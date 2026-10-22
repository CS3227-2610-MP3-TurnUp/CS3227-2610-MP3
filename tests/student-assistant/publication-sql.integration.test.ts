import { createRequire } from "node:module";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/server/db/generated/client";
import { replaceSession } from "../../src/server/auth/session";
import { createEvent, listEvents, mutateEvent, readEvent } from "../../src/server/events/service";
import { currentPublication } from "../../src/server/publication/reader";
import { answerPublication } from "../../src/server/student-assistant/publication-answer";
import { tokenDigest, revokeSession } from "../../src/server/auth/session";
import { EMPTY_EVENT } from "../../src/lib/event-fields";

// Explicit local diagnostic. Reuse Prisma's locked dev dependencies, never an env URL.
// This is an in-memory, single-connection PostgreSQL engine, not a Neon/load test.
if (process.env.RUN_LOCAL_PUBLICATION_SQL !== "1") throw new Error("Opt into disposable local event SQL with RUN_LOCAL_PUBLICATION_SQL=1.");
const require = createRequire(import.meta.url);
const prismaRequire = createRequire(require.resolve("prisma/package.json"));
const devRequire = createRequire(prismaRequire.resolve("@prisma/dev"));
const { PGlite } = await import(devRequire.resolve("@electric-sql/pglite"));
const { PGLiteSocketServer } = await import(devRequire.resolve("@electric-sql/pglite-socket"));
const engine = await PGlite.create();
const socket = new PGLiteSocketServer({ db: engine, host: "127.0.0.1", port: 0, maxConnections: 1 });
let db: PrismaClient | undefined;
let token: string;
let studentToken: string;
let foreignToken: string;
const ownerId = randomUUID();
const fields = { ...EMPTY_EVENT, title: "Synthetic SQL workshop", description: "Local-only fixture", location: "Hall", fee: "Free", openTo: "Anyone", preparation: "None", capacity: 10,
  start: "2099-11-01T02:00:00.000Z", end: "2099-11-01T04:00:00.000Z" };
function client() { if (!db) throw new Error("Local fixture not initialised"); return db; }
beforeAll(async () => {
  const directory = resolve("prisma/migrations");
  for (const name of (await readdir(directory)).filter((name) => /^\d/.test(name)).sort()) await engine.exec(await readFile(resolve(directory, name, "migration.sql"), "utf8"));
  await socket.start();
  const endpoint = socket.getServerConn();
  if (!/^127\.0\.0\.1:\d+$/.test(endpoint)) throw new Error("Local fixture must bind loopback only.");
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: `postgresql://postgres@${endpoint}/postgres`, max: 1 }) });
  const studentId = randomUUID(), foreignId = randomUUID();
  for (const [id, username, role] of [[ownerId, "qa_sql_owner", "ORGANISER"], [studentId, "qa_sql_student", "STUDENT"], [foreignId, "qa_sql_foreign", "ORGANISER"]] as const) {
    await db.user.create({ data: { id, username, role, passwordHash: "synthetic-non-login-hash" } });
  }
  token = await db.$transaction((tx) => replaceSession(tx, ownerId));
  studentToken = await db.$transaction((tx) => replaceSession(tx, studentId));
  foreignToken = await db.$transaction((tx) => replaceSession(tx, foreignId));
});
afterAll(async () => { await db?.$disconnect(); await socket.stop(); await engine.close(); });
async function prepared() {
  const event = await createEvent(client(), token);
  await mutateEvent(client(), token, event.id, 0, "save", fields);
  return event.id;
}
async function publish(id: string, version: number) {
  const preview = await mutateEvent(client(), token, id, version, "preview") as { approvalId: string };
  return mutateEvent(client(), token, id, version, "publish", undefined, preview.approvalId);
}
import { loadPublicationSource, recheckPublication, deliverPublicationAnswer } from "../../src/server/student-assistant/publication-lifecycle";

it("real session and JSONB publication project approved source without registration or private draft", async () => {
 const id=await prepared();
 await expect(loadPublicationSource(client(),studentToken,id)).rejects.toMatchObject({status:404});
 await publish(id,1);
 const source=await loadPublicationSource(client(),studentToken,id);
 const raw=await currentPublication(client(),studentToken,id);
 expect(source.binding.revision).toBe(`${raw.publication.id}:${raw.publication.revision}:${raw.publication.digest}`);
 expect(source.source.sections.find(section=>section.id === "preparation")?.text).toBe(fields.preparation);
 expect(JSON.stringify(source)).not.toContain("qa_sql_owner");expect(JSON.stringify(source)).not.toContain("passwordHash");
 await expect(loadPublicationSource(client(),undefined,id)).rejects.toMatchObject({status:401});
 await expect(loadPublicationSource(client(),token,id)).rejects.toMatchObject({status:403});
});
it("private draft edit leaves binding current, reviewed replacement invalidates it",async()=>{
 const id=await prepared();await publish(id,1);const first=await loadPublicationSource(client(),studentToken,id);
 await mutateEvent(client(),token,id,2,"save",{...fields,title:"private draft canary"});
 const still=await recheckPublication(client(),studentToken,first.binding);expect(still.source.title).toBe(fields.title);expect(JSON.stringify(still)).not.toContain("private draft canary");
 await publish(id,3);await expect(recheckPublication(client(),studentToken,first.binding)).rejects.toMatchObject({status:409,code:"source_changed"});
});
it("withdrawal and cancellation deny source and previously prepared answer at delivery",async()=>{
 const id=await prepared();await publish(id,1);const first=await loadPublicationSource(client(),studentToken,id);
 const answer={...first.binding,kind:"answered",evidence:[{...first.binding,sectionId:"preparation",quote:fields.preparation}]};
 expect((await deliverPublicationAnswer(client(),studentToken,first.binding,answer)).kind).toBe("answered");
 await mutateEvent(client(),token,id,2,"withdraw");
 await expect(deliverPublicationAnswer(client(),studentToken,first.binding,answer)).rejects.toMatchObject({status:404,code:"event_unavailable"});
 await mutateEvent(client(),token,id,3,"cancel");
 await expect(loadPublicationSource(client(),studentToken,id)).rejects.toMatchObject({status:404,code:"event_unavailable"});
});
it("same-content republication changes publication binding after withdrawal",async()=>{
 const id=await prepared();await publish(id,1);const first=await loadPublicationSource(client(),studentToken,id);
 await mutateEvent(client(),token,id,2,"withdraw");await publish(id,3);
 const next=await loadPublicationSource(client(),studentToken,id);expect(next.binding.revision).not.toBe(first.binding.revision);expect(next.source.title).toBe(first.source.title);
 await expect(recheckPublication(client(),studentToken,first.binding)).rejects.toMatchObject({code:"source_changed"});
});
it("revoked and expired Student sessions are rechecked before delivery",async()=>{
 const id=await prepared();await publish(id,1);
 const {tokenDigest}=await import("../../src/server/auth/session");
 const identity=await client().user.findUniqueOrThrow({where:{username:"qa_sql_student"}});
 for(const action of ["revoke","expire"]){
  const token=await client().$transaction(tx=>replaceSession(tx,identity.id));const loaded=await loadPublicationSource(client(),token,id);
  if(action === "revoke")await client().session.delete({where:{tokenDigest:tokenDigest(token)!}});
  else await client().session.update({where:{tokenDigest:tokenDigest(token)!},data:{expiresAt:new Date(0)}});
  await expect(recheckPublication(client(),token,loaded.binding)).rejects.toMatchObject({status:401,code:"login_required"});
 }
});

it.each(["unchanged", "draft", "replace", "withdraw", "cancel", "revoke", "expire"] as const)("real publication → mocked inference → final %s SQL check", async action => {
 const identity = await client().user.findUniqueOrThrow({ where: { username: "qa_sql_student" } });
 const activeToken = await client().$transaction(tx => replaceSession(tx, identity.id));
 const event = await createEvent(client(), token);
 await mutateEvent(client(), token, event.id, 0, "save", fields, undefined, { questions: [{ type: "single_choice", label: "Choose a workshop", required: true, help: "Select one session", options: [{ label: "Morning" }, { label: "Afternoon" }] }] });
 await publish(event.id, 1);
 const first = await loadPublicationSource(client(), activeToken, event.id);
 expect(first.source.sections.some(section => section.text.includes("Morning") && section.text.includes("Afternoon"))).toBe(true);
 const candidate = { kind: "answered", eventId: event.id, revision: first.binding.revision, reply: "No preparation is needed.", evidence: [{ ...first.binding, sectionId: "preparation", quote: fields.preparation }] };
 const config = { apiKey: "fake-sql-key", model: "fake-model", maxInputBytes: 65536, maxOutputTokens: 1000, timeoutMs: 1000 };
 const release = vi.fn(async () => {});
 const reserve = vi.fn(async () => ({ ok: true as const, config, release }));
 const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, options) => {
   const context = JSON.parse(options!.body as string);
   expect(JSON.stringify(context)).not.toMatch(/qa_sql_student|qa_sql_owner|fake-sql-key|synthetic-non-login-hash/);
   if (action === "draft" || action === "replace") await mutateEvent(client(), token, event.id, 2, "save", { ...fields, title: "Private replacement title" });
   if (action === "replace") await publish(event.id, 3);
   if (action === "withdraw" || action === "cancel") await mutateEvent(client(), token, event.id, 2, action);
   if (action === "revoke") await revokeSession(client(), activeToken);
   if (action === "expire") await client().session.update({ where: { tokenDigest: tokenDigest(activeToken)! }, data: { expiresAt: new Date(0) } });
   return Response.json({ choices: [{ message: { content: JSON.stringify(candidate) } }] });
 });
 const result = answerPublication(client(), activeToken, event.id, { requestId: randomUUID(), revision: first.binding.revision, question: "What should I prepare?" }, config, { reserve, fetchImpl: fetcher });
 if (action === "unchanged" || action === "draft") expect(await result).toEqual({ ok: true, candidate });
 else await expect(result).rejects.toMatchObject({ code: action === "replace" ? "source_changed" : action === "withdraw" || action === "cancel" ? "event_unavailable" : "login_required" });
 expect(fetcher).toHaveBeenCalledOnce(); expect(release).toHaveBeenCalledOnce();
 expect(await client().registration.count({ where: { eventId: event.id } })).toBe(0);
});

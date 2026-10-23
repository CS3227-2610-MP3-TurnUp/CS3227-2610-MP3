import "server-only";
import { NextResponse } from "next/server";
import { AuthError } from "../auth/policy";
import { authConfig, requireOrigin } from "../auth/request-security";
import { presentedToken } from "../auth/session";
import { privateHeaders } from "../accounts/service";
import { EventError, exactKeys, object, parseFields, uuid, version } from "./policy";
import { createEvent, listEvents, mutateEvent, readEvent, type EventAction } from "./service";
import { parseResolutionIntents } from "../proposal-assistance/clarification";

export function eventFailure(error: unknown) {
  return NextResponse.json({ error: error instanceof AuthError ? error.message : "Event service unavailable. Your saved work has been preserved. Try again later.",
    ...(error instanceof EventError && error.field ? { field: error.field } : {}) },
  { status: error instanceof AuthError ? error.status : 503, headers: privateHeaders });
}
async function readBody(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new EventError(415, "Send event fields as JSON.");
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > 524288)) throw new EventError(413, "The event request is too large.");
  if (!request.body) throw new EventError(400, "Send valid event fields.");
  const reader = request.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([ (async () => {
      const chunks: Uint8Array[] = []; let bytes = 0;
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        bytes += value.byteLength;
        if (bytes > 524288) throw new EventError(413, "The event request is too large.");
        chunks.push(value);
      }
      try { return object(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch (error) { if (error instanceof EventError) throw error; throw new EventError(400, "Send valid event fields."); }
    })(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new EventError(408, "The event request took too long.")), 5000); }) ]);
  } finally { clearTimeout(timer); void reader.cancel().catch(() => {}); }
}
export async function eventCollection(request: Request) {
  try {
    const config = authConfig();
    if (request.method === "POST") requireOrigin(request, config);
    const token = presentedToken(request.headers, config);
    const { prisma } = await import("../db/client");
    if (request.method === "GET") {
      const query = new URL(request.url).searchParams;
      if ([...query.keys()].some((key) => !["search", "sort", "direction"].includes(key)) || (query.get("search")?.length ?? 0) > 150 ||
          !["title", "modified", "start"].includes(query.get("sort") ?? "modified") || !["asc", "desc"].includes(query.get("direction") ?? "desc")) throw new EventError(400, "Use valid search and sort options.");
      return NextResponse.json({ events: await listEvents(prisma, token, query.get("search") ?? "", query.get("sort") ?? "modified", query.get("direction") ?? "desc") }, { headers: privateHeaders });
    }
    exactKeys(await readBody(request), []);
    const event = await createEvent(prisma, token);
    return NextResponse.json({ id: event.id }, { status: 201, headers: privateHeaders });
  } catch (error) { return eventFailure(error); }
}
export async function eventResource(request: Request, id: string) {
  try {
    const config = authConfig(); if (request.method === "POST") requireOrigin(request, config);
    uuid(id);
    const token = presentedToken(request.headers, config);
    if (request.method === "GET") {
      const { prisma } = await import("../db/client");
      return NextResponse.json(await readEvent(prisma, token, id), { headers: privateHeaders });
    }
    const body = await readBody(request);
    const actions: EventAction[] = ["save", "preview", "publish", "withdraw", "cancel", "delete", "discard"];
    if (!actions.includes(body.action as EventAction)) throw new EventError(400, "Choose a valid event action.");
    const action = body.action as EventAction;
    const hasPreparationRevision = Object.hasOwn(body, "expectedPreparationRevision");
    const hasResolutions = Object.hasOwn(body, "resolutions");
    if (hasPreparationRevision !== hasResolutions || (action !== "save" && (hasPreparationRevision || hasResolutions))) {
      throw new EventError(400, "Send proposal resolutions only with Save Draft.");
    }
    exactKeys(body, ["action", "expectedVersion", ...(action === "save" ? ["fields", "form", ...(hasPreparationRevision ? ["expectedPreparationRevision", "resolutions"] : [])] : action === "publish" ? ["approvalId"] : [])]);
    const expected = version(body.expectedVersion);
    const fields = action === "save" ? parseFields(body.fields) : undefined;
    const approvalId = action === "publish" ? uuid(body.approvalId) : undefined;
    const clarification = hasPreparationRevision ? {
      expectedPreparationRevision: version(body.expectedPreparationRevision),
      resolutions: parseResolutionIntents(body.resolutions),
    } : undefined;
    const { prisma } = await import("../db/client");
    return NextResponse.json(await mutateEvent(prisma, token, id, expected, action, fields, approvalId, clarification, ...(Object.hasOwn(body, "form") ? [body.form] : [])), { headers: privateHeaders });
  } catch (error) { return eventFailure(error); }
}

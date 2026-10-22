import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ self: vi.fn() }));
vi.mock("../../src/server/accounts/service", () => ({requireSelf:auth.self}));
import { AuthError } from "../../src/server/auth/policy";
import { EventError } from "../../src/server/events/policy";
import type { PrismaClient } from "../../src/server/db/generated/client";
import { loadPublicationSource, recheckPublication, deliverPublicationAnswer } from "../../src/server/student-assistant/publication-lifecycle";
import { eventId, publicationFixture } from "./publication-fixture";
let record = publicationFixture(), state = "PUBLISHED";
const findFirst = vi.fn(async (_query: {where:{id:string}}) => state === "PUBLISHED" ? {id:record.eventId,version:record.eventVersion,owner:{username:record.organiser},currentPublication:record.publication} : null);
const db = {event:{findFirst}} as unknown as PrismaClient;
beforeEach(() => { record=publicationFixture();state="PUBLISHED";findFirst.mockReset().mockImplementation(async()=>state === "PUBLISHED"?{id:record.eventId,version:record.eventVersion,owner:{username:record.organiser},currentPublication:record.publication}:null);auth.self.mockReset().mockImplementation(async(_db,token)=>{if(token!=="student")throw new AuthError(401,"private-session-detail");return {role:"STUDENT",id:"student"};}); });
it("authenticates reader and selects current publication without requiring registration", async () => {
 const loaded=await loadPublicationSource(db,"student",eventId);
 expect(loaded.source.eventId).toBe(eventId);
 expect(findFirst).toHaveBeenCalledWith({where:{id:eventId,state:"PUBLISHED"},select:{id:true,version:true,owner:{select:{username:true}},currentPublication:{select:{id:true,revision:true,snapshot:true,digest:true}}}});
 await expect(loadPublicationSource(db,undefined,eventId)).rejects.toMatchObject({status:401,code:"login_required"});
 auth.self.mockResolvedValueOnce({id:"organiser",role:"ORGANISER"});
 await expect(loadPublicationSource(db,"student",eventId)).rejects.toMatchObject({status:403,code:"student_required"});
});
it("accepts private draft version changes but rejects publication replacement with identical text", async () => {
 const first=await loadPublicationSource(db,"student",eventId);record.eventVersion+=10;
 expect((await recheckPublication(db,"student",first.binding)).binding).toEqual(first.binding);
 record.publication.id="44444444-4444-4444-8444-444444444444";record.publication.revision=20;
 await expect(recheckPublication(db,"student",first.binding)).rejects.toMatchObject({status:409,code:"source_changed"});
});
it.each(["WITHDRAWN","CANCELLED","DRAFT"])("rejects %s at final delivery without old content",async nextState=>{
 const first=await loadPublicationSource(db,"student",eventId);state=nextState;
 await expect(deliverPublicationAnswer(db,"student",first.binding,{...first.binding,kind:"unanswered"})).rejects.toMatchObject({status:404,code:"event_unavailable"});
});
it("revalidates logout/revocation at delivery and maps DB errors separately",async()=>{
 const first=await loadPublicationSource(db,"student",eventId);auth.self.mockRejectedValueOnce(new AuthError(401,"private"));
 await expect(recheckPublication(db,"student",first.binding)).rejects.toMatchObject({code:"login_required"});
 findFirst.mockRejectedValueOnce(new Error("private DB credential"));await expect(loadPublicationSource(db,"student",eventId)).rejects.toMatchObject({status:503,code:"source_unavailable"});
});
it("checks candidate against final current source; no provider or message side effects",async()=>{
 const first=await loadPublicationSource(db,"student",eventId);
 const evidence=[{...first.binding,sectionId:"preparation",quote:"Bring a water bottle."}];
 expect((await deliverPublicationAnswer(db,"student",first.binding,{...first.binding,kind:"answered",evidence})).kind).toBe("answered");
 await expect(deliverPublicationAnswer(db,"student",first.binding,{...first.binding,kind:"answered",evidence:[{...evidence[0],quote:"Lunch is provided."}]})).rejects.toMatchObject({code:"invalid_answer"});
 await expect(loadPublicationSource(db,"student","bad uuid")).rejects.toMatchObject({status:400});
 findFirst.mockRejectedValueOnce(new EventError(404,"sensitive unavailable reason"));await expect(loadPublicationSource(db,"student",eventId)).rejects.toMatchObject({code:"event_unavailable"});
});

it("canonicalises accepted uppercase UUID references before reading or binding",async()=>{
 record.eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
 const loaded=await loadPublicationSource(db,"student",record.eventId.toUpperCase());
 expect(loaded.binding.eventId).toBe(record.eventId);
 expect(findFirst.mock.calls[0][0].where.id).toBe(record.eventId);
});

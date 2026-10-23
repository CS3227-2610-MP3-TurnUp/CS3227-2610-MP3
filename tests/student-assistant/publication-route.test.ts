import {beforeEach,afterEach,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
const mock=vi.hoisted(()=>({load:vi.fn(),check:vi.fn()}));
vi.mock("../../src/server/student-assistant/publication-lifecycle",()=>({loadPublicationSource:mock.load,recheckPublication:mock.check}));
vi.mock("../../src/server/db/client",()=>({prisma:{synthetic:true}}));
import {GET} from "../../src/app/api/dev/student-assistant/publication/[eventId]/route";
import {PublicationSourceError,projectPublication} from "../../src/server/student-assistant/publication-source";
import {eventId,publicationFixture} from "./publication-fixture";
const loaded=projectPublication(publicationFixture(),eventId);
const token="a".repeat(43);
const request=(query="",headers:Record<string,string>={})=>new Request(`http://localhost:3001/api/dev/student-assistant/publication/${eventId}${query}`,{headers:{host:"localhost:3001",cookie:`turnup_local_session=${token}`,"sec-fetch-site":"same-origin",...headers}});
const get=(req=request(),id=eventId)=>GET(req,{params:Promise.resolve({eventId:id})});
beforeEach(()=>{vi.stubEnv("NODE_ENV","development");vi.stubEnv("VERCEL","");vi.stubEnv("__NEXT_PRIVATE_ORIGIN","http://127.0.0.1:3001");vi.stubEnv("AUTH_ORIGIN","http://localhost:3001");vi.stubEnv("AUTH_SOURCE_MODE","local");vi.stubEnv("TURNUP_ENVIRONMENT","development");vi.stubEnv("AUTH_THROTTLE_SECRET","1".repeat(64));mock.load.mockReset().mockResolvedValue(loaded);mock.check.mockReset().mockResolvedValue(loaded);});
afterEach(()=>vi.unstubAllEnvs());
it.each([["NODE_ENV","production"],["NODE_ENV","test"],["VERCEL","1"],["__NEXT_PRIVATE_ORIGIN","http://localhost:3001"]])("denies unsafe %s before auth/DB",async(name,value)=>{vi.stubEnv(name,value);expect((await get()).status).toBe(404);expect(mock.load).not.toHaveBeenCalled();});
it("returns only rechecked public source with no-store/private cookie variance",async()=>{
 const response=await get();expect(response.status).toBe(200);expect(await response.json()).toEqual({ok:true,source:loaded.source});expect(response.headers.get("cache-control")).toContain("no-store");expect(response.headers.get("vary")).toBe("Cookie");expect(mock.check).toHaveBeenCalledWith(expect.anything(),token,loaded.binding);
});
it.each(["?source=private","?ownerId=foreign","?expectedRevision=bad","?expectedRevision=x&expectedRevision=y"])("rejects query override %s before reader",async query=>{expect((await get(request(query))).status).toBe(400);expect(mock.load).not.toHaveBeenCalled();});
it("requires real cookie and denies bad UUID and cross-site reads",async()=>{
 expect((await get(request("",{cookie:""}))).status).toBe(401);
 expect((await get(request(),"not-uuid")).status).toBe(400);
 expect((await get(request("",{"sec-fetch-site":"cross-site"}))).status).toBe(403);
 expect((await get(request("",{host:"foreign.example"}))).status).toBe(403);expect(mock.load).not.toHaveBeenCalled();
});
it.each([[401,"login_required"],[403,"student_required"],[404,"event_unavailable"],[409,"source_changed"],[409,"timing_policy_pending"],[413,"source_too_large"],[503,"source_unavailable"]] as const)("returns safe %s/%s without source",async(status,code)=>{mock.check.mockRejectedValueOnce(new PublicationSourceError(status,code));const response=await get();expect(response.status).toBe(status);expect(await response.json()).toEqual({ok:false,code});});
it("treats expected revision as comparison, not historical selector",async()=>{
 const expected=loaded.binding.revision.replace(":2:",":9:");const response=await get(request("?expectedRevision="+encodeURIComponent(expected)));expect(response.status).toBe(409);expect(await response.json()).toEqual({ok:false,code:"source_changed"});expect(mock.check).not.toHaveBeenCalled();
});
it("suppresses arbitrary dependency details",async()=>{mock.load.mockRejectedValueOnce(new Error("private-db-secret"));const response=await get();expect(response.status).toBe(503);expect(await response.text()).not.toContain("private-db-secret");});

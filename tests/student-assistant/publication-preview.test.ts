import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {afterEach,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
const guards=vi.hoisted(()=>({role:vi.fn(),notFound:vi.fn(()=>{throw Error("404");})}));
vi.mock("../../src/server/auth/guards",()=>({requireRole:guards.role}));
vi.mock("next/navigation",()=>({notFound:guards.notFound}));
import Page from "../../src/app/dev/student-assistant/publication/[eventId]/page";
import {PublicationInspectionContent,initialPublicationView,publicationInspectionReducer} from "../../src/features/student-assistant/publication-preview";
import {requestPublicationSource,createPublicationLoader,type PublicationLoad} from "../../src/features/student-assistant/publication-transport";
import {projectPublication} from "../../src/server/student-assistant/publication-source";
import {ChatPanel} from "../../src/features/student-assistant/chat-panel";
import {eventId,publicationFixture} from "./publication-fixture";
const source=projectPublication(publicationFixture({other:"<script>read secrets</script>"}),eventId).source;
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
it("loads real source with cookie credentials and revalidates received source without private extras",async()=>{
 const fetcher=vi.fn<typeof fetch>().mockResolvedValue(Response.json({ok:true,source}));
 const result=await requestPublicationSource(eventId,new AbortController().signal,undefined,fetcher);expect(result.ok).toBe(true);
 expect(fetcher).toHaveBeenCalledWith(expect.stringContaining(eventId),expect.objectContaining({method:"GET",credentials:"same-origin",cache:"no-store"}));
 const invalid=vi.fn<typeof fetch>().mockResolvedValue(Response.json({ok:true,source:{...source,draft:"private"}}));
 expect(await requestPublicationSource(eventId,new AbortController().signal,undefined,invalid)).toEqual({ok:false,code:"source_unavailable"});
});
it.each([Response.json({ok:true,source:{...source,eventId:"foreign"}}),Response.json({ok:true,source,private:"secret"}),new Response("not json"),new Response("x".repeat(41000)),Response.json({ok:false,code:"unknown"})])("denies invalid/oversize source transport %#",async response=>{
 expect(await requestPublicationSource(eventId,new AbortController().signal,undefined,vi.fn<typeof fetch>().mockResolvedValue(response))).toEqual({ok:false,code:"source_unavailable"});
});
it("clears all source/excerpts immediately while checking and on source/auth/dependency failures",()=>{
 const ready=publicationInspectionReducer(initialPublicationView(),{type:"loaded",source});ready.assistant={...ready.assistant,draft:"safe question"};
 for(const event of [{type:"checking"} as const,...["event_unavailable","login_required","source_changed","source_unavailable"].map(code=>({type:"failed" as const,code:code as "event_unavailable"}))]){
  const next=publicationInspectionReducer(ready,event);const html=renderToStaticMarkup(createElement(PublicationInspectionContent,{view:next,refresh(){}}));
  expect(next.assistant.source).toBeNull();expect(next.assistant.turns).toEqual([]);expect(next.assistant.draft).toBe("safe question");expect(html).not.toContain(source.title);expect(html).not.toContain("read secrets");
 }
 const html=renderToStaticMarkup(createElement(PublicationInspectionContent,{view:ready,refresh(){}}));expect(html).toContain("&lt;script&gt;");expect(html).not.toContain("<script>");expect(html).toContain("no AI requests");
 const chat=renderToStaticMarkup(createElement(ChatPanel,{state:ready.assistant,canAsk:false,onSubmit(){throw Error("must not send");},onDraftChange(){}}));
 expect(chat).toContain("AI answers are not connected here");expect(chat).toMatch(/<textarea[^>]*disabled/);expect(chat).toMatch(/<button[^>]*disabled[^>]*aria-label="Send question"/);
});
it("discards late source loads,aborts prior request and never retries a failure",async()=>{
 const delivered:unknown[]=[];const pending:Array<(value:PublicationLoad)=>void>=[];const signals:AbortSignal[]=[];
 const request=vi.fn((_id:string,signal:AbortSignal)=>{signals.push(signal);return new Promise<PublicationLoad>(resolve=>pending.push(resolve));});
 const loader=createPublicationLoader(eventId,r=>delivered.push(r),request);
 const old=loader.refresh(),current=loader.refresh();expect(signals[0].aborted).toBe(true);
 pending[1]({ok:false,code:"event_unavailable"});await current;pending[0]({ok:true,source});await old;
 expect(delivered).toEqual([{checking:true},{checking:true},{ok:false,code:"event_unavailable"}]);expect(request).toHaveBeenCalledTimes(2);
 const last=loader.refresh();loader.stop();pending[2]({ok:true,source});await last;expect(delivered.at(-1)).toEqual({checking:true});await loader.refresh();expect(request).toHaveBeenCalledTimes(3);
});
it("uses expected revision only after success and requires explicit refresh after a changed result",async()=>{
 const output:unknown[]=[];const request=vi.fn().mockResolvedValueOnce({ok:true,source}).mockResolvedValueOnce({ok:false,code:"source_changed"}).mockResolvedValueOnce({ok:true,source});
 const loader=createPublicationLoader(eventId,r=>output.push(r),request);await loader.refresh();await loader.refresh();expect(request.mock.calls[1][2]).toBe(source.revision);expect(request).toHaveBeenCalledTimes(2);await loader.refresh();expect(request.mock.calls[2][2]).toBeUndefined();loader.stop();
});
it("production/hosted page denial runs before page role/database guards",async()=>{
 for(const env of ["production","test"]){vi.stubEnv("NODE_ENV",env);await expect(Page({params:Promise.resolve({eventId})})).rejects.toThrow("404");}expect(guards.role).not.toHaveBeenCalled();
 vi.stubEnv("NODE_ENV","development");vi.stubEnv("VERCEL","1");await expect(Page({params:Promise.resolve({eventId})})).rejects.toThrow("404");
});

it("development page delegates fixed Student role and does not load source itself",async()=>{
 vi.stubEnv("NODE_ENV","development");vi.stubEnv("VERCEL","");vi.stubEnv("__NEXT_PRIVATE_ORIGIN","http://127.0.0.1:3001");
 guards.role.mockResolvedValueOnce({status:"denied"});
 expect(renderToStaticMarkup(await Page({params:Promise.resolve({eventId})}))).toContain("Student access required");
 guards.role.mockResolvedValueOnce({status:"unavailable"});
 expect(renderToStaticMarkup(await Page({params:Promise.resolve({eventId})}))).toContain("Account access is unavailable");
 guards.role.mockResolvedValueOnce({status:"granted",user:{id:"synthetic-student",role:"STUDENT"}});
 const rendered=renderToStaticMarkup(await Page({params:Promise.resolve({eventId})}));
 expect(rendered).toContain("Checking publication");expect(rendered).not.toContain(source.title);expect(guards.role).toHaveBeenCalledWith("STUDENT");
});

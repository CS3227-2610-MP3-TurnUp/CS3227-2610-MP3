import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  states: [] as unknown[],
  refs: [] as Array<{ current: unknown }>,
  stateIndex: 0,
  refIndex: 0,
  setterCalls: [] as number[],
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: <T,>(initial: T | (() => T)) => {
      const index = hooks.stateIndex++;
      if (!(index in hooks.states)) hooks.states[index] = typeof initial === "function" ? (initial as () => T)() : initial;
      const setState = (next: T | ((previous: T) => T)) => {
        hooks.setterCalls[index] = (hooks.setterCalls[index] ?? 0) + 1;
        const previous = hooks.states[index] as T;
        hooks.states[index] = typeof next === "function" ? (next as (value: T) => T)(previous) : next;
      };
      return [hooks.states[index] as T, setState] as const;
    },
    useRef: <T,>(initial: T) => {
      const index = hooks.refIndex++;
      if (!hooks.refs[index]) hooks.refs[index] = { current: initial };
      return hooks.refs[index] as { current: T };
    },
    useEffect: () => undefined,
  };
});

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", async () => {
  const react = await vi.importActual<typeof import("react")>("react");
  return { default: ({ href, children, ...props }: { href: string; children: unknown; [key: string]: unknown }) => react.createElement("a", { href, ...props }, children as never) };
});

import { renderToStaticMarkup } from "react-dom/server";
import { EMPTY_EVENT, type EventFields } from "../../src/lib/event-fields";
import type { PrivateExtraction, ProposalRevisions } from "../../src/features/proposal-assistance/types";
import { EventEditor } from "../../src/components/events/editor";

type ElementLike = { type: unknown; key?: string | null; props: Record<string, unknown> };

const savedFields: EventFields = { ...EMPTY_EVENT, title: "Current title", description: "Current description", location: "Current venue", fee: "Paid", openTo: "Current audience", capacity: 50 };
const view = { id: "event-1", version: 2, state: "DRAFT", fields: savedFields, published: null };
const extraction: PrivateExtraction = {
  facts: {
    title: { status: "known", value: "Campus Arts Night", evidence: [{ quote: "Campus Arts Night", page: 1 }] },
    purpose: { status: "missing", evidence: [] },
    start: { status: "known", value: "2026-11-14T19:00:00.000+08:00", evidence: [{ quote: "2026-11-14 7 pm SGT", page: 1 }] },
    end: { status: "known", value: "2026-11-14T21:00:00.000Z", evidence: [{ quote: "2026-11-14T21:00:00.000Z", page: 1 }] },
    location: { status: "conflicting", alternatives: [
      { value: "Innovation Hall", evidence: [{ quote: "Innovation Hall", page: 1 }] },
      { value: "Business School Foyer", evidence: [{ quote: "Business School Foyer", page: 1 }] },
    ] },
    capacity: { status: "known", value: "80", evidence: [{ quote: "80 attendees", page: 1 }] },
    feeStatus: { status: "known", value: "Free entry", evidence: [{ quote: "Free entry", page: 1 }] },
    preparation: { status: "known", value: "Bring your student card", evidence: [{ quote: "Bring your student card", page: 1 }] },
  },
  privateFindings: [],
  completeness: "incomplete",
  incompleteReasons: ["unprocessed_fields"],
  unprocessedFields: ["openTo"],
  technicalIssues: 0,
};
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  hooks.states = [view, { ...savedFields }, "editor", null, false, false, false, "", "", "", {}, 0];
  hooks.refs = [];
  hooks.stateIndex = 0;
  hooks.refIndex = 0;
  hooks.setterCalls = [];
  fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = init?.body as FormData;
    const revisions = JSON.parse(String(body.get("revisions"))) as ProposalRevisions;
    return json({ ok: true, revisions, extraction });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

function render() {
  hooks.stateIndex = 0;
  hooks.refIndex = 0;
  return EventEditor({ id: "event-1" });
}

function nodes(root: unknown): ElementLike[] {
  if (Array.isArray(root)) return root.flatMap(nodes);
  if (typeof root !== "object" || root === null || !("type" in root) || !("props" in root)) return [];
  const element = root as ElementLike;
  if (typeof element.type === "function") {
    const stateIndex = hooks.stateIndex;
    const refIndex = hooks.refIndex;
    hooks.stateIndex = 12;
    hooks.refIndex = 5;
    const result = nodes((element.type as (props: Record<string, unknown>) => unknown)(element.props));
    hooks.stateIndex = stateIndex;
    hooks.refIndex = refIndex;
    return result;
  }
  return [element, ...nodes(element.props.children)];
}

function byId(root: unknown, id: string): ElementLike {
  const found = nodes(root).find((element) => element.props.id === id);
  if (!found) throw new Error(`Could not find element with id ${id}`);
  return found;
}

function byClass(root: unknown, className: string): ElementLike {
  const found = nodes(root).find((element) => element.props.className === className);
  if (!found) throw new Error(`Could not find element with class ${className}`);
  return found;
}

function byText(root: unknown, type: string, text: string): ElementLike {
  const found = nodes(root).find((element) => element.type === type && textOf(element.props.children) === text);
  if (!found) throw new Error(`Could not find <${type}> with text ${text}`);
  return found;
}

function textOf(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textOf).join("");
  if (typeof value === "object" && value !== null && "props" in value) return textOf((value as ElementLike).props.children);
  return "";
}

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { "Content-Type": "application/json" } });
}

describe("EventEditor proposal prefill integration", () => {
  it("updates all supported fields in one parent state update, keeps unresolved fields and renders evidence below their inputs", async () => {
    const initial = render();
    const fileInput = nodes(initial).find((element) => element.type === "input" && element.props.type === "file");
    if (!fileInput) throw new Error("PDF picker missing from EventEditor");
    const file = new File(["synthetic PDF bytes"], "proposal.pdf", { type: "application/pdf" });
    (fileInput.props.onChange as (event: unknown) => void)({ currentTarget: { files: [file], value: "" } });
    (byText(render(), "button", "Generate Findings").props.onClick as () => void)();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(hooks.setterCalls[1]).toBe(1);
    expect(hooks.states[1]).toMatchObject({
      title: "Campus Arts Night",
      description: "Current description",
      start: "2026-11-14T11:00:00.000Z",
      end: "2026-11-14T21:00:00.000Z",
      location: "Current venue",
      capacity: 80,
      fee: "Free entry",
      openTo: "Current audience",
      preparation: "Bring your student card",
    });

    const updated = render();
    expect(byId(updated, "event-title").props.value).toBe("Campus Arts Night");
    expect(byId(updated, "event-description").props.value).toBe("Current description");
    expect(byId(updated, "event-start").props.value).toBe("2026-11-14T19:00");
    expect(byId(updated, "event-end").props.value).toBe("2026-11-15T05:00");
    expect(byId(updated, "event-location").props.value).toBe("Current venue");
    expect(byId(updated, "event-capacity").props.value).toBe(80);
    expect(byId(updated, "event-fee").props.value).toBe("Free entry");
    expect(byId(updated, "event-openTo").props.value).toBe("Current audience");
    expect(String(byId(updated, "event-title").props["aria-describedby"])).toContain("proposal-feedback-title");
    expect(String(byId(updated, "event-start").props["aria-describedby"])).toContain("proposal-feedback-start");
    const markup = renderToStaticMarkup(updated);
    expect(markup).toContain("<q>Campus Arts Night</q>");
    expect(markup).toContain("<q>2026-11-14 7 pm SGT</q>");
    expect(markup).toContain("Page 1");
    expect(markup).toContain("When the source gives a complete date and time without a timezone, it is interpreted as Singapore Time (SGT).");
    expect(textOf(byId(updated, "proposal-feedback-location").props.children)).toContain("Innovation Hall");
    expect(textOf(byId(updated, "proposal-feedback-location").props.children)).toContain("Business School Foyer");
    expect(textOf(byId(updated, "proposal-feedback-description").props.children)).toContain("existing field was kept");
    expect(textOf(byId(updated, "proposal-feedback-openTo").props.children)).toContain("No safe value");
    expect(markup).toContain("Save Draft");
    expect(markup).not.toContain("Apply to");

    const title = byId(updated, "event-title");
    (title.props.onChange as (event: unknown) => void)({ target: { value: "Manually edited title" } });
    const manuallyEdited = render();
    expect(byId(manuallyEdited, "event-title").props.value).toBe("Manually edited title");
    expect(nodes(manuallyEdited).some((element) => element.props.id === "proposal-feedback-title")).toBe(false);
  });

  it("rejects a deferred Generate result after Cancel Editing restores the saved values", async () => {
    hooks.states[1] = { ...savedFields, title: "Unsaved working title" };
    let resolveResponse!: (response: Response) => void;
    fetchMock.mockImplementationOnce(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body as FormData;
      const revisions = JSON.parse(String(body.get("revisions"))) as ProposalRevisions;
      return await new Promise<Response>((resolve) => { resolveResponse = (response) => { void revisions; resolve(response); }; });
    });

    const initial = render();
    const fileInput = nodes(initial).find((element) => element.type === "input" && element.props.type === "file");
    if (!fileInput) throw new Error("PDF picker missing from EventEditor");
    const file = new File(["synthetic PDF bytes"], "proposal.pdf", { type: "application/pdf" });
    (fileInput.props.onChange as (event: unknown) => void)({ currentTarget: { files: [file], value: "" } });
    (byText(render(), "button", "Generate Findings").props.onClick as () => void)();

    expect(byId(render(), "event-title").props.value).toBe("Unsaved working title");
    (byText(render(), "button", "Cancel Editing").props.onClick as () => void)();
    expect(hooks.states[1]).toMatchObject({ title: "Current title" });
    expect(hooks.setterCalls[11]).toBe(1);

    const form = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    const revisions = JSON.parse(String(form.get("revisions"))) as ProposalRevisions;
    resolveResponse(json({ ok: true, revisions, extraction }));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(hooks.states[1]).toMatchObject({ title: "Current title", start: "" });
    expect(hooks.setterCalls[1]).toBe(1);
    expect(byId(render(), "event-title").props.value).toBe("Current title");
  });

  it("clears only edited start-date evidence while retaining the end control and evidence in stable order", async () => {
    const initial = render();
    const fileInput = nodes(initial).find((element) => element.type === "input" && element.props.type === "file");
    if (!fileInput) throw new Error("PDF picker missing from EventEditor");
    const file = new File(["synthetic PDF bytes"], "proposal.pdf", { type: "application/pdf" });
    (fileInput.props.onChange as (event: unknown) => void)({ currentTarget: { files: [file], value: "" } });
    (byText(render(), "button", "Generate Findings").props.onClick as () => void)();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const generated = render();
    const originalDateRows = byClass(generated, "event-date-grid").props.children as ElementLike[];
    const originalDateInputs = nodes(generated).filter((element) => ["event-start", "event-end"].includes(String(element.props.id)));
    expect(originalDateRows.map((row) => row.key)).toEqual(["start", "end"]);
    expect(originalDateRows.every((row) => row.props.className === "field")).toBe(true);
    expect(originalDateInputs.map((input) => [input.props.id, input.props.type])).toEqual([
      ["event-start", "datetime-local"],
      ["event-end", "datetime-local"],
    ]);
    expect(nodes(generated).some((element) => element.props.id === "proposal-feedback-start")).toBe(true);
    expect(renderToStaticMarkup(generated)).toContain("<q>2026-11-14T21:00:00.000Z</q>");

    (byId(generated, "event-start").props.onChange as (event: unknown) => void)({ target: { value: "2026-11-15T10:30" } });
    const edited = render();
    const editedDateRows = byClass(edited, "event-date-grid").props.children as ElementLike[];
    const editedDateInputs = nodes(edited).filter((element) => ["event-start", "event-end"].includes(String(element.props.id)));
    expect(editedDateRows.map((row) => row.key)).toEqual(["start", "end"]);
    expect(editedDateInputs.map((input) => [input.props.id, input.props.type])).toEqual([
      ["event-start", "datetime-local"],
      ["event-end", "datetime-local"],
    ]);
    expect(byId(edited, "event-start").props.value).toBe("2026-11-15T10:30");
    expect(byId(edited, "event-end").props.value).toBe("2026-11-15T05:00");
    expect(nodes(edited).some((element) => element.props.id === "proposal-feedback-start")).toBe(false);
    expect(nodes(edited).some((element) => element.props.id === "proposal-feedback-end")).toBe(true);
    expect(String(byId(edited, "event-end").props["aria-describedby"])).toContain("proposal-feedback-end");
    expect(renderToStaticMarkup(edited)).toContain("<q>2026-11-14T21:00:00.000Z</q>");
  });

  it("lets an organiser choose one text, date, or capacity alternative and retains only its exact evidence", async () => {
    const alternatives: PrivateExtraction = {
      ...extraction,
      facts: {
        ...extraction.facts,
        purpose: { status: "conflicting", alternatives: [
          { value: "You will explore robotics", evidence: [{ quote: "You will explore robotics.", page: 1 }] },
          { value: "This activity includes a design session", evidence: [{ quote: "This activity includes a design session.", page: 2 }] },
        ] },
        start: { status: "conflicting", alternatives: [
          { value: "2026-11-14T13:00:00.000Z", evidence: [{ quote: "14 November 2026, 09:00 PM SGT", page: 1 }] },
          { value: "2026-11-14T14:00:00.000Z", evidence: [{ quote: "14 November 2026, 10:00 PM SGT", page: 2 }] },
        ] },
        end: { status: "conflicting", alternatives: [
          { value: "2026-11-14T15:00:00.000Z", evidence: [{ quote: "14 November 2026, 11:00 PM SGT", page: 2 }] },
          { value: "2026-11-15T01:00:00.000Z", evidence: [{ quote: "15 November 2026, 09:00 AM SGT", page: 3 }] },
        ] },
        capacity: { status: "conflicting", alternatives: [
          { value: "80", evidence: [{ quote: "Capacity: 80", page: 1 }] },
          { value: "100", evidence: [{ quote: "Capacity: 100", page: 2 }] },
        ] },
      },
    };
    fetchMock.mockImplementationOnce(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body as FormData;
      const revisions = JSON.parse(String(body.get("revisions"))) as ProposalRevisions;
      return json({ ok: true, revisions, extraction: alternatives });
    });

    const initial = render();
    const fileInput = nodes(initial).find((element) => element.type === "input" && element.props.type === "file");
    if (!fileInput) throw new Error("PDF picker missing from EventEditor");
    const file = new File(["synthetic PDF bytes"], "proposal.pdf", { type: "application/pdf" });
    (fileInput.props.onChange as (event: unknown) => void)({ currentTarget: { files: [file], value: "" } });
    (byText(render(), "button", "Generate Findings").props.onClick as () => void)();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const generated = render();
    expect(byText(generated, "button", "Use 14/11/2026, 09:00 PM SGT")).toBeDefined();
    expect(byText(generated, "button", "Use 14/11/2026, 11:00 PM SGT")).toBeDefined();
    expect(byId(generated, "event-start").props.value).toBe("");
    const original = { ...(hooks.states[1] as EventFields) };

    (byText(generated, "button", "Use You will explore robotics").props.onClick as () => void)();
    expect(hooks.states[1]).toEqual({ ...original, description: "You will explore robotics" });
    expect(hooks.states[10]).toMatchObject({
      description: { status: "prefilled", generatedValue: "You will explore robotics", evidence: [{ quote: "You will explore robotics.", page: 1 }] },
      location: { status: "conflicting" },
      start: { status: "conflicting" },
      end: { status: "conflicting" },
      capacity: { status: "conflicting" },
    });
    expect(renderToStaticMarkup(render())).toContain("<q>You will explore robotics.</q>");

    let current = render();
    (byText(current, "button", "Use 14/11/2026, 09:00 PM SGT").props.onClick as () => void)();
    expect((hooks.states[1] as EventFields).start).toBe("2026-11-14T13:00:00.000Z");
    expect(hooks.states[10]).toMatchObject({ start: { status: "prefilled", generatedValue: "2026-11-14T13:00:00.000Z", evidence: [{ quote: "14 November 2026, 09:00 PM SGT", page: 1 }] }, end: { status: "conflicting" } });
    expect(byId(render(), "event-start").props.value).toBe("2026-11-14T21:00");

    current = render();
    (byText(current, "button", "Use 14/11/2026, 11:00 PM SGT").props.onClick as () => void)();
    expect((hooks.states[1] as EventFields).end).toBe("2026-11-14T15:00:00.000Z");
    expect(byId(render(), "event-end").props.value).toBe("2026-11-14T23:00");

    current = render();
    (byText(current, "button", "Use 80").props.onClick as () => void)();
    expect((hooks.states[1] as EventFields).capacity).toBe(80);
    expect(hooks.states[10]).toMatchObject({ capacity: { status: "prefilled", generatedValue: 80, evidence: [{ quote: "Capacity: 80", page: 1 }] }, location: { status: "conflicting" } });

    const selected = render();
    (byId(selected, "event-description").props.onChange as (event: unknown) => void)({ target: { value: "My manual description" } });
    expect(nodes(render()).some((element) => element.props.id === "proposal-feedback-description")).toBe(false);
    expect(nodes(render()).some((element) => element.props.id === "proposal-feedback-location")).toBe(true);
  });

  it("rejects stale alternative handlers and guards selection while an event action is in flight", async () => {
    const initial = render();
    const fileInput = nodes(initial).find((element) => element.type === "input" && element.props.type === "file");
    if (!fileInput) throw new Error("PDF picker missing from EventEditor");
    const file = new File(["synthetic PDF bytes"], "proposal.pdf", { type: "application/pdf" });
    (fileInput.props.onChange as (event: unknown) => void)({ currentTarget: { files: [file], value: "" } });
    (byText(render(), "button", "Generate Findings").props.onClick as () => void)();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const generated = render();
    const staleChoice = byText(generated, "button", "Use Innovation Hall").props.onClick as () => void;
    (byId(generated, "event-title").props.onChange as (event: unknown) => void)({ target: { value: "New manual title" } });
    staleChoice();
    expect((hooks.states[1] as EventFields).title).toBe("New manual title");
    expect((hooks.states[1] as EventFields).location).toBe("Current venue");
    expect(hooks.states[10]).toMatchObject({ location: { status: "conflicting" } });

    hooks.refs[2]!.current = true;
    const freshChoice = byText(render(), "button", "Use Innovation Hall").props.onClick as () => void;
    freshChoice();
    expect((hooks.states[1] as EventFields).location).toBe("Current venue");
    hooks.refs[2]!.current = false;
  });
});

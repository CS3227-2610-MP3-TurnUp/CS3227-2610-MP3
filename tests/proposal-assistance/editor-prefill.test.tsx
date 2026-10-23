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
import type { EventPreparationResponse } from "../../src/features/proposal-assistance/clarification";
import type { DraftRetentionStatus } from "../../src/lib/event-retention";
import { EventEditor } from "../../src/components/events/editor";

type ElementLike = { type: unknown; key?: string | null; props: Record<string, unknown> };

const savedFields: EventFields = { ...EMPTY_EVENT, title: "Current title", description: "Current description", location: "Current venue", fee: "Paid", openTo: "Current audience", capacity: 50 };
const view = { id: "event-1", version: 2, state: "DRAFT", fields: savedFields, published: null, preparation: null, retention: null };
const warningRetention: DraftRetentionStatus = {
  expiresAt: "2026-10-30T04:00:00.000Z",
  warningAt: "2026-10-23T04:00:00.000Z",
  warning: true,
  expired: false,
  disposition: "delete_draft",
};
const renewedRetention: DraftRetentionStatus = {
  expiresAt: "2026-11-23T04:00:00.000Z",
  warningAt: "2026-11-16T04:00:00.000Z",
  warning: false,
  expired: false,
  disposition: "delete_draft",
};
const preparation: EventPreparationResponse = {
  revision: 3,
  issues: [
    { field: "purpose", reason: "source_missing", alternatives: [], resolution: null },
    { field: "location", reason: "source_conflict", alternatives: [
      { value: "Innovation Hall", evidence: [{ quote: "Innovation Hall", page: 1 }] },
      { value: "Business School Foyer", evidence: [{ quote: "Business School Foyer", page: 1 }] },
    ], resolution: null },
  ],
};
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
  hooks.states = [view, { ...savedFields }, "editor", null, false, false, false, "", "", "", {}, {}, 0, 0];
  hooks.refs = [];
  hooks.stateIndex = 0;
  hooks.refIndex = 0;
  hooks.setterCalls = [];
  fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = init?.body as FormData;
    const revisions = JSON.parse(String(body.get("revisions"))) as ProposalRevisions;
    return json({ ok: true, revisions, eventVersion: 3, preparation, extraction, retention: renewedRetention });
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
    const componentName = (element.type as { name?: string }).name;
    if (componentName === "ProposalAssistance") {
      hooks.stateIndex = 14;
      hooks.refIndex = 8;
    } else if (componentName === "PublicContentAssistance") {
      hooks.stateIndex = 20;
      hooks.refIndex = 14;
    }
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
  it("refreshes retention after accepted extraction without replacing a newer working edit", async () => {
    hooks.states[0] = { ...view, retention: warningRetention };
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

    expect(renderToStaticMarkup(render())).toContain("Private draft expires soon");
    (byId(render(), "event-title").props.onChange as (event: unknown) => void)({ target: { value: "Newer local title" } });
    const body = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    const revisions = JSON.parse(String(body.get("revisions"))) as ProposalRevisions;
    resolveResponse(json({ ok: true, revisions, eventVersion: 3, preparation, extraction, retention: renewedRetention }));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect((hooks.states[0] as typeof view).retention).toEqual(renewedRetention);
    expect((hooks.states[1] as EventFields).title).toBe("Newer local title");
    expect(byId(render(), "event-title").props.value).toBe("Newer local title");
    expect(renderToStaticMarkup(render())).not.toContain("Private draft expires soon");
    expect(renderToStaticMarkup(render())).toContain("saved clarifications were refreshed");
  });

  it("shows the retention warning in owner views and leaves it out of public preview", () => {
    const published = { fields: savedFields, form: { formRevisionId: "form-1", questions: [] } };
    hooks.states[0] = { ...view, state: "PUBLISHED", published, retention: { ...warningRetention, disposition: "restore_publication" } };
    hooks.states[2] = "publication";
    let markup = renderToStaticMarkup(render());
    expect(markup).toContain("Private draft expires soon");
    expect(markup).toContain("current publication, event state, history, and registrations remain");

    hooks.states[2] = "preview";
    hooks.states[3] = { approvalId: "approval-1", version: 2, snapshot: published, digest: "digest" };
    markup = renderToStaticMarkup(render());
    expect(markup).toContain("Public Preview");
    expect(markup).not.toContain("Private draft expires soon");
    expect(markup).not.toContain("Save Draft or successfully process a proposal PDF");
  });

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
    expect(textOf(byId(updated, "proposal-feedback-description").props.children)).toContain("does not provide an event description");
    expect(textOf(byId(updated, "proposal-feedback-description").props.children)).toContain("Confirm this value");
    expect(textOf(byId(updated, "proposal-feedback-openTo").props.children)).toContain("No safe value");
    expect(markup).toContain("Save Draft");
    expect(markup).not.toContain("Apply to");

    const title = byId(updated, "event-title");
    (title.props.onChange as (event: unknown) => void)({ target: { value: "Manually edited title" } });
    const manuallyEdited = render();
    expect(byId(manuallyEdited, "event-title").props.value).toBe("Manually edited title");
    expect(nodes(manuallyEdited).some((element) => element.props.id === "proposal-feedback-title")).toBe(false);
  });

  it("keeps suggestion and manual confirmations local until Save Draft, then submits their exact intent", async () => {
    hooks.states[0] = { ...view, preparation, retention: warningRetention };
    const manualDescription = "  Cafe\u0301 Arts Hall  ";
    const canonicalDescription = "Café Arts Hall";
    hooks.states[1] = { ...savedFields, description: manualDescription };
    const savedPreparation: EventPreparationResponse = {
      revision: 4,
      issues: [
        { field: "purpose", reason: "source_missing", alternatives: [], confirmedValue: canonicalDescription, resolution: {
          method: "organiser", value: canonicalDescription, resolvedBy: "organiser-1", resolvedAt: "2026-10-23T03:00:00.000Z", evidence: [],
        } },
        { field: "location", reason: "source_conflict", alternatives: preparation.issues[1]!.alternatives, confirmedValue: "Innovation Hall", resolution: {
          method: "suggestion", value: "Innovation Hall", resolvedBy: "organiser-1", resolvedAt: "2026-10-23T03:00:00.000Z", evidence: [{ quote: "Innovation Hall", page: 1 }],
        } },
      ],
    };
    const savedFieldsAfterResolution = { ...savedFields, description: canonicalDescription, location: "Innovation Hall" };
    let submitted: Record<string, unknown> | undefined;
    fetchMock.mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        submitted = JSON.parse(String(init.body)) as Record<string, unknown>;
        return json({ ok: true });
      }
      return json({ ...view, version: 3, fields: savedFieldsAfterResolution, preparation: savedPreparation, retention: renewedRetention });
    });

    const initial = render();
    (byText(initial, "button", "Use Innovation Hall").props.onClick as () => void)();
    let updated = render();
    expect((hooks.states[1] as EventFields).location).toBe("Innovation Hall");
    expect(hooks.states[11]).toMatchObject({ location: { method: "suggestion", alternative: { value: "Innovation Hall", evidence: [{ quote: "Innovation Hall", page: 1 }] } } });
    expect(textOf(byId(updated, "proposal-feedback-location").props.children)).toContain("ready to save");
    expect(nodes(updated).some((element) => element.type === "button" && textOf(element.props.children) === "Use Innovation Hall")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();

    (byText(updated, "button", "Confirm this value").props.onClick as () => void)();
    updated = render();
    expect(hooks.states[11]).toMatchObject({ purpose: { method: "organiser" }, location: { method: "suggestion" } });
    expect(textOf(byId(updated, "proposal-feedback-description").props.children)).toContain("Your confirmation is ready to save");
    expect(byText(updated, "button", "Preview saved draft").props.disabled).toBe(true);
    expect(byText(updated, "button", "Save Draft").props.disabled).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();

    const form = nodes(updated).find((element) => element.type === "form");
    if (!form) throw new Error("Event editor form missing");
    (form.props.onSubmit as (event: unknown) => void)({ preventDefault: vi.fn() });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(submitted).toMatchObject({ action: "save", expectedVersion: 2, expectedPreparationRevision: 3, resolutions: [
      { field: "location", method: "suggestion", value: "Innovation Hall" },
      { field: "purpose", method: "organiser", value: canonicalDescription },
    ] });
    expect((submitted?.fields as EventFields).description).toBe(manualDescription);
    updated = render();
    expect((hooks.states[0] as typeof view).preparation).toEqual(savedPreparation);
    expect((hooks.states[0] as typeof view).retention).toEqual(renewedRetention);
    expect(renderToStaticMarkup(updated)).not.toContain("Private draft expires soon");
    expect(hooks.states[11]).toEqual({});
    expect(byText(updated, "button", "Preview saved draft").props.disabled).toBe(false);
    expect(textOf(byId(updated, "proposal-feedback-description").props.children)).toContain("Confirmed by you");
  });

  it("preserves a locally confirmed field during new extraction and requires review against the new issue", async () => {
    hooks.states[0] = { ...view, preparation };
    const newDescriptionEvidence = [{ quote: "A newly proposed description", page: 2 }];
    const newerExtraction: PrivateExtraction = {
      ...extraction,
      facts: { ...extraction.facts, purpose: { status: "known", value: "A newly proposed description", evidence: newDescriptionEvidence } },
    };
    const newerPreparation: EventPreparationResponse = {
      revision: 4,
      issues: [
        { field: "purpose", reason: "source_candidate", alternatives: [{ value: "A newly proposed description", evidence: newDescriptionEvidence }], resolution: null },
        preparation.issues[1]!,
      ],
    };
    fetchMock.mockImplementationOnce(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body as FormData;
      const revisions = JSON.parse(String(body.get("revisions"))) as ProposalRevisions;
      return json({ ok: true, revisions, eventVersion: 3, preparation: newerPreparation, extraction: newerExtraction });
    });

    let current = render();
    (byText(current, "button", "Confirm this value").props.onClick as () => void)();
    expect(hooks.states[11]).toMatchObject({ purpose: { method: "organiser" } });
    current = render();
    const fileInput = nodes(current).find((element) => element.type === "input" && element.props.type === "file");
    if (!fileInput) throw new Error("PDF picker missing from EventEditor");
    const file = new File(["synthetic PDF bytes"], "proposal.pdf", { type: "application/pdf" });
    (fileInput.props.onChange as (event: unknown) => void)({ currentTarget: { files: [file], value: "" } });
    (byText(render(), "button", "Generate Findings").props.onClick as () => void)();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    current = render();
    expect((hooks.states[1] as EventFields).description).toBe("Current description");
    expect(hooks.states[11]).toEqual({});
    expect((hooks.states[0] as typeof view).preparation).toEqual(newerPreparation);
    expect(textOf(byId(current, "proposal-feedback-description").props.children)).toContain("needs your confirmation");
    expect(textOf(byId(current, "proposal-feedback-description").props.children)).toContain("A newly proposed description");
  });

  it("blocks clarification choices and Save Draft while generation is in flight", async () => {
    hooks.states[0] = { ...view, preparation };
    let resolveResponse!: (response: Response) => void;
    fetchMock.mockImplementationOnce(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body as FormData;
      const revisions = JSON.parse(String(body.get("revisions"))) as ProposalRevisions;
      return await new Promise<Response>((resolve) => { resolveResponse = (response) => { void revisions; resolve(response); }; });
    });
    let current = render();
    const fileInput = nodes(current).find((element) => element.type === "input" && element.props.type === "file");
    if (!fileInput) throw new Error("PDF picker missing from EventEditor");
    const file = new File(["synthetic PDF bytes"], "proposal.pdf", { type: "application/pdf" });
    (fileInput.props.onChange as (event: unknown) => void)({ currentTarget: { files: [file], value: "" } });
    current = render();
    const staleChoice = byText(current, "button", "Use Innovation Hall").props.onClick as () => void;
    const staleConfirm = byText(current, "button", "Confirm this value").props.onClick as () => void;
    (byText(render(), "button", "Generate Findings").props.onClick as () => void)();

    expect(hooks.states[12]).toBe(1);
    current = render();
    const choice = byText(current, "button", "Use Innovation Hall");
    const confirm = byText(current, "button", "Confirm this value");
    expect(choice.props.disabled).toBe(true);
    expect(confirm.props.disabled).toBe(true);
    expect(byText(current, "button", "Save Draft").props.disabled).toBe(true);
    staleChoice();
    staleConfirm();
    (choice.props.onClick as () => void)();
    (confirm.props.onClick as () => void)();
    expect(hooks.states[11]).toEqual({});
    expect((hooks.states[1] as EventFields).location).toBe("Current venue");

    const form = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    const revisions = JSON.parse(String(form.get("revisions"))) as ProposalRevisions;
    resolveResponse(json({ ok: true, revisions, eventVersion: 3, preparation, extraction }));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(hooks.states[12]).toBe(0);
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
    expect(hooks.setterCalls[13]).toBe(1);

    const form = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    const revisions = JSON.parse(String(form.get("revisions"))) as ProposalRevisions;
    resolveResponse(json({ ok: true, revisions, eventVersion: 3, preparation, extraction }));
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
      const alternativePreparation: EventPreparationResponse = {
        revision: 4,
        issues: [
          { field: "purpose", reason: "source_conflict", alternatives: alternatives.facts.purpose?.status === "conflicting" ? alternatives.facts.purpose.alternatives : [], resolution: null },
          { field: "location", reason: "source_conflict", alternatives: extraction.facts.location?.status === "conflicting" ? extraction.facts.location.alternatives : [], resolution: null },
          { field: "start", reason: "source_conflict", alternatives: alternatives.facts.start?.status === "conflicting" ? alternatives.facts.start.alternatives : [], resolution: null },
          { field: "end", reason: "source_conflict", alternatives: alternatives.facts.end?.status === "conflicting" ? alternatives.facts.end.alternatives : [], resolution: null },
          { field: "capacity", reason: "source_conflict", alternatives: alternatives.facts.capacity?.status === "conflicting" ? alternatives.facts.capacity.alternatives : [], resolution: null },
        ],
      };
      return json({ ok: true, revisions, eventVersion: 3, preparation: alternativePreparation, extraction: alternatives });
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
    expect(hooks.states[11]).toMatchObject({
      purpose: { method: "suggestion", alternative: { value: "You will explore robotics", evidence: [{ quote: "You will explore robotics.", page: 1 }] } },
    });
    expect(renderToStaticMarkup(render())).toContain("<q>You will explore robotics.</q>");
    expect(nodes(render()).some((element) => element.type === "button" && textOf(element.props.children).includes("Use You will explore robotics"))).toBe(false);

    let current = render();
    (byText(current, "button", "Use 14/11/2026, 09:00 PM SGT").props.onClick as () => void)();
    expect((hooks.states[1] as EventFields).start).toBe("2026-11-14T13:00:00.000Z");
    expect(hooks.states[11]).toMatchObject({ start: { method: "suggestion", alternative: { value: "2026-11-14T13:00:00.000Z", evidence: [{ quote: "14 November 2026, 09:00 PM SGT", page: 1 }] } } });
    expect(byId(render(), "event-start").props.value).toBe("2026-11-14T21:00");

    current = render();
    (byText(current, "button", "Use 14/11/2026, 11:00 PM SGT").props.onClick as () => void)();
    expect((hooks.states[1] as EventFields).end).toBe("2026-11-14T15:00:00.000Z");
    expect(byId(render(), "event-end").props.value).toBe("2026-11-14T23:00");

    current = render();
    (byText(current, "button", "Use 80").props.onClick as () => void)();
    expect((hooks.states[1] as EventFields).capacity).toBe(80);
    expect(hooks.states[11]).toMatchObject({ capacity: { method: "suggestion", alternative: { value: "80", evidence: [{ quote: "Capacity: 80", page: 1 }] } } });

    const selected = render();
    (byId(selected, "event-description").props.onChange as (event: unknown) => void)({ target: { value: "My manual description" } });
    expect(nodes(render()).some((element) => element.props.id === "proposal-feedback-description")).toBe(true);
    expect(textOf(byId(render(), "proposal-feedback-description").props.children)).toContain("gives conflicting event descriptions");
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
    expect(hooks.states[11]).toEqual({});

    hooks.refs[2]!.current = true;
    const freshChoice = byText(render(), "button", "Use Innovation Hall").props.onClick as () => void;
    freshChoice();
    expect((hooks.states[1] as EventFields).location).toBe("Current venue");
    hooks.refs[2]!.current = false;
  });
});

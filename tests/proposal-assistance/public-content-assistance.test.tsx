import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const hooks = vi.hoisted(() => ({
  states: [] as unknown[],
  refs: [] as Array<{ current: unknown }>,
  stateIndex: 0,
  refIndex: 0,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: <T,>(initial: T | (() => T)) => {
      const index = hooks.stateIndex++;
      if (!(index in hooks.states)) hooks.states[index] = typeof initial === "function" ? (initial as () => T)() : initial;
      const setState = (next: T | ((previous: T) => T)) => {
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

import { EMPTY_EVENT, type EventFields } from "../../src/lib/event-fields";
import type { PublicCandidatesResponse } from "../../src/features/proposal-assistance/public-candidates";
import { PublicContentAssistance } from "../../src/components/events/public-content-assistance";

type ElementLike = { type: unknown; props: Record<string, unknown> };
type Snapshot = {
  eventVersion: number;
  preparationRevision: number;
  editorRevision: number;
  dirty: boolean;
  unresolvedCount: number;
  editorActionPending: boolean;
  assistancePending: boolean;
  state: string;
  previousPublishedStart?: string;
  fields: EventFields;
};

const savedFields: EventFields = {
  ...EMPTY_EVENT,
  title: "Campus Arts Night",
  description: "Saved event description",
  start: "2027-11-14T11:00:00.000Z",
  end: "2027-11-14T13:00:00.000Z",
  location: "Innovation Hall",
  capacity: 80,
  fee: "Free entry",
  openTo: "Students",
  preparation: "Bring a student card",
  other: "Saved FAQ",
};

const result: PublicCandidatesResponse = {
  ok: true,
  eventVersion: 4,
  preparationRevision: 2,
  candidates: {
    answeredFaqs: [{ question: "Is there an entry fee?", answer: "Free entry", references: [{ field: "fee", quote: "Free entry" }] }],
    unansweredQuestions: ["Will refreshments be served?"],
    renderedOther: "Q: Is there an entry fee?\nA: Free entry",
  },
};

let snapshot: Snapshot;
let fetchMock: ReturnType<typeof vi.fn>;
type ApplyCandidate = (field: "other", value: string, version: number, prep: number, revision: number, oldValue: string) => boolean;
let onApply: Mock<ApplyCandidate>;
let onGenerationPending: Mock<(delta: 1 | -1) => void>;
let props: Parameters<typeof PublicContentAssistance>[0];

beforeEach(() => {
  hooks.states = [];
  hooks.refs = [];
  hooks.stateIndex = 0;
  hooks.refIndex = 0;
  snapshot = {
    eventVersion: 4,
    preparationRevision: 2,
    editorRevision: 7,
    dirty: false,
    unresolvedCount: 0,
    editorActionPending: false,
    assistancePending: false,
    state: "DRAFT",
    previousPublishedStart: undefined,
    fields: { ...savedFields },
  };
  fetchMock = vi.fn(async () => json(result));
  onApply = vi.fn<ApplyCandidate>((field, value, version, prep, revision, oldValue) => {
    if (snapshot.eventVersion !== version || snapshot.preparationRevision !== prep || snapshot.editorRevision !== revision || snapshot.fields[field] !== oldValue) return false;
    snapshot.fields = { ...snapshot.fields, [field]: value };
    snapshot.editorRevision += 1;
    snapshot.dirty = true;
    return true;
  });
  onGenerationPending = vi.fn<(delta: 1 | -1) => void>();
  props = {
    eventId: "event-7",
    eventVersion: 4,
    preparationRevision: 2,
    editorActionPending: false,
    assistancePending: false,
    getCurrentSnapshot: () => snapshot,
    onGenerationPending,
    onApply,
  };
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("window", { confirm: vi.fn(() => true) });
});

afterEach(() => vi.unstubAllGlobals());

function render() {
  hooks.stateIndex = 0;
  hooks.refIndex = 0;
  return PublicContentAssistance(props);
}

function nodes(root: unknown): ElementLike[] {
  if (Array.isArray(root)) return root.flatMap(nodes);
  if (typeof root !== "object" || root === null || !("type" in root) || !("props" in root)) return [];
  const element = root as ElementLike;
  if (typeof element.type === "function") return nodes((element.type as (props: Record<string, unknown>) => unknown)(element.props));
  return [element, ...nodes(element.props.children)];
}

function byText(root: unknown, type: string, expected: string): ElementLike {
  const found = nodes(root).find((element) => element.type === type && textOf(element.props.children) === expected);
  if (!found) throw new Error("Could not find <" + type + "> with text " + expected);
  return found;
}

function byId(root: unknown, id: string): ElementLike {
  const found = nodes(root).find((element) => element.props.id === id);
  if (!found) throw new Error("Could not find element with id " + id);
  return found;
}

function textOf(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textOf).join("");
  if (typeof value === "object" && value !== null && "props" in value) return textOf((value as ElementLike).props.children);
  return "";
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function generate() {
  (byText(render(), "button", "Generate FAQ suggestions").props.onClick as () => void)();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("PublicContentAssistance", () => {
  it("disables generation unless the saved draft is complete, clean, resolved, and idle", () => {
    let root = render();
    expect(byText(root, "button", "Generate FAQ suggestions").props.disabled).toBe(false);

    snapshot.dirty = true;
    root = render();
    expect(byText(root, "button", "Generate FAQ suggestions").props.disabled).toBe(true);
    snapshot.dirty = false;
    snapshot.unresolvedCount = 1;
    root = render();
    expect(byText(root, "button", "Generate FAQ suggestions").props.disabled).toBe(true);
    snapshot.unresolvedCount = 0;
    snapshot.fields.capacity = null;
    root = render();
    expect(byText(root, "button", "Generate FAQ suggestions").props.disabled).toBe(true);
    snapshot.fields.capacity = 80;
    snapshot.assistancePending = true;
    root = render();
    expect(byText(root, "button", "Generate FAQ suggestions").props.disabled).toBe(true);
    snapshot.assistancePending = false;

    snapshot.state = "DRAFT";
    snapshot.fields.start = "2026-10-22T11:00:00.000Z";
    snapshot.fields.end = "2026-10-22T13:00:00.000Z";
    root = render();
    expect(byText(root, "button", "Generate FAQ suggestions").props.disabled).toBe(true);
    snapshot.state = "PUBLISHED";
    snapshot.previousPublishedStart = snapshot.fields.start;
    root = render();
    expect(byText(root, "button", "Generate FAQ suggestions").props.disabled).toBe(false);
    snapshot.previousPublishedStart = "2027-11-14T11:00:00.000Z";
    root = render();
    expect(byText(root, "button", "Generate FAQ suggestions").props.disabled).toBe(true);
    snapshot.state = "WITHDRAWN";
    root = render();
    expect(byText(root, "button", "Generate FAQ suggestions").props.disabled).toBe(true);

    (byText(root, "button", "Generate FAQ suggestions").props.onClick as () => void)();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rechecks the live editor busy state in a previously rendered Generate handler", () => {
    const handler = byText(render(), "button", "Generate FAQ suggestions").props.onClick as () => void;
    snapshot.assistancePending = true;
    handler();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onGenerationPending).not.toHaveBeenCalled();

    snapshot.assistancePending = false;
    const nextHandler = byText(render(), "button", "Generate FAQ suggestions").props.onClick as () => void;
    snapshot.editorActionPending = true;
    nextHandler();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onGenerationPending).not.toHaveBeenCalled();
  });

  it("posts only saved revisions and changes neither description nor Other before Apply", async () => {
    await generate();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/organiser/events/event-7/public-candidates");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ expectedVersion: 4, expectedPreparationRevision: 2 });
    expect(Object.keys(JSON.parse(String(init.body))).sort()).toEqual(["expectedPreparationRevision", "expectedVersion"]);
    expect(onGenerationPending.mock.calls).toEqual([[1], [-1]]);
    expect(onApply).not.toHaveBeenCalled();
    expect(snapshot.fields).toEqual(savedFields);

    const updated = render();
    expect(byId(updated, "public-other-candidate").props.value).toBe("Q: Is there an entry fee?\nA: Free entry");
    expect(nodes(updated).some((node) => node.props.id === "public-description-candidate")).toBe(false);
    expect(nodes(updated).some((node) => node.type === "button" && textOf(node.props.children).includes("Apply description"))).toBe(false);
    expect(nodes(updated).some((node) => node.props.id === "public-faq-answer-0")).toBe(true);
    expect(String(byId(updated, "public-other-candidate").props.value)).not.toContain("Will refreshments be served?");
    expect(textOf(byId(updated, "public-other-title").props.children)).toBe("FAQ / Other suggestion");
  });

  it("shows an all-unanswered explanation and never applies blank or whitespace-only Other", async () => {
    fetchMock.mockImplementation(async () => json({
      ...result,
      candidates: { answeredFaqs: [], unansweredQuestions: ["Will refreshments be served?"], renderedOther: "" },
    }));
    await generate();
    let updated = render();
    expect(nodes(updated).some((node) => node.props.role === "status" && textOf(node.props.children).includes("No supported answers were found"))).toBe(true);
    expect(byId(updated, "public-other-candidate").props.value).toBe("");
    let apply = byText(updated, "button", "Apply FAQ / Other to working form");
    expect(apply.props.disabled).toBe(true);
    (apply.props.onClick as () => void)();
    expect(onApply).not.toHaveBeenCalled();
    expect(snapshot.fields.other).toBe("Saved FAQ");

    (byId(updated, "public-other-candidate").props.onChange as (event: unknown) => void)({ target: { value: "  \n " } });
    updated = render();
    apply = byText(updated, "button", "Apply FAQ / Other to working form");
    (apply.props.onClick as () => void)();
    updated = render();
    expect(onApply).not.toHaveBeenCalled();
    expect(snapshot.fields.other).toBe("Saved FAQ");
    expect(textOf(nodes(updated).find((node) => node.props.role === "alert")?.props.children)).toContain("Enter some faq / other text");
  });

  it("keeps unanswered questions separate until an organiser answers and explicitly adds one", async () => {
    fetchMock.mockImplementation(async () => json({
      ...result,
      candidates: { ...result.candidates, answeredFaqs: [], renderedOther: "" },
    }));
    await generate();
    let updated = render();
    expect(String(byId(updated, "public-other-candidate").props.value)).not.toContain("Will refreshments be served?");

    (byId(updated, "public-faq-answer-0").props.onChange as (event: unknown) => void)({ target: { value: "Refreshments will be available." } });
    updated = render();
    (byText(updated, "button", "Add answered question to FAQ / Other suggestion").props.onClick as () => void)();
    updated = render();
    const other = String(byId(updated, "public-other-candidate").props.value);
    expect(other).toContain("Q: Will refreshments be served?");
    expect(other).toContain("A: Refreshments will be available.");
    expect(snapshot.fields.other).toBe("Saved FAQ");
    expect(onApply).not.toHaveBeenCalled();
    expect(byText(updated, "button", "Apply FAQ / Other to working form").props.disabled).toBe(false);
    (byText(updated, "button", "Apply FAQ / Other to working form").props.onClick as () => void)();
    expect(snapshot.fields.other).toBe("Q: Will refreshments be served?\nA: Refreshments will be available.");
    expect(snapshot.fields.description).toBe(savedFields.description);
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("confirms replacement and applies Other only; normal saving remains a separate action", async () => {
    await generate();
    const confirm = vi.mocked(window.confirm);
    confirm.mockReturnValueOnce(false);
    let updated = render();
    (byText(updated, "button", "Apply FAQ / Other to working form").props.onClick as () => void)();
    expect(onApply).not.toHaveBeenCalled();
    expect(snapshot.fields.other).toBe("Saved FAQ");

    confirm.mockReturnValue(true);
    updated = render();
    (byText(updated, "button", "Apply FAQ / Other to working form").props.onClick as () => void)();
    expect(snapshot.fields.other).toBe("Q: Is there an entry fee?\nA: Free entry");
    expect(snapshot.fields.description).toBe(savedFields.description);
    expect(snapshot.fields.title).toBe(savedFields.title);
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0]?.[0]).toBe("other");
    expect(snapshot.dirty).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    updated = render();
    expect(byText(updated, "button", "FAQ / Other applied to working form").props.disabled).toBe(true);
  });

  it("rejects an oversized candidate using Other and combined public-field bounds", async () => {
    await generate();
    let updated = render();
    (byId(updated, "public-other-candidate").props.onChange as (event: unknown) => void)({ target: { value: "x".repeat(4_001) } });
    updated = render();
    (byText(updated, "button", "Apply FAQ / Other to working form").props.onClick as () => void)();
    updated = render();
    expect(onApply).not.toHaveBeenCalled();
    expect(textOf(nodes(updated).find((node) => node.props.role === "alert")?.props.children)).toContain("4,000 characters");
    expect(snapshot.fields.other).toBe("Saved FAQ");
  });

  it("includes the unchanged description and other saved fields in the combined UTF-8 bound", async () => {
    snapshot.fields = {
      ...snapshot.fields,
      title: "😀".repeat(150),
      description: "😀".repeat(4_000),
      location: "😀".repeat(1_000),
      fee: "😀".repeat(500),
      openTo: "😀".repeat(1_000),
      preparation: "😀".repeat(2_000),
      other: "",
    };
    fetchMock.mockImplementation(async () => json({
      ...result,
      candidates: { ...result.candidates, renderedOther: "😀".repeat(4_000) },
    }));
    await generate();
    let updated = render();
    (byText(updated, "button", "Apply FAQ / Other to working form").props.onClick as () => void)();
    updated = render();
    expect(onApply).not.toHaveBeenCalled();
    expect(snapshot.fields.description).toBe("😀".repeat(4_000));
    expect(snapshot.fields.other).toBe("");
    expect(textOf(nodes(updated).find((node) => node.props.role === "alert")?.props.children)).toContain("combined public event text");
  });

  it("rejects stale application after the saved Description changes after generation", async () => {
    await generate();
    snapshot.fields.description = "A newer saved description";
    snapshot.editorRevision += 1;
    let updated = render();
    (byText(updated, "button", "Apply FAQ / Other to working form").props.onClick as () => void)();
    updated = render();
    expect(onApply).not.toHaveBeenCalled();
    expect(snapshot.fields.other).toBe("Saved FAQ");
    expect(snapshot.fields.description).toBe("A newer saved description");
    expect(textOf(nodes(updated).find((node) => node.props.role === "alert")?.props.children)).toContain("working fields changed");
  });

  it("rejects a delayed response after the editor changes and preserves the newer input", async () => {
    let resolveResponse!: (value: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => { resolveResponse = resolve; }));
    (byText(render(), "button", "Generate FAQ suggestions").props.onClick as () => void)();
    await Promise.resolve();
    snapshot.fields.location = "Newer local venue";
    snapshot.editorRevision += 1;
    snapshot.dirty = true;
    resolveResponse(json(result));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const updated = render();
    expect(nodes(updated).some((node) => node.props.id === "public-other-candidate")).toBe(false);
    expect(snapshot.fields.location).toBe("Newer local venue");
    expect(onApply).not.toHaveBeenCalled();
    expect(textOf(nodes(updated).find((node) => node.props.className === "notice")?.props.children)).toContain("changed while suggestions were being prepared");
  });

  it("reports generation failure without changing event fields", async () => {
    fetchMock.mockImplementation(async () => json({ ok: false, outcome: "unavailable" }, 503));
    const before = { ...snapshot.fields };
    await generate();
    expect(snapshot.fields).toEqual(before);
    expect(onApply).not.toHaveBeenCalled();
    expect(nodes(render()).some((node) => node.props.role === "alert")).toBe(true);
  });

  it("dismisses suggestions without changing original event fields", async () => {
    await generate();
    const updated = render();
    (byText(updated, "button", "Dismiss suggestions").props.onClick as () => void)();
    const dismissed = render();
    expect(nodes(dismissed).some((node) => node.props.id === "public-other-candidate")).toBe(false);
    expect(snapshot.fields).toEqual(savedFields);
    expect(onApply).not.toHaveBeenCalled();
  });
});

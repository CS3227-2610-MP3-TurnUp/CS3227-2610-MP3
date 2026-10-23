import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { renderToStaticMarkup } from "react-dom/server";
import { EMPTY_EVENT, type EventFields } from "../../src/lib/event-fields";
import type { PrivateExtraction, ProposalRevisions } from "../../src/features/proposal-assistance/types";
import type { ProposalFeedbackMap } from "../../src/features/proposal-assistance/event-prefill";
import type { EventPreparationResponse } from "../../src/features/proposal-assistance/clarification";
import type { DraftRetentionStatus } from "../../src/lib/event-retention";
import { MAX_PROPOSAL_PDF_BYTES } from "../../src/features/proposal-assistance/limits";
import { ProposalAssistance } from "../../src/components/events/proposal-assistance";

type ElementLike = { type: unknown; props: Record<string, unknown> };
type Props = Parameters<typeof ProposalAssistance>[0];

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
  privateFindings: ["Confirm the final venue with the organiser."],
  completeness: "incomplete",
  incompleteReasons: ["unprocessed_fields"],
  unprocessedFields: ["openTo"],
  technicalIssues: 0,
};

let props: Props;
let editorRevision: number;
let onPrefill: ReturnType<typeof vi.fn<(values: Partial<EventFields>, feedback: ProposalFeedbackMap) => void>>;
let onServerPreparation: ReturnType<typeof vi.fn<(eventVersion: number, preparation: EventPreparationResponse, retention?: DraftRetentionStatus | null) => void>>;
let onGenerationPending: ReturnType<typeof vi.fn<(delta: 1 | -1) => void>>;
let onClearFeedback: ReturnType<typeof vi.fn<() => void>>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  hooks.states = [];
  hooks.refs = [];
  hooks.stateIndex = 0;
  hooks.refIndex = 0;
  editorRevision = 0;
  onPrefill = vi.fn<(values: Partial<EventFields>, feedback: ProposalFeedbackMap) => void>();
  onServerPreparation = vi.fn<(eventVersion: number, preparation: EventPreparationResponse, retention?: DraftRetentionStatus | null) => void>();
  onGenerationPending = vi.fn<(delta: 1 | -1) => void>();
  onClearFeedback = vi.fn<() => void>();
  props = {
    eventId: "event-1",
    eventVersion: 1,
    preparationRevision: 0,
    eventBusy: false,
    generationBusy: false,
    preserveFields: new Set(),
    currentEditorRevision: () => editorRevision,
    onPrefill,
    onServerPreparation,
    onGenerationPending,
    onClearFeedback,
  };
  fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const form = init?.body as FormData;
    const received = JSON.parse(String(form.get("revisions"))) as ProposalRevisions;
    return json({ ok: true, revisions: received, eventVersion: props.eventVersion + 1, preparation: null, extraction, retention: {
      expiresAt: "2026-11-23T04:00:00.000Z",
      warningAt: "2026-11-16T04:00:00.000Z",
      warning: false,
      expired: false,
      disposition: "delete_draft",
    } satisfies DraftRetentionStatus });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

function render() {
  hooks.stateIndex = 0;
  hooks.refIndex = 0;
  return ProposalAssistance(props);
}

function nodes(root: unknown): ElementLike[] {
  if (Array.isArray(root)) return root.flatMap(nodes);
  if (typeof root !== "object" || root === null || !("type" in root) || !("props" in root)) return [];
  const element = root as ElementLike;
  if (typeof element.type === "function") return nodes((element.type as (props: Record<string, unknown>) => unknown)(element.props));
  return [element, ...nodes(element.props.children)];
}

function nodeByText(root: unknown, type: string, text: string): ElementLike {
  const found = nodes(root).find((element) => element.type === type && childText(element.props.children) === text);
  if (!found) throw new Error(`Could not find <${type}> with text ${text}`);
  return found;
}

function childText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(childText).join("");
  if (typeof value === "object" && value !== null && "props" in value) return childText((value as ElementLike).props.children);
  return "";
}

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { "Content-Type": "application/json" } });
}

function selectPdf(root: unknown, name = "synthetic.pdf", size = new TextEncoder().encode("synthetic PDF bytes").byteLength) {
  const input = nodes(root).find((element) => element.type === "input" && element.props.type === "file");
  if (!input) throw new Error("PDF picker not rendered");
  const file = new File([new Uint8Array(size)], name, { type: "application/pdf" });
  const currentTarget = { files: [file], value: `C:\\fakepath\\${name}` };
  (input.props.onChange as (event: unknown) => void)({ currentTarget });
  return currentTarget;
}

function startGenerate(root: unknown) {
  const button = nodeByText(root, "button", "Generate Findings");
  (button.props.onClick as () => void)();
}

async function generate(root: unknown) {
  startGenerate(root);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("ProposalAssistance component", () => {
  it("exposes one accessible file chooser/status and file selection alone makes no request", () => {
    const initial = render();
    const markup = renderToStaticMarkup(initial);
    expect(markup).toContain("Selecting a file sends nothing");
    expect(markup).toContain("Generate Findings");
    expect(markup.match(/No file chosen/g)).toHaveLength(1);
    expect(markup).not.toContain("Choose File");
    expect(fetchMock).not.toHaveBeenCalled();
    const choose = nodeByText(initial, "button", "Choose PDF");
    const status = nodes(initial).find((element) => element.props.id === "proposal-file-status");
    expect(choose.props["aria-describedby"]).toBe("proposal-file-status");
    expect(status?.props.role).toBe("status");
    expect(status?.props["aria-live"]).toBe("polite");
    expect(nodes(initial).find((element) => element.type === "input" && element.props.type === "file")?.props["aria-hidden"]).toBe("true");

    const selected = selectPdf(initial);
    expect(selected.value).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
    let selectedMarkup = renderToStaticMarkup(render());
    expect(selectedMarkup).toContain("synthetic.pdf (0.00 MB)");
    expect(selectedMarkup).not.toContain("Selected:");
    expect(selectedMarkup).not.toContain("No file chosen");
    expect(nodeByText(render(), "button", "Generate Findings").props.disabled).toBe(false);

    const sameFileReselected = selectPdf(render(), "synthetic.pdf");
    expect(sameFileReselected.value).toBe("");
    expect(renderToStaticMarkup(render())).toContain("synthetic.pdf (0.00 MB)");

    const replacement = selectPdf(render(), "A very long replacement proposal filename that should wrap safely.pdf");
    expect(replacement.value).toBe("");
    selectedMarkup = renderToStaticMarkup(render());
    expect(selectedMarkup).toContain("A very long replacement proposal filename that should wrap safely.pdf (0.00 MB)");
    expect(selectedMarkup).not.toContain("synthetic.pdf (0.00 MB)");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves the current selected proposal and findings when replacement is canceled", async () => {
    selectPdf(render(), "current-proposal.pdf");
    await generate(render());
    const current = render();
    const input = nodes(current).find((element) => element.type === "input" && element.props.type === "file");
    if (!input) throw new Error("PDF input not rendered");
    const inputRef = hooks.refs[0] as { current: unknown };
    const click = vi.fn();
    inputRef.current = { click };

    (nodeByText(current, "button", "Choose PDF").props.onClick as () => void)();
    expect(click).toHaveBeenCalledOnce();
    const canceledSelection = { files: [], value: "C:\\fakepath\\current-proposal.pdf" };
    (input.props.onChange as (event: unknown) => void)({ currentTarget: canceledSelection });
    expect(canceledSelection.value).toBe("");
    const afterCancel = renderToStaticMarkup(render());
    expect(afterCancel).toContain("current-proposal.pdf (0.00 MB)");
    expect(afterCancel).toContain("Private findings");
    expect(onPrefill).toHaveBeenCalledOnce();
    expect(onClearFeedback).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("reports oversized PDFs accessibly and does not upload them", () => {
    selectPdf(render(), "too-large.pdf", MAX_PROPOSAL_PDF_BYTES + 1);
    const tree = render();
    const markup = renderToStaticMarkup(tree);
    expect(markup).toContain("No file chosen");
    expect(markup).toContain("Choose a PDF no larger than 4 MB.");
    expect(nodeByText(tree, "button", "Generate Findings").props.disabled).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prefills known findings together and shows non-applied findings as field feedback", async () => {
    selectPdf(render());
    await generate(render());
    expect(fetchMock).toHaveBeenCalledOnce();
    const submitted = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    expect(submitted.get("expectedPreparationRevision")).toBe("0");
    expect(onPrefill).toHaveBeenCalledOnce();
    expect(onServerPreparation).toHaveBeenCalledWith(2, null, {
      expiresAt: "2026-11-23T04:00:00.000Z",
      warningAt: "2026-11-16T04:00:00.000Z",
      warning: false,
      expired: false,
      disposition: "delete_draft",
    });
    expect(onGenerationPending.mock.calls).toEqual([[1], [-1]]);
    expect(onPrefill).toHaveBeenCalledWith({
      title: "Campus Arts Night",
      start: "2026-11-14T11:00:00.000Z",
      end: "2026-11-14T21:00:00.000Z",
      capacity: 80,
      fee: "Free entry",
      preparation: "Bring your student card",
    }, expect.objectContaining({
      title: expect.objectContaining({ status: "prefilled" }),
      description: { status: "missing" },
      location: expect.objectContaining({ status: "conflicting" }),
      openTo: { status: "unprocessed" },
    }));

    const tree = render();
    const markup = renderToStaticMarkup(tree);
    expect(markup).toContain("Private findings");
    expect(markup).toContain("Confirm the final venue with the organiser.");
    expect(markup).not.toContain("Apply to");
    expect(markup).not.toContain("datetime-local");
    expect(onClearFeedback).toHaveBeenCalled();
  });

  it("keeps Generate blocked during event save and rejects late results after an editor change", async () => {
    selectPdf(render());
    await generate(render());
    expect(onPrefill).toHaveBeenCalledOnce();

    props = { ...props, eventBusy: true };
    const busyButton = nodeByText(render(), "button", "Generate Findings");
    expect(busyButton.props.disabled).toBe(true);
    expect(nodeByText(render(), "button", "Choose PDF").props.disabled).toBe(true);
    expect(nodes(render()).find((element) => element.type === "input" && element.props.type === "file")?.props.disabled).toBe(true);
    expect(nodeByText(render(), "button", "Remove proposal").props.disabled).toBe(true);
    (busyButton.props.onClick as () => void)();
    expect(fetchMock).toHaveBeenCalledOnce();

    props = { ...props, eventBusy: false };
    let resolveResponse!: (response: Response) => void;
    fetchMock.mockImplementationOnce(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const form = init?.body as FormData;
      const received = JSON.parse(String(form.get("revisions"))) as ProposalRevisions;
      return await new Promise<Response>((resolve) => { resolveResponse = (response) => { void received; resolve(response); }; });
    });
    startGenerate(render());
    expect(nodeByText(render(), "button", "Choose PDF").props.disabled).toBe(true);
    expect(nodes(render()).find((element) => element.type === "input" && element.props.type === "file")?.props.disabled).toBe(true);
    expect(nodeByText(render(), "button", "Remove proposal").props.disabled).toBe(true);
    editorRevision += 1;
    const form = fetchMock.mock.calls[1]?.[1]?.body as FormData;
    const received = JSON.parse(String(form.get("revisions"))) as ProposalRevisions;
    resolveResponse(json({ ok: true, revisions: received, eventVersion: props.eventVersion + 1, preparation: null, extraction }));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(onPrefill).toHaveBeenCalledOnce();
    expect(onServerPreparation).toHaveBeenCalledTimes(2);
    expect(onGenerationPending.mock.calls).toEqual([[1], [-1], [1], [-1]]);
    expect(renderToStaticMarkup(render())).toContain("proposal or event changed while findings were being generated");
  });

  it("clears only transient evidence on source removal and preserves generated field values", async () => {
    selectPdf(render());
    await generate(render());
    const remove = nodeByText(render(), "button", "Remove proposal");
    (remove.props.onClick as () => void)();
    const markup = renderToStaticMarkup(render());
    expect(markup).not.toContain("Private findings");
    expect(markup).toContain("No file chosen");
    expect(markup).not.toContain("synthetic.pdf");
    expect(onPrefill).toHaveBeenCalledOnce();
    expect(onClearFeedback).toHaveBeenCalledTimes(3);
  });
});

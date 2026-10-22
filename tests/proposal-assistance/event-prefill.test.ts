import { describe, expect, it } from "vitest";
import { formatEventAlternative, prepareEventAlternative, prepareEventPrefill } from "../../src/features/proposal-assistance/event-prefill";
import type { PrivateExtraction, ProposalField, ProposalFinding } from "../../src/features/proposal-assistance/types";

const quote = (value: string) => [{ quote: value, page: 1 }];
const known = (value: string): ProposalFinding => ({ status: "known", value, evidence: quote(value) });

function extraction(facts: Partial<Record<ProposalField, ProposalFinding>>): PrivateExtraction {
  return {
    facts,
    privateFindings: [],
    completeness: "incomplete",
    incompleteReasons: ["unprocessed_fields"],
    unprocessedFields: [],
    technicalIssues: 0,
  };
}

describe("Event Creation prefill adapter", () => {
  it("batches known supported text, capacity and complete offset date-times into event fields", () => {
    const result = prepareEventPrefill(extraction({
      title: known("Campus Orchestra Night"),
      purpose: known("Play film music together"),
      start: known("2028-02-29T00:30:00.000+01:00"),
      end: known("2028-03-01T21:00:00.000Z"),
      location: known("Hall 4"),
      capacity: known("80"),
      feeStatus: known("$10"),
      openTo: known("All students"),
      preparation: known("Bring a student card"),
    }));
    expect(result.values).toEqual({
      title: "Campus Orchestra Night",
      description: "Play film music together",
      start: "2028-02-28T23:30:00.000Z",
      end: "2028-03-01T21:00:00.000Z",
      location: "Hall 4",
      capacity: 80,
      fee: "$10",
      openTo: "All students",
      preparation: "Bring a student card",
    });
    expect(result.feedback.title).toEqual({ status: "prefilled", generatedValue: "Campus Orchestra Night", evidence: quote("Campus Orchestra Night") });
    expect(result.feedback.start).toEqual({ status: "prefilled", generatedValue: "2028-02-28T23:30:00.000Z", evidence: quote("2028-02-29T00:30:00.000+01:00") });
  });

  it("preserves existing values for missing, conflicting and unprocessed findings", () => {
    const result = prepareEventPrefill(extraction({
      title: { status: "missing", evidence: [] },
      purpose: { status: "conflicting", alternatives: [
        { value: "First purpose", evidence: quote("First purpose") },
        { value: "Second purpose", evidence: quote("Second purpose") },
      ] },
      start: known("2028-02-29T12:00:00.000"),
    }));
    expect(result.values).toEqual({});
    expect(result.feedback.title).toEqual({ status: "missing" });
    expect(result.feedback.description).toMatchObject({ status: "conflicting", alternatives: [{ value: "First purpose" }, { value: "Second purpose" }] });
    expect(result.feedback.start).toMatchObject({ status: "invalid" });
    expect(result.feedback.end).toEqual({ status: "unprocessed" });
  });

  it("rejects values outside current EventEditor bounds without truncating them", () => {
    const longTitle = "x".repeat(151);
    const result = prepareEventPrefill(extraction({ title: known(longTitle) }));
    expect(result.values).toEqual({});
    expect(result.feedback.title).toMatchObject({ status: "invalid", evidence: quote(longTitle) });
  });

  it("converts selected alternatives through the field adapter and formats canonical dates as SGT", () => {
    expect(prepareEventAlternative("description", "  You will explore circuits.  ")).toEqual({ ok: true, value: "You will explore circuits." });
    expect(prepareEventAlternative("capacity", "80")).toEqual({ ok: true, value: 80 });
    expect(prepareEventAlternative("start", "2026-11-14T13:00:00.000Z")).toEqual({ ok: true, value: "2026-11-14T13:00:00.000Z" });
    expect(prepareEventAlternative("start", "2026-11-14T13:00:00.000")).toMatchObject({ ok: false });
    expect(formatEventAlternative("start", "2026-11-14T13:00:00.000Z")).toBe("14/11/2026, 09:00 PM SGT");
    expect(formatEventAlternative("end", "2026-11-14T12:00:00.000Z")).toBe("14/11/2026, 08:00 PM SGT");
  });
});

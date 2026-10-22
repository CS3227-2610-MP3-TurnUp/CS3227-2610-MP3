import { describe, expect, it } from "vitest";
import { parseExtractionJsonResponse } from "../../src/features/proposal-assistance/json-extraction-validation";
import { normalizeProposalDateTime } from "../../src/features/proposal-assistance/validation";
import { parseProposalFinding } from "../../src/features/proposal-assistance/validation";
import { MAX_CONFLICT_ALTERNATIVES } from "../../src/features/proposal-assistance/limits";
import { PROPOSAL_EXTRACTION_JSON_SCHEMA } from "../../src/features/proposal-assistance/extraction-schema";
import { PROPOSAL_FIELDS, type ProposalField, type ProposalFinding } from "../../src/features/proposal-assistance/types";

const source = "Campus Orchestra Night. Purpose: Play film music together. Start: 2028-02-29T00:30:00.000+01:00. Venue: Hall 4. Fee: $10. Anyone may attend. Bring your student card.";
function known(value: string, quote: string): Extract<ProposalFinding, { status: "known" }> { return { status: "known", value, evidence: [{ quote, page: 1 }] }; }
function missing(): Extract<ProposalFinding, { status: "missing" }> { return { status: "missing", evidence: [] }; }
function completeFacts(): Record<ProposalField, ProposalFinding> {
  return {
    title: known("Campus Orchestra Night", "Campus Orchestra Night"),
    purpose: known("Play film music together", "Play film music together"),
    start: known("2028-02-29T00:30:00.000+01:00", "2028-02-29T00:30:00.000+01:00"),
    end: missing(),
    location: known("Hall 4", "Hall 4"),
    capacity: missing(),
    feeStatus: known("$10", "Fee: $10"),
    openTo: known("Anyone may attend", "Anyone may attend"),
    preparation: known("Bring your student card", "Bring your student card"),
  };
}

describe("proposal extraction response validation", () => {
  it("accepts supported findings, exact page evidence, and explicitly missing facts", () => {
    const result = parseExtractionJsonResponse(JSON.stringify({ facts: completeFacts(), privateFindings: [] }), [source], "stop");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.value.facts).sort()).toEqual([...PROPOSAL_FIELDS].sort());
    expect(result.value.facts.start).toMatchObject({ status: "known", value: "2028-02-28T23:30:00.000Z" });
    expect(result.value.facts.end).toEqual({ status: "missing", evidence: [] });
    expect(result.value.completeness).toBe("complete");
  });

  it("withholds a fact whose evidence is not an exact source substring and preserves other fields", () => {
    const facts = completeFacts();
    facts.title = known("Campus Orchestra Night", "Campus Orchestra Nights");
    const result = parseExtractionJsonResponse(JSON.stringify({ facts, privateFindings: [] }), [source], "stop");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.facts.title).toBeUndefined();
    expect(result.value.facts.purpose?.status).toBe("known");
    expect(result.value.unprocessedFields).toContain("title");
    expect(result.value.incompleteReasons).toContain("invalid_records");
  });

  it("withholds title values outside the title limit and duplicate title keys", () => {
    const longTitle = "x".repeat(151);
    const overLimit = completeFacts();
    overLimit.title = known(longTitle, longTitle);
    const overLimitResult = parseExtractionJsonResponse(JSON.stringify({ facts: overLimit, privateFindings: [] }), [longTitle], "stop");
    expect(overLimitResult).toMatchObject({ ok: true, value: { facts: expect.not.objectContaining({ title: expect.anything() }), unprocessedFields: expect.arrayContaining(["title"]) } });

    const first = JSON.stringify(known("Campus Orchestra Night", "Campus Orchestra Night"));
    const duplicate = JSON.stringify(known("Orchestra Night", "Orchestra Night"));
    const duplicateTitle = `{"facts":{"title":${first},"title":${duplicate},"purpose":${JSON.stringify(known("Play film music together", "Play film music together"))}},"privateFindings":[]}`;
    const duplicateResult = parseExtractionJsonResponse(duplicateTitle, [source], "stop");
    expect(duplicateResult).toMatchObject({ ok: true, value: { facts: expect.not.objectContaining({ title: expect.anything() }), unprocessedFields: expect.arrayContaining(["title"]) } });
  });

  it("retains completed fields from truncated JSON and marks absent fields unprocessed", () => {
    const title = JSON.stringify(known("Campus Orchestra Night", "Campus Orchestra Night"));
    const result = parseExtractionJsonResponse(`{"facts":{"title":${title},"purpose":${JSON.stringify(known("Play film music together", "Play film music together"))},"location":`, [source], "length");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.facts.title?.status).toBe("known");
    expect(result.value.facts.location).toBeUndefined();
    expect(result.value.unprocessedFields).toContain("start");
    expect(result.value.incompleteReasons).toContain("missing_end");
  });

  it("rejects invalid capacity, duplicate keys, and oversized response text", () => {
    const invalidCapacity = completeFacts();
    invalidCapacity.capacity = known("0", "capacity");
    expect(parseExtractionJsonResponse(JSON.stringify({ facts: invalidCapacity, privateFindings: [] }), [source])).toMatchObject({ ok: true, value: { facts: expect.not.objectContaining({ capacity: expect.anything() }) } });
    const title = JSON.stringify(known("Campus Orchestra Night", "Campus Orchestra Night"));
    expect(parseExtractionJsonResponse(`{"facts":{"title":${title},"title":${title}},"privateFindings":[]}`, [source], "stop")).toMatchObject({ ok: false, outcome: "invalid_response" });
    expect(parseExtractionJsonResponse(" ".repeat(262_145), [source])).toEqual({ ok: false, outcome: "invalid_response" });
  });

  it("normalizes strict ISO offsets across leap days and rejects invalid or partial date values", () => {
    expect(normalizeProposalDateTime("2028-02-29T00:30:00.000+01:00")).toBe("2028-02-28T23:30:00.000Z");
    expect(normalizeProposalDateTime("2028-02-29T23:30:00.000-02:00")).toBe("2028-03-01T01:30:00.000Z");
    expect(normalizeProposalDateTime("2027-02-29T12:00:00.000Z")).toBeUndefined();
    expect(normalizeProposalDateTime("2028-02-29T12:00:00.000")).toBeUndefined();
    expect(normalizeProposalDateTime("2026-11-14")).toBeUndefined();
    expect(normalizeProposalDateTime("29 February 2028 at 12pm Singapore time")).toBeUndefined();
    expect(normalizeProposalDateTime("2028-02-29T12:00:00.000-00:00")).toBeUndefined();
  });

  it("leaves an impossible date-time unprocessed without blocking other supported fields", () => {
    const facts = completeFacts();
    facts.start = known("2027-02-29T12:00:00.000Z", "2028-02-29T00:30:00.000+01:00");
    const result = parseExtractionJsonResponse(JSON.stringify({ facts, privateFindings: [] }), [source], "stop");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.facts.start).toBeUndefined();
    expect(result.value.unprocessedFields).toContain("start");
    expect(result.value.facts.title?.status).toBe("known");
  });

  it("accepts a complete date and time without a source timezone under the Singapore default", () => {
    const quote = "14 November 2026 2pm";
    const unzonedSource = `The event begins ${quote}.`;
    const facts = completeFacts();
    facts.start = known("2026-11-14T06:00:00.000Z", quote);
    const result = parseExtractionJsonResponse(JSON.stringify({ facts, privateFindings: [] }), [unzonedSource], "stop");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.facts.start).toEqual({ status: "known", value: "2026-11-14T06:00:00.000Z", evidence: [{ quote, page: 1 }] });
  });

  it("keeps an explicitly stated non-Singapore offset when normalizing the source time", () => {
    const quote = "14 November 2026 2pm +02:00";
    const facts = completeFacts();
    facts.start = known("2026-11-14T14:00:00.000+02:00", quote);
    const result = parseExtractionJsonResponse(JSON.stringify({ facts, privateFindings: [] }), [`The event begins ${quote}.`], "stop");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.facts.start).toMatchObject({ status: "known", value: "2026-11-14T12:00:00.000Z" });
  });

  it("retains a missing finding for a partial source date", () => {
    const facts = completeFacts();
    facts.start = missing();
    const result = parseExtractionJsonResponse(JSON.stringify({ facts, privateFindings: [] }), ["The event begins 14 November at 2pm."], "stop");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.facts.start).toEqual({ status: "missing", evidence: [] });
    expect(result.value.unprocessedFields).not.toContain("start");
  });

  it("allows at most three supported conflict alternatives while retaining the five-quote evidence limit", () => {
    expect(MAX_CONFLICT_ALTERNATIVES).toBe(3);
    const schema = PROPOSAL_EXTRACTION_JSON_SCHEMA as unknown as { properties: { facts: { properties: Record<string, { anyOf: Array<{ properties: { alternatives?: { maxItems: number } } }> }> } } };
    expect(schema.properties.facts.properties.location.anyOf[2]?.properties.alternatives?.maxItems).toBe(3);
    const quotes = ["Option Cedar", "Option Maple", "Option Birch", "Option Oak", "Option Ash"];
    const pageText = quotes.join(". ");
    const supported = {
      status: "conflicting",
      alternatives: quotes.slice(0, 3).map((value) => ({ value, evidence: Array.from({ length: 5 }, () => ({ quote: value, page: 1 })) })),
    };
    const parsed = parseProposalFinding(supported, [pageText], "location");
    expect(parsed.ok).toBe(true);
    if (parsed.ok && parsed.value.status === "conflicting") {
      expect(parsed.value.alternatives).toHaveLength(3);
      expect(parsed.value.alternatives[0]?.evidence).toHaveLength(5);
    }
    const excessive = { ...supported, alternatives: quotes.slice(0, 4).map((value) => ({ value, evidence: [{ quote: value, page: 1 }] })) };
    expect(parseProposalFinding(excessive, [pageText], "location")).toEqual({ ok: false, outcome: "invalid_response" });
  });
});

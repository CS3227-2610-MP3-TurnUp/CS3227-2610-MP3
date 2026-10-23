import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { EMPTY_EVENT } from "../../src/lib/event-fields";
import {
  applyPreparationResolutions,
  clarificationPersistenceEnabled,
  mergeGeneratedPreparation,
  parseResolutionIntents,
  preparationJson,
  readPreparation,
  unresolvedClarificationFields,
} from "../../src/server/proposal-assistance/clarification";
import type { EventPreparation, ClarificationIssue } from "../../src/features/proposal-assistance/clarification";
import type { PrivateExtraction } from "../../src/features/proposal-assistance/types";

const actor = "a3c1fedd-1bdf-4e70-9fa0-4e8a074c2587";
const evidence = [{ quote: "Campus Orchestra", page: 1 }];
const choiceEvidence = [{ quote: "Campus Ensemble", page: 2 }];
const issue: ClarificationIssue = {
  field: "title",
  reason: "source_conflict",
  alternatives: [
    { value: "Campus Orchestra", evidence },
    { value: "Campus Ensemble", evidence: choiceEvidence },
  ],
  resolution: null,
};
const completeFields = {
  ...EMPTY_EVENT,
  title: "Campus Orchestra",
  description: "A concert",
  start: "2099-11-01T02:00:00.000Z",
  end: "2099-11-01T04:00:00.000Z",
  location: "Arts Hall",
  capacity: 80,
  fee: "Free",
  openTo: "University community",
  preparation: "None",
};

function extraction(facts: PrivateExtraction["facts"]): PrivateExtraction {
  return { facts, privateFindings: [], completeness: "incomplete", incompleteReasons: ["unprocessed_fields"], unprocessedFields: [], technicalIssues: 0 };
}

function withLocalEnvironment() {
  vi.stubEnv("TURNUP_ENVIRONMENT", "development");
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("DATABASE_ENVIRONMENT", "non-production");
  vi.stubEnv("VERCEL_ENV", "development");
}

function withHostedEnvironment(kind: "preview" | "production", hostedEnabled: boolean) {
  vi.stubEnv("TURNUP_ENVIRONMENT", kind);
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("DATABASE_ENVIRONMENT", kind === "preview" ? "non-production" : "production");
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_ENV", kind);
  vi.stubEnv("DATABASE_URL", kind === "preview"
    ? "postgresql://synthetic:synthetic@ep-preview-pooler.us-east-1.aws.neon.tech/synthetic?sslmode=require"
    : "postgresql://synthetic:synthetic@ep-production-pooler.us-east-1.aws.neon.tech/synthetic?sslmode=require");
  vi.stubEnv("PROPOSAL_ASSISTANCE_HOSTED_ENABLED", String(hostedEnabled));
}

beforeEach(() => vi.unstubAllEnvs());

it("enables stored clarification behavior in local non-production regardless of model opt-in", () => {
  withLocalEnvironment();
  expect(clarificationPersistenceEnabled()).toBe(true);
  vi.stubEnv("PROPOSAL_ASSISTANCE_LOCAL_SYNTHETIC", "false");
  expect(clarificationPersistenceEnabled()).toBe(true);
  vi.stubEnv("VERCEL_ENV", "production");
  expect(clarificationPersistenceEnabled()).toBe(false);
});

it("enables stored clarification behavior only for matching validated hosted deployments, independent of inference opt-in", () => {
  withHostedEnvironment("preview", false);
  expect(clarificationPersistenceEnabled()).toBe(true);
  expect(clarificationPersistenceEnabled({
    TURNUP_ENVIRONMENT: "preview",
    NODE_ENV: "production",
    DATABASE_ENVIRONMENT: "non-production",
    VERCEL: "1",
    VERCEL_ENV: "preview",
    DATABASE_URL: "postgresql://synthetic:synthetic@ep-preview-pooler.us-east-1.aws.neon.tech/synthetic?sslmode=require",
  })).toBe(true);
  expect(clarificationPersistenceEnabled({
    TURNUP_ENVIRONMENT: "production",
    NODE_ENV: "production",
    DATABASE_ENVIRONMENT: "production",
    VERCEL: "1",
    VERCEL_ENV: "production",
    DATABASE_URL: "postgresql://synthetic:synthetic@ep-production-pooler.us-east-1.aws.neon.tech/synthetic?sslmode=require",
  })).toBe(false);

  vi.stubEnv("DATABASE_URL", "postgresql://synthetic:synthetic@ep-wrong.us-east-1.aws.neon.tech/synthetic?sslmode=require");
  expect(clarificationPersistenceEnabled()).toBe(false);
});

it("reads only bounded, structurally valid persisted issues", () => {
  expect(readPreparation(null, 0)).toBeNull();
  expect(readPreparation({ issues: [issue] }, 2)).toEqual({ revision: 2, issues: [issue] });
  expect(() => readPreparation({ issues: [{ ...issue, unknown: true }] }, 1)).toThrow();
  expect(() => readPreparation({ issues: [{ ...issue, alternatives: [{ ...issue.alternatives[0] }] }] }, 1)).toThrow();
  expect(() => readPreparation(null, 1)).toThrow();
});

it("preserves existing clarification rows when regeneration is missing or unprocessed", () => {
  const prior: EventPreparation = { revision: 3, issues: [issue] };
  const missing = mergeGeneratedPreparation(prior, extraction({ title: { status: "missing", evidence: [] } }), completeFields, 4);
  const unprocessed = mergeGeneratedPreparation(prior, extraction({}), completeFields, 4);
  expect(missing.issues).toEqual([issue]);
  expect(unprocessed.issues).toEqual([issue]);
});

it("turns a newly known value into a candidate without silently resolving an older issue", () => {
  const prior: EventPreparation = { revision: 1, issues: [issue] };
  const result = mergeGeneratedPreparation(prior, extraction({
    title: { status: "known", value: "Campus Orchestra", evidence },
  }), completeFields, 2);
  expect(result.issues[0]).toMatchObject({
    field: "title", reason: "source_candidate", resolution: null,
    alternatives: [{ value: "Campus Orchestra", evidence }],
  });
});

it("protects a confirmed value and reopens only that field when a new source disagrees", () => {
  const confirmed = {
    ...issue,
    alternatives: [{ value: "Campus Orchestra", evidence }],
    confirmedValue: "Campus Orchestra",
    resolution: { method: "organiser" as const, value: "Campus Orchestra", resolvedBy: actor,
      resolvedAt: "2026-10-22T00:00:00.000Z", evidence: [] },
  };
  const prior: EventPreparation = { revision: 4, issues: [confirmed] };
  const result = mergeGeneratedPreparation(prior, extraction({
    title: { status: "known", value: "Campus Ensemble", evidence: choiceEvidence },
  }), completeFields, 5);
  expect(result.issues[0]).toMatchObject({
    reason: "source_disagrees_with_confirmed", confirmedValue: "Campus Orchestra", resolution: null,
    alternatives: [{ value: "Campus Ensemble", evidence: choiceEvidence }],
  });
  expect(unresolvedClarificationFields(result, completeFields)).toEqual(["title"]);
});

it("reopens a stale persisted confirmation against the current saved draft before merging", () => {
  const prior: EventPreparation = { revision: 2, issues: [{
    ...issue,
    alternatives: [{ value: "Campus Orchestra", evidence }],
    confirmedValue: "Campus Orchestra",
    resolution: { method: "organiser", value: "Campus Orchestra", resolvedBy: actor,
      resolvedAt: "2026-10-22T00:00:00.000Z", evidence: [] },
  }] };
  const changedFields = { ...completeFields, title: "Changed in an older draft" };
  const result = mergeGeneratedPreparation(prior, extraction({}), changedFields, 3);
  expect(result.issues[0]).toMatchObject({ reason: "answer_changed", confirmedValue: "Campus Orchestra", resolution: null });
  expect(unresolvedClarificationFields(result, changedFields)).toEqual(["title"]);
});

it("accepts a selected current alternative with exact evidence, while manual confirmation stores none", () => {
  const prior: EventPreparation = { revision: 1, issues: [issue] };
  const selected: ClarificationIssue = {
    ...issue,
    reason: "source_candidate",
    alternatives: [{ value: "Campus Ensemble", evidence: choiceEvidence }],
  };
  const selectedState = applyPreparationResolutions({ revision: 1, issues: [selected] }, completeFields,
    { ...completeFields, title: "Campus Ensemble" }, [{ field: "title", method: "suggestion", value: "Campus Ensemble" }], actor,
    new Date("2026-10-22T00:00:00.000Z"), 2)!;
  expect(selectedState.issues[0]).toMatchObject({
    confirmedValue: "Campus Ensemble",
    resolution: { method: "suggestion", value: "Campus Ensemble", evidence: choiceEvidence },
  });

  const manual = applyPreparationResolutions(prior, completeFields, { ...completeFields, title: "Owner chosen title" },
    [{ field: "title", method: "organiser", value: "Owner chosen title" }], actor,
    new Date("2026-10-22T00:00:00.000Z"), 2)!;
  expect(manual.issues[0].resolution).toMatchObject({ method: "organiser", value: "Owner chosen title", evidence: [] });
});

it("round-trips a selected capacity alternative with numeric resolution value", () => {
  const capacityIssue: ClarificationIssue = {
    field: "capacity",
    reason: "source_candidate",
    alternatives: [{ value: "80", evidence: [{ quote: "Capacity: 80 attendees", page: 1 }] }],
    resolution: null,
  };
  const prior: EventPreparation = { revision: 1, issues: [capacityIssue] };
  const saved = applyPreparationResolutions(prior, completeFields, completeFields,
    [{ field: "capacity", method: "suggestion", value: 80 }], actor,
    new Date("2026-10-23T00:00:00.000Z"), 2)!;
  expect(saved.issues[0]).toMatchObject({
    confirmedValue: 80,
    resolution: { method: "suggestion", value: 80, evidence: [{ quote: "Capacity: 80 attendees", page: 1 }] },
  });
  expect(readPreparation(preparationJson(saved), 2)).toEqual(saved);
});

it("rejects stale, mismatched and unsupported confirmation intents", () => {
  const prior: EventPreparation = { revision: 1, issues: [issue] };
  expect(() => parseResolutionIntents([{ field: "title", method: "organiser", value: "Owner title", extra: true }])).toThrow();
  expect(() => applyPreparationResolutions(prior, completeFields, { ...completeFields, title: "Owner title" },
    [{ field: "title", method: "suggestion", value: "Owner title" }], actor,
    new Date("2026-10-22T00:00:00.000Z"), 2)).toThrow();
  expect(() => applyPreparationResolutions(prior, completeFields, { ...completeFields, title: "Different" },
    [{ field: "title", method: "organiser", value: "Owner title" }], actor,
    new Date("2026-10-22T00:00:00.000Z"), 2)).toThrow();
  expect(() => applyPreparationResolutions(null, completeFields, completeFields,
    [{ field: "title", method: "organiser", value: "Campus Orchestra" }], actor,
    new Date("2026-10-22T00:00:00.000Z"), 1)).toThrow();
});

it("reopens a previously confirmed issue when the saved value changes without a fresh intent", () => {
  const resolved: EventPreparation = { revision: 1, issues: [{
    ...issue,
    confirmedValue: "Campus Orchestra",
    resolution: { method: "organiser", value: "Campus Orchestra", resolvedBy: actor,
      resolvedAt: "2026-10-22T00:00:00.000Z", evidence: [] },
  }] };
  const saved = applyPreparationResolutions(resolved, completeFields, { ...completeFields, title: "A new title" }, [], actor,
    new Date("2026-10-23T00:00:00.000Z"), 2)!;
  expect(saved.issues[0]).toMatchObject({ reason: "answer_changed", confirmedValue: "Campus Orchestra", resolution: null });
  expect(unresolvedClarificationFields(saved, { ...completeFields, title: "A new title" })).toEqual(["title"]);
});

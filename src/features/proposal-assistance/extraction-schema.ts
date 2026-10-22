import { PROPOSAL_FIELDS } from "./types";
import { MAX_CONFLICT_ALTERNATIVES } from "./limits";

export const PROPOSAL_EXTRACTION_JSON_PROFILE = "proposal-extraction-json-object-v2" as const;
export const PROPOSAL_EXTRACTION_JSON_SCHEMA_NAME = "turnup_proposal_extraction_v1" as const;
export type ProposalExtractionResponseProfile = typeof PROPOSAL_EXTRACTION_JSON_PROFILE;

export const PROPOSAL_FIELD_VALUE_LIMITS: Record<(typeof PROPOSAL_FIELDS)[number], number> = {
  title: 150,
  purpose: 4_000,
  start: 29,
  end: 29,
  location: 1_000,
  capacity: 5,
  feeStatus: 500,
  openTo: 1_000,
  preparation: 2_000,
};

const evidenceSchema = {
  type: "array",
  minItems: 1,
  maxItems: 5,
  items: {
    type: "object",
    additionalProperties: false,
    required: ["quote", "page"],
    properties: {
      quote: { type: "string", minLength: 1, maxLength: 300 },
      page: { type: "integer", minimum: 1, maximum: 20 },
    },
  },
} as const;

function findingSchema(field: (typeof PROPOSAL_FIELDS)[number]) {
  const dateTimePattern = "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}(Z|[+-][0-9]{2}:[0-9]{2})$";
  const knownValue = field === "capacity"
    ? { type: "string", minLength: 1, maxLength: PROPOSAL_FIELD_VALUE_LIMITS[field], pattern: "^[1-9][0-9]*$" }
    : field === "start" || field === "end"
      ? { type: "string", minLength: 24, maxLength: PROPOSAL_FIELD_VALUE_LIMITS[field], pattern: dateTimePattern }
      : { type: "string", minLength: 1, maxLength: PROPOSAL_FIELD_VALUE_LIMITS[field] };
  const conflictValue = field === "capacity"
    ? { type: "string", minLength: 1, maxLength: PROPOSAL_FIELD_VALUE_LIMITS[field], pattern: "^[1-9][0-9]*$" }
    : field === "start" || field === "end"
      ? { type: "string", minLength: 24, maxLength: PROPOSAL_FIELD_VALUE_LIMITS[field], pattern: dateTimePattern }
      : { type: "string", minLength: 1, maxLength: PROPOSAL_FIELD_VALUE_LIMITS[field] };

  return {
    anyOf: [
      {
        type: "object",
        additionalProperties: false,
        required: ["status", "value", "evidence"],
        properties: {
          status: { type: "string", const: "known" },
          value: knownValue,
          evidence: evidenceSchema,
        },
      },
      {
        type: "object",
        additionalProperties: false,
        required: ["status", "evidence"],
        properties: {
          status: { type: "string", const: "missing" },
          evidence: { type: "array", items: { type: "string" }, maxItems: 0 },
        },
      },
      {
        type: "object",
        additionalProperties: false,
        required: ["status", "alternatives"],
        properties: {
          status: { type: "string", const: "conflicting" },
          alternatives: {
            type: "array",
            minItems: 2,
            maxItems: MAX_CONFLICT_ALTERNATIVES,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["value", "evidence"],
              properties: {
                value: conflictValue,
                evidence: evidenceSchema,
              },
            },
          },
        },
      },
    ],
  } as const;
}

const factProperties = Object.fromEntries(
  PROPOSAL_FIELDS.map((field) => [field, findingSchema(field)]),
);

export const PROPOSAL_EXTRACTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["facts", "privateFindings"],
  properties: {
    facts: {
      type: "object",
      additionalProperties: false,
      required: [...PROPOSAL_FIELDS],
      properties: factProperties,
    },
    privateFindings: {
      type: "array",
      maxItems: 10,
      items: { type: "string", minLength: 1, maxLength: 2_000 },
    },
  },
} as const;

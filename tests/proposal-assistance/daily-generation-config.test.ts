import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  hostedDailyGenerationEnabled,
  readDailyGenerationEnvironment,
} from "../../src/server/ai/daily-generation-config";

const preview = {
  TURNUP_ENVIRONMENT: "preview",
  DATABASE_ENVIRONMENT: "non-production",
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "preview",
  DATABASE_URL: "postgresql://synthetic:synthetic@ep-preview-pooler.us-east-1.aws.neon.tech/synthetic?sslmode=require",
};
const production = {
  TURNUP_ENVIRONMENT: "production",
  DATABASE_ENVIRONMENT: "production",
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "production",
  DATABASE_URL: "postgresql://synthetic:synthetic@ep-production-pooler.us-east-1.aws.neon.tech/synthetic?sslmode=require",
};

describe("daily generation server environment pairing", () => {
  it("leaves local development on the existing separate provider gate", () => {
    expect(readDailyGenerationEnvironment({
      TURNUP_ENVIRONMENT: "development",
      DATABASE_ENVIRONMENT: "non-production",
      NODE_ENV: "development",
      VERCEL_ENV: "development",
    })).toEqual({ status: "unsupported_local" });
  });

  it("accepts only matching verified Preview and Production labels and pooled Neon targets", () => {
    expect(readDailyGenerationEnvironment(preview)).toEqual({ status: "supported", environment: "preview" });
    expect(readDailyGenerationEnvironment(production)).toEqual({ status: "supported", environment: "production" });
  });

  it("fails closed on mismatched Vercel, runtime, database, URL, or deployment labels", () => {
    expect(readDailyGenerationEnvironment({ ...preview, VERCEL_ENV: "production" })).toEqual({ status: "invalid" });
    expect(readDailyGenerationEnvironment({ ...preview, DATABASE_ENVIRONMENT: "production" })).toEqual({ status: "invalid" });
    expect(readDailyGenerationEnvironment({ ...preview, NODE_ENV: "development" })).toEqual({ status: "invalid" });
    expect(readDailyGenerationEnvironment({ ...preview, VERCEL: undefined })).toEqual({ status: "invalid" });
    expect(readDailyGenerationEnvironment({ ...preview, DATABASE_URL: undefined })).toEqual({ status: "invalid" });
    expect(readDailyGenerationEnvironment({ ...preview, DATABASE_URL: "postgresql://synthetic:synthetic@ep-wrong.us-east-1.aws.neon.tech/synthetic?sslmode=require" })).toEqual({ status: "invalid" });
  });

  it("requires the explicit opt-in and a supported environment/database pair", () => {
    expect(hostedDailyGenerationEnabled({ ...preview })).toBe(false);
    expect(hostedDailyGenerationEnabled({ ...preview, PROPOSAL_ASSISTANCE_HOSTED_ENABLED: "true" })).toBe(true);
    expect(hostedDailyGenerationEnabled({ ...preview, PROPOSAL_ASSISTANCE_HOSTED_ENABLED: "True" })).toBe(false);
    expect(hostedDailyGenerationEnabled({ ...preview, PROPOSAL_ASSISTANCE_HOSTED_ENABLED: "true", VERCEL_ENV: "production" })).toBe(false);
    expect(hostedDailyGenerationEnabled({
      TURNUP_ENVIRONMENT: "development",
      DATABASE_ENVIRONMENT: "non-production",
      NODE_ENV: "development",
      PROPOSAL_ASSISTANCE_HOSTED_ENABLED: "true",
    })).toBe(false);
  });
});

import "server-only";

export type SoCConfigFailure = "not_configured" | "invalid_configuration";

export interface SoCConfig {
  apiKey: string;
  model: string;
  maxInputBytes: number;
  maxOutputTokens: number;
  timeoutMs: number;
}

export type SoCConfigResult =
  | { ok: true; config: SoCConfig }
  | { ok: false; outcome: SoCConfigFailure };

export type SoCEnvironment = Record<string, string | undefined>;

const expectedBaseUrl = "https://soclaas-api.comp.nus.edu.sg/v1";
const maxInputByteLimit = 65_536;
const maxOutputTokenLimit = 4_096;
const maxTimeoutMs = 30_000;

/** Read server-only settings; no defaults silently select a model or budget. */
export function readSoCConfig(env: SoCEnvironment): SoCConfigResult {
  const required = [
    env.SOCLAAS_API_KEY,
    env.SOCLAAS_BASE_URL,
    env.SOCLAAS_MODEL,
    env.SOCLAAS_MAX_INPUT_BYTES,
    env.SOCLAAS_MAX_OUTPUT_TOKENS,
    env.SOCLAAS_TIMEOUT_MS,
  ];

  if (required.some((value) => value === undefined || value === "")) {
    return { ok: false, outcome: "not_configured" };
  }

  const [apiKeyValue, baseUrl, model, inputBytesValue, outputTokensValue, timeoutMsValue] = required;
  const apiKey = apiKeyValue?.trim();
  const maxInputBytes = parsePositiveInteger(inputBytesValue);
  const maxOutputTokens = parsePositiveInteger(outputTokensValue);
  const timeoutMs = parsePositiveInteger(timeoutMsValue);

  if (
    !apiKey ||
    !/^[\x21-\x7e]+$/.test(apiKey) ||
    baseUrl !== expectedBaseUrl ||
    !model ||
    model.length > 256 ||
    !/^[A-Za-z0-9._:/-]+$/.test(model) ||
    maxInputBytes === undefined ||
    maxInputBytes > maxInputByteLimit ||
    maxOutputTokens === undefined ||
    maxOutputTokens > maxOutputTokenLimit ||
    timeoutMs === undefined ||
    timeoutMs > maxTimeoutMs
  ) {
    return { ok: false, outcome: "invalid_configuration" };
  }

  return {
    ok: true,
    config: { apiKey, model, maxInputBytes, maxOutputTokens, timeoutMs },
  };
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

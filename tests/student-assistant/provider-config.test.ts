import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { readStudentSoCConfig } from "../../src/server/student-assistant/provider-config";
import { readSoCConfig } from "../../src/server/ai/soclaas-config";
import { answerSynthetic } from "../../src/server/student-assistant/answer";
import { SAMPLE_SOURCE } from "../../src/features/student-assistant/demo/scenarios";

const env = { SOCLAAS_API_KEY: "organiser-secret-canary", STUDENT_SOCLAAS_API_KEY: "student-secret-canary",
  SOCLAAS_BASE_URL: "https://soclaas-api.comp.nus.edu.sg/v1", SOCLAAS_MODEL: "synthetic-model",
  SOCLAAS_MAX_INPUT_BYTES: "65536", SOCLAAS_MAX_OUTPUT_TOKENS: "1000", SOCLAAS_TIMEOUT_MS: "20000" };
it("selects distinct server keys without mutating shared configuration", () => {
  const before = { ...env }, student = readStudentSoCConfig(env), organiser = readSoCConfig(env);
  expect(student).toMatchObject({ ok: true, config: { apiKey: env.STUDENT_SOCLAAS_API_KEY } });
  expect(organiser).toMatchObject({ ok: true, config: { apiKey: env.SOCLAAS_API_KEY } });
  expect(env).toEqual(before);
});
it.each([undefined, "", " ", "unsafe\nkey"])("never falls back to a valid Organiser key when Student key is %s", key => {
  const result = readStudentSoCConfig({ ...env, STUDENT_SOCLAAS_API_KEY: key });
  expect(result.ok).toBe(false); expect(JSON.stringify(result)).not.toContain(env.SOCLAAS_API_KEY);
});
it("Student works without an Organiser key and sends only its own bearer credential", async () => {
  const configured = readStudentSoCConfig({ ...env, SOCLAAS_API_KEY: undefined });
  if (!configured.ok) throw Error("Expected Student config");
  const candidate = { eventId: SAMPLE_SOURCE.eventId, revision: SAMPLE_SOURCE.revision, kind: "unanswered", reply: "I'm not sure." };
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ choices: [{ message: { content: JSON.stringify(candidate) } }] }));
  const result = await answerSynthetic({ requestId: "one", eventId: SAMPLE_SOURCE.eventId, revision: SAMPLE_SOURCE.revision, question: "Lunch?" }, configured.config, undefined, fetcher);
  expect(result).toEqual({ ok: true, candidate });
  expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ authorization: `Bearer ${env.STUDENT_SOCLAAS_API_KEY}` });
  const sent = fetcher.mock.calls[0][1]?.body as string;
  expect(sent).not.toContain(env.STUDENT_SOCLAAS_API_KEY); expect(sent).not.toContain(env.SOCLAAS_API_KEY);
  expect(JSON.stringify(result)).not.toContain("secret-canary"); expect(fetcher).toHaveBeenCalledOnce();
});

import type { AnswerCandidate, FailureReason, PublicSourceSnapshot } from "../types";

export const SAMPLE_SOURCE: PublicSourceSnapshot = {
  eventId: "sample-garden", revision: "sample-r1", title: "Campus Gardening Workshop",
  sections: [
    { id: "schedule", label: "Time and place", text: "The workshop is on 12 November from 2 pm to 4 pm at the Campus Garden." },
    { id: "preparation", label: "What to bring", text: "Bring a water bottle. Gardening tools are provided." },
    { id: "access", label: "Participation", text: "The workshop is open to all Students. Participation is free." },
  ],
};
export const UPDATED_SOURCE: PublicSourceSnapshot = { ...SAMPLE_SOURCE, revision: "sample-r2", sections: SAMPLE_SOURCE.sections.map((section) => section.id === "preparation" ? { ...section, text: "Bring a water bottle and a hat. Gardening tools are provided." } : section) };
export const OTHER_SOURCE: PublicSourceSnapshot = { ...SAMPLE_SOURCE, eventId: "sample-garden-evening", title: "Campus Gardening Workshop — evening session", sections: SAMPLE_SOURCE.sections.map((section) => section.id === "schedule" ? { ...section, text: "The evening workshop is on 13 November from 6 pm to 8 pm at the Campus Garden." } : section) };
export const SCENARIOS = [
  { id: "answered", label: "Supported answer", question: "Do I need to bring gardening tools?" },
  { id: "partial", label: "Partly answered", question: "Do I need tools, and is lunch provided?" },
  { id: "subjective", label: "Personal preference", question: "Is the event fun?" },
  { id: "unanswered", label: "Not in the source", question: "Is lunch provided?" },
  { id: "clarification", label: "Needs clarification", question: "How does it work?" },
  { id: "out_of_scope", label: "Out of scope", question: "Can you help with my calculus homework?" },
  { id: "timeout", label: "Timeout", question: "Do I need to bring gardening tools?" },
  { id: "unavailable", label: "Assistant unavailable", question: "Do I need to bring gardening tools?" },
  { id: "bad_evidence", label: "Invalid evidence", question: "Is lunch provided?" },
] as const;
export type ScenarioId = typeof SCENARIOS[number]["id"];
export interface SimulationRequest { requestId: string; eventId: string; revision: string; question: string }
export type SimulationResult = { ok: true; candidate: AnswerCandidate } | { ok: false; reason: FailureReason };

/** Deterministic fixture driver, never a provider adapter or an answer to arbitrary input. */
export function simulateResponse(scenarioId: ScenarioId, request: SimulationRequest, signal: AbortSignal, delayMs = 900): Promise<SimulationResult> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (result: SimulationResult) => { clearTimeout(timer); signal.removeEventListener("abort", abort); resolve(result); };
    const abort = () => finish({ ok: false, reason: "cancelled" });
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    timer = setTimeout(() => {
      const scenario = SCENARIOS.find((value) => value.id === scenarioId);
      if (!scenario || request.question !== scenario.question) { finish({ ok: false, reason: "preview_only" }); return; }
      if (scenarioId === "timeout" || scenarioId === "unavailable") { finish({ ok: false, reason: scenarioId === "timeout" ? "timeout" : "provider_unavailable" }); return; }
      const identity = { eventId: request.eventId, revision: request.revision };
      const evidence = [{ ...identity, sectionId: "preparation", quote: "Gardening tools are provided." }];
      let candidate: AnswerCandidate;
      switch (scenarioId) {
        case "answered": candidate = { ...identity, kind: "answered", reply: "No need to bring gardening tools—they are provided. Bring a water bottle.", evidence: [{ ...identity, sectionId: "preparation", quote: "Bring a water bottle. Gardening tools are provided." }] }; break;
        case "partial": candidate = { ...identity, kind: "partially_answered", evidence, unresolved: ["Is lunch provided?"] }; break;
        case "subjective": candidate = { ...identity, kind: "unanswered", reply: "That depends on what you enjoy! What kind of activities do you usually like?" }; break;
        case "unanswered": candidate = { ...identity, kind: "unanswered" }; break;
        case "clarification": candidate = { ...identity, kind: "needs_clarification", clarification: "Would you like to know what happens at the workshop or how to attend?" }; break;
        case "out_of_scope": candidate = { ...identity, kind: "out_of_scope" }; break;
        case "bad_evidence": candidate = { ...identity, kind: "answered", evidence: [{ ...identity, sectionId: "access", quote: "Lunch is provided for free." }] }; break;
      }
      finish({ ok: true, candidate });
    }, delayMs);
  });
}

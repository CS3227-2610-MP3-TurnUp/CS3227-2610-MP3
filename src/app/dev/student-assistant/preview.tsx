"use client";

import React, { useEffect, useReducer, useRef, useState } from "react";
import { requestLocalAnswer } from "../../../features/student-assistant/dev-transport";
import { ChatWidget } from "../../../features/student-assistant/chat-widget";
import { assistantReducer, createAssistantState } from "../../../features/student-assistant/state";
import { OTHER_SOURCE, SAMPLE_SOURCE, UPDATED_SOURCE, SCENARIOS, simulateResponse, type ScenarioId } from "../../../features/student-assistant/demo/scenarios";
import type { PublicSourceSnapshot } from "../../../features/student-assistant/types";
import styles from "../../../features/student-assistant/chat-panel.module.css";

export function StudentAssistantPreview({ liveAvailable = false }: { liveAvailable?: boolean }) {
  const [mode, setMode] = useState<"simulation" | "live">("simulation");
  const [state, dispatch] = useReducer(assistantReducer, SAMPLE_SOURCE, createAssistantState);
  const [scenario, setScenario] = useState<ScenarioId>("answered");
  const inFlight = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  useEffect(() => () => { inFlight.current?.abort(); }, []);

  function stop() { inFlight.current?.abort(); inFlight.current = null; }
  function replaceSource(source: PublicSourceSnapshot) { stop(); dispatch({ type: "source_changed", source }); }
  async function submit() {
    if (inFlight.current) return;
    const requestId = "sample-request-" + (++sequence.current);
    const event = { type: "request_started" as const, requestId };
    const next = assistantReducer(state, event);
    dispatch(event);
    if (!next.pending || next.pending.requestId !== requestId) return;
    const request = next.pending;
    const controller = new AbortController(); inFlight.current = controller;
    try {
      const result = await (mode === "live" ? requestLocalAnswer(request, controller.signal) : simulateResponse(scenario, request, controller.signal));
      dispatch(result.ok ? { type: "response_received", ...request, candidate: result.candidate } : { type: "request_failed", ...request, reason: result.reason });
    } catch {
      dispatch({ type: "request_failed", ...request, reason: "provider_unavailable" });
    } finally { if (inFlight.current === controller) inFlight.current = null; }
  }
  return <main className={styles.shell}>
    <header className={styles.header}><span className="brand">TurnUp</span><span className={styles.previewLabel}>Development preview<br />Synthetic examples only</span></header>
    <p className={styles.eyebrow}>Sample event</p>
    <h1>{state.source?.title ?? "Event unavailable"}</h1>
    <p className={styles.explanation}>Try the assistant interface with sample event information and simulated responses. {mode === "live" ? "Live SoCLaaS responses use sample event information only." : "Responses are simulated. Live mode requires confirmed model permission and an approved allowance."} No account data or messaging is connected.</p>
    <div>
      <article className={styles.eventDetails} aria-label="Sample event details">
        {state.source ? state.source.sections.map((section) => <section key={section.id}><h2>{section.label}</h2><p>{section.text}</p></section>) : <p role="status">This sample event is {state.availability === "cancelled" ? "cancelled" : "unavailable"}. Event information is no longer shown.</p>}
      </article>
      <ChatWidget liveMode={mode === "live"} suggestions={[SCENARIOS[0].question, SCENARIOS[2].question, SCENARIOS[3].question]} onSuggestion={(question) => { const selected = SCENARIOS.find((item) => item.question === question); if (selected) setScenario(selected.id); dispatch({ type: "draft_changed", value: question }); }} state={state} onDraftChange={(value) => dispatch({ type: "draft_changed", value })} onSubmit={submit} />
      <details className={styles.devTools}><summary>Development test controls</summary><aside className={styles.panel} aria-labelledby="scenarios-title">
        <h2 id="scenarios-title">Try a scenario</h2>
        <div className={styles.controls}>
          <div><label htmlFor="response-mode">Response mode</label><select id="response-mode" value={mode} disabled={state.pending !== null} onChange={(event) => { stop(); dispatch({ type: "cleared" }); setMode(event.target.value === "live" && liveAvailable ? "live" : "simulation"); }}><option value="simulation">Simulation</option><option value="live" disabled={!liveAvailable}>Live SoCLaaS · sample event</option></select></div>
          {!liveAvailable && <p className={styles.explanation}>Live requests are blocked until model permission, handling rules and a local budget are confirmed. Configuring a key does not enable requests.</p>}
          <div><label htmlFor="sample-scenario">Sample response</label><select id="sample-scenario" value={scenario} disabled={state.pending !== null || mode === "live"} onChange={(event) => { const value = event.target.value as ScenarioId; setScenario(value); const selected = SCENARIOS.find((item) => item.id === value); if (selected) dispatch({ type: "draft_changed", value: selected.question }); }}>
            {SCENARIOS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select></div>
          <button type="button" className="secondary" disabled={state.pending !== null || state.availability !== "available"} onClick={() => dispatch({ type: "draft_changed", value: SCENARIOS.find((item) => item.id === scenario)!.question })}>Use sample question</button>
          <button type="button" className="secondary" onClick={() => replaceSource(UPDATED_SOURCE)}>Replace sample source</button>
          <button type="button" className="secondary" onClick={() => replaceSource(OTHER_SOURCE)}>Switch sample event</button>
          <button type="button" className="secondary" disabled={!state.source} onClick={() => { const eventId = state.source?.eventId; if (!eventId) return; stop(); dispatch({ type: "source_unavailable", eventId, reason: "withdrawn" }); }}>Withdraw sample event</button>
          <button type="button" className="secondary" disabled={!state.source} onClick={() => { const eventId = state.source?.eventId; if (!eventId) return; stop(); dispatch({ type: "source_unavailable", eventId, reason: "cancelled" }); }}>Cancel sample event</button>
          <button type="button" className={styles.subtle} onClick={() => replaceSource(SAMPLE_SOURCE)}>Reset sample source</button>
        </div>
        {state.source && <details className={styles.source}><summary>Sample event information</summary>{state.source.sections.map((section) => <section key={section.id}><h3>{section.label}</h3><p>{section.text}</p></section>)}<p>Source: {state.source.revision}</p></details>}
      </aside></details>
    </div>
  </main>;
}

"use client";
import React, { useEffect, useReducer, useRef } from "react";
import { ChatWidget } from "./chat-widget";
import { createAssistantState, assistantReducer } from "./state";
import type { AssistantState, PublicSourceSnapshot } from "./types";
import { createPublicationLoader, type PublicationCode } from "./publication-transport";
import styles from "./chat-panel.module.css";
export const publicationMessages: Record<PublicationCode, string> = {
  invalid_request: "This event reference could not be loaded.", login_required: "Log in again to view this publication.", student_required: "Student access is required.",
  event_unavailable: "Event unavailable. Published information is no longer shown.", source_changed: "Event information changed. Refresh to load the current publication.",
  source_too_large: "This publication exceeds the assistant source limit. No content has been truncated.", timing_policy_pending: "Inspection of started or past events is pending the Student timing policy.",
  source_unavailable: "Publication information could not be checked. Try refreshing.",
};
export interface PublicationView { assistant: AssistantState; status: "checking" | "ready" | PublicationCode }
type ViewEvent = { type: "checking" } | { type: "loaded"; source: PublicSourceSnapshot } | { type: "failed"; code: PublicationCode };
export function initialPublicationView(): PublicationView { return { assistant: createAssistantState(null), status: "checking" }; }
export function publicationInspectionReducer(state: PublicationView, event: ViewEvent): PublicationView {
  if (event.type === "loaded") return { assistant: assistantReducer(state.assistant, { type: "source_changed", source: event.source }), status: "ready" };
  // Clear excerpts immediately while checking, preserving only the safe question draft.
  return { assistant: { ...createAssistantState(null), draft: state.assistant.draft }, status: event.type === "checking" ? "checking" : event.code };
}
export function PublicationInspectionContent({ view, refresh }: { view: PublicationView; refresh: () => void }) {
  return <main className={styles.shell}>
    <header className={styles.header}><span className="brand">TurnUp</span><span className={styles.previewLabel}>Development source inspection<br />Real publication · no AI requests</span></header>
    <h1>{view.assistant.source?.title ?? "Publication source inspection"}</h1>
    <p className={styles.explanation}>Authenticated current publication only. Refresh or return to this window to recheck availability. AI answers are not connected here.</p>
    <button type="button" className="secondary" onClick={refresh} disabled={view.status === "checking"}>Refresh publication</button>
    {view.status !== "ready" && <p role="status">{view.status === "checking" ? "Checking publication…" : publicationMessages[view.status]}</p>}
    {view.status === "login_required" && <a href="/login">Log in</a>}
    {view.assistant.source && <article className={styles.eventDetails} aria-label="Current approved publication">{view.assistant.source.sections.map((section) => <section key={section.id}><h2>{section.label}</h2><p>{section.text}</p></section>)}</article>}
    <ChatWidget state={view.assistant} canAsk={false} suggestions={[]} onDraftChange={() => {}} onSubmit={() => {}} onOpen={refresh} />
  </main>;
}
export function PublicationPreview({ eventId }: { eventId: string }) {
  const [view, dispatch] = useReducer(publicationInspectionReducer, undefined, initialPublicationView);
  const loader = useRef<ReturnType<typeof createPublicationLoader> | null>(null);
  useEffect(() => {
    const active = createPublicationLoader(eventId, (result) => {
      if ("checking" in result) dispatch({ type: "checking" });
      else if (result.ok) dispatch({ type: "loaded", source: result.source });
      else dispatch({ type: "failed", code: result.code });
    });
    loader.current = active; void active.refresh();
    const focus = () => { void active.refresh(); }; window.addEventListener("focus", focus);
    return () => { active.stop(); window.removeEventListener("focus", focus); if (loader.current === active) loader.current = null; };
  }, [eventId]);
  return <PublicationInspectionContent view={view} refresh={() => { void loader.current?.refresh(); }} />;
}

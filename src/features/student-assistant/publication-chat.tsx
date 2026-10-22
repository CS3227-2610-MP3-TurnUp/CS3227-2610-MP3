"use client";
import React, { useEffect, useMemo, useSyncExternalStore } from "react";
import { ChatWidget } from "./chat-widget";
import { createAssistantState, assistantReducer } from "./state";
import type { AssistantState } from "./types";
import { requestPublicationSource, type PublicationCode } from "./publication-transport";
import { requestPublicationAnswer } from "./publication-answer-transport";

export const chatPublicationMessages: Record<PublicationCode, string> = {
  invalid_request: "This event reference could not be checked. Refresh the page.",
  login_required: "Log in again to ask about this event.", student_required: "Student access is required to ask questions.",
  event_unavailable: "This event is unavailable. New questions cannot be sent.",
  source_changed: "The event information changed. Refresh it before asking again.",
  source_too_large: "This event has more information than the assistant can currently handle.",
  timing_policy_pending: "Questions are currently available only before the event starts.",
  source_unavailable: "The event information could not be checked. Try refreshing.",
};
export interface PublicationChatView { assistant: AssistantState; status: "idle" | "checking" | "ready" | PublicationCode }
const empty = (draft = ""): AssistantState => ({ ...createAssistantState(null), draft, error: null });
/** A testable volatile controller: refresh never dispatches inference; old requests cannot publish. */
export function createPublicationChat(eventId: string, dependencies = { load: requestPublicationSource, answer: requestPublicationAnswer }) {
  const initial: PublicationChatView = { assistant: empty(), status: "idle" };
  let view = initial, active = true, opened = false, generation = 0;
  let retained: AssistantState | null = null;
  let pending: AbortController | undefined;
  const listeners = new Set<() => void>();
  const update = (next: PublicationChatView) => { view = next; for (const listener of listeners) listener(); };
  async function refresh() {
    if (!active) return;
    const ticket = ++generation; pending?.abort(); const controller = new AbortController(); pending = controller;
    if (view.status === "ready") retained = { ...view.assistant, pending: null };
    else if (view.status !== "checking") retained = null;
    const previous = retained;
    update({ assistant: empty(view.assistant.draft), status: "checking" });
    const result = await dependencies.load(eventId, controller.signal, previous?.source?.revision);
    if (!active || controller.signal.aborted || ticket !== generation) return;
    pending = undefined;
    if (!result.ok) { retained = null; update({ assistant: empty(view.assistant.draft), status: result.code }); return; }
    const assistant = previous?.source?.revision === result.source.revision && previous.source.eventId === result.source.eventId
      && JSON.stringify(previous.source) === JSON.stringify(result.source)
      ? { ...previous, draft: view.assistant.draft }
      : { ...assistantReducer(empty(view.assistant.draft), { type: "source_changed", source: result.source }), error: null };
    update({ assistant, status: "ready" });
    retained = null;
  }
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    snapshot: () => view, serverSnapshot: () => initial,
    start() { active = true; },
    stop() { active = false; ++generation; pending?.abort(); retained = null; },
    refresh,
    open() { opened = true; return refresh(); },
    refocus() { return opened ? refresh() : Promise.resolve(); },
    edit(value: string) { if (!active || view.status !== "ready" || view.assistant.pending) return; update({ ...view, assistant: assistantReducer(view.assistant, { type: "draft_changed", value }) }); },
    async submit() {
      if (!active || view.status !== "ready" || view.assistant.pending) return;
      const requestId = crypto.randomUUID();
      const next = assistantReducer(view.assistant, { type: "request_started", requestId });
      update({ ...view, assistant: next });
      if (!next.pending) return;
      const request = next.pending, ticket = ++generation, controller = new AbortController(); pending = controller;
      const result = await dependencies.answer(request, controller.signal);
      if (!active || controller.signal.aborted || ticket !== generation) return;
      pending = undefined;
      if (!result.ok && "code" in result) { update({ assistant: empty(view.assistant.draft), status: result.code }); return; }
      const assistant = assistantReducer(view.assistant, result.ok
        ? { type: "response_received", ...request, candidate: result.candidate }
        : { type: "request_failed", ...request, reason: result.reason });
      update({ assistant, status: "ready" });
      // A lost/invalid response cannot prove freshness. Recheck source only, never retry inference.
      if (!result.ok) await refresh();
    },
  };
}
export function PublicationChat({ eventId }: { eventId: string }) {
  const controller = useMemo(() => createPublicationChat(eventId.toLowerCase()), [eventId]);
  const view = useSyncExternalStore(controller.subscribe, controller.snapshot, controller.serverSnapshot);
  useEffect(() => {
    controller.start();
    const focus = () => { void controller.refocus(); };
    window.addEventListener("focus", focus);
    return () => { window.removeEventListener("focus", focus); controller.stop(); };
  }, [controller]);
  const message = view.status === "checking" ? "Checking the current event information…" : view.status === "idle" ? undefined : view.status === "ready" ? undefined : chatPublicationMessages[view.status];
  return <ChatWidget state={view.assistant} publicationMode statusMessage={message}
    onRefreshSource={view.status !== "checking" ? () => { void controller.refresh(); } : undefined}
    onOpen={() => { void controller.open(); }} onDraftChange={controller.edit} onSubmit={() => { void controller.submit(); }} />;
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { EventFields } from "../../lib/event-fields";
import { MAX_PROPOSAL_PDF_BYTES } from "../../features/proposal-assistance/limits";
import { prepareEventPrefill, type ProposalFeedbackMap } from "../../features/proposal-assistance/event-prefill";
import type { PrivateExtraction, ProposalRevisions } from "../../features/proposal-assistance/types";

type Props = {
  eventId: string;
  eventVersion: number;
  eventBusy: boolean;
  currentEditorRevision: () => number;
  onPrefill: (values: Partial<EventFields>, feedback: ProposalFeedbackMap) => void;
  onClearFeedback: () => void;
};

type ApiResult = { ok: true; revisions: ProposalRevisions; extraction: PrivateExtraction } | { ok: false; outcome: string };

export function ProposalAssistance({ eventId, eventVersion, eventBusy, currentEditorRevision, onPrefill, onClearFeedback }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [extraction, setExtraction] = useState<PrivateExtraction | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const sourceRevision = useRef(0);
  const factsRevision = useRef(0);
  const requestRevision = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    requestRevision.current += 1;
    controllerRef.current?.abort();
  }, []);
  useEffect(() => {
    if (!eventBusy) return;
    controllerRef.current?.abort();
  }, [eventBusy]);

  function resetSource(nextFile: File | null) {
    controllerRef.current?.abort();
    controllerRef.current = null;
    requestRevision.current += 1;
    sourceRevision.current += 1;
    factsRevision.current += 1;
    setFile(nextFile);
    setExtraction(null);
    setPending(false);
    setError("");
    setNotice(nextFile ? "PDF selected. It has not been uploaded." : "Proposal removed. Generated event values remain in the private draft.");
    onClearFeedback();
  }

  async function generate() {
    if (!file || pending || eventBusy) return;
    const requestId = requestRevision.current + 1;
    requestRevision.current = requestId;
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;
    const revisions: ProposalRevisions = {
      source: sourceRevision.current,
      facts: factsRevision.current,
      editor: currentEditorRevision(),
    };
    setPending(true);
    setError("");
    setNotice("");
    setExtraction(null);
    onClearFeedback();
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("expectedVersion", String(eventVersion));
      body.append("revisions", JSON.stringify(revisions));
      const response = await fetch(`/api/organiser/events/${eventId}/proposal-extraction`, {
        method: "POST",
        body,
        signal: controller.signal,
      });
      const payload = await response.json() as ApiResult;
      if (requestRevision.current !== requestId || controller.signal.aborted) return;
      if (!response.ok || !payload.ok) {
        setError(messageForOutcome(payload && "outcome" in payload ? payload.outcome : "unavailable"));
        return;
      }
      if (requestRevision.current !== requestId || controller.signal.aborted ||
        revisions.source !== sourceRevision.current || revisions.facts !== factsRevision.current ||
        revisions.editor !== currentEditorRevision() || payload.revisions.source !== revisions.source ||
        payload.revisions.facts !== revisions.facts || payload.revisions.editor !== revisions.editor) {
        setNotice("The proposal or event changed while findings were being generated. Generate again to review current values.");
        return;
      }

      factsRevision.current += 1;
      const prefill = prepareEventPrefill(payload.extraction);
      onPrefill(prefill.values, prefill.feedback);
      setExtraction(payload.extraction);
    } catch {
      if (requestRevision.current === requestId && !controller.signal.aborted) setError("Proposal assistance is unavailable. Your event fields were not changed by this request.");
    } finally {
      if (requestRevision.current === requestId) {
        controllerRef.current = null;
        setPending(false);
      }
    }
  }

  return <section className="proposal-assistance" aria-labelledby="proposal-assistance-title">
    <h3 id="proposal-assistance-title">Proposal assistance</h3>
    <p className="muted">Selecting a file sends nothing. Generate uploads it to TurnUp for temporary text extraction and sends the embedded text to the configured AI service. The PDF and findings are not saved with the event and clear when you leave or refresh. Generate pre-fills only supported values; review them and Save Draft to keep them.</p>
    <div className="proposal-file-controls">
      <div className="proposal-file-picker" role="group" aria-labelledby="proposal-file-label">
        <span id="proposal-file-label" className="proposal-file-label">Proposal PDF</span>
        <input ref={fileInput} className="proposal-file-input" id="proposal-pdf" type="file" accept="application/pdf,.pdf" disabled={pending || eventBusy} tabIndex={-1} aria-hidden="true" aria-describedby="proposal-file-status" onChange={(event) => {
          const selected = event.currentTarget.files?.[0] ?? null;
          event.currentTarget.value = "";
          if (!selected) return;
          if (selected.size > MAX_PROPOSAL_PDF_BYTES) {
            resetSource(null);
            setError("Choose a PDF no larger than 4 MB.");
            return;
          }
          resetSource(selected);
        }} />
        <div className="proposal-file-picker-row">
          <button type="button" className="secondary" disabled={pending || eventBusy} aria-describedby="proposal-file-status" onClick={() => fileInput.current?.click()}>Choose PDF</button>
          <span id="proposal-file-status" className="proposal-file-status field-help" role="status" aria-live="polite" aria-atomic="true">
            {file ? `${file.name} (${(file.size / 1_000_000).toFixed(2)} MB)` : "No file chosen"}
          </span>
        </div>
      </div>
      <div className="event-actions">
        <button type="button" className="primary" disabled={!file || pending || eventBusy} onClick={() => void generate()}>{pending ? "Generating…" : "Generate Findings"}</button>
        {file && <button type="button" className="secondary" disabled={pending || eventBusy} onClick={() => resetSource(null)}>Remove proposal</button>}
      </div>
    </div>
    {error && <p className="error-panel" role="alert">{error}</p>}
    {notice && <p className="notice" role="status">{notice}</p>}
    {extraction && <div className="proposal-findings" aria-live="polite">
      <h4>Private findings</h4>
      <p className="field-help">{extraction.completeness === "complete" ? "All requested fields were processed." : "Some fields could not be safely prefilled. Check each field's status and complete unresolved values manually."}</p>
      {extraction.privateFindings.length > 0 && <section className="proposal-private-notes">
        <h5>Private review notes</h5><ul>{extraction.privateFindings.map((finding, index) => <li key={finding + "-" + index}>{finding}</li>)}</ul>
      </section>}
    </div>}
  </section>;
}

function messageForOutcome(outcome: string): string {
  const messages: Record<string, string> = {
    stale_event: "This event changed or is no longer editable. Reload saved values before generating findings.",
    disabled: "Proposal assistance is not enabled in this environment.",
    not_configured: "Proposal assistance is not configured. Your event fields are unchanged.",
    invalid_configuration: "Proposal assistance is unavailable in this environment.",
    unsupported_file: "Choose a PDF file.",
    file_too_large: "The PDF exceeds the 4 MB limit.",
    too_many_pages: "The PDF has more than 20 pages.",
    text_too_large: "The PDF contains more text than this request can process.",
    encrypted_pdf: "This PDF is password protected and cannot be processed.",
    invalid_pdf: "This file could not be read as a PDF.",
    empty_or_unreadable: "No readable embedded text was found. Scanned PDFs are not supported.",
    parser_timeout: "Reading this PDF took too long. Your event fields are unchanged.",
    rate_or_budget_limited: "Proposal assistance is temporarily limited. Try again after the current limit expires.",
    invalid_response: "The response could not be safely checked. Your event fields are unchanged.",
    unsupported_evidence: "The response included evidence that did not match the PDF. Your event fields are unchanged.",
    timeout: "Proposal assistance took too long. Your event fields are unchanged.",
    cancelled: "Proposal processing was cancelled. Your event fields are unchanged.",
    input_too_large: "The extracted text is too large for a safe request.",
  };
  return messages[outcome] ?? "Proposal assistance is unavailable. Your event fields are unchanged.";
}

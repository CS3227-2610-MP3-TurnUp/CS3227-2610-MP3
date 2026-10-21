"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChatPanel, type ChatPanelProps } from "./chat-panel";
import styles from "./chat-panel.module.css";

/** Nonmodal presentation only; conversation state remains in the caller. */
export function ChatWidget(props: Omit<ChatPanelProps, "onClose">) {
  const [open, setOpen] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) {
      const target = popup.current?.querySelector<HTMLTextAreaElement>("textarea:not(:disabled)")
        ?? popup.current?.querySelector<HTMLButtonElement>('button[aria-label="Close chat"]');
      target?.focus({ preventScroll: true });
    }
  }, [open]);
  function close() { setOpen(false); launcher.current?.focus({ preventScroll: true }); }
  return <>
    <div id="event-chat-widget" className={styles.widget} hidden={!open} ref={popup} role="region" aria-label="Event assistant chat"
      onKeyDown={(event) => { if (event.key === "Escape" && !event.nativeEvent.isComposing) { event.stopPropagation(); close(); } }}>
      {open && <ChatPanel {...props} onClose={close} />}
    </div>
    <button ref={launcher} type="button" className={styles.launcher} aria-controls="event-chat-widget" aria-expanded={open}
      onClick={() => { if (open) close(); else setOpen(true); }}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-3 2V11.5A8.5 8.5 0 0 1 9.5 3h3a8.5 8.5 0 0 1 8.5 8.5Z" /></svg>
      <span>{open ? "Hide chat" : "Ask about this event"}</span>
    </button>
  </>;
}

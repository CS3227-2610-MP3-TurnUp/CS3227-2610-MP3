"use client";
import { useRef, useState } from "react";
import type { RegistrationActionResult } from "../../lib/registration-types";
export function RegistrationAction({ label, onAction, onCommitted }: { label: string; onAction: () => Promise<RegistrationActionResult>; onCommitted?: () => void }) {
  const [pending, setPending] = useState(false), [notice, setNotice] = useState("");
  const lock = useRef(false);
  async function act() {
    if (lock.current) return; lock.current = true; setPending(true); setNotice("");
    try {
      const result = await onAction();
      if (result.status === "committed") { setNotice("Registration updated."); try { onCommitted?.(); } catch { setNotice("Registration updated. Refresh to see its current status."); } }
      else setNotice(result.status === "conflict" ? "This registration changed. Refresh before trying again." : "Registration could not be updated. Refresh its status before retrying.");
    } catch { setNotice("Registration could not be updated. Refresh its status before retrying."); }
    finally { lock.current = false; setPending(false); }
  }
  return <div><button className="secondary event-danger" disabled={pending} onClick={act}>{pending ? "Updating…" : label}</button>{notice && <p role="status">{notice}</p>}</div>;
}

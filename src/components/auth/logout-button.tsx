"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error();
      router.replace("/login");
      router.refresh();
    } catch { setError("Logout could not be completed. Please try again."); }
    finally { setPending(false); }
  }
  return <div><button className="secondary" type="button" onClick={logout} disabled={pending}>{pending ? "Logging out…" : "Log out"}</button>
    {error && <p className="error-panel" role="alert">{error}</p>}</div>;
}

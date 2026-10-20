"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { LogoutButton } from "../auth/logout-button";

export function AccountMenu({ username }: { username: string }) {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);

  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !menu.current?.contains(event.target) && menu.current) menu.current.open = false;
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  return <nav className="account-navigation" aria-label="Account">
    <details className="account-menu" ref={menu}
      onKeyDown={(event) => {
        if (event.key === "Escape" && menu.current?.open) {
          event.preventDefault(); menu.current.open = false; trigger.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      }}>
      <summary ref={trigger} aria-label={`Account menu for ${username}`} title="Account menu">
        <span className="account-avatar" aria-hidden="true">{username.trim().charAt(0).toUpperCase()}</span>
        <span className="account-menu-name">{username}</span>
        <span className="account-menu-chevron" aria-hidden="true" />
      </summary>
      <div className="account-menu-items">
        <Link href="/account" aria-current={pathname === "/account" ? "page" : undefined}
          onClick={() => { if (menu.current) menu.current.open = false; }}>Profile</Link>
        <span className="account-menu-divider" aria-hidden="true" />
        <LogoutButton className="account-menu-logout" />
      </div>
    </details>
  </nav>;
}

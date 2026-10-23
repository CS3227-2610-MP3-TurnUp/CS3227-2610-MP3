"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "./account/account-menu";

/** Navigation follows the authenticated server-supplied role; it grants no access. */
export function WorkspaceHeader({ username, role }: { username: string; role: "STUDENT" | "ORGANISER" }) {
  const pathname = usePathname() ?? "";
  const student = role === "STUDENT";
  const home = student ? "/student" : "/organiser";
  const links = student
    ? [{ href: "/student", label: "Discover events" }, { href: "/student/my-events", label: "My Events" }]
    : [{ href: "/organiser", label: "Your events" }];

  return <header className="workspace-header">
    <Link className="brand" href={home} aria-label="TurnUp home">TurnUp</Link>
    <nav className="workspace-navigation" aria-label={student ? "Student navigation" : "Organiser navigation"}>
      {links.map(({ href, label }) => <Link key={href} href={href}
        aria-current={pathname === href ? "page" : pathname.startsWith(`${href}/`) && href !== "/student" ? "location" : undefined}>
        {label}
      </Link>)}
    </nav>
    <AccountMenu username={username} />
  </header>;
}

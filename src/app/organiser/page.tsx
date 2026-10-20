import Link from "next/link";
import { AccountMenu } from "../../components/account/account-menu";
import { requireRole } from "../../server/auth/guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function OrganiserPage() {
  const access = await requireRole("ORGANISER");
  if (access.status !== "granted") return <main className="workspace"><Link className="brand" href="/">TurnUp</Link><section className="card">
    <h1>{access.status === "denied" ? "Access unavailable" : "Account access is unavailable"}</h1>
    <p>{access.status === "denied" ? "This page is for Organiser accounts." : "Please try again later."}</p><Link href="/login">Go to login</Link>
  </section></main>;
  return <main className="workspace"><header className="workspace-header"><Link className="brand" href="/">TurnUp</Link><AccountMenu username={access.user.username} /></header>
    <section className="card"><p className="eyebrow">Organiser account</p><h1>Welcome, {access.user.username}</h1>
      <p>You are logged in as an Organiser.</p><p className="muted">Event preparation and publication are coming in a later update.</p></section></main>;
}

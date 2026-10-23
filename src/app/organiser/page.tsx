import Link from "next/link";
import { EventDashboard } from "../../components/events/dashboard";
import { WorkspaceHeader } from "../../components/workspace-header";
import { requireRole } from "../../server/auth/guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function OrganiserPage() {
  const access = await requireRole("ORGANISER");
  if (access.status !== "granted") return <main className="workspace"><Link className="brand" href="/">TurnUp</Link><section className="card">
    <h1>{access.status === "denied" ? "Access unavailable" : "Account access is unavailable"}</h1>
    <p>{access.status === "denied" ? "This page is for Organiser accounts." : "Please try again later."}</p><Link href="/login">Go to login</Link>
  </section></main>;
  return <main className="workspace"><WorkspaceHeader username={access.user.username} role={"ORGANISER"} />
    <EventDashboard /></main>;
}

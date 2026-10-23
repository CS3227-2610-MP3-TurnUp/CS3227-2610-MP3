import Link from "next/link";
import { WorkspaceHeader } from "../../../../components/workspace-header";
import { EventEditor } from "../../../../components/events/editor";
import { requireRole } from "../../../../server/auth/guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole("ORGANISER");
  if (access.status !== "granted") return <main className="workspace"><h1>Event access unavailable</h1><p>{access.status === "denied" ? "This page is for Organiser accounts." : "Please try again later."}</p><Link href="/login">Go to login</Link></main>;
  const { id } = await params;
  return <main className="workspace"><WorkspaceHeader username={access.user.username} role={"ORGANISER"} /><EventEditor key={id} id={id} /></main>;
}

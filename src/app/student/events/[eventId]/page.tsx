import Link from "next/link";
import { WorkspaceHeader } from "../../../../components/workspace-header";
import { StudentEventDetails } from "../../../../features/student/event-details";
import { requireRole } from "../../../../server/auth/guards";
import { localDevelopment } from "../../../../server/student-assistant/development-policy";
import { PublicationChat } from "../../../../features/student-assistant/publication-chat";
import { hostedPolicy } from "../../../../server/student-assistant/hosted-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function StudentEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const access = await requireRole("STUDENT");
  if (access.status !== "granted") return <main className="workspace workspace-with-assistant"><h1>Event access unavailable</h1>
    <p>{access.status === "denied" ? "This page is for Student accounts." : "Please try again later."}</p><Link href="/login">Go to login</Link></main>;
  const { eventId } = await params;
  return <main className="workspace workspace-with-assistant"><WorkspaceHeader username={access.user.username} role={"STUDENT"} />
    <StudentEventDetails key={eventId} eventId={eventId} />
    {(localDevelopment() || hostedPolicy()) && <PublicationChat key={`chat-${access.user.id}-${eventId}`} eventId={eventId} mode={localDevelopment() ? "local" : "hosted"} />}</main>;
}

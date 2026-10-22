import Link from "next/link";
import { AccountMenu } from "../../../../components/account/account-menu";
import { StudentEventDetails } from "../../../../features/student/event-details";
import { requireRole } from "../../../../server/auth/guards";
import { localDevelopment } from "../../../../server/student-assistant/development-policy";
import { PublicationChat } from "../../../../features/student-assistant/publication-chat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function StudentEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const access = await requireRole("STUDENT");
  if (access.status !== "granted") return <main className="workspace"><h1>Event access unavailable</h1>
    <p>{access.status === "denied" ? "This page is for Student accounts." : "Please try again later."}</p><Link href="/login">Go to login</Link></main>;
  const { eventId } = await params;
  return <main className="workspace"><header className="workspace-header"><Link className="brand" href="/student">TurnUp</Link><AccountMenu username={access.user.username} studentNavigation /></header>
    <StudentEventDetails key={eventId} eventId={eventId} />
    {localDevelopment() && <PublicationChat key={`chat-${eventId}`} eventId={eventId} />}</main>;
}

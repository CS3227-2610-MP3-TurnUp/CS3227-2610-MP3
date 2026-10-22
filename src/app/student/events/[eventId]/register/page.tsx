import Link from "next/link";
import { AccountMenu } from "../../../../../components/account/account-menu";
import { StudentRegistrationScreen } from "../../../../../features/student/registration-screen";
import { requireRole } from "../../../../../server/auth/guards";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function Page({ params }: { params: Promise<{ eventId: string }> }) {
  const access = await requireRole("STUDENT");
  if (access.status !== "granted") return <main className="workspace"><h1>Student access unavailable</h1><Link href="/login">Go to login</Link></main>;
  const { eventId } = await params;
  return <main className="workspace"><header className="workspace-header"><Link className="brand" href="/student">TurnUp</Link><AccountMenu username={access.user.username} studentNavigation /></header><StudentRegistrationScreen reference={eventId} /></main>;
}

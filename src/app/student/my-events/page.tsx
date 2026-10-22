import Link from "next/link";
import { AccountMenu } from "../../../components/account/account-menu";
import { StudentMyEvents } from "../../../features/student/registration-screen";
import { requireRole } from "../../../server/auth/guards";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function Page() {
  const access = await requireRole("STUDENT");
  if (access.status !== "granted") return <main className="workspace"><h1>Student access unavailable</h1><Link href="/login">Go to login</Link></main>;
  return <main className="workspace"><header className="workspace-header"><Link className="brand" href="/student">TurnUp</Link><AccountMenu username={access.user.username} studentNavigation /></header><StudentMyEvents /></main>;
}

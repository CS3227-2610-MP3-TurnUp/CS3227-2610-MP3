import Link from "next/link";
import { AccountMenu } from "../../components/account/account-menu";
import { StudentEventList } from "../../features/student/event-list";
import { requireRole } from "../../server/auth/guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function StudentPage() {
  const access = await requireRole("STUDENT");
  if (access.status !== "granted") return <main className="workspace"><Link className="brand" href="/">TurnUp</Link><section className="card">
    <h1>{access.status === "denied" ? "Access unavailable" : "Account access is unavailable"}</h1>
    <p>{access.status === "denied" ? "This page is for Student accounts." : "Please try again later."}</p><Link href="/login">Go to login</Link>
  </section></main>;
  return <main className="workspace"><header className="workspace-header"><Link className="brand" href="/student">TurnUp</Link><AccountMenu username={access.user.username} /></header>
    <StudentEventList /></main>;
}

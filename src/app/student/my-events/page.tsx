import Link from "next/link";
import { WorkspaceHeader } from "../../../components/workspace-header";
import { StudentMyEvents } from "../../../features/student/registration-screen";
import { requireRole } from "../../../server/auth/guards";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function Page() {
  const access = await requireRole("STUDENT");
  if (access.status !== "granted") return <main className="workspace"><h1>Student access unavailable</h1><Link href="/login">Go to login</Link></main>;
  return <main className="workspace"><WorkspaceHeader username={access.user.username} role={"STUDENT"} /><StudentMyEvents /></main>;
}

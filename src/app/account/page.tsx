import Link from "next/link";
import { cookies } from "next/headers";
import { CredentialsForm } from "../../components/account/credentials-form";
import { StudentProfileForm } from "../../components/account/student-profile-form";
import { AccountMenu } from "../../components/account/account-menu";
import { requireRole } from "../../server/auth/guards";
import { authConfig } from "../../server/auth/request-security";
import { cookieName } from "../../server/auth/session";
import { readSettings } from "../../server/accounts/service";
import { studentProfile } from "../../server/accounts/profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function AccountPage() {
  const access = await requireRole();
  if (access.status !== "granted") return <main className="workspace"><h1>Account settings are unavailable</h1><Link href="/login">Go to login</Link></main>;
  let settings: Awaited<ReturnType<typeof readSettings>> | null = null;
  let profile: Awaited<ReturnType<typeof studentProfile>> | null = null;
  try {
    const token = (await cookies()).get(cookieName(authConfig()))?.value;
    const { prisma } = await import("../../server/db/client");
    settings = await readSettings(prisma, token);
    profile = settings.role === "STUDENT" ? await studentProfile(prisma, token) : null;
  } catch { settings = null; }
  const content = settings
    ? <><CredentialsForm username={settings.username} credentialVersion={settings.credentialVersion} />{profile && <StudentProfileForm profile={profile} />}</>
    : <section className="card"><p role="alert">Settings are unavailable. Reload or log in again.</p><Link href="/login">Go to login</Link></section>;
  return <main className="workspace"><header className="workspace-header"><Link className="brand" href="/">TurnUp</Link><AccountMenu username={access.user.username} /></header>
    <div className="account-shell"><Link href={access.user.role === "STUDENT" ? "/student" : "/organiser"}>Back to your account</Link><h1>Account settings</h1>{content}</div></main>;
}

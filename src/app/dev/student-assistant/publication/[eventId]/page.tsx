import React from "react";
import { notFound } from "next/navigation";
import { localDevelopment } from "../../../../../server/student-assistant/development-policy";
export const dynamic = "force-dynamic";
export default async function PublicationInspectionPage({ params }: { params: Promise<{ eventId: string }> }) {
  if (!localDevelopment()) notFound();
  const { eventId } = await params;
  const { uuid } = await import("../../../../../server/events/policy");
  try { uuid(eventId); } catch { notFound(); }
  const { requireRole } = await import("../../../../../server/auth/guards");
  const access = await requireRole("STUDENT");
  if (access.status !== "granted") return <main><h1>Publication source inspection</h1><p>{access.status === "denied" ? "Student access required." : "Account access is unavailable. Try again later."}</p></main>;
  const { PublicationPreview } = await import("../../../../../features/student-assistant/publication-preview");
  return <PublicationPreview key={eventId} eventId={eventId} />;
}

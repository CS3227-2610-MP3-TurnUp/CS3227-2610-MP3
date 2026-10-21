import React from "react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudentAssistantPreviewPage() {
  // This fixture harness is never an unauthenticated product feature.
  if (process.env.NODE_ENV !== "development" || Boolean(process.env.VERCEL)) notFound();
  const { StudentAssistantPreview } = await import("./preview");
  const { localDevelopment } = await import("../../../server/student-assistant/development-policy");
  let liveAvailable = false;
  if (localDevelopment()) {
    const { readSoCConfig } = await import("../../../server/ai/soclaas-config");
    const { localAvailability } = await import("../../../server/student-assistant/local-admission");
    const config = readSoCConfig(process.env);
    if (config.ok) liveAvailable = await localAvailability(config.config);
  }
  return React.createElement(StudentAssistantPreview, { liveAvailable });
}

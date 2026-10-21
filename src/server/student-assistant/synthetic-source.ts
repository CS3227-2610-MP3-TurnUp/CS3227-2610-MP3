import "server-only";
import { SAMPLE_SOURCE, UPDATED_SOURCE, OTHER_SOURCE } from "../../features/student-assistant/demo/scenarios";
import { validateSource } from "../../features/student-assistant/evidence";

/** Trusted sample catalogue only. Not a current publication lookup or lifecycle service. */
export function syntheticSource(eventId: string, revision: string) {
  const selected = [SAMPLE_SOURCE, UPDATED_SOURCE, OTHER_SOURCE].find((source) => source.eventId === eventId && source.revision === revision);
  const result = validateSource(selected);
  return result.ok ? result.source : null;
}

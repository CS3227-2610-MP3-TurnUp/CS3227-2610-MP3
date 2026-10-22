import "server-only";
import { EventError } from "../events/policy";
import { discoverySearchError, type DiscoveryOptions } from "../../lib/registration-types";

export function discoveryOptions(params: URLSearchParams): DiscoveryOptions {
  const keys = [...params.keys()];
  if (keys.some((key) => !["search", "period"].includes(key)) ||
      new Set(keys).size !== keys.length) throw new EventError(400, "Use valid event search options.");
  const search = (params.get("search") ?? "").normalize("NFC").trim();
  const period = params.get("period") ?? "upcoming";
  if (discoverySearchError(search) || (period !== "upcoming" && period !== "past")) throw new EventError(400, "Use valid event search options.");
  return { search, period };
}

export function remainingCapacity(capacity: number, activeCount: number): number {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000 || !Number.isInteger(activeCount) || activeCount < 0 || activeCount > capacity) {
    throw new EventError(503, "Registration availability is unavailable. Try again later.");
  }
  return capacity - activeCount;
}
/** UI eligibility only; the transaction must repeat these guards with database time. */
export function registrationActions(eventState: "PUBLISHED" | "WITHDRAWN" | "CANCELLED", start: string, ownState: "ACTIVE" | "CANCELLED" | null, remaining: number, now: Date) {
  const instant = Date.parse(start);
  if (!Number.isFinite(instant) || !Number.isFinite(now.getTime()) || !Number.isInteger(remaining) || remaining < 0) throw new EventError(503, "Registration availability is unavailable. Try again later.");
  const beforeStart = now.getTime() < instant;
  return { canJoin: eventState === "PUBLISHED" && beforeStart && ownState === null && remaining > 0,
    canRejoin: eventState === "PUBLISHED" && beforeStart && ownState === "CANCELLED" && remaining > 0,
    canCancel: (eventState === "PUBLISHED" || eventState === "WITHDRAWN") && beforeStart && ownState === "ACTIVE",
    canCorrect: eventState === "PUBLISHED" && beforeStart && ownState === "ACTIVE" };
}

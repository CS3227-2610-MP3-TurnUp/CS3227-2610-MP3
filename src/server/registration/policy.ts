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

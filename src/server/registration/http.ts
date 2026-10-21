import "server-only";
import { NextResponse } from "next/server";
import { AuthError } from "../auth/policy";
import { authConfig } from "../auth/request-security";
import { presentedToken } from "../auth/session";
import { privateHeaders } from "../accounts/service";
import { EventError, uuid } from "../events/policy";
import { discoveryOptions } from "./policy";
import { discoverEvents, studentEvent } from "./queries";

function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof AuthError ? error.message : "Published events are unavailable. Try again later." },
    { status: error instanceof AuthError ? error.status : 503, headers: privateHeaders });
}
export async function studentEvents(request: Request) {
  try {
    const options = discoveryOptions(new URL(request.url).searchParams);
    const config = authConfig();
    const token = presentedToken(request.headers, config);
    const { prisma } = await import("../db/client");
    return NextResponse.json({ events: await discoverEvents(prisma, token, options) }, { headers: privateHeaders });
  } catch (error) { return failure(error); }
}
export async function studentEventResource(request: Request, eventId: string) {
  try {
    uuid(eventId);
    if ([...new URL(request.url).searchParams].length) throw new EventError(400, "Use the current event link.");
    const config = authConfig();
    const token = presentedToken(request.headers, config);
    const { prisma } = await import("../db/client");
    return NextResponse.json({ event: await studentEvent(prisma, token, eventId) }, { headers: privateHeaders });
  } catch (error) { return failure(error); }
}

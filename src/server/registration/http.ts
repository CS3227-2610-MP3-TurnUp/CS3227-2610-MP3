import "server-only";
import { NextResponse } from "next/server";
import { AuthError } from "../auth/policy";
import { authConfig, requireOrigin } from "../auth/request-security";
import { presentedToken } from "../auth/session";
import { privateHeaders } from "../accounts/service";
import { EventError, uuid } from "../events/policy";
import { discoveryOptions } from "./policy";
import { discoverEvents, studentEvent } from "./queries";

import { FormValidationError } from "../../lib/registration-form";
import { registrationJson } from "./request";
import { myRegistrations, registrationScreen } from "./queries";
import { mutateRegistration, mutateOwnRegistration } from "./service";

function failure(error: unknown) {
  if (error instanceof FormValidationError) return NextResponse.json({ issues: error.issues }, { status: 400, headers: privateHeaders });
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

export async function registrationResource(request: Request, kind: "join" | "list" | "correct" | "cancel", reference?: string) {
  try {
    if (reference) uuid(reference);
    if ([...new URL(request.url).searchParams].length) throw new EventError(400, "Use the current registration link.");
    const config = authConfig();
    if (request.method !== "GET") requireOrigin(request, config);
    const token = presentedToken(request.headers, config);
    const { prisma } = await import("../db/client");
    if (request.method === "GET") {
      const result = kind === "list" ? { registrations: await myRegistrations(prisma, token) } :
        { screen: await registrationScreen(prisma, token, reference!, kind === "correct") };
      return NextResponse.json(result, { headers: privateHeaders });
    }
    if (kind === "list") throw new EventError(405, "Use the registration form.");
    const body = await registrationJson(request);
    const result = kind === "join" ? await mutateRegistration(prisma, token, reference!, "JOIN", body) :
      await mutateOwnRegistration(prisma, token, reference!, kind === "cancel" ? "CANCEL" : "CORRECT", body);
    return NextResponse.json({ registration: result }, { headers: privateHeaders });
  } catch (error) { return failure(error); }
}

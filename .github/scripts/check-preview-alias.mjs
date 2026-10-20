const hostnamePattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/;

export async function checkPreviewAlias(env, fetchImpl = fetch) {
  if (env.DEPLOYMENT_TARGET !== "preview") return;
  const { PREVIEW_ALIAS: alias, VERCEL_PROJECT_ID: projectId, VERCEL_ORG_ID: ownerId, VERCEL_TOKEN: token } = env;
  const isTeam = /^team_[A-Za-z0-9]+$/.test(ownerId ?? "");
  const isPersonal = /^(usr_[A-Za-z0-9]+|[A-Za-z0-9]{24})$/.test(ownerId ?? "");
  if (!hostnamePattern.test(alias ?? "") || !projectId || !token || (!isTeam && !isPersonal)) {
    throw new Error("Preview alias safety check requires valid alias, project, owner and token configuration.");
  }

  let cursor;
  for (let page = 0; page < 20; page += 1) {
    const endpoint = new URL(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/domains`);
    endpoint.searchParams.set("production", "true");
    endpoint.searchParams.set("limit", "100");
    if (isTeam) endpoint.searchParams.set("teamId", ownerId);
    if (cursor !== undefined) endpoint.searchParams.set("until", String(cursor));
    const response = await fetchImpl(endpoint, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    if (!response.ok) throw new Error("Could not verify Production domains; Preview is blocked.");
    const result = await response.json();
    if (!Array.isArray(result?.domains) || !result.pagination ||
        !Object.hasOwn(result.pagination, "next")) {
      throw new Error("Invalid Production-domain response; Preview is blocked.");
    }
    for (const domain of result.domains) {
      if (typeof domain?.name !== "string" || domain.projectId !== projectId) {
        throw new Error("Invalid Production-domain record; Preview is blocked.");
      }
      if (domain.name.toLowerCase().replace(/\.$/, "") === alias) {
        throw new Error("PREVIEW_ALIAS is a Production hostname; Preview is blocked.");
      }
    }
    const next = result.pagination.next;
    if (next === null) return;
    if (!Number.isSafeInteger(next) || next < 0 || (cursor !== undefined && next >= cursor)) {
      throw new Error("Invalid Production-domain pagination; Preview is blocked.");
    }
    cursor = next;
  }
  throw new Error("Production-domain pagination limit reached; Preview is blocked.");
}

// Print only fixed diagnostics: provider bodies/errors may contain private data.
if (process.argv[1]?.endsWith("/check-preview-alias.mjs")) {
  try {
    await checkPreviewAlias(process.env);
  } catch {
    console.error("Preview alias safety check failed. Use a dedicated non-Production hostname and verify Vercel read access.");
    process.exitCode = 1;
  }
}

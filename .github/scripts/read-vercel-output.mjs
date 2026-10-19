import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Vercel 58.4.4's single-document YAML reader logs this to stdout and continues.
// Keep the pnpm 12 lockfile intact and separate only this known diagnostic.
const lockfileDiagnostic = `Error while parsing config file: "${resolve("pnpm-lock.yaml")}"`;
const lines = readFileSync(0, "utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const results = lines.filter((line) => line !== lockfileDiagnostic);

if (results.length !== lines.length) {
  console.error("Vercel CLI could not parse the pnpm 12 lockfile; separated its known diagnostic from the command result.");
}

try {
  if (results.length !== 1) throw new Error("Expected one result");
  const result = results[0];
  switch (process.argv[2]) {
    case "deployment-url": {
      const url = new URL(result);
      if (
        url.protocol !== "https:" ||
        !url.hostname.endsWith(".vercel.app") ||
        url.username || url.password || url.port ||
        (result !== url.origin && result !== `${url.origin}/`)
      ) throw new Error("Unexpected deployment URL");
      break;
    }
    case "http-status":
      if (!/^[1-5][0-9]{2}$/.test(result)) throw new Error("Unexpected HTTP status");
      break;
    default:
      throw new Error("Unsupported result type");
  }
  console.log(result);
} catch {
  // Never echo unexpected CLI output: it may contain credentials or private data.
  console.error("Vercel CLI output did not contain exactly one valid expected result.");
  process.exitCode = 1;
}

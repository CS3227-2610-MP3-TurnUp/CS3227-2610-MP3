import { realpathSync } from "node:fs";
import type { NextConfig } from "next";
import { relative, resolve, sep } from "node:path";

const projectRoot = process.cwd();
const pdfjsPackageRoot = realpathSync(resolve(projectRoot, "node_modules/pdfjs-dist"));
const pdfjsTraceRoot = relative(projectRoot, pdfjsPackageRoot).split(sep).join("/");

if (pdfjsTraceRoot === ".." || pdfjsTraceRoot.startsWith("../") || pdfjsTraceRoot.startsWith("/")) {
  throw new Error("pdfjs-dist must resolve inside the project for deployment tracing.");
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/organiser/events/*/proposal-extraction": [
      `./${pdfjsTraceRoot}/legacy/build/pdf.mjs`,
      `./${pdfjsTraceRoot}/legacy/build/pdf.worker.mjs`,
      `./${pdfjsTraceRoot}/standard_fonts/**/*`,
    ],
  },
};

export default nextConfig;

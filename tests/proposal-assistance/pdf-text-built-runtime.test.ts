import { copyFileSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import vm from "node:vm";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";

const buildRouteDirectory = process.env.PDF_TEXT_BUILD_DIR;

describe.skipIf(!buildRouteDirectory)("PDF.js production route artifact", () => {
  it("parses a synthetic PDF using only assets materialized from the route trace", async () => {
    const routePath = path.join(buildRouteDirectory!, "route.js");
    const tracePath = `${routePath}.nft.json`;
    const traceDirectory = path.dirname(tracePath);
    const routeBundle = readFileSync(routePath, "utf8");
    const trace = JSON.parse(readFileSync(tracePath, "utf8")) as { files?: unknown };
    expect(Array.isArray(trace.files)).toBe(true);

    const pdfjsTraceFiles = (trace.files as string[]).filter((file) =>
      file.replaceAll("\\", "/").includes("node_modules/pdfjs-dist/"),
    );
    expect(pdfjsTraceFiles.some((file) => file.endsWith("/legacy/build/pdf.mjs"))).toBe(true);
    expect(pdfjsTraceFiles.some((file) => file.endsWith("/legacy/build/pdf.worker.mjs"))).toBe(true);
    const standardFontFiles = pdfjsTraceFiles.filter((file) => file.includes("/standard_fonts/"));
    expect(standardFontFiles.length).toBeGreaterThan(0);

    const runtimeRoot = mkdtempSync(path.join(tmpdir(), "turnup-pdf-traced-runtime-"));
    try {
      for (const traceFile of pdfjsTraceFiles) {
        const normalized = traceFile.replaceAll("\\", "/");
        const packageMarker = "node_modules/pdfjs-dist/";
        const markerIndex = normalized.lastIndexOf(packageMarker);
        const packageRelativePath = normalized.slice(markerIndex + packageMarker.length);
        const sourcePath = path.resolve(traceDirectory, traceFile);
        const targetPath = path.join(runtimeRoot, "node_modules", "pdfjs-dist", packageRelativePath);
        expect(statSync(sourcePath).isFile()).toBe(true);
        mkdirSync(path.dirname(targetPath), { recursive: true });
        copyFileSync(sourcePath, targetPath);
      }

      const runtimeNodeModules = path.join(runtimeRoot, "node_modules");
      expect(statSync(runtimeNodeModules).isDirectory()).toBe(true);
      expect(lstatSync(runtimeNodeModules).isSymbolicLink()).toBe(false);
      const pdfModulePath = path.join(runtimeNodeModules, "pdfjs-dist/legacy/build/pdf.mjs");
      const pdfModule = await import(pathToFileURL(pdfModulePath).href);
      const compiledParser = findCompiledParser(routeBundle, routePath);
      const loader = compiledParser.match(/\b([A-Za-z_$][\w$]*)\.bind\(\1,(\d+)\)/);
      const [fsIdentifier, pathIdentifier, urlIdentifier, limitsIdentifier] = [
        compiledParser.match(/\b([A-Za-z_$][\w$]*)\.realpathSync/)?.[1],
        compiledParser.match(/\b([A-Za-z_$][\w$]*)\.resolve\)/)?.[1],
        compiledParser.match(/\b([A-Za-z_$][\w$]*)\.pathToFileURL/)?.[1],
        compiledParser.match(/\b([A-Za-z_$][\w$]*)\.hK/)?.[1],
      ];
      expect(loader).not.toBeNull();
      expect([fsIdentifier, pathIdentifier, urlIdentifier, limitsIdentifier].every(Boolean)).toBe(true);
      const runtimeBindings: Record<string, unknown> = {
        [fsIdentifier!]: await import("node:fs"),
        [pathIdentifier!]: await import("node:path"),
        [urlIdentifier!]: await import("node:url"),
        [limitsIdentifier!]: { hK: 4_000_000, Cp: 20, gY: 48_000 },
        process: { cwd: () => runtimeRoot },
        AbortSignal,
        TextDecoder,
        TextEncoder,
        Uint8Array,
        clearTimeout,
        setTimeout,
      };
      runtimeBindings[loader![1]!] = (moduleId: number) => {
        if (moduleId === Number(loader![2])) return pdfModule;
        throw new Error("Unexpected compiled PDF parser import");
      };
      const parser = vm.runInNewContext(`(${compiledParser})`, runtimeBindings) as (
        file: File,
      ) => Promise<{ ok: boolean; pageTexts?: string[]; outcome?: string }>;

      const result = await parser(asPdfFile(makePdf("Preview parser build check")));
      expect(result).toEqual({ ok: true, pageTexts: ["Preview parser build check"] });
    } finally {
      rmSync(runtimeRoot, { recursive: true, force: true });
    }
  });
});

function findCompiledParser(bundle: string, fileName: string): string {
  const source = ts.createSourceFile(fileName, bundle, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const candidates: ts.FunctionDeclaration[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.body) {
      const text = node.getText(source);
      if (
        text.includes("standard_fonts") &&
        text.includes("invalid_pdf") &&
        text.includes("parser_timeout")
      ) {
        candidates.push(node);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  expect(candidates).toHaveLength(1);
  return candidates[0]!.getText(source);
}

function asPdfFile(bytes: Uint8Array): File {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new File([buffer], "build-check.pdf", { type: "application/pdf" });
}

function makePdf(text: string): Uint8Array {
  const escaped = text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
  const content = `BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.7\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(new TextEncoder().encode(pdf).byteLength);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = new TextEncoder().encode(pdf).byteLength;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= objects.length; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

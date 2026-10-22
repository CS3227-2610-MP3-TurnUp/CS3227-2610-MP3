import "server-only";

import { createRequire } from "node:module";
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { MAX_PROPOSAL_PDF_BYTES, MAX_PROPOSAL_PDF_PAGES, MAX_PROPOSAL_TEXT_BYTES } from "../../features/proposal-assistance/limits";

export { MAX_PROPOSAL_PDF_BYTES, MAX_PROPOSAL_PDF_PAGES, MAX_PROPOSAL_TEXT_BYTES };
const PDF_PARSE_TIMEOUT_MS = 8_000;

export type PdfTextFailure =
  | "unsupported_file"
  | "file_too_large"
  | "too_many_pages"
  | "empty_or_unreadable"
  | "encrypted_pdf"
  | "invalid_pdf"
  | "parser_timeout"
  | "cancelled"
  | "text_too_large";

export type PdfTextResult =
  | { ok: true; pageTexts: string[] }
  | { ok: false; outcome: PdfTextFailure };

/** Parse one bounded, text-based PDF in memory. The source bytes and page text are never cached. */
export async function extractPdfPageText(file: File, signal?: AbortSignal): Promise<PdfTextResult> {
  if (!isPdfFile(file)) return { ok: false, outcome: "unsupported_file" };
  if (signal?.aborted) return { ok: false, outcome: "cancelled" };
  if (file.size > MAX_PROPOSAL_PDF_BYTES) return { ok: false, outcome: "file_too_large" };

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { ok: false, outcome: "empty_or_unreadable" };
  }
  if (signal?.aborted) {
    bytes.fill(0);
    return { ok: false, outcome: "cancelled" };
  }
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PROPOSAL_PDF_BYTES) {
    const outcome = bytes.byteLength > MAX_PROPOSAL_PDF_BYTES ? "file_too_large" : "empty_or_unreadable";
    bytes.fill(0);
    return { ok: false, outcome };
  }
  if (!hasPdfHeader(bytes)) {
    bytes.fill(0);
    return { ok: false, outcome: "invalid_pdf" };
  }

  const loadingTaskPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then(({ getDocument }) => {
    const require = createRequire(`${process.cwd()}/package.json`);
    const resolvedModule = realpathSync(require.resolve("pdfjs-dist/legacy/build/pdf.mjs"));
    const standardFontDataUrl = new URL("../../../standard_fonts/", pathToFileURL(resolvedModule)).href;
    return getDocument({
      data: bytes,
      standardFontDataUrl,
      useSystemFonts: true,
      stopAtErrors: true,
      disableAutoFetch: true,
      disableStream: true,
      // Proposal source text and embedded font names are user-controlled data.
      verbosity: 0,
    });
  });

  let loadingTask: Awaited<typeof loadingTaskPromise> | undefined;
  let timedOut = false;
  let cancelled = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const parsed = (async (): Promise<PdfTextResult> => {
    try {
      loadingTask = await loadingTaskPromise;
      if (cancelled) {
        await loadingTask.destroy().catch(() => undefined);
        return { ok: false, outcome: "cancelled" };
      }
      if (timedOut) {
        await loadingTask.destroy().catch(() => undefined);
        return { ok: false, outcome: "parser_timeout" };
      }
      const document = await loadingTask.promise;
      if (document.numPages > MAX_PROPOSAL_PDF_PAGES) return { ok: false, outcome: "too_many_pages" };

      const pageTexts: string[] = [];
      let totalBytes = 0;
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        try {
          const content = await page.getTextContent();
          const text = content.items
            .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
            .filter(Boolean)
            .join(" ")
            .trim();
          totalBytes += new TextEncoder().encode(text).byteLength;
          if (totalBytes > MAX_PROPOSAL_TEXT_BYTES) return { ok: false, outcome: "text_too_large" };
          pageTexts.push(text);
        } finally {
          page.cleanup();
        }
      }

      if (pageTexts.length === 0 || pageTexts.every((text) => text.length === 0)) {
        return { ok: false, outcome: "empty_or_unreadable" };
      }
      return { ok: true, pageTexts };
    } catch (error) {
      if (timedOut) return { ok: false, outcome: "parser_timeout" };
      if (cancelled) return { ok: false, outcome: "cancelled" };
      if (isPasswordError(error)) return { ok: false, outcome: "encrypted_pdf" };
      return { ok: false, outcome: "invalid_pdf" };
    } finally {
      if (loadingTask) {
        try {
          await loadingTask.destroy();
        } catch {
          // Parser cleanup is best-effort; no parse data or diagnostic is returned.
        }
      }
      try {
        // PDF.js may transfer and detach the backing buffer while starting its worker.
        bytes.fill(0);
      } catch {
        // A detached buffer is already inaccessible to this request.
      }
    }
  })();

  const timeoutPromise = new Promise<PdfTextResult>((resolve) => {
    timeout = setTimeout(() => {
      timedOut = true;
      if (loadingTask) void loadingTask.destroy().catch(() => undefined);
      resolve({ ok: false, outcome: "parser_timeout" });
    }, PDF_PARSE_TIMEOUT_MS);
  });
  let removeAbortListener: () => void = () => {};
  const cancellationPromise = new Promise<PdfTextResult>((resolve) => {
    if (!signal) return;
    const onAbort = () => {
      cancelled = true;
      if (loadingTask) void loadingTask.destroy().catch(() => undefined);
      resolve({ ok: false, outcome: "cancelled" });
    };
    signal.addEventListener("abort", onAbort, { once: true });
    removeAbortListener = () => signal.removeEventListener("abort", onAbort);
    if (signal.aborted) onAbort();
  });

  try {
    return await Promise.race([parsed, timeoutPromise, cancellationPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
    removeAbortListener();
  }
}

function isPdfFile(file: File): boolean {
  return (
    (file.type === "application/pdf" || file.type === "") &&
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function hasPdfHeader(bytes: Uint8Array): boolean {
  const headerWindow = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 1024)));
  return headerWindow.includes("%PDF-");
}

function isPasswordError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === "PasswordException";
}

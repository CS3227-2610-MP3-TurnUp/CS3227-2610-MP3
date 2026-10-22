import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { MAX_PROPOSAL_PDF_BYTES } from "../../src/features/proposal-assistance/limits";
import { extractPdfPageText } from "../../src/server/proposal-assistance/pdf-text";

function makePdf(pageTexts: readonly string[], encrypted = false, fontName = "Helvetica"): Uint8Array {
  const objects: string[] = [];
  const pageIds = pageTexts.map((_, index) => 3 + index * 2);
  const fontId = 3 + pageTexts.length * 2;
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageTexts.length} >>`);
  pageTexts.forEach((text, index) => {
    const pageId = pageIds[index]!;
    const contentId = pageId + 1;
    const escaped = text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
    const textOperands = escaped.match(/.{1,1000}/g) ?? [""];
    const content = `BT /F1 12 Tf 72 720 Td ${textOperands.map((part) => `(${part}) Tj`).join(" ")} ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1000000 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /${fontName} >>`);
  const encryptionId = fontId + 1;
  if (encrypted) objects.push("<< /Filter /Standard /V 1 /R 2 /O <4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f> /U <5555555555555555555555555555555555555555555555555555555555555555> /P -4 >>");
  let pdf = "%PDF-1.7\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).byteLength);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = new TextEncoder().encode(pdf).byteLength;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= objects.length; id += 1) pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  const encryptionTrailer = encrypted ? ` /Encrypt ${encryptionId} 0 R /ID [<0123456789ABCDEF0123456789ABCDEF><0123456789ABCDEF0123456789ABCDEF>]` : "";
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R${encryptionTrailer} >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function asFile(bytes: Uint8Array, name = "sample.pdf", type = "application/pdf"): File {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return new File([copy], name, { type });
}

describe("temporary proposal PDF parser", () => {
  it("extracts embedded page text in memory", async () => {
    expect(await extractPdfPageText(asFile(makePdf(["Campus Orchestra Night"]))))
      .toEqual({ ok: true, pageTexts: ["Campus Orchestra Night"] });
  });

  it("rejects malformed, encrypted, textless, excessive and unsupported PDFs", async () => {
    expect(await extractPdfPageText(asFile(new TextEncoder().encode("%PDF-broken")))).toEqual({ ok: false, outcome: "invalid_pdf" });
    expect(await extractPdfPageText(asFile(makePdf([""], true)))).toEqual({ ok: false, outcome: "encrypted_pdf" });
    expect(await extractPdfPageText(asFile(makePdf([""])))).toEqual({ ok: false, outcome: "empty_or_unreadable" });
    expect(await extractPdfPageText(asFile(makePdf(Array.from({ length: 21 }, (_, index) => `Page ${index + 1}`)))))
      .toEqual({ ok: false, outcome: "too_many_pages" });
    expect(await extractPdfPageText(asFile(makePdf(["file"]), "source.txt"))).toEqual({ ok: false, outcome: "unsupported_file" });
    expect(await extractPdfPageText(asFile(makePdf(["file"]), "source.pdf", "text/plain"))).toEqual({ ok: false, outcome: "unsupported_file" });
    expect(await extractPdfPageText(asFile(new Uint8Array(MAX_PROPOSAL_PDF_BYTES + 1)))).toEqual({ ok: false, outcome: "file_too_large" });
  });

  it("applies the embedded-text ceiling and honours cancellation before parsing", async () => {
    expect(await extractPdfPageText(asFile(makePdf(["A".repeat(48_001)]))))
      .toEqual({ ok: false, outcome: "text_too_large" });
    const controller = new AbortController();
    controller.abort();
    expect(await extractPdfPageText(asFile(makePdf(["Event"])), controller.signal)).toEqual({ ok: false, outcome: "cancelled" });
  });

  it("does not print a source-controlled font name while parsing", async () => {
    const marker = "SYNTHETIC_PRIVATE_FONT_MARKER";
    const methods = ["debug", "error", "info", "log", "warn"] as const;
    const spies = methods.map((method) => vi.spyOn(console, method).mockImplementation(() => {}));
    try {
      expect(await extractPdfPageText(asFile(makePdf(["Local demo text"], false, marker)))).toMatchObject({ ok: true });
      const renderedOutput = spies.flatMap((spy) => spy.mock.calls).flat().map(String).join(" ");
      expect(renderedOutput).not.toContain(marker);
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });
});

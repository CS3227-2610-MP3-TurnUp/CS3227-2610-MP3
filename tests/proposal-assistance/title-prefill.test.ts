import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { prepareEventPrefill } from "../../src/features/proposal-assistance/event-prefill";
import { extractPdfPageText } from "../../src/server/proposal-assistance/pdf-text";
import { processProposalExtraction, type ProposalCompletion } from "../../src/server/proposal-assistance/processor";

const guideLines = [
  "Campus Circuit Workshop",
  "Purpose: Students build and test a simple LED circuit.",
  "Start: 14 November 2026, 2:00 pm Singapore time (UTC+08:00).",
  "End: 14 November 2026, 4:00 pm Singapore time (UTC+08:00).",
  "Location: Cedar Hall.",
  "Capacity: 20 students.",
  "Fee: Free admission.",
  "Open to: All students using TurnUp.",
  "Preparation: Bring a laptop. No prior electronics experience is required.",
] as const;
const flattenedGuide = guideLines.join(" ");
const guideTitle = "Campus Circuit Workshop";

describe("guide heading title capture through PDF extraction and prefill", () => {
  it("keeps an unlabeled heading through flattening, schema prompt, exact evidence validation and EventEditor mapping", async () => {
    const pdf = asFile(makePdfWithTextItems(guideLines));
    const pageResult = await extractPdfPageText(pdf);
    expect(pageResult).toEqual({ ok: true, pageTexts: [flattenedGuide] });
    if (!pageResult.ok) return;

    const completion: ProposalCompletion = vi.fn(async ({ user }) => {
      const prompt = JSON.parse(user) as {
        fields: string[];
        fieldLabels: Record<string, string>;
        fieldLimits: Record<string, string>;
        pages: Array<{ text: string }>;
        schema: { properties: { facts: { required: string[] } } };
      };
      expect(prompt.pages[0]?.text).toBe(flattenedGuide);
      expect(prompt.fields).toContain("title");
      expect(prompt.schema.properties.facts.required).toContain("title");
      expect(prompt.fieldLabels.title).toContain("event heading");
      expect(prompt.fieldLimits.title).toContain(
        'facts.title = {"status":"known","value":"Campus Circuit Workshop","evidence":[{"quote":"Campus Circuit Workshop","page":1}]}',
      );

      return {
        ok: true as const,
        text: JSON.stringify({
          facts: {
            title: {
              status: "known",
              value: guideTitle,
              evidence: [{ quote: guideTitle, page: 1 }],
            },
          },
          privateFindings: [],
        }),
      };
    });

    const processed = await processProposalExtraction(pageResult.pageTexts, completion);
    expect(processed.ok).toBe(true);
    if (!processed.ok) return;
    expect(processed.value.facts.title).toEqual({
      status: "known",
      value: guideTitle,
      evidence: [{ quote: guideTitle, page: 1 }],
    });

    const prefill = prepareEventPrefill(processed.value);
    expect(prefill.values.title).toBe(guideTitle);
    expect(prefill.feedback.title).toEqual({
      status: "prefilled",
      generatedValue: guideTitle,
      evidence: [{ quote: guideTitle, page: 1 }],
    });
  });
});

function makePdfWithTextItems(items: readonly string[]): Uint8Array {
  const pageId = 3;
  const contentId = 4;
  const fontId = 5;
  const textOperators = items.map((item) => `(${escapePdfString(item)}) Tj T*`).join(" ");
  const content = `BT /F1 12 Tf 72 720 Td ${textOperators} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    `<< /Length ${new TextEncoder().encode(content).byteLength} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.7\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).byteLength);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = new TextEncoder().encode(pdf).byteLength;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= objects.length; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function escapePdfString(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function asFile(bytes: Uint8Array): File {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return new File([copy], "synthetic-guide.pdf", { type: "application/pdf" });
}

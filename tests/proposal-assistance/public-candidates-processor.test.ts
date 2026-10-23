import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  MAX_PUBLIC_CANDIDATE_QUESTIONS,
  MAX_PUBLIC_CANDIDATE_QUESTION_LENGTH,
  MAX_PUBLIC_CANDIDATE_REFERENCES,
  MAX_PUBLIC_CANDIDATE_QUOTE_LENGTH,
  PUBLIC_CANDIDATE_PROMPT_VERSION,
  type PublicCandidateSource,
} from "../../src/features/proposal-assistance/public-candidates";
import { buildPublicCandidateInput, PUBLIC_CANDIDATE_SYSTEM_PROMPT } from "../../src/server/proposal-assistance/public-candidates/prompt";
import {
  parsePublicCandidateResponse,
  processPublicCandidates,
  PUBLIC_CANDIDATE_REJECTION_CODES,
  type PublicCandidateRejectionCode,
} from "../../src/server/proposal-assistance/public-candidates/processor";

const source: PublicCandidateSource = {
  title: "Campus Design Workshop",
  description: "You will practise user research methods.",
  start: "14/11/2026, 09:00 PM SGT",
  end: "14/11/2026, 10:00 PM SGT",
  location: "Zoom; join with the link sent after registration",
  capacity: "80",
  fee: "Free",
  openTo: "NUS students",
  preparation: "Bring a laptop",
  other: "",
};

const validModelResponse = {
  faqs: [
    {
      question: "How can attendees join remotely?",
      references: [
        { field: "location", quote: "Zoom" },
        { field: "location", quote: "join with the link sent after registration" },
      ],
    },
    { question: "What should attendees bring?", references: [{ field: "preparation", quote: "Bring a laptop" }] },
    { question: "Will a recording be shared?", references: [] },
  ],
};

describe("public FAQ prompt and strict processor", () => {
  it("builds a versioned FAQ-only prompt from allowlisted saved public fields", () => {
    const input = buildPublicCandidateInput(source);
    expect(input.system).toBe(PUBLIC_CANDIDATE_SYSTEM_PROMPT);
    const body = JSON.parse(input.user) as Record<string, unknown>;
    expect(body.promptVersion).toBe(PUBLIC_CANDIDATE_PROMPT_VERSION);
    expect(PUBLIC_CANDIDATE_PROMPT_VERSION).toBe("CHG-K-012-public-candidates-v3");
    expect(body.source).toEqual(source);
    expect(body.schema).toEqual({ faqs: [{ question: "string", references: [{ field: "allowed field name", quote: "exact source quote" }] }] });
    expect(input.user).not.toContain("preparationRevision");
    expect(input.user).not.toContain("privateFindings");
    expect(input.user).not.toContain("resolvedBy");
    expect(input.system).toContain("eligibility, fees, attendance and schedule, preparation");
    expect(input.system).toContain("Prioritize relevant questions that can be answered by supported facts already present");
    expect(input.system).toContain("exactly one root property, faqs");
    expect(input.system).toContain("one to six objects");
    expect(input.system).toContain('"question":"Will there be a recording?","references":[]');
    expect(input.system).toContain("Never write an answer");
    expect(input.system).not.toContain("description candidate");
  });

  it("derives supported FAQ answers only from exact quotes and separates unanswered questions", async () => {
    const complete = vi.fn().mockResolvedValue({ ok: true, text: JSON.stringify(validModelResponse) });
    const result = await processPublicCandidates(source, complete);
    expect(result).toEqual({
      ok: true,
      value: {
        answeredFaqs: [
          {
            question: "How can attendees join remotely?",
            answer: "Zoom join with the link sent after registration",
            references: validModelResponse.faqs[0].references,
          },
          {
            question: "What should attendees bring?",
            answer: "Bring a laptop",
            references: validModelResponse.faqs[1].references,
          },
        ],
        unansweredQuestions: ["Will a recording be shared?"],
        renderedOther: "Q: How can attendees join remotely?\nA: Zoom join with the link sent after registration\n\nQ: What should attendees bring?\nA: Bring a laptop",
      },
    });
    expect(result.ok && result.value).not.toHaveProperty("description");
    expect(complete).toHaveBeenCalledOnce();
    expect(complete.mock.calls[0][0]).toHaveProperty("system", PUBLIC_CANDIDATE_SYSTEM_PROMPT);
  });

  it("rejects model-authored answers, extra keys, unsupported references and altered quotes", () => {
    const freeAnswer = structuredClone(validModelResponse) as typeof validModelResponse & { faqs: Array<Record<string, unknown>> };
    freeAnswer.faqs[0]!.answer = "Join on the event website";
    expect(parsePublicCandidateResponse(JSON.stringify(freeAnswer), source)).toMatchObject({ ok: false, outcome: "invalid_response", rejectionCode: "FAQ_ITEM_SHAPE" });

    const unknownField = structuredClone(validModelResponse);
    (unknownField.faqs[0]!.references[0] as { field: string }).field = "attendeeAnswers";
    expect(parsePublicCandidateResponse(JSON.stringify(unknownField), source)).toMatchObject({ ok: false, outcome: "invalid_response", rejectionCode: "FAQ_REFERENCE_INVALID" });

    const altered = structuredClone(validModelResponse);
    altered.faqs[0]!.references[0]!.quote = "Zoom link";
    expect(parsePublicCandidateResponse(JSON.stringify(altered), source)).toMatchObject({ ok: false, outcome: "invalid_response", rejectionCode: "FAQ_REFERENCE_INVALID" });

    expect(parsePublicCandidateResponse(JSON.stringify({ ...validModelResponse, description: "extra candidate" }), source))
      .toMatchObject({ ok: false, outcome: "invalid_response", rejectionCode: "ROOT_SHAPE" });
    expect(parsePublicCandidateResponse(JSON.stringify({ description: "legacy output", references: [], faqs: [] }), source))
      .toMatchObject({ ok: false, outcome: "invalid_response", rejectionCode: "ROOT_SHAPE" });
  });

  it("requires a nonempty FAQ list and rejects malformed, wrapped or truncated JSON", async () => {
    expect(parsePublicCandidateResponse("{truncated", source)).toMatchObject({ ok: false, rejectionCode: "JSON_SYNTAX" });
    expect(parsePublicCandidateResponse(`\`\`\`json\n${JSON.stringify(validModelResponse)}\n\`\`\``, source))
      .toMatchObject({ ok: false, outcome: "invalid_response", rejectionCode: "JSON_SYNTAX" });
    expect(parsePublicCandidateResponse(JSON.stringify({ faqs: [] }), source))
      .toMatchObject({ ok: false, outcome: "invalid_response", rejectionCode: "FAQ_LIST_BOUND" });

    const tooManyQuestions = {
      faqs: Array.from({ length: MAX_PUBLIC_CANDIDATE_QUESTIONS + 1 }, () => ({ question: "Gap?", references: [] })),
    };
    expect(parsePublicCandidateResponse(JSON.stringify(tooManyQuestions), source))
      .toMatchObject({ ok: false, outcome: "invalid_response", rejectionCode: "FAQ_LIST_BOUND" });

    const lengthLimited = vi.fn().mockResolvedValue({ ok: true, text: JSON.stringify(validModelResponse), finishReason: "length" });
    await expect(processPublicCandidates(source, lengthLimited)).resolves.toEqual({
      ok: false,
      outcome: "invalid_response",
      rejectionCode: "OUTPUT_TOKEN_LIMIT",
    });
  });

  it("enforces question, reference, quote and Other bounds without truncation", () => {
    const longQuestion = { faqs: [{ question: "Q".repeat(MAX_PUBLIC_CANDIDATE_QUESTION_LENGTH + 1), references: [] }] };
    expect(parsePublicCandidateResponse(JSON.stringify(longQuestion), source))
      .toMatchObject({ ok: false, outcome: "invalid_response", rejectionCode: "FAQ_QUESTION_BOUND" });

    const tooManyRefs = {
      faqs: [{ question: "Q?", references: Array.from({ length: MAX_PUBLIC_CANDIDATE_REFERENCES + 1 }, () => ({ field: "title", quote: "Campus" })) }],
    };
    expect(parsePublicCandidateResponse(JSON.stringify(tooManyRefs), source))
      .toMatchObject({ ok: false, outcome: "invalid_response", rejectionCode: "FAQ_REFERENCE_INVALID" });

    const longQuote = "x".repeat(MAX_PUBLIC_CANDIDATE_QUOTE_LENGTH + 1);
    const longSource = { ...source, description: longQuote };
    const longCitation = { faqs: [{ question: "What is planned?", references: [{ field: "description", quote: longQuote }] }] };
    expect(parsePublicCandidateResponse(JSON.stringify(longCitation), longSource))
      .toMatchObject({ ok: false, outcome: "invalid_response", rejectionCode: "FAQ_REFERENCE_INVALID" });

    const quote = "x".repeat(MAX_PUBLIC_CANDIDATE_QUOTE_LENGTH);
    const largeSource = { ...source, description: [quote, "y".repeat(300), "z".repeat(300)].join("|") };
    const oversizedOther = {
      faqs: Array.from({ length: MAX_PUBLIC_CANDIDATE_QUESTIONS }, (_, index) => ({
        question: `Question ${index}?`,
        references: [
          { field: "description", quote },
          { field: "description", quote: "y".repeat(300) },
          { field: "description", quote: "z".repeat(300) },
        ],
      })),
    };
    expect(parsePublicCandidateResponse(JSON.stringify(oversizedOther), largeSource))
      .toMatchObject({ ok: false, outcome: "invalid_response", rejectionCode: "OTHER_BOUND" });
  });

  it("classifies every rejection with a finite server-only code while keeping the client outcome generic", async () => {
    const providerInvalid = await processPublicCandidates(source, vi.fn().mockResolvedValue({ ok: false, outcome: "invalid_response" }));
    expect(providerInvalid).toEqual({ ok: false, outcome: "invalid_response", rejectionCode: "PROVIDER_INVALID_RESPONSE" });

    const questionLength = {
      faqs: [{ question: "Q".repeat(MAX_PUBLIC_CANDIDATE_QUESTION_LENGTH + 1), references: [] }],
    };
    const quote = "a".repeat(225);
    const boundarySource: PublicCandidateSource = {
      ...source,
      title: "x".repeat(15_593),
      description: quote,
      start: "",
      end: "",
      location: "b".repeat(225),
      capacity: "",
      fee: "",
      openTo: "",
      preparation: "",
      other: "",
    };
    const repeatedQuestions = {
      faqs: Array.from({ length: MAX_PUBLIC_CANDIDATE_QUESTIONS }, () => ({
        question: `${"q".repeat(MAX_PUBLIC_CANDIDATE_QUESTION_LENGTH - 1)}?`,
        references: [
          { field: "description", quote },
          { field: "location", quote: "b".repeat(225) },
        ],
      })),
    };
    const totalSize = parsePublicCandidateResponse(JSON.stringify(repeatedQuestions), boundarySource);
    expect(totalSize).toMatchObject({ ok: false, rejectionCode: "TOTAL_PUBLIC_BOUND" });

    const otherQuote = "x".repeat(MAX_PUBLIC_CANDIDATE_QUOTE_LENGTH);
    const otherBoundSource = { ...source, description: [otherQuote, "y".repeat(300), "z".repeat(300)].join("|") };
    const otherBoundResponse = {
      faqs: Array.from({ length: MAX_PUBLIC_CANDIDATE_QUESTIONS }, (_, index) => ({
        question: `Question ${index}?`,
        references: [
          { field: "description", quote: otherQuote },
          { field: "description", quote: "y".repeat(300) },
          { field: "description", quote: "z".repeat(300) },
        ],
      })),
    };

    const parserCases: Array<{ code: PublicCandidateRejectionCode; raw: string; source?: PublicCandidateSource }> = [
      { code: "JSON_SYNTAX", raw: "{truncated" },
      { code: "ROOT_SHAPE", raw: JSON.stringify({ description: "legacy", references: [], faqs: [] }) },
      { code: "FAQ_LIST_BOUND", raw: JSON.stringify({ faqs: [] }) },
      { code: "FAQ_ITEM_SHAPE", raw: JSON.stringify({ faqs: [{ question: "Can I join?", references: [], answer: "yes" }] }) },
      { code: "FAQ_QUESTION_BOUND", raw: JSON.stringify(questionLength) },
      { code: "FAQ_REFERENCE_INVALID", raw: JSON.stringify({ faqs: [{ question: "Where?", references: [{ field: "location", quote: "not present" }] }] }) },
      { code: "OTHER_BOUND", raw: JSON.stringify(otherBoundResponse), source: otherBoundSource },
      { code: "TOTAL_PUBLIC_BOUND", raw: JSON.stringify(repeatedQuestions), source: boundarySource },
    ];

    const parserCodes = parserCases.map(({ code }) => code);
    const lengthLimited = await processPublicCandidates(source, vi.fn().mockResolvedValue({
      ok: true,
      text: JSON.stringify({ faqs: [{ question: "Gap?", references: [] }] }),
      finishReason: "length",
    }));
    expect(lengthLimited).toEqual({ ok: false, outcome: "invalid_response", rejectionCode: "OUTPUT_TOKEN_LIMIT" });
    const observed = new Set<PublicCandidateRejectionCode>([
      ...parserCodes,
      (providerInvalid as { rejectionCode: PublicCandidateRejectionCode }).rejectionCode,
      (lengthLimited as { rejectionCode: PublicCandidateRejectionCode }).rejectionCode,
    ]);
    expect(observed).toEqual(new Set(PUBLIC_CANDIDATE_REJECTION_CODES));

    for (const { code, raw, source: caseSource } of parserCases) {
      expect(parsePublicCandidateResponse(raw, caseSource ?? source)).toEqual({
        ok: false,
        outcome: "invalid_response",
        rejectionCode: code,
      });
    }
  });
});

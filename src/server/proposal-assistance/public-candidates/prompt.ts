import {
  PUBLIC_CANDIDATE_PROMPT_VERSION,
  type PublicCandidateSource,
} from "../../../features/proposal-assistance/public-candidates";
import { END_OF_UNTRUSTED_DATA, untrustedDataRules } from "../prompt-safety";

export const PUBLIC_CANDIDATE_SYSTEM_PROMPT = [
  untrustedDataRules("source"),
  "Suggest one to six questions that prospective participants commonly ask and that the event page does not",
  "already answer. The page already shows title, description, start, end, location, capacity, fee, openTo and",
  "preparation, so never ask a question whose answer only restates one of those fields; for example, do not ask",
  "about the fee, date or time, venue, capacity, who may attend or required preparation. The application handles",
  "registration, places left and registration status; do not ask about them.",
  "Choose topics that fit this kind of event from: organiser and contact (who organises it; who to contact on the",
  "day or in an emergency); arrival and check-in (when to arrive, what to show, joining late or leaving early);",
  "getting there and accessibility; attendance rules (attending every session, attendance taking); cancellation",
  "and changes (cancelling, how changes are announced, wet-weather plans); food and dietary needs; dress code and",
  "safety requirements; online participation requirements; recording, photos and shared materials; certificates",
  "or other recognition; bringing guests or forming teams; competition judging, prizes and deadlines; language of",
  "delivery and suitability for beginners when openTo and preparation are silent.",
  "Return only one JSON object with exactly one root property, faqs. Its value must be an array containing one",
  "to six objects. Each FAQ object has exactly question and references. Do not return description, answers, a",
  "schema/promptVersion wrapper, or any other property.",
  "Shape example only (synthetic source and valid output; do not reuse its facts). Source JSON:",
  '{"fee":"Free","other":"Lunch is provided."}. Valid output JSON:',
  '{"faqs":[{"question":"Will food be provided?","references":[{"field":"other","quote":"Lunch is provided."}]},{"question":"Who can I contact on the day?","references":[]}]}',
  "",
  "Each nonempty FAQ reference names one supplied field and copies a short contiguous quote exactly, including",
  "punctuation. Do not paraphrase, stitch quotes,",
  "alter whitespace, or cite a field that does not contain the quote.",
  "",
  "For each possible FAQ, provide only its concise question and zero to three exact supporting references.",
  "Never write an answer. The application derives any suggested answer only from the references. Most questions",
  "should be unanswered gaps with an empty references array; the Organiser answers them. Cite references only when",
  "a specific detail in description or other answers the question without restating a whole field. Do not mark",
  "information stated in other or description unanswered. Never invent contact details, names, links, phone",
  "numbers or email addresses; a contact question is unanswered unless description or other already states that",
  "contact.",
  "Keep each question within 200 Unicode characters, provide at least one question and no more than six, and keep",
  "each quote within 300 Unicode characters.",
  "",
  "Allowed reference field names are exactly: title, description, start, end, location, capacity, fee, openTo,",
  "preparation, other. The supplied start/end are human-readable Singapore-time values; capacity is text.",
  "Do not add fields, confidence, instructions, markup, or text outside the JSON object.",
].join(" ");

export type PublicCandidateInput = { system: string; user: string };

export function buildPublicCandidateInput(source: PublicCandidateSource): PublicCandidateInput {
  return {
    system: PUBLIC_CANDIDATE_SYSTEM_PROMPT,
    user: JSON.stringify({
      promptVersion: PUBLIC_CANDIDATE_PROMPT_VERSION,
      task: "Suggest relevant participant FAQ questions from these saved public event fields.",
      schema: {
        faqs: [{
          question: "string",
          references: [{ field: "allowed field name", quote: "exact source quote" }],
        }],
      },
      source,
      reminder: END_OF_UNTRUSTED_DATA,
    }),
  };
}

import {
  MAX_PRIVATE_FINDING_CHARS,
  MAX_PRIVATE_FINDINGS,
  parseProposalFinding,
  type ValidationResult,
} from "./validation";
import { PROPOSAL_FIELDS, type PrivateExtraction, type ProposalField } from "./types";

const MAX_RESPONSE_BYTES = 262_144;
const MAX_JSON_DEPTH = 24;
const MAX_JSON_NODES = 2_048;
const MAX_OBJECT_MEMBERS = 256;
const MAX_ARRAY_ITEMS = 256;

interface PrimitiveNode {
  kind: "primitive";
  complete: true;
  hasDuplicate: false;
  value: string | number | boolean | null;
}

interface ObjectNode {
  kind: "object";
  complete: boolean;
  hasDuplicate: boolean;
  properties: Map<string, JsonNode[]>;
  occurrences: Map<string, number>;
}

interface ArrayNode {
  kind: "array";
  complete: boolean;
  hasDuplicate: boolean;
  items: JsonNode[];
}

type JsonNode = PrimitiveNode | ObjectNode | ArrayNode;

/** Parse only completed finding values from the root facts object; partial JSON is never repaired. */
export function parseExtractionJsonResponse(
  responseText: string,
  pageTexts: readonly string[],
  finishReason?: "stop" | "length" | "other",
): ValidationResult<PrivateExtraction> {
  if (new TextEncoder().encode(responseText).byteLength > MAX_RESPONSE_BYTES) {
    return { ok: false, outcome: "invalid_response" };
  }

  const reader = new JsonPrefixReader(responseText);
  const root = reader.readRoot();
  if (!root || root.kind !== "object") return { ok: false, outcome: "invalid_response" };

  let technicalIssues = reader.issueCount;
  const rootKeys = new Set(["facts", "privateFindings"]);
  for (const [key, count] of root.occurrences) {
    if (!rootKeys.has(key)) technicalIssues += 1;
    if (count > 1) technicalIssues += 1;
  }

  const facts: Partial<Record<ProposalField, PrivateExtraction["facts"][ProposalField]>> = {};
  const factNodes = root.properties.get("facts") ?? [];
  const factsOccurrences = root.occurrences.get("facts") ?? 0;
  if (factsOccurrences !== 1 || factNodes.length !== 1 || factNodes[0]?.kind !== "object") {
    technicalIssues += 1;
  } else {
    const factsNode = factNodes[0];
    const allowedFields = new Set<string>(PROPOSAL_FIELDS);
    for (const [fieldName, occurrenceCount] of factsNode.occurrences) {
      if (!allowedFields.has(fieldName)) {
        technicalIssues += 1;
        continue;
      }
      const findingNodes = factsNode.properties.get(fieldName) ?? [];
      if (occurrenceCount !== 1 || findingNodes.length !== 1) {
        technicalIssues += 1;
        continue;
      }
      const findingNode = findingNodes[0];
      if (!findingNode || !findingNode.complete || findingNode.hasDuplicate) {
        technicalIssues += 1;
        continue;
      }
      const parsedFinding = parseProposalFinding(toValue(findingNode), pageTexts, fieldName as ProposalField);
      if (!parsedFinding.ok) {
        technicalIssues += 1;
        continue;
      }
      facts[fieldName as ProposalField] = parsedFinding.value;
    }
    if (factsNode.complete) {
      for (const field of PROPOSAL_FIELDS) {
        if (!factsNode.occurrences.has(field)) technicalIssues += 1;
      }
    }
  }

  const privateFindings: string[] = [];
  const privateNodes = root.properties.get("privateFindings") ?? [];
  if (root.occurrences.get("privateFindings") !== 1 || privateNodes.length !== 1) {
    technicalIssues += 1;
  } else {
    const privateNode = privateNodes[0];
    if (!privateNode?.complete || privateNode.hasDuplicate || privateNode.kind !== "array") {
      technicalIssues += 1;
    } else {
      const privateValues = privateNode.items.map((item) => item.kind === "primitive" ? item.value : undefined);
      if (
        privateValues.length > MAX_PRIVATE_FINDINGS ||
        privateValues.some((value) => !isBoundedText(value, MAX_PRIVATE_FINDING_CHARS)) ||
        new Set(privateValues).size !== privateValues.length
      ) {
        technicalIssues += 1;
      } else {
        privateFindings.push(...privateValues as string[]);
      }
    }
  }

  const unprocessedFields = PROPOSAL_FIELDS.filter((field) => !Object.hasOwn(facts, field));
  const incompleteReasons: PrivateExtraction["incompleteReasons"] = [];
  if (finishReason === "length") incompleteReasons.push("token_limit");
  if (technicalIssues > 0) incompleteReasons.push("invalid_records");
  if (!root.complete) incompleteReasons.push("missing_end");
  if (unprocessedFields.length > 0) incompleteReasons.push("unprocessed_fields");
  if (Object.keys(facts).length === 0) return { ok: false, outcome: "invalid_response" };

  return {
    ok: true,
    value: {
      facts,
      privateFindings,
      completeness: incompleteReasons.length === 0 ? "complete" : "incomplete",
      ...(finishReason ? { finishReason } : {}),
      incompleteReasons,
      unprocessedFields,
      technicalIssues,
    },
  };
}

class JsonPrefixReader {
  private index = 0;
  private nodeCount = 0;
  private memberCount = 0;
  private malformed = false;
  private boundExceeded = false;
  issueCount = 0;
  hasTrailingData = false;

  constructor(private readonly source: string) {}

  readRoot(): JsonNode | undefined {
    this.skipWhitespace();
    const root = this.readValue(0);
    if (!root) return undefined;
    this.skipWhitespace();
    if (root.complete && this.index < this.source.length) {
      this.hasTrailingData = true;
      this.issueCount += 1;
    }
    if (this.malformed || this.boundExceeded) this.issueCount += 1;
    return root;
  }

  private readValue(depth: number): JsonNode | undefined {
    this.skipWhitespace();
    if (depth > MAX_JSON_DEPTH) {
      this.boundExceeded = true;
      return undefined;
    }
    if (!this.countNode()) return undefined;
    const current = this.source[this.index];
    if (current === undefined) return undefined;
    if (current === "{") return this.readObject(depth);
    if (current === "[") return this.readArray(depth);
    if (current === '"') {
      const result = this.readString();
      return result.complete
        ? { kind: "primitive", complete: true, hasDuplicate: false, value: result.value }
        : undefined;
    }
    if (current === "t" || current === "f" || current === "n") return this.readLiteral();
    if (current === "-" || isDigit(current)) return this.readNumber();
    this.markMalformed();
    return undefined;
  }

  private readObject(depth: number): ObjectNode {
    this.index += 1;
    const node: ObjectNode = {
      kind: "object",
      complete: false,
      hasDuplicate: false,
      properties: new Map(),
      occurrences: new Map(),
    };
    this.skipWhitespace();
    if (this.source[this.index] === "}") {
      this.index += 1;
      node.complete = true;
      return node;
    }

    while (this.index < this.source.length && !this.malformed && !this.boundExceeded) {
      if (this.source[this.index] !== '"') {
        this.markMalformed();
        return node;
      }
      const key = this.readString();
      if (!key.complete) return node;
      const occurrenceCount = (node.occurrences.get(key.value) ?? 0) + 1;
      node.occurrences.set(key.value, occurrenceCount);
      if (occurrenceCount > 1) node.hasDuplicate = true;
      this.skipWhitespace();
      if (this.source[this.index] !== ":") {
        if (this.index >= this.source.length) return node;
        this.markMalformed();
        return node;
      }
      this.index += 1;
      this.skipWhitespace();
      const child = this.readValue(depth + 1);
      if (!child) return node;
      const values = node.properties.get(key.value) ?? [];
      values.push(child);
      node.properties.set(key.value, values);
      this.memberCount += 1;
      if (child.hasDuplicate) node.hasDuplicate = true;
      if (this.memberCount > MAX_OBJECT_MEMBERS) {
        this.boundExceeded = true;
        return node;
      }
      if (!child.complete) return node;

      this.skipWhitespace();
      const delimiter = this.source[this.index];
      if (delimiter === "}") {
        this.index += 1;
        node.complete = true;
        return node;
      }
      if (delimiter !== ",") {
        if (delimiter === undefined) return node;
        this.markMalformed();
        return node;
      }
      this.index += 1;
      this.skipWhitespace();
      if (this.source[this.index] === undefined) return node;
    }
    return node;
  }

  private readArray(depth: number): ArrayNode {
    this.index += 1;
    const node: ArrayNode = { kind: "array", complete: false, hasDuplicate: false, items: [] };
    this.skipWhitespace();
    if (this.source[this.index] === "]") {
      this.index += 1;
      node.complete = true;
      return node;
    }

    while (this.index < this.source.length && !this.malformed && !this.boundExceeded) {
      const child = this.readValue(depth + 1);
      if (!child) return node;
      node.items.push(child);
      if (child.hasDuplicate) node.hasDuplicate = true;
      if (node.items.length > MAX_ARRAY_ITEMS) {
        this.boundExceeded = true;
        return node;
      }
      if (!child.complete) return node;

      this.skipWhitespace();
      const delimiter = this.source[this.index];
      if (delimiter === "]") {
        this.index += 1;
        node.complete = true;
        return node;
      }
      if (delimiter !== ",") {
        if (delimiter === undefined) return node;
        this.markMalformed();
        return node;
      }
      this.index += 1;
      this.skipWhitespace();
      if (this.source[this.index] === undefined) return node;
    }
    return node;
  }

  private readString(): { complete: true; value: string } | { complete: false; value: "" } {
    const start = this.index;
    this.index += 1;
    while (this.index < this.source.length) {
      const char = this.source.charCodeAt(this.index);
      if (char === 0x22) {
        this.index += 1;
        try {
          return { complete: true, value: JSON.parse(this.source.slice(start, this.index)) as string };
        } catch {
          this.markMalformed();
          return { complete: false, value: "" };
        }
      }
      if (char < 0x20) {
        this.markMalformed();
        return { complete: false, value: "" };
      }
      if (char === 0x5c) {
        this.index += 1;
        const escape = this.source[this.index];
        if (escape === undefined) return { complete: false, value: "" };
        if (escape === "u") {
          const hex = this.source.slice(this.index + 1, this.index + 5);
          if (hex.length < 4) return { complete: false, value: "" };
          if (!/^[\da-fA-F]{4}$/.test(hex)) {
            this.markMalformed();
            return { complete: false, value: "" };
          }
          this.index += 5;
          continue;
        }
        if (!("\"\\/bfnrt".includes(escape))) {
          this.markMalformed();
          return { complete: false, value: "" };
        }
      }
      this.index += 1;
    }
    return { complete: false, value: "" };
  }

  private readLiteral(): PrimitiveNode | undefined {
    const current = this.source[this.index]!;
    const expected = current === "t" ? "true" : current === "f" ? "false" : "null";
    const remaining = this.source.slice(this.index);
    if (remaining.length < expected.length && expected.startsWith(remaining)) return undefined;
    if (!remaining.startsWith(expected)) {
      this.markMalformed();
      return undefined;
    }
    this.index += expected.length;
    return { kind: "primitive", complete: true, hasDuplicate: false, value: expected === "null" ? null : expected === "true" };
  }

  private readNumber(): PrimitiveNode | undefined {
    const start = this.index;
    while (this.index < this.source.length && /[0-9eE+.-]/.test(this.source[this.index]!)) this.index += 1;
    const token = this.source.slice(start, this.index);
    if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(token)) {
      this.markMalformed();
      return undefined;
    }
    if (this.index < this.source.length && !/[\s,\]}]/.test(this.source[this.index]!)) {
      this.markMalformed();
      return undefined;
    }
    const value = Number(token);
    if (!Number.isFinite(value)) {
      this.markMalformed();
      return undefined;
    }
    return { kind: "primitive", complete: true, hasDuplicate: false, value };
  }

  private skipWhitespace(): void {
    while (this.index < this.source.length && /[\t\n\r ]/.test(this.source[this.index]!)) this.index += 1;
  }

  private countNode(): boolean {
    this.nodeCount += 1;
    if (this.nodeCount > MAX_JSON_NODES) {
      this.boundExceeded = true;
      return false;
    }
    return true;
  }

  private markMalformed(): void {
    this.malformed = true;
  }
}

function toValue(node: JsonNode): unknown {
  if (node.kind === "primitive") return node.value;
  if (node.kind === "array") return node.items.map(toValue);
  const value: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const [key, values] of node.properties) {
    const child = values[values.length - 1];
    if (child) value[key] = toValue(child);
  }
  return value;
}

function isBoundedText(value: unknown, maxChars: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && [...value].length <= maxChars;
}

function isDigit(value: string): boolean {
  return value >= "0" && value <= "9";
}

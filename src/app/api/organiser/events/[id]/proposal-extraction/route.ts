import { proposalExtraction } from "../../../../../../server/proposal-assistance/http";

export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return proposalExtraction(request, (await context.params).id);
}

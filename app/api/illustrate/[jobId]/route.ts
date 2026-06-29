import { NextResponse } from "next/server";
import { ERROR_CODES, getErrorPayload } from "@/lib/errors";
import {
  getIllustrationJob,
  toIllustrationJobResponse,
} from "@/lib/illustration-jobs";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const job = getIllustrationJob(jobId);

  if (!job) {
    return NextResponse.json(
      { error: getErrorPayload(ERROR_CODES.UNKNOWN) },
      { status: 404 },
    );
  }

  return NextResponse.json(toIllustrationJobResponse(job));
}

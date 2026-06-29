import { after, NextRequest, NextResponse } from "next/server";
import { ERROR_CODES, getErrorPayload } from "@/lib/errors";
import { getArticleByUrl } from "@/lib/get-article";
import { generateArticleIllustration } from "@/lib/illustration";
import {
  completeIllustrationJob,
  createIllustrationJob,
  failIllustrationJob,
  setIllustrationJobPhase,
  toIllustrationJobResponse,
} from "@/lib/illustration-jobs";

export const maxDuration = 60;

function parseRequestUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  const url = raw.trim();
  if (!url) return null;

  try {
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

async function runIllustrationJob(jobId: string, url: string): Promise<void> {
  try {
    setIllustrationJobPhase(jobId, "prompt");
    const { article } = await getArticleByUrl(url);

    setIllustrationJobPhase(jobId, "image");
    const illustration = await generateArticleIllustration(article);

    completeIllustrationJob(jobId, {
      result: illustration.result,
      imagePrompt: illustration.imagePrompt,
    });
  } catch (error) {
    failIllustrationJob(jobId, error);
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: getErrorPayload(ERROR_CODES.UNKNOWN) },
      { status: 400 },
    );
  }

  const url = parseRequestUrl((body as { url?: unknown }).url);

  if (!url) {
    return NextResponse.json(
      { error: getErrorPayload(ERROR_CODES.INVALID_URL) },
      { status: 400 },
    );
  }

  const job = createIllustrationJob();

  after(() => runIllustrationJob(job.id, url));

  return NextResponse.json(toIllustrationJobResponse(job), { status: 202 });
}

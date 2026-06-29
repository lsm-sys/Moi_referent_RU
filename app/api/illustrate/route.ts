import { NextRequest, NextResponse } from "next/server";
import {
  AppError,
  ERROR_CODES,
  createErrorResponse,
  getErrorPayload,
} from "@/lib/errors";
import { getArticleByUrl } from "@/lib/get-article";
import { generateArticleIllustration } from "@/lib/illustration";

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

  try {
    const { article } = await getArticleByUrl(url);
    const illustration = await generateArticleIllustration(article);

    return NextResponse.json({
      resultType: "image" as const,
      result: illustration.result,
      imagePrompt: illustration.imagePrompt,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: getErrorPayload(error.code) },
        { status: error.httpStatus },
      );
    }

    const { body: errorBody, status } = createErrorResponse(error);
    return NextResponse.json(errorBody, { status });
  }
}

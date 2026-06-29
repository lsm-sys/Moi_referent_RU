import { NextResponse } from "next/server";
import { AppError, ERROR_CODES, getErrorPayload } from "@/lib/errors";
import { buildArticlePreview } from "@/lib/article-preview";
import { getArticleByUrl } from "@/lib/get-article";

export const maxDuration = 30;

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

export async function POST(request: Request) {
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
    const { article, cached } = await getArticleByUrl(url);
    const preview = buildArticlePreview(article, cached);

    return NextResponse.json({ preview });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: getErrorPayload(error.code) },
        { status: error.httpStatus },
      );
    }

    return NextResponse.json(
      { error: getErrorPayload(ERROR_CODES.UNKNOWN) },
      { status: 422 },
    );
  }
}

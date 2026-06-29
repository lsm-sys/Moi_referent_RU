import { NextRequest, NextResponse } from "next/server";
import { ACTION_LABELS, type ActionType } from "@/lib/actions";
import {
  AppError,
  ERROR_CODES,
  createErrorResponse,
  getErrorPayload,
} from "@/lib/errors";
import {
  generateDzenPost,
  generateTelegramPost,
  summarizeArticle,
} from "@/lib/openrouter";
import { fetchAndParseArticle, type ParsedArticle } from "@/lib/parse-article";

export const maxDuration = 60;

type ActionHandler = (article: ParsedArticle) => Promise<string>;

const ACTION_HANDLERS: Record<ActionType, ActionHandler> = {
  summary: summarizeArticle,
  dzen: generateDzenPost,
  telegram: generateTelegramPost,
};

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

  const payload = body as { url?: unknown; action?: unknown };
  const url = typeof payload.url === "string" ? payload.url.trim() : "";
  const action = payload.action as ActionType;

  if (!url) {
    return NextResponse.json(
      { error: getErrorPayload(ERROR_CODES.MISSING_URL) },
      { status: 400 },
    );
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json(
      { error: getErrorPayload(ERROR_CODES.INVALID_URL) },
      { status: 400 },
    );
  }

  if (!ACTION_LABELS[action]) {
    return NextResponse.json(
      { error: getErrorPayload(ERROR_CODES.UNKNOWN_ACTION) },
      { status: 400 },
    );
  }

  try {
    const parsed = await fetchAndParseArticle(url);
    const handler = ACTION_HANDLERS[action];
    const result = await handler(parsed);

    return NextResponse.json({ result, action });
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

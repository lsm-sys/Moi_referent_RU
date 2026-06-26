import { NextRequest, NextResponse } from "next/server";
import { ACTION_LABELS, type ActionType } from "@/lib/actions";
import {
  generateDzenPost,
  generateTelegramPost,
  summarizeArticle,
} from "@/lib/openrouter";
import { fetchAndParseArticle, type ParsedArticle } from "@/lib/parse-article";

type ActionHandler = (article: ParsedArticle) => Promise<string>;

const ACTION_HANDLERS: Record<ActionType, ActionHandler> = {
  summary: summarizeArticle,
  dzen: generateDzenPost,
  telegram: generateTelegramPost,
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const action = body.action as ActionType;

  if (!url) {
    return NextResponse.json({ error: "Укажите URL статьи" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Некорректный URL" }, { status: 400 });
  }

  if (!ACTION_LABELS[action]) {
    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  }

  try {
    const parsed = await fetchAndParseArticle(url);
    const handler = ACTION_HANDLERS[action];
    const result = await handler(parsed);

    return NextResponse.json({ result, action });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка при обработке статьи";

    return NextResponse.json({ error: message }, { status: 422 });
  }
}

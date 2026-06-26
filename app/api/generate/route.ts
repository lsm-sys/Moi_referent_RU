import { NextRequest, NextResponse } from "next/server";
import { ACTION_LABELS, type ActionType } from "@/lib/actions";
import { fetchAndParseArticle } from "@/lib/parse-article";

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
    const result = JSON.stringify(parsed, null, 2);

    return NextResponse.json({ result, action, parsed });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка при парсинге статьи";

    return NextResponse.json({ error: message }, { status: 422 });
  }
}

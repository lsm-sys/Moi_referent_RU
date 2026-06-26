import type { ParsedArticle } from "@/lib/parse-article";

const OPENROUTER_URL =
  process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek/deepseek-chat-v3.1";

const MAX_CONTENT_LENGTH = 12000;

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

function buildTranslationPrompt(article: ParsedArticle): string {
  const parts: string[] = [
    "Переведи франкоязычную статью на русский язык.",
    "Сохрани смысл, структуру и абзацы. Выведи только перевод без комментариев.",
  ];

  if (article.title) {
    parts.push(`\nЗаголовок: ${article.title}`);
  }

  if (article.date) {
    parts.push(`Дата: ${article.date}`);
  }

  let content = article.content ?? "";
  if (content.length > MAX_CONTENT_LENGTH) {
    content = `${content.slice(0, MAX_CONTENT_LENGTH)}\n\n[Текст обрезан для перевода]`;
  }

  parts.push(`\nТекст статьи:\n${content}`);
  return parts.join("\n");
}

export async function translateArticle(article: ParsedArticle): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Не задан OPENROUTER_API_KEY");
  }

  if (!article.content?.trim()) {
    throw new Error("Не удалось извлечь текст статьи для перевода");
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "https://moi-referent-ru.vercel.app",
      "X-Title": "Moi referent RU",
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: "user",
          content: buildTranslationPrompt(article),
        },
      ],
      temperature: 0.3,
    }),
  });

  const data = (await response.json()) as ChatCompletionResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? `Ошибка OpenRouter (${response.status})`);
  }

  const translation = data.choices?.[0]?.message?.content?.trim();

  if (!translation) {
    throw new Error("OpenRouter не вернул перевод");
  }

  return translation;
}

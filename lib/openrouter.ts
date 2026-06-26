import type { ParsedArticle } from "@/lib/parse-article";
import {
  buildDzenPrompt,
  buildSummaryPrompt,
  buildTelegramPrompt,
} from "@/lib/prompts";

const PARSE_TIMEOUT_MS = 45_000;
const AI_TIMEOUT_MS = 120_000;

function getOpenRouterUrl(): string {
  const raw =
    process.env.OPENROUTER_BASE_URL ??
    process.env.OPENAI_BASE_URL ??
    "https://openrouter.ai/api/v1/chat/completions";

  if (raw.includes("/chat/completions")) {
    return raw;
  }

  return `${raw.replace(/\/$/, "")}/chat/completions`;
}

export const DEEPSEEK_MODEL = "deepseek/deepseek-chat-v3.1";

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

export type OpenRouterOptions = {
  temperature?: number;
  emptyResponseMessage?: string;
};

function ensureArticleContent(article: ParsedArticle): void {
  if (!article.content?.trim()) {
    throw new Error("Не удалось извлечь текст статьи");
  }
}

export async function callOpenRouter(
  prompt: string,
  options: OpenRouterOptions = {},
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Не задан OPENROUTER_API_KEY");
  }

  let response: Response;

  try {
    response = await fetch(getOpenRouterUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "https://moi-referent-ru.vercel.app",
        "X-Title": "Moi referent RU",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: options.temperature ?? 0.3,
      }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("timeout: OpenRouter не ответил вовремя");
    }
    throw error;
  }

  const data = (await response.json()) as ChatCompletionResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? `Ошибка OpenRouter (${response.status})`);
  }

  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error(options.emptyResponseMessage ?? "OpenRouter не вернул ответ");
  }

  return content;
}

async function generateFromArticle(
  article: ParsedArticle,
  buildPrompt: (article: ParsedArticle) => string,
  options?: OpenRouterOptions,
): Promise<string> {
  ensureArticleContent(article);
  return callOpenRouter(buildPrompt(article), options);
}

export async function summarizeArticle(article: ParsedArticle): Promise<string> {
  return generateFromArticle(article, buildSummaryPrompt, {
    emptyResponseMessage: "OpenRouter не вернул краткое содержание",
  });
}

export async function generateDzenPost(article: ParsedArticle): Promise<string> {
  return generateFromArticle(article, buildDzenPrompt, {
    temperature: 0.5,
    emptyResponseMessage: "OpenRouter не вернул пост для Дзен",
  });
}

export async function generateTelegramPost(article: ParsedArticle): Promise<string> {
  return generateFromArticle(article, buildTelegramPrompt, {
    temperature: 0.5,
    emptyResponseMessage: "OpenRouter не вернул пост для Telegram",
  });
}

export { PARSE_TIMEOUT_MS, AI_TIMEOUT_MS };

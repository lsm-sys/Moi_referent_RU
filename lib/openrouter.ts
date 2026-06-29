import type { ParsedArticle } from "@/lib/parse-article";
import { AppError, ERROR_CODES } from "@/lib/errors";
import {
  buildDzenPrompt,
  buildSummaryPrompt,
  buildTelegramPrompt,
} from "@/lib/prompts";

/** Парсинг + AI должны уложиться в maxDuration=60 на Vercel */
const PARSE_TIMEOUT_MS = 10_000;
const AI_TIMEOUT_MS = 45_000;

const FALLBACK_MODEL = "deepseek/deepseek-chat";

function getOpenRouterUrl(): string {
  const raw =
    process.env.OPENROUTER_BASE_URL ??
    process.env.OPENAI_BASE_URL ??
    "https://openrouter.ai/api/v1/chat/completions";

  const normalized = raw.replace(/^["']|["']$/g, "");

  if (normalized.includes("/chat/completions")) {
    return normalized;
  }

  return `${normalized.replace(/\/$/, "")}/chat/completions`;
}

export const DEEPSEEK_MODEL =
  process.env.OPENROUTER_MODEL?.replace(/^["']|["']$/g, "") ??
  "deepseek/deepseek-chat";

type ChatMessage = {
  content?: string | null;
  reasoning?: string | null;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: ChatMessage;
  }>;
  error?: {
    message?: string;
    code?: string | number;
  };
};

export type OpenRouterOptions = {
  temperature?: number;
  maxTokens?: number;
};

function ensureArticleContent(article: ParsedArticle): void {
  if (!article.content?.trim()) {
    throw new AppError(ERROR_CODES.ARTICLE_CONTENT_EMPTY);
  }
}

function mapOpenRouterStatus(status: number): AppError {
  if (status === 401 || status === 403 || status === 402) {
    return new AppError(ERROR_CODES.AI_UNAVAILABLE);
  }

  if (status === 429) {
    return new AppError(ERROR_CODES.AI_FAILED);
  }

  if (status === 408 || status === 504 || status === 524) {
    return new AppError(ERROR_CODES.AI_TIMEOUT);
  }

  if (status >= 500) {
    return new AppError(ERROR_CODES.AI_UNAVAILABLE);
  }

  return new AppError(ERROR_CODES.AI_FAILED);
}

function extractAssistantText(message?: ChatMessage): string | null {
  if (!message) return null;

  const content = typeof message.content === "string" ? message.content.trim() : "";
  if (content) return content;

  const reasoning = typeof message.reasoning === "string" ? message.reasoning.trim() : "";
  if (reasoning) return reasoning;

  return null;
}

function isRetryableError(error: unknown): error is AppError {
  return error instanceof AppError && error.code === ERROR_CODES.AI_FAILED;
}

async function callOpenRouterOnce(
  prompt: string,
  options: OpenRouterOptions,
  model: string,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.replace(/^["']|["']$/g, "");

  if (!apiKey) {
    throw new AppError(ERROR_CODES.AI_UNAVAILABLE);
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
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 2048,
        reasoning: { enabled: false },
      }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(ERROR_CODES.AI_TIMEOUT);
    }
    throw new AppError(ERROR_CODES.AI_UNAVAILABLE);
  }

  let data: ChatCompletionResponse;

  try {
    data = (await response.json()) as ChatCompletionResponse;
  } catch {
    throw new AppError(ERROR_CODES.AI_FAILED);
  }

  if (!response.ok) {
    throw mapOpenRouterStatus(response.status);
  }

  const content = extractAssistantText(data.choices?.[0]?.message);

  if (!content) {
    throw new AppError(ERROR_CODES.AI_FAILED);
  }

  return content;
}

export async function callOpenRouter(
  prompt: string,
  options: OpenRouterOptions = {},
): Promise<string> {
  try {
    return await callOpenRouterOnce(prompt, options, DEEPSEEK_MODEL);
  } catch (error) {
    if (!isRetryableError(error)) {
      throw error;
    }

    const compactPrompt = `${prompt}\n\nВажно: ответ должен быть компактным и завершённым.`;

    return callOpenRouterOnce(
      compactPrompt,
      {
        ...options,
        maxTokens: Math.min(options.maxTokens ?? 1200, 900),
        temperature: Math.min(options.temperature ?? 0.3, 0.4),
      },
      FALLBACK_MODEL,
    );
  }
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
  return generateFromArticle(article, buildSummaryPrompt, { maxTokens: 1200 });
}

export async function generateDzenPost(article: ParsedArticle): Promise<string> {
  return generateFromArticle(article, buildDzenPrompt, {
    temperature: 0.5,
    maxTokens: 1000,
  });
}

export async function generateTelegramPost(article: ParsedArticle): Promise<string> {
  return generateFromArticle(article, buildTelegramPrompt, {
    temperature: 0.5,
    maxTokens: 600,
  });
}

export { PARSE_TIMEOUT_MS, AI_TIMEOUT_MS };

import type { ParsedArticle } from "@/lib/parse-article";

export const MAX_ARTICLE_CONTENT_LENGTH = 6000;

function trimArticleContent(content: string, truncatedNote: string): string {
  if (content.length <= MAX_ARTICLE_CONTENT_LENGTH) {
    return content;
  }

  return `${content.slice(0, MAX_ARTICLE_CONTENT_LENGTH)}\n\n[${truncatedNote}]`;
}

function articleContext(article: ParsedArticle, truncatedNote: string): string {
  const parts: string[] = [];

  if (article.title) {
    parts.push(`Заголовок: ${article.title}`);
  }

  if (article.date) {
    parts.push(`Дата: ${article.date}`);
  }

  const content = trimArticleContent(article.content ?? "", truncatedNote);
  parts.push(`Текст статьи:\n${content}`);

  return parts.join("\n\n");
}

export function buildSummaryPrompt(article: ParsedArticle): string {
  return [
    "Ты редактор русскоязычного медиа. На основе франкоязычной статьи подготовь краткое содержание на русском.",
    "Требования:",
    "- 3–5 абзацев: суть, ключевые факты, вывод;",
    "- без полного перевода статьи;",
    "- без служебных пометок и markdown;",
    "- только готовый текст на русском.",
    "",
    articleContext(article, "Текст обрезан"),
  ].join("\n");
}

export function buildDzenPrompt(article: ParsedArticle): string {
  return [
    "Ты автор публикаций для Яндекс Дзен. На основе франкоязычной статьи напиши пост на русском.",
    "Требования:",
    "- цепляющий заголовок в первой строке;",
    "- лид, основная часть и мягкий вывод;",
    "- информативный стиль для широкой аудитории;",
    "- ориентир по объёму: 400–700 слов;",
    "- без служебных пометок и markdown;",
    "- только готовый текст поста.",
    "",
    articleContext(article, "Текст обрезан"),
  ].join("\n");
}

export function buildTelegramPrompt(article: ParsedArticle): string {
  return [
    "Ты автор Telegram-канала. На основе франкоязычной статьи напиши короткий пост на русском.",
    "Требования:",
    "- 2–4 абзаца, суть статьи;",
    "- умеренное использование эмодзи допустимо;",
    "- не более 1500 символов;",
    "- удобно читать с телефона;",
    "- без служебных пометок и markdown;",
    "- только готовый текст поста.",
    "",
    articleContext(article, "Текст обрезан"),
  ].join("\n");
}

export function buildIllustrationPrompt(article: ParsedArticle): string {
  return [
    "You create prompts for AI image generation (Stable Diffusion). Based on the French article below, write one English prompt for an editorial illustration.",
    "Requirements:",
    "- 50–90 words, one paragraph;",
    "- concrete visual scene reflecting the article theme;",
    "- editorial illustration, cinematic lighting, detailed;",
    "- no markdown, no quotes, no labels;",
    "- output only the English prompt.",
    "",
    articleContext(article, "Text truncated"),
  ].join("\n");
}

import type { ParsedArticle } from "@/lib/parse-article";

export const PREVIEW_EXCERPT_LENGTH = 500;

export type ArticlePreview = {
  title: string | null;
  date: string | null;
  excerpt: string;
  contentLength: number;
  cached: boolean;
};

export function buildArticlePreview(
  article: ParsedArticle,
  cached: boolean,
): ArticlePreview {
  const content = article.content?.trim() ?? "";
  const excerpt =
    content.length <= PREVIEW_EXCERPT_LENGTH
      ? content
      : `${content.slice(0, PREVIEW_EXCERPT_LENGTH).trim()}…`;

  return {
    title: article.title,
    date: article.date,
    excerpt,
    contentLength: content.length,
    cached,
  };
}

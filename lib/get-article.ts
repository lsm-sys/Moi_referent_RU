import { fetchAndParseArticle, type ParsedArticle } from "@/lib/parse-article";
import { getCachedArticle, setCachedArticle } from "@/lib/parse-cache";

export async function getArticleByUrl(url: string): Promise<{
  article: ParsedArticle;
  cached: boolean;
}> {
  const cached = getCachedArticle(url);

  if (cached) {
    return { article: cached, cached: true };
  }

  const article = await fetchAndParseArticle(url);
  setCachedArticle(url, article);

  return { article, cached: false };
}

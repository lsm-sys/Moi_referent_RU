import type { ParsedArticle } from "@/lib/parse-article";
import { AppError, ERROR_CODES } from "@/lib/errors";
import { buildIllustrationPrompt } from "@/lib/prompts";
import { generateImageFromPrompt } from "@/lib/huggingface";
import { callOpenRouter } from "@/lib/openrouter";

export type IllustrationResult = {
  resultType: "image";
  result: string;
  imagePrompt: string;
};

export async function generateArticleIllustration(
  article: ParsedArticle,
): Promise<IllustrationResult> {
  if (!article.content?.trim()) {
    throw new AppError(ERROR_CODES.ARTICLE_CONTENT_EMPTY);
  }

  const imagePrompt = await callOpenRouter(buildIllustrationPrompt(article), {
    maxTokens: 220,
    temperature: 0.6,
  });

  const imageDataUrl = await generateImageFromPrompt(imagePrompt);

  return {
    resultType: "image",
    result: imageDataUrl,
    imagePrompt,
  };
}

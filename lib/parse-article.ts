import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { AppError, ERROR_CODES } from "@/lib/errors";

export interface ParsedArticle {
  date: string | null;
  title: string | null;
  content: string | null;
}

const MIN_CONTENT_LENGTH = 120;

const CONTENT_SELECTORS = [
  "article",
  '[role="article"]',
  '[itemprop="articleBody"]',
  "#article-body",
  ".article-body",
  ".article__content",
  ".article__body",
  ".article-content",
  ".article-content__paragraph",
  ".article__paragraph",
  ".fig-content-body",
  ".fig-standfirst",
  ".post-content",
  ".entry-content",
  ".content-body",
  ".story-body",
  ".text-content",
  ".post",
  ".content",
  "main article",
  "main",
];

const NOISE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "nav",
  "footer",
  "aside",
  "header",
  "form",
  ".share",
  ".comments",
  ".related",
  ".advertisement",
  ".ad",
  ".newsletter",
  ".paywall",
  ".subscription",
  '[aria-hidden="true"]',
].join(", ");

const DATE_META_SELECTORS = [
  'meta[property="article:published_time"]',
  'meta[name="article:published_time"]',
  'meta[property="og:published_time"]',
  'meta[name="date"]',
  'meta[name="pubdate"]',
  'meta[itemprop="datePublished"]',
  'meta[property="article:modified_time"]',
];

function cleanText(value: string | undefined | null): string | null {
  if (!value) return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
}

function cleanDate(value: string | undefined | null): string | null {
  const text = cleanText(value);
  if (!text) return null;
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return text;
  return new Date(parsed).toISOString();
}

function isElement(node: AnyNode): node is Element {
  return node.type === "tag";
}

function extractTextFromBlock($: cheerio.CheerioAPI, element: AnyNode): string | null {
  if (!isElement(element)) return null;
  const block = $(element).clone();
  block.find(NOISE_SELECTORS).remove();

  const paragraphs = block
    .find("p, li")
    .map((_, node) => cleanText($(node).text()))
    .get()
    .filter((text): text is string => Boolean(text && text.length > 30));

  if (paragraphs.length > 0) {
    return paragraphs.join("\n\n");
  }

  return cleanText(block.text());
}

function extractTitle($: cheerio.CheerioAPI): string | null {
  const candidates = [
    $('meta[property="og:title"]').attr("content"),
    $('meta[name="twitter:title"]').attr("content"),
    $("article h1").first().text(),
    $("h1").first().text(),
    $("title").text(),
  ];

  for (const candidate of candidates) {
    const title = cleanText(candidate);
    if (title) return title;
  }

  return null;
}

function parseJsonLdNodes(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.flatMap((item) => parseJsonLdNodes(item));
  }
  if (typeof data !== "object") return [];

  const record = data as Record<string, unknown>;
  const nodes: Record<string, unknown>[] = [record];

  if (record["@graph"]) {
    nodes.push(...parseJsonLdNodes(record["@graph"]));
  }

  return nodes;
}

function extractFromJsonLd($: cheerio.CheerioAPI): {
  date: string | null;
  content: string | null;
} {
  let date: string | null = null;
  let content: string | null = null;

  $('script[type="application/ld+json"]').each((_, element) => {
    if (date && content) return;

    try {
      const raw = $(element).html();
      if (!raw) return;

      const data = JSON.parse(raw) as unknown;
      const items = parseJsonLdNodes(data);

      for (const item of items) {
        const typeValue = item["@type"];
        const types = Array.isArray(typeValue)
          ? typeValue.map(String)
          : [String(typeValue ?? "")];
        const isArticle = types.some((type) =>
          /Article|NewsArticle|BlogPosting|ReportageNewsArticle/i.test(type),
        );

        if (!date) {
          const dateValue =
            item.datePublished ?? item.dateCreated ?? item.uploadDate;
          if (typeof dateValue === "string") {
            date = cleanDate(dateValue);
          }
        }

        if (!content) {
          const body = item.articleBody ?? item.description;
          if (typeof body === "string") {
            const text = cleanText(body);
            if (text && text.length >= MIN_CONTENT_LENGTH) {
              content = text;
            }
          }
        }
      }
    } catch {
      // ignore invalid JSON-LD blocks
    }
  });

  return { date, content };
}

function extractDate($: cheerio.CheerioAPI): string | null {
  for (const selector of DATE_META_SELECTORS) {
    const value = $(selector).first().attr("content");
    const date = cleanDate(value);
    if (date) return date;
  }

  const timeValue = $("time[datetime]").first().attr("datetime") ?? $("time").first().text();
  const timeDate = cleanDate(timeValue);
  if (timeDate) return timeDate;

  return extractFromJsonLd($).date;
}

function extractContentFromSelectors($: cheerio.CheerioAPI): string | null {
  let bestContent: string | null = null;
  let bestLength = 0;

  for (const selector of CONTENT_SELECTORS) {
    $(selector).each((_, element) => {
      const text = extractTextFromBlock($, element);
      if (text && text.length > bestLength) {
        bestLength = text.length;
        bestContent = text;
      }
    });
  }

  return bestContent;
}

function extractContentFromParagraphs($: cheerio.CheerioAPI): string | null {
  const paragraphs = $("article p, main p, [role='article'] p, .article p")
    .map((_, node) => cleanText($(node).text()))
    .get()
    .filter((text): text is string => Boolean(text && text.length > 40));

  if (paragraphs.length === 0) return null;

  const unique = [...new Set(paragraphs)];
  const text = unique.join("\n\n");
  return text.length >= MIN_CONTENT_LENGTH ? text : null;
}

function extractContent($: cheerio.CheerioAPI): string | null {
  const fromSelectors = extractContentFromSelectors($);
  if (fromSelectors && fromSelectors.length >= MIN_CONTENT_LENGTH) {
    return fromSelectors;
  }

  const fromJsonLd = extractFromJsonLd($).content;
  if (fromJsonLd) return fromJsonLd;

  const fromParagraphs = extractContentFromParagraphs($);
  if (fromParagraphs) return fromParagraphs;

  return fromSelectors && fromSelectors.length > 0 ? fromSelectors : null;
}

export function parseArticleHtml(html: string): ParsedArticle {
  const $ = cheerio.load(html);

  return {
    date: extractDate($),
    title: extractTitle($),
    content: extractContent($),
  };
}

export async function fetchAndParseArticle(url: string): Promise<ParsedArticle> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(ERROR_CODES.ARTICLE_FETCH_FAILED);
    }
    throw new AppError(ERROR_CODES.ARTICLE_FETCH_FAILED);
  }

  if (!response.ok) {
    throw new AppError(ERROR_CODES.ARTICLE_FETCH_FAILED);
  }

  const html = await response.text();
  const parsed = parseArticleHtml(html);

  if (!parsed.content?.trim()) {
    throw new AppError(ERROR_CODES.ARTICLE_CONTENT_EMPTY);
  }

  return parsed;
}

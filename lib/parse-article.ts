import * as cheerio from "cheerio";

export interface ParsedArticle {
  date: string | null;
  title: string | null;
  content: string | null;
}

const CONTENT_SELECTORS = [
  "article",
  '[role="article"]',
  ".post-content",
  ".entry-content",
  ".article-content",
  ".article-body",
  ".article__body",
  ".post",
  ".content",
  "main article",
  "main",
];

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

function extractDateFromJsonLd($: cheerio.CheerioAPI): string | null {
  let found: string | null = null;

  $('script[type="application/ld+json"]').each((_, element) => {
    if (found) return;

    try {
      const raw = $(element).html();
      if (!raw) return;

      const data = JSON.parse(raw) as unknown;
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (!item || typeof item !== "object") continue;

        const record = item as Record<string, unknown>;
        const dateValue =
          record.datePublished ?? record.dateCreated ?? record.uploadDate;

        if (typeof dateValue === "string") {
          found = cleanDate(dateValue);
          if (found) return;
        }
      }
    } catch {
      // ignore invalid JSON-LD blocks
    }
  });

  return found;
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

  return extractDateFromJsonLd($);
}

function extractContent($: cheerio.CheerioAPI): string | null {
  let bestContent: string | null = null;
  let bestLength = 0;

  for (const selector of CONTENT_SELECTORS) {
    $(selector).each((_, element) => {
      const block = $(element).clone();
      block
        .find(
          "script, style, noscript, nav, footer, aside, header, .share, .comments, .related, .advertisement, .ad",
        )
        .remove();

      const paragraphs = block
        .find("p")
        .map((__, paragraph) => cleanText($(paragraph).text()))
        .get()
        .filter((text): text is string => Boolean(text));

      const text =
        paragraphs.length > 0 ? paragraphs.join("\n\n") : cleanText(block.text());

      if (text && text.length > bestLength) {
        bestLength = text.length;
        bestContent = text;
      }
    });
  }

  return bestContent;
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
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MoiReferentRU/1.0; +https://github.com/)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "fr,en;q=0.9",
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`Не удалось загрузить страницу (${response.status})`);
  }

  const html = await response.text();
  const parsed = parseArticleHtml(html);

  if (!parsed.title && !parsed.content) {
    throw new Error("Не удалось извлечь заголовок и текст статьи");
  }

  return parsed;
}

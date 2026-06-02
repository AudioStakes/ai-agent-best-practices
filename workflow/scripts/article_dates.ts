#!/usr/bin/env node

export type ArticleDates = {
  publishedAt?: string;
  updatedAt?: string;
};

type ReadabilityDateFields = {
  publishedTime?: string;
  modifiedTime?: string;
};

const toDateString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : undefined;
};

const collectMetaContent = (
  document: Document,
  selectors: string[],
): string | undefined => {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (!element) continue;

    const value =
      element.getAttribute("content") ||
      element.getAttribute("datetime") ||
      element.getAttribute("value");

    const normalized = toDateString(value);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
};

const findDateInJsonValue = (
  value: unknown,
  keys: string[],
): string | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findDateInJsonValue(item, keys);
      if (nested) return nested;
    }
    return undefined;
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = toDateString(record[key]);
    if (candidate) {
      return candidate;
    }
  }

  for (const nestedValue of Object.values(record)) {
    const nested = findDateInJsonValue(nestedValue, keys);
    if (nested) return nested;
  }

  return undefined;
};

const collectJsonLdDate = (
  document: Document,
  keys: string[],
): string | undefined => {
  const scripts = [
    ...document.querySelectorAll('script[type="application/ld+json"]'),
  ];

  for (const script of scripts) {
    const raw = script.textContent?.trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as unknown;
      const candidate = findDateInJsonValue(parsed, keys);
      if (candidate) {
        return candidate;
      }
    } catch {
      // Ignore malformed JSON-LD.
    }
  }

  return undefined;
};

const escapeCommentValue = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

export const extractArticleDates = (
  document: Document,
  article?: ReadabilityDateFields,
): ArticleDates => {
  const publishedAt =
    toDateString(article?.publishedTime) ||
    collectMetaContent(document, [
      'meta[property="article:published_time"]',
      'meta[name="article:published_time"]',
      'meta[property="og:published_time"]',
      'meta[name="pubdate"]',
      'meta[name="publish-date"]',
      'meta[name="date"]',
      'meta[itemprop="datePublished"]',
      "time[datetime]",
    ]) ||
    collectJsonLdDate(document, [
      "datePublished",
      "uploadDate",
      "publishedTime",
    ]);

  const updatedAt =
    toDateString(article?.modifiedTime) ||
    collectMetaContent(document, [
      'meta[property="article:modified_time"]',
      'meta[name="article:modified_time"]',
      'meta[property="og:updated_time"]',
      'meta[name="lastmod"]',
      'meta[itemprop="dateModified"]',
    ]) ||
    collectJsonLdDate(document, ["dateModified", "updatedTime"]);

  const dates: ArticleDates = {};

  if (publishedAt) {
    dates.publishedAt = publishedAt;
  }

  if (updatedAt) {
    dates.updatedAt = updatedAt;
  }

  return dates;
};

const findFirstMatch = (
  html: string,
  patterns: RegExp[],
): string | undefined => {
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match) {
      const value = toDateString(match[1]);
      if (value) {
        return value;
      }
    }
  }

  return undefined;
};

const findDatesInJson = (
  jsonText: string,
  keys: string[],
): string | undefined => {
  try {
    const parsed = JSON.parse(jsonText) as unknown;
    return findDateInJsonValue(parsed, keys);
  } catch {
    return undefined;
  }
};

const findJsonLdDate = (html: string, keys: string[]): string | undefined => {
  const scriptPattern =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(scriptPattern)) {
    const candidate = findDatesInJson(match[1] ?? "", keys);
    if (candidate) {
      return candidate;
    }
  }

  return undefined;
};

export const extractArticleDatesFromHtml = (html: string): ArticleDates => {
  const publishedAt =
    findFirstMatch(html, [
      /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']article:published_time["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:published_time["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']pubdate["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']publish-date["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']date["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+itemprop=["']datePublished["'][^>]+content=["']([^"']+)["']/i,
      /<time[^>]+datetime=["']([^"']+)["']/i,
    ]) ||
    findJsonLdDate(html, ["datePublished", "uploadDate", "publishedTime"]);

  const updatedAt =
    findFirstMatch(html, [
      /<meta[^>]+property=["']article:modified_time["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']article:modified_time["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:updated_time["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']lastmod["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+itemprop=["']dateModified["'][^>]+content=["']([^"']+)["']/i,
    ]) || findJsonLdDate(html, ["dateModified", "updatedTime"]);

  const dates: ArticleDates = {};

  if (publishedAt) {
    dates.publishedAt = publishedAt;
  }

  if (updatedAt) {
    dates.updatedAt = updatedAt;
  }

  return dates;
};

export const renderArticleDatesComment = (
  dates: ArticleDates,
): string | undefined => {
  if (!dates.publishedAt && !dates.updatedAt) {
    return undefined;
  }

  return `<!--
article_dates:
  published_at: "${escapeCommentValue(dates.publishedAt ?? "")}"
  updated_at: "${escapeCommentValue(dates.updatedAt ?? "")}"
-->
`;
};

export const stripLeadingArticleDatesComment = (html: string): string => {
  return html.replace(/^<!--\narticle_dates:\n(?: {2}.*\n)+-->\n?/, "");
};

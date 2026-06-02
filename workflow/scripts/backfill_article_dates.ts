#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type ArticleDates,
  extractArticleDatesFromHtml,
  renderArticleDatesComment,
  stripLeadingArticleDatesComment,
} from "./article_dates.js";
import { type ArticleRow, readArticles } from "./article_rows.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const articlesCsvPath = join(repoRoot, "sources/articles.csv");
const extractedRoot = join(repoRoot, "archive/extracted");
const singlefileRoot = join(repoRoot, "archive/singlefile");

const rawArgs = process.argv.slice(2);
const dryRun = rawArgs.includes("--dry-run");

const normalizeSource = (source: string | undefined): string =>
  String(source ?? "unknown")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";

const escapeYaml = (value: string | number | null | undefined): string =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');

const upsertFrontmatterDate = (
  frontmatter: string,
  key: "published_at" | "updated_at",
  value?: string,
): { content: string; changed: boolean } => {
  if (!value) {
    return { content: frontmatter, changed: false };
  }

  const lines = frontmatter.split("\n");
  const entry = `${key}: "${escapeYaml(value)}"`;
  const existingIndex = lines.findIndex((line) => line.startsWith(`${key}:`));

  if (existingIndex >= 0) {
    if (lines[existingIndex] === entry) {
      return { content: frontmatter, changed: false };
    }

    lines[existingIndex] = entry;
    return { content: lines.join("\n"), changed: true };
  }

  const preferredAnchors = ["captured_at:", "byline:", "excerpt:"];
  let insertIndex = lines.length;

  for (const anchor of preferredAnchors) {
    const index = lines.findIndex((line) => line.startsWith(anchor));
    if (index >= 0) {
      insertIndex = index;
      break;
    }
  }

  lines.splice(insertIndex, 0, entry);
  return { content: lines.join("\n"), changed: true };
};

export const upsertMarkdownFrontmatter = (
  markdown: string,
  dates: ArticleDates,
): { content: string; changed: boolean } => {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { content: markdown, changed: false };
  }

  const frontmatter = match[1] ?? "";
  const body = markdown.slice(match[0].length);

  const published = upsertFrontmatterDate(
    frontmatter,
    "published_at",
    dates.publishedAt,
  );
  const updated = upsertFrontmatterDate(
    published.content,
    "updated_at",
    dates.updatedAt,
  );

  if (!published.changed && !updated.changed) {
    return { content: markdown, changed: false };
  }

  return {
    content: `---\n${updated.content}\n---\n${body}`,
    changed: true,
  };
};

export const upsertSinglefileComment = (
  html: string,
  dates: ArticleDates,
): { content: string; changed: boolean } => {
  const comment = renderArticleDatesComment(dates);
  if (!comment) {
    return { content: html, changed: false };
  }

  const stripped = stripLeadingArticleDatesComment(html);
  const next = `${comment}${stripped}`;

  return { content: next, changed: next !== html };
};

const getSinglefilePath = (row: ArticleRow): string =>
  join(singlefileRoot, normalizeSource(row.source), `${row.id}.html`);

const getMarkdownPath = (row: ArticleRow): string =>
  join(extractedRoot, normalizeSource(row.source), `${row.id}.md`);

const fetchHtmlForDates = async (row: ArticleRow): Promise<string | null> => {
  if (!row.url) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(row.url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 ai-agent-best-practices-date-backfill",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const getDatesForRow = async (
  row: ArticleRow,
): Promise<ArticleDates | null> => {
  const singlefilePath = getSinglefilePath(row);
  if (existsSync(singlefilePath)) {
    const html = readFileSync(singlefilePath, "utf8");
    const dates = extractArticleDatesFromHtml(html);
    if (dates.publishedAt || dates.updatedAt) {
      return dates;
    }
  }

  const remoteHtml = await fetchHtmlForDates(row);
  if (!remoteHtml) {
    return null;
  }

  const dates = extractArticleDatesFromHtml(remoteHtml);
  return dates.publishedAt || dates.updatedAt ? dates : null;
};

const updateMarkdownFile = async (
  row: ArticleRow,
): Promise<"updated" | "skipped"> => {
  const path = getMarkdownPath(row);
  if (!existsSync(path)) {
    return "skipped";
  }

  const dates = await getDatesForRow(row);
  if (!dates) {
    return "skipped";
  }

  const original = readFileSync(path, "utf8");
  const { content, changed } = upsertMarkdownFrontmatter(original, dates);
  if (!changed) {
    return "skipped";
  }

  if (!dryRun) {
    writeFileSync(path, content, "utf8");
  }

  return "updated";
};

const updateSinglefileFile = async (
  row: ArticleRow,
): Promise<"updated" | "skipped"> => {
  const path = getSinglefilePath(row);
  if (!existsSync(path)) {
    return "skipped";
  }

  const dates = await getDatesForRow(row);
  if (!dates) {
    return "skipped";
  }

  const original = readFileSync(path, "utf8");
  const { content, changed } = upsertSinglefileComment(original, dates);
  if (!changed) {
    return "skipped";
  }

  if (!dryRun) {
    writeFileSync(path, content, "utf8");
  }

  return "updated";
};

const main = async (): Promise<void> => {
  const rows = readArticles(articlesCsvPath);
  let markdownUpdated = 0;
  let singlefileUpdated = 0;
  let skipped = 0;

  for (const row of rows) {
    const mdResult = await updateMarkdownFile(row);
    if (mdResult === "updated") {
      markdownUpdated += 1;
    }

    const htmlResult = await updateSinglefileFile(row);
    if (htmlResult === "updated") {
      singlefileUpdated += 1;
    }

    if (mdResult === "skipped" && htmlResult === "skipped") {
      skipped += 1;
    }
  }

  console.log(`markdown updated: ${markdownUpdated}`);
  console.log(`singlefile updated: ${singlefileUpdated}`);
  console.log(`skipped: ${skipped}`);
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

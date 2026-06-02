#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { type ArticleRow, readArticles } from "./article_rows.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const singlefileRoot = join(repoRoot, "archive/singlefile");
const indexPath = join(singlefileRoot, "index.html");

function normalizeSource(source: string | undefined): string {
  return (
    String(source || "unknown")
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unknown"
  );
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resolveSinglefilePath(row: {
  id: string;
  source?: string;
  raw_path?: string;
}): string {
  if (row.raw_path?.trim()) {
    return row.raw_path.trim();
  }

  const sourceDir = normalizeSource(row.source);
  return `archive/singlefile/${sourceDir}/${row.id}.html`;
}

function pathFromIndex(relativePathFromRepoRoot: string): string {
  return relative(
    singlefileRoot,
    join(repoRoot, relativePathFromRepoRoot),
  ).replaceAll("\\", "/");
}

function buildIndex(rows: ArticleRow[]): string {
  const generatedAt = new Date().toISOString();
  const total = rows.length;
  const saved = rows.filter((row) =>
    existsSync(join(repoRoot, resolveSinglefilePath(row))),
  ).length;
  const failed = rows.filter(
    (row) => String(row.status || "").toLowerCase() === "failed",
  ).length;
  const pending = total - saved - failed;

  const grouped = new Map<string, ArticleRow[]>();
  for (const row of rows) {
    const source = row.source || "Unknown";
    const existing = grouped.get(source);
    if (existing) {
      existing.push(row);
    } else {
      grouped.set(source, [row]);
    }
  }

  const sections = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([source, sourceRows]) => {
      const items = sourceRows
        .sort((a, b) => String(a.title).localeCompare(String(b.title)))
        .map((row) => {
          const relativePath = resolveSinglefilePath(row);
          const absolutePath = join(repoRoot, relativePath);
          const exists = existsSync(absolutePath);
          const href = exists ? pathFromIndex(relativePath) : "";
          const status = exists ? "saved" : row.status || "pending";
          const statusClass = exists ? "saved" : String(status).toLowerCase();
          const title = escapeHtml(row.title || row.id);
          const category = escapeHtml(row.category || "uncategorized");
          const capturedAt = escapeHtml(row.captured_at || "");
          const url = escapeHtml(row.url || "");

          return `<li class="article" data-source="${escapeHtml(source)}" data-category="${category}" data-status="${escapeHtml(statusClass)}">
  <div class="article-main">
    ${exists ? `<a class="title" href="${escapeHtml(href)}">${title}</a>` : `<span class="title missing">${title}</span>`}
    <div class="meta">
      <span class="badge ${escapeHtml(statusClass)}">${escapeHtml(status)}</span>
      <span>${category}</span>
      ${capturedAt ? `<span>captured: ${capturedAt}</span>` : ""}
    </div>
  </div>
  <a class="source-link" href="${url}">source</a>
</li>`;
        })
        .join("\n");

      return `<section class="source-section">
  <h2>${escapeHtml(source)} <span>${sourceRows.length}</span></h2>
  <ul>${items}</ul>
</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI Agent Best Practices - SingleFile Index</title>
  <style>
    :root { color-scheme: light dark; --border: #d0d7de; --muted: #57606a; --bg: #ffffff; --card: #f6f8fa; --text: #24292f; --link: #0969da; }
    @media (prefers-color-scheme: dark) { :root { --border: #30363d; --muted: #8b949e; --bg: #0d1117; --card: #161b22; --text: #e6edf3; --link: #58a6ff; } }
    body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); }
    header { position: sticky; top: 0; z-index: 1; padding: 20px clamp(16px, 4vw, 48px); border-bottom: 1px solid var(--border); background: color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter: blur(10px); }
    h1 { margin: 0 0 8px; font-size: clamp(24px, 4vw, 36px); }
    .summary { display: flex; flex-wrap: wrap; gap: 10px; color: var(--muted); }
    .toolbar { display: grid; grid-template-columns: 1fr; gap: 10px; margin-top: 16px; }
    input { width: 100%; box-sizing: border-box; padding: 12px 14px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg); color: var(--text); font-size: 16px; }
    main { padding: 24px clamp(16px, 4vw, 48px) 56px; }
    .source-section { margin: 0 0 28px; }
    h2 { display: flex; align-items: baseline; gap: 8px; margin: 0 0 12px; font-size: 20px; }
    h2 span { color: var(--muted); font-size: 14px; font-weight: 500; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .article { display: flex; justify-content: space-between; gap: 16px; align-items: center; padding: 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--card); }
    .article-main { min-width: 0; }
    .title { color: var(--link); font-weight: 700; text-decoration: none; }
    .title:hover { text-decoration: underline; }
    .title.missing { color: var(--muted); }
    .meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; color: var(--muted); font-size: 13px; }
    .badge { padding: 2px 8px; border: 1px solid var(--border); border-radius: 999px; font-size: 12px; }
    .badge.saved { color: #1a7f37; border-color: #1a7f37; }
    .badge.failed { color: #cf222e; border-color: #cf222e; }
    .source-link { flex: 0 0 auto; color: var(--muted); font-size: 13px; }
    .hidden { display: none; }
    footer { padding: 0 clamp(16px, 4vw, 48px) 32px; color: var(--muted); font-size: 13px; }
  </style>
</head>
<body>
  <header>
    <h1>AI Agent Best Practices</h1>
    <div class="summary">
      <span>Total: ${total}</span>
      <span>Saved: ${saved}</span>
      <span>Pending: ${pending}</span>
      <span>Failed: ${failed}</span>
      <span>Generated: ${escapeHtml(generatedAt)}</span>
    </div>
    <div class="toolbar">
      <input id="filter" type="search" placeholder="Filter by title, source, category, or status..." autofocus>
    </div>
  </header>
  <main id="content">${sections}</main>
  <footer>Open this file locally: archive/singlefile/index.html</footer>
  <script>
    const input = document.getElementById('filter');
    const articles = [...document.querySelectorAll('.article')];
    const sections = [...document.querySelectorAll('.source-section')];

    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();

      for (const article of articles) {
        article.classList.toggle('hidden', query && !article.textContent.toLowerCase().includes(query));
      }

      for (const section of sections) {
        const visibleCount = [...section.querySelectorAll('.article')].filter((article) => !article.classList.contains('hidden')).length;
        section.classList.toggle('hidden', visibleCount === 0);
      }
    });
  </script>
</body>
</html>`;
}

function main() {
  const rows = readArticles(join(repoRoot, "sources/articles.csv"));
  mkdirSync(singlefileRoot, { recursive: true });
  writeFileSync(indexPath, buildIndex(rows), "utf8");
  console.log(`generated: ${relative(repoRoot, indexPath)}`);
}

main();

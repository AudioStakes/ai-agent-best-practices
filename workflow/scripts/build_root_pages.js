#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { marked } from "marked";
import { transformMarkdownAlerts } from "./markdown_alerts.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const distRoot = join(repoRoot, "dist");
const indexMarkdownPath = join(repoRoot, "content/index.md");
const glossaryMarkdownPath = join(repoRoot, "content/domain-glossary.md");
const stylesheetVersion = "20260601-site-shell-3";
const popupScriptVersion = "20260601-site-shell-3";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function readMarkdown(filePath) {
  return readFileSync(filePath, "utf8");
}

function renderMarkdown(markdown) {
  const rendered = marked.parse(markdown, {
    gfm: true,
    breaks: false,
  });
  const dom = new JSDOM(
    `<main class="markdown-body markdown-document">${rendered}</main>`,
  );
  const { document } = dom.window;
  transformMarkdownAlerts(document);

  return document.querySelector("main")?.innerHTML ?? rendered;
}

function splitGlossaryMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const headerLines = [];
  const tableLines = [];
  let inTable = false;

  for (const line of lines) {
    if (!inTable && line.startsWith('| <a id="')) {
      inTable = true;
    }

    if (inTable) {
      tableLines.push(line);
    } else {
      headerLines.push(line);
    }
  }

  return {
    headerHtml: renderMarkdown(headerLines.join("\n")),
    tableLines,
  };
}

function parseGlossaryEntries(tableLines) {
  const entries = [];

  for (const line of tableLines) {
    if (!line.startsWith('| <a id="')) {
      continue;
    }

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 4) {
      continue;
    }

    const match = cells[0].match(/^<a id="([^"]+)"><\/a>\s*(.*)$/);
    if (!match) {
      continue;
    }

    entries.push({
      id: match[1],
      english: match[2].trim(),
      japanese: cells[1],
      description: cells[2],
      avoid: cells[3],
    });
  }

  return entries;
}

function buildIndexHtml() {
  const markdown = readMarkdown(indexMarkdownPath);
  const body = renderMarkdown(markdown);

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI Agent Best Practices Linked Glossary</title>
  <link rel="stylesheet" href="site/styles/style.css?v=${stylesheetVersion}">
</head>
<body class="site-index">
<main class="markdown-body markdown-document">
${body}
</main>
</body>
</html>`;
}

function buildGlossaryHtml() {
  const markdown = readMarkdown(glossaryMarkdownPath);
  const { headerHtml, tableLines } = splitGlossaryMarkdown(markdown);
  const entries = parseGlossaryEntries(tableLines);

  const tableRows = entries
    .map((entry) => {
      const id = escapeHtml(entry.id);
      return `<tr id="row-${id}">
  <td><a id="${id}"></a>${escapeHtml(entry.english)}</td>
  <td>${escapeHtml(entry.japanese)}</td>
  <td>${escapeHtml(entry.description)}</td>
  <td>${escapeHtml(entry.avoid)}</td>
</tr>`;
    })
    .join("\n");

  const cards = entries
    .map((entry) => {
      const id = escapeHtml(entry.id);
      return `<li class="glossary-card" id="card-${id}">
  <a id="mobile-${id}"></a>
  <div class="glossary-card-title"><span class="english">${escapeHtml(entry.english)}</span><span class="japanese">${escapeHtml(entry.japanese)}</span></div>
  <p><span class="glossary-label">説明:</span> ${escapeHtml(entry.description)}</p>
  <p><span class="glossary-label">Avoid:</span> ${escapeHtml(entry.avoid)}</p>
</li>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Agent Domain Glossary</title>
  <link rel="stylesheet" href="site/styles/style.css?v=${stylesheetVersion}" />
  <style>
/* Force glossary mobile layout: desktop keeps a table; mobile uses card/list items. */
.glossary-cards { display: none; }
.glossary-table-wrap { width: 100%; overflow-x: auto; }
.glossary-table { display: table; width: 100%; table-layout: auto; border-collapse: collapse; }
.glossary-table thead { display: table-header-group; }
.glossary-table tbody { display: table-row-group; }
.glossary-table tr { display: table-row; }
.glossary-table th, .glossary-table td { display: table-cell; }

@media (max-width: 720px) {
  body.glossary-page .container { padding-left: 4px; padding-right: 4px; }
  body.glossary-page .article { padding-left: 10px; padding-right: 10px; }
  body.glossary-page .glossary-table-wrap { display: none !important; }
  body.glossary-page .glossary-cards { display: grid !important; gap: 12px; margin-top: 18px; padding: 0; }
  body.glossary-page .glossary-card {
    display: block;
    list-style: none;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: #fff;
    padding: 12px 12px 12px 14px;
  }
  body.glossary-page .glossary-card-title {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 8px;
  }
  body.glossary-page .glossary-card-title .english {
    font-weight: 800;
    font-size: 1.05rem;
    line-height: 1.35;
  }
  body.glossary-page .glossary-card-title .japanese {
    font-weight: 700;
    color: var(--muted);
    line-height: 1.35;
  }
  body.glossary-page .glossary-card p { margin: 7px 0; }
  body.glossary-page .glossary-label { font-weight: 700; color: var(--muted); }
}
  </style>
  <script src="site/scripts/term-popup.js?v=${popupScriptVersion}" defer></script>
</head>
<body class="glossary-page">
<div class="container">
  <p class="nav"><a href="index.html">Index</a><a href="domain-glossary.html">用語集</a></p>
  <article class="article markdown-body markdown-document">
    ${headerHtml}

    <div class="glossary-table-wrap">
      <table class="glossary-table">
        <thead>
          <tr><th>English</th><th>Japanese</th><th>Description</th><th>Avoid</th></tr>
        </thead>
        <tbody>
${tableRows}
        </tbody>
      </table>
    </div>

    <ul class="glossary-cards" aria-label="Domain glossary mobile list">
${cards}
    </ul>
  </article>
</div>
</body>
</html>`;
}

function main() {
  mkdirSync(distRoot, { recursive: true });
  writeFileSync(join(distRoot, "index.html"), buildIndexHtml(), "utf8");
  writeFileSync(
    join(distRoot, "domain-glossary.html"),
    buildGlossaryHtml(),
    "utf8",
  );

  console.log(`generated: ${join(distRoot, "index.html")}`);
  console.log(`generated: ${join(distRoot, "domain-glossary.html")}`);
}

main();

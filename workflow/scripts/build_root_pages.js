#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { markdownToHtml } from "./markdown_to_html.js";

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

async function renderMarkdown(markdown) {
  const rendered = await markdownToHtml(markdown);
  const dom = new JSDOM(
    `<article class="article markdown-body markdown-document">${rendered}</article>`,
  );
  const { document } = dom.window;

  return document.querySelector("article")?.innerHTML ?? rendered;
}

async function splitGlossaryMarkdown(markdown) {
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
    headerHtml: await renderMarkdown(headerLines.join("\n")),
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

async function buildIndexHtml() {
  const markdown = readMarkdown(indexMarkdownPath);
  const body = await renderMarkdown(markdown);

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI Agent Best Practices Linked Glossary</title>
  <link rel="stylesheet" href="site/styles/github-markdown.css?v=${stylesheetVersion}">
  <link rel="stylesheet" href="site/styles/style.css?v=${stylesheetVersion}">
</head>
<body class="site-index">
<main>
<article class="article markdown-body markdown-document">
${body}
</article>
</main>
</body>
</html>`;
}

async function buildGlossaryHtml() {
  const markdown = readMarkdown(glossaryMarkdownPath);
  const { headerHtml, tableLines } = await splitGlossaryMarkdown(markdown);
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
  <link rel="stylesheet" href="site/styles/github-markdown.css?v=${stylesheetVersion}" />
  <link rel="stylesheet" href="site/styles/style.css?v=${stylesheetVersion}" />
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

async function main() {
  mkdirSync(distRoot, { recursive: true });
  writeFileSync(join(distRoot, "index.html"), await buildIndexHtml(), "utf8");
  writeFileSync(
    join(distRoot, "domain-glossary.html"),
    await buildGlossaryHtml(),
    "utf8",
  );

  console.log(`generated: ${join(distRoot, "index.html")}`);
  console.log(`generated: ${join(distRoot, "domain-glossary.html")}`);
}

main();

#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  basename,
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { marked } from "marked";
import { transformMarkdownAlerts } from "./markdown_alerts.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");

function printHelpAndExit() {
  console.log(`Usage:
  node workflow/scripts/render_markdown_file.js INPUT.md OUTPUT.html

Notes:
  - INPUT.md must exist.
  - OUTPUT.html will be created along with any missing parent directories.
  - The script renders the Markdown as a standalone HTML document.`);
  process.exit(0);
}

function extractTitle(markdown, fallback) {
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^#\s+(.+?)\s*$/);
    if (match) {
      return match[1].trim();
    }
  }

  return fallback;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const [, , inputArg, outputArg] = process.argv;

if (!inputArg || !outputArg || inputArg === "--help" || inputArg === "-h") {
  printHelpAndExit();
}

const inputPath = resolve(repoRoot, inputArg);
const outputPath = resolve(repoRoot, outputArg);

if (!existsSync(inputPath)) {
  throw new Error(`Input Markdown not found: ${inputPath}`);
}

const markdown = readFileSync(inputPath, "utf8");
const renderedBody = marked.parse(markdown, {
  gfm: true,
  breaks: false,
});
const renderedDom = new JSDOM(
  `<main class="markdown-document">${renderedBody}</main>`,
);
transformMarkdownAlerts(renderedDom.window.document);
const renderedMain = renderedDom.window.document.querySelector("main");
const renderedHtml = renderedMain?.innerHTML ?? renderedBody;
const title = extractTitle(
  markdown,
  basename(inputPath, extname(inputPath)) || "Document",
);
const stylesheetHref = relative(
  dirname(outputPath),
  join(repoRoot, "site/styles/style.css"),
)
  .split(sep)
  .join("/");

mkdirSync(dirname(outputPath), { recursive: true });

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="${escapeHtml(stylesheetHref)}">
  </head>
  <body>
    <main class="markdown-document">
      ${renderedHtml}
    </main>
  </body>
</html>
`;

writeFileSync(outputPath, html);
console.log(`generated: ${outputPath}`);

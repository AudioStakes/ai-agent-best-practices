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
import { extractTitle, markdownToHtml } from "./markdown_to_html.js";

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
const renderedBody = await markdownToHtml(markdown);
const renderedDom = new JSDOM(
  `<article class="article markdown-body markdown-document">${renderedBody}</article>`,
);
const renderedArticle = renderedDom.window.document.querySelector("article");
const renderedHtml = renderedArticle?.innerHTML ?? renderedBody;
const title = extractTitle(
  markdown,
  basename(inputPath, extname(inputPath)) || "Document",
);
const markdownCssHref = relative(
  dirname(outputPath),
  join(repoRoot, "site/styles/github-markdown.css"),
)
  .split(sep)
  .join("/");
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
    <link rel="stylesheet" href="${escapeHtml(markdownCssHref)}">
    <link rel="stylesheet" href="${escapeHtml(stylesheetHref)}">
  </head>
  <body>
    <article class="article markdown-body markdown-document">
      ${renderedHtml}
    </article>
  </body>
</html>
`;

writeFileSync(outputPath, html);
console.log(`generated: ${outputPath}`);

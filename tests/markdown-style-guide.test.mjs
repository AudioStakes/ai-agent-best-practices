import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import { markdownToHtml } from "../workflow/scripts/markdown_to_html.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..");
const guidePath = path.join(
  repoRoot,
  "workflow/guides/github-markdown-style-guide.md",
);
const guideDirUrl = pathToFileURL(path.dirname(guidePath) + path.sep);

async function renderGuide() {
  const markdown = readFileSync(guidePath, "utf8");
  const html = await markdownToHtml(markdown);

  return new JSDOM(html).window.document;
}

function getMarkdownLinks(markdown) {
  const links = [];
  const linkPattern = /(?<!!)\[[^\]]+\]\(([^)]+)\)/g;

  for (const match of markdown.matchAll(linkPattern)) {
    links.push(match[1]);
  }

  return links;
}

function getLocalHrefPath(href) {
  const url = new URL(href, guideDirUrl);

  if (url.protocol !== "file:") {
    return null;
  }

  return fileURLToPath(url);
}

test("GitHub Markdown style guide renders into the expected DOM", async () => {
  expect(existsSync(guidePath)).toBeTruthy();

  const document = await renderGuide();

  const h1s = [...document.querySelectorAll("h1")];
  expect(h1s).toHaveLength(1);
  expect(h1s[0].textContent.trim()).toBe("GitHub Markdown Style Guide");

  const h2Texts = [...document.querySelectorAll("h2")].map((heading) =>
    heading.textContent.trim(),
  );

  for (const expected of [
    "Source References",
    "Core Principles",
    "Document Structure",
    "Paragraphs",
    "Emphasis",
    "Blockquotes",
    "Lists",
    "Task Lists",
    "Links",
    "Section Links and Anchors",
    "Images",
    "Tables",
    "Inline Code",
    "Fenced Code Blocks",
    "What Not to Put in Code Blocks",
    "Repository-Specific Semantic Fences",
    "Alerts",
    "Collapsed Sections",
    "Footnotes",
    "Diagrams",
    "Mathematical Expressions",
    "HTML in Markdown",
    "Escaping Markdown Characters",
    "Comments",
    "Line Breaks",
    "Article Source Format",
    "Source Fidelity",
    "Formatting Checklist",
    "Command Checklist",
  ]) {
    expect(h2Texts).toContain(expected);
  }

  const alertCodeBlocks = [...document.querySelectorAll("pre code")]
    .map((code) => code.textContent ?? "")
    .filter((text) => text.includes("[!NOTE]"));

  expect(alertCodeBlocks).toHaveLength(1);
  expect(
    readFileSync(path.join(repoRoot, "site/styles/style.css"), "utf8"),
  ).not.toContain(".markdown-alert");
  expect(document.querySelectorAll("pre code").length).toBeGreaterThan(0);
  expect(document.querySelector("table")).toBeTruthy();
  expect(document.querySelector('input[type="checkbox"]')).toBeTruthy();
});

test("GitHub Markdown style guide keeps fenced code language classes", async () => {
  const document = await renderGuide();

  const codeClassNames = [...document.querySelectorAll("pre code")]
    .map((code) => code.getAttribute("class") ?? "")
    .join(" ");

  expect(codeClassNames).toContain("language-markdown");
  expect(codeClassNames).toContain("language-bash");
  expect(codeClassNames).toContain("language-html");
});

test("GitHub Markdown style guide keeps local repository links valid", () => {
  const markdown = readFileSync(guidePath, "utf8");
  const localHrefs = getMarkdownLinks(markdown).filter(
    (href) => !/^(?:https?:|mailto:|#)/.test(href),
  );

  const uniqueLocalHrefs = [...new Set(localHrefs)];
  expect(uniqueLocalHrefs).toHaveLength(2);

  for (const href of uniqueLocalHrefs) {
    const filePath = getLocalHrefPath(href);
    expect(filePath, `Expected local link for ${href}`).not.toBeNull();
    if (filePath) {
      expect(existsSync(filePath), `Missing target for ${href}`).toBeTruthy();
    }
  }
});

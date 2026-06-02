import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { JSDOM } from "jsdom";
import { markdownToHtml } from "../workflow/scripts/markdown_to_html.ts";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..");
const guidePath = path.join(
  repoRoot,
  "workflow/guides/github-markdown-style-guide.md",
);
const guideDirUrl = pathToFileURL(path.dirname(guidePath) + path.sep);
const renderMarkdownFileScript = path.join(
  repoRoot,
  "workflow/scripts/render_markdown_file.ts",
);

async function renderDocument(markdown) {
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

function runProcess(args) {
  const child = spawn("tsx", [renderMarkdownFileScript, ...args], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stdout = [];
  const stderr = [];

  child.stdout.on("data", (chunk) => stdout.push(chunk.toString("utf8")));
  child.stderr.on("data", (chunk) => stderr.push(chunk.toString("utf8")));

  return once(child, "close").then(([code]) => ({
    code,
    stdout: stdout.join(""),
    stderr: stderr.join(""),
  }));
}

test("markdownToHtml renders representative GitHub Flavored Markdown", async () => {
  const markdown = `# Heading

Paragraph with \`inline code\`, a [link](https://example.com), and ~~strikethrough~~.

> Quoted line

- Bullet one
- Bullet two

1. First
2. Second

\`\`\`js
console.log("hello");
\`\`\`

| Name | Value |
| --- | --- |
| Alpha | Beta |

- [x] Done
- [ ] Todo
`;

  const document = await renderDocument(markdown);

  expect(document.querySelector("h1")?.textContent).toBe("Heading");
  expect(document.querySelector("ul")).toBeTruthy();
  expect(document.querySelector("ol")).toBeTruthy();
  expect(document.querySelector("pre code")?.className).toContain(
    "language-js",
  );
  expect(document.querySelector("code:not(pre code)")?.textContent).toContain(
    "inline code",
  );
  expect(document.querySelector("table")).toBeTruthy();
  expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
  expect(document.querySelector("del")?.textContent).toBe("strikethrough");
  expect(document.querySelector("a")?.getAttribute("href")).toBe(
    "https://example.com",
  );
  expect(document.querySelector("blockquote")?.textContent).toContain(
    "Quoted line",
  );
});

test("GitHub Markdown style guide renders into the expected DOM", async () => {
  expect(existsSync(guidePath)).toBeTruthy();

  const markdown = readFileSync(guidePath, "utf8");
  const document = await renderDocument(markdown);

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
  expect(document.querySelector("table")).toBeTruthy();
  expect(document.querySelector('input[type="checkbox"]')).toBeTruthy();
});

test("GitHub Markdown style guide keeps fenced code language classes", async () => {
  const markdown = readFileSync(guidePath, "utf8");
  const document = await renderDocument(markdown);

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

test("render_markdown_file.js converts markdown into standalone HTML", async () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "markdown-render-"));
  const outputPath = path.join(tempRoot, "guide.html");

  try {
    const result = await runProcess([guidePath, outputPath]);
    expect(result.code).toBe(0);
    expect(existsSync(outputPath)).toBeTruthy();

    const html = readFileSync(outputPath, "utf8");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("GitHub Markdown Style Guide");
    expect(html).toContain(
      '<article class="article markdown-body markdown-document">',
    );
    expect(html).toContain("github-markdown.css");
    expect(html).toContain("style.css");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

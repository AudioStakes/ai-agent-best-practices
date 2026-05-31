#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { marked } from "marked";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const defaultDocsDir = join(repoRoot, "docs");
const requiredChapterSlugs = [
  "01-agent-design",
  "02-workflow-design",
  "03-tool-use",
  "04-context-engineering",
  "05-evals",
  "06-coding-agents",
  "07-production-operations",
  "08-security-sandboxing",
  "09-multi-agent",
  "10-governance",
];

function parseArgs(argv) {
  const options = {
    docsDir: defaultDocsDir,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--docs-dir" && next) {
      options.docsDir = resolve(next);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelpAndExit();
    } else {
      throw new Error(
        `Unknown argument: ${arg}\nUse --help to see available options.`,
      );
    }
  }

  return options;
}

function printHelpAndExit() {
  console.log(`Usage:
  node scripts/check-pages-output.mjs [--docs-dir DIR]

Defaults:
  --docs-dir   ${defaultDocsDir}`);
  process.exit(0);
}

function fail(message) {
  throw new Error(message);
}

function readText(filePath) {
  if (!existsSync(filePath)) {
    fail(`Missing required file: ${relative(repoRoot, filePath)}`);
  }

  return readFileSync(filePath, "utf8");
}

function walkFiles(rootDir) {
  const entries = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    const children = readdirSync(currentDir, { withFileTypes: true });

    for (const child of children) {
      const childPath = join(currentDir, child.name);
      if (child.isDirectory()) {
        stack.push(childPath);
      } else if (
        child.isFile() &&
        (child.name.endsWith(".md") || child.name.endsWith(".html"))
      ) {
        entries.push(childPath);
      }
    }
  }

  return entries.sort((a, b) => a.localeCompare(b));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertContains(text, needle, label) {
  if (!text.includes(needle)) {
    fail(`${label} is missing "${needle}"`);
  }
}

function assertHeading(text, heading, label) {
  const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "m");
  if (!pattern.test(text)) {
    fail(`${label} is missing heading "${heading}"`);
  }
}

function toDocument(filePath, text) {
  const html = filePath.endsWith(".md") ? marked.parse(text) : text;
  return new JSDOM(html).window.document;
}

function isLocalLink(url) {
  return (
    url &&
    !/^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(url) &&
    !url.startsWith("//")
  );
}

function resolveLocalTarget(filePath, url) {
  const cleaned = url.split(/[?#]/)[0];
  const sourceDir = dirname(filePath);

  if (cleaned.startsWith("/")) {
    return {
      absolute: null,
      message: `uses root-relative path "${url}"`,
    };
  }

  const absolute = resolve(sourceDir, cleaned);
  const hasExtension = extname(cleaned) !== "";

  if (existsSync(absolute)) {
    return { absolute };
  }

  if (!hasExtension) {
    const fallbackCandidates = [
      `${absolute}.html`,
      `${absolute}.md`,
      join(absolute, "index.html"),
      join(absolute, "index.md"),
    ];

    for (const candidate of fallbackCandidates) {
      if (existsSync(candidate)) {
        return { absolute: candidate };
      }
    }
  }

  return {
    absolute,
    message: `does not exist: ${relative(repoRoot, absolute)}`,
  };
}

function collectDocumentLinks(document) {
  const urls = [];
  for (const element of document.querySelectorAll(
    "a[href], img[src], script[src], link[href], source[src], iframe[src]",
  )) {
    const url =
      element.getAttribute("href") ?? element.getAttribute("src") ?? "";
    if (isLocalLink(url)) {
      urls.push(url);
    }
  }
  return urls;
}

function validateLocalLinks(filePath, document) {
  const urls = collectDocumentLinks(document);
  const failures = [];

  for (const url of urls) {
    const resolved = resolveLocalTarget(filePath, url);
    if (resolved.message) {
      failures.push(
        `${relative(repoRoot, filePath)} -> ${url} (${resolved.message})`,
      );
    }
  }

  if (failures.length > 0) {
    fail(
      `Broken local links found:\n${failures.map((entry) => `- ${entry}`).join("\n")}`,
    );
  }
}

function checkIndexMarkdown(docsDir) {
  const indexPath = join(docsDir, "index.md");
  const text = readText(indexPath);
  const label = relative(repoRoot, indexPath);

  for (const heading of [
    "対象時点",
    "対象読者",
    "このナレッジベースで得られること",
    "読み方",
    "目次",
    "対象外",
  ]) {
    assertHeading(text, heading, label);
  }

  for (const slug of requiredChapterSlugs) {
    assertContains(text, `tag-guides/${slug}.html`, label);
  }

  assertContains(text, "public-page-problem-statement.md", label);
}

function checkChapterFile(docsDir, slug) {
  const mdPath = join(docsDir, "tag-guides", `${slug}.md`);
  const htmlPath = join(docsDir, "tag-guides", `${slug}.html`);
  const markdown = readText(mdPath);
  const html = readText(htmlPath);
  const mdDocument = toDocument(mdPath, markdown);
  const htmlDocument = toDocument(htmlPath, html);
  const label = `tag-guides/${slug}`;

  for (const [document, fileLabel] of [
    [mdDocument, `${label}.md`],
    [htmlDocument, `${label}.html`],
  ]) {
    const h1 = document.querySelector("h1");
    if (!h1) {
      fail(`${fileLabel} is missing an h1 title`);
    }

    const headingText = h1.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (!/^\d{2}\.\s+/.test(headingText)) {
      fail(`${fileLabel} has an unexpected title: "${headingText}"`);
    }

    const bodyText =
      document.body?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (!bodyText.includes("対象時点: 2026年5月")) {
      fail(`${fileLabel} is missing the target-time note`);
    }

    if (!bodyText.includes("この章で見直せること")) {
      fail(`${fileLabel} is missing the review checklist section`);
    }

    const topLink = Array.from(document.querySelectorAll("a[href]")).find(
      (anchor) =>
        /(?:^|\/)index\.(?:md|html)$/.test(anchor.getAttribute("href") ?? ""),
    );

    if (!topLink) {
      fail(`${fileLabel} is missing a link back to the top page`);
    }
  }
}

function checkRequiredFiles(docsDir) {
  const requiredPaths = [
    join(docsDir, "index.md"),
    join(docsDir, "_config.yml"),
    join(docsDir, "style.css"),
    join(docsDir, "term-popup.js"),
    join(docsDir, "public-page-problem-statement.md"),
    join(docsDir, "publishing-checklist.md"),
  ];

  for (const path of requiredPaths) {
    if (!existsSync(path)) {
      fail(`Missing required file: ${relative(repoRoot, path)}`);
    }
  }

  const glossaryMarkdown = join(docsDir, "domain-glossary.md");
  const glossaryHtml = join(docsDir, "domain-glossary.html");
  if (!existsSync(glossaryMarkdown) && !existsSync(glossaryHtml)) {
    fail(
      "Missing required glossary file: docs/domain-glossary.md or docs/domain-glossary.html",
    );
  }

  const tagGuidesDir = join(docsDir, "tag-guides");
  if (!existsSync(tagGuidesDir)) {
    fail("Missing required directory: docs/tag-guides");
  }
}

function checkTagGuidePairs(docsDir) {
  const tagGuidesDir = join(docsDir, "tag-guides");
  const markdownFiles = readdirSync(tagGuidesDir)
    .filter((name) => name.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b));

  if (markdownFiles.length === 0) {
    fail("No tag guide markdown files were found in docs/tag-guides");
  }

  for (const fileName of markdownFiles) {
    const slug = fileName.replace(/\.md$/, "");
    const htmlPath = join(tagGuidesDir, `${slug}.html`);
    if (!existsSync(htmlPath)) {
      fail(`Missing paired HTML file for docs/tag-guides/${fileName}`);
    }
    checkChapterFile(docsDir, slug);
  }
}

function checkLocalLinksInDocs(docsDir) {
  const files = walkFiles(docsDir);
  for (const filePath of files) {
    const text = readText(filePath);
    const document = toDocument(filePath, text);
    validateLocalLinks(filePath, document);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  checkRequiredFiles(options.docsDir);
  checkIndexMarkdown(options.docsDir);
  checkTagGuidePairs(options.docsDir);
  checkLocalLinksInDocs(options.docsDir);
  console.log(`verified: ${relative(repoRoot, options.docsDir)}`);
}

main();

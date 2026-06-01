#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { marked } from "marked";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const defaultDistDir = join(repoRoot, "dist");
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
    distDir: defaultDistDir,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--dist-dir" && next) {
      options.distDir = resolve(next);
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
  node scripts/check-pages-output.mjs [--dist-dir DIR]

Defaults:
  --dist-dir   ${defaultDistDir}`);
  process.exit(0);
}

function fail(message) {
  throw new Error(message);
}

function requireFile(filePath, hint = "") {
  if (!existsSync(filePath)) {
    const relativePath = relative(repoRoot, filePath);
    fail(`Missing required file: ${relativePath}${hint ? `\n${hint}` : ""}`);
  }
}

function readText(filePath, hint = "") {
  requireFile(filePath, hint);
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

function assertContains(text, needle, label) {
  if (!text.includes(needle)) {
    fail(`${label} is missing "${needle}"`);
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

function checkIndexMarkdown(distDir) {
  const indexPath = join(distDir, "index.md");
  const text = readText(
    indexPath,
    "Run npm run build and npm run build:pages before npm run verify:pages.",
  );
  const label = relative(repoRoot, indexPath);

  for (const slug of requiredChapterSlugs) {
    assertContains(text, `tag-guides/${slug}.html`, label);
  }

  assertContains(text, "domain-glossary.html", label);
  assertContains(text, "sources/articles.csv", label);
}

function checkIndexHtml(distDir) {
  const indexPath = join(distDir, "index.html");
  const text = readText(
    indexPath,
    "Run npm run build and npm run build:pages before npm run verify:pages.",
  );
  const document = toDocument(indexPath, text);
  const label = relative(repoRoot, indexPath);

  assertContains(text, 'href="site/styles/style.css?v=', label);
  for (const slug of requiredChapterSlugs) {
    assertContains(text, `tag-guides/${slug}.html`, label);
  }

  const topLink = Array.from(document.querySelectorAll("a[href]")).find(
    (anchor) => anchor.getAttribute("href") === "domain-glossary.html",
  );
  if (!topLink) {
    fail(`${label} is missing a link to the glossary`);
  }
}

function checkChapterFile(distDir, slug) {
  const mdPath = join(distDir, "tag-guides", `${slug}.md`);
  const htmlPath = join(distDir, "tag-guides", `${slug}.html`);
  const markdown = readText(
    mdPath,
    "Run npm run build and npm run build:pages before npm run verify:pages.",
  );
  const html = readText(
    htmlPath,
    "Run npm run build and npm run build:pages before npm run verify:pages.",
  );
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
    if (
      slug !== "11-markdown-code-block-gallery" &&
      !bodyText.includes("対象時点: 2026年5月")
    ) {
      fail(`${fileLabel} is missing the target-time note`);
    }

    if (
      slug !== "11-markdown-code-block-gallery" &&
      !bodyText.includes("この章で見直せること")
    ) {
      fail(`${fileLabel} is missing the review checklist section`);
    }

    if (slug !== "11-markdown-code-block-gallery") {
      const topLink = Array.from(document.querySelectorAll("a[href]")).find(
        (anchor) =>
          /(?:^|\/)index\.(?:md|html)$/.test(anchor.getAttribute("href") ?? ""),
      );

      if (!topLink) {
        fail(`${fileLabel} is missing a link back to the top page`);
      }
    }
  }

  assertContains(html, 'href="../site/styles/style.css?v=', `${label}.html`);
  assertContains(
    html,
    'src="../site/scripts/term-popup.js?v=',
    `${label}.html`,
  );
}

function checkRequiredFiles(distDir) {
  const requiredPaths = [
    join(distDir, "index.html"),
    join(distDir, "index.md"),
    join(distDir, "domain-glossary.html"),
    join(distDir, "domain-glossary.md"),
    join(distDir, "site/styles/style.css"),
    join(distDir, "site/styles/semantic-overrides.css"),
    join(distDir, "site/scripts/term-popup.js"),
    join(distDir, "sources/articles.csv"),
  ];

  for (const path of requiredPaths) {
    if (!existsSync(path)) {
      fail(`Missing required file: ${relative(repoRoot, path)}`);
    }
  }

  const tagGuidesDir = join(distDir, "tag-guides");
  if (!existsSync(tagGuidesDir)) {
    fail(
      "Missing required directory: dist/tag-guides.\nRun npm run build and npm run build:pages before npm run verify:pages.",
    );
  }
}

function checkTagGuidePairs(distDir) {
  const tagGuidesDir = join(distDir, "tag-guides");
  const markdownFiles = readdirSync(tagGuidesDir)
    .filter((name) => name.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b));

  if (markdownFiles.length === 0) {
    fail(
      "No tag guide markdown files were found in dist/tag-guides.\nRun npm run build and npm run build:pages before npm run verify:pages.",
    );
  }

  for (const fileName of markdownFiles) {
    const slug = fileName.replace(/\.md$/, "");
    const htmlPath = join(tagGuidesDir, `${slug}.html`);
    if (!existsSync(htmlPath)) {
      fail(`Missing paired HTML file for dist/tag-guides/${fileName}`);
    }
    checkChapterFile(distDir, slug);
  }
}

function checkLocalLinksInDist(distDir) {
  const files = walkFiles(distDir);
  for (const filePath of files) {
    const text = readText(filePath);
    const document = toDocument(filePath, text);
    validateLocalLinks(filePath, document);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  checkRequiredFiles(options.distDir);
  checkIndexHtml(options.distDir);
  checkIndexMarkdown(options.distDir);
  checkTagGuidePairs(options.distDir);
  checkLocalLinksInDist(options.distDir);
  console.log(`verified: ${relative(repoRoot, options.distDir)}`);
}

main();

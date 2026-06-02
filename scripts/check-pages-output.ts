#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const defaultDistDir = join(repoRoot, "dist");

type CheckOptions = {
  distDir: string;
};

type LocalTarget = {
  absolute: string | null;
  message?: string;
};

function parseArgs(argv: string[]): CheckOptions {
  const options: CheckOptions = {
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
  tsx scripts/check-pages-output.ts [--dist-dir DIR]

Defaults:
  --dist-dir   ${defaultDistDir}`);
  process.exit(0);
}

function fail(message: string): never {
  throw new Error(message);
}

function requireFile(filePath: string, hint = ""): void {
  if (!existsSync(filePath)) {
    const relativePath = relative(repoRoot, filePath);
    fail(`Missing required file: ${relativePath}${hint ? `\n${hint}` : ""}`);
  }
}

function readText(filePath: string, hint = ""): string {
  requireFile(filePath, hint);
  return readFileSync(filePath, "utf8");
}

function walkFiles(rootDir: string): string[] {
  const entries: string[] = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) {
      continue;
    }
    const children = readdirSync(currentDir, { withFileTypes: true });

    for (const child of children) {
      const childPath = join(currentDir, child.name);
      if (child.isDirectory()) {
        stack.push(childPath);
      } else if (child.isFile()) {
        entries.push(childPath);
      }
    }
  }

  return entries.sort((a, b) => a.localeCompare(b));
}

function assertContains(text: string, needle: string, label: string): void {
  if (!text.includes(needle)) {
    fail(`${label} is missing "${needle}"`);
  }
}

function toDocument(text: string): Document {
  return new JSDOM(text).window.document;
}

function isLocalLink(url: string): boolean {
  return (
    url.length > 0 &&
    !/^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(url) &&
    !url.startsWith("//")
  );
}

function resolveLocalTarget(filePath: string, url: string): LocalTarget {
  const cleaned = url.split(/[?#]/)[0] ?? "";
  const sourceDir = dirname(filePath);

  if (cleaned.startsWith("/")) {
    return {
      absolute: null,
      message: `uses root-relative path "${url}"`,
    };
  }

  const absolute = resolve(sourceDir, cleaned);
  if (existsSync(absolute)) {
    return { absolute };
  }

  return {
    absolute,
    message: `does not exist: ${relative(repoRoot, absolute)}`,
  };
}

function collectDocumentLinks(document: Document): string[] {
  const urls: string[] = [];
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

function validateLocalLinks(filePath: string, document: Document): void {
  const urls = collectDocumentLinks(document);
  const failures: string[] = [];

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

function readSourceTagGuideSlugs() {
  const tagGuidesDir = join(repoRoot, "content/tag-guides");
  return readdirSync(tagGuidesDir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""))
    .sort((a, b) => a.localeCompare(b));
}

function checkRequiredFiles(distDir: string): void {
  const requiredPaths = [
    join(distDir, "index.html"),
    join(distDir, "domain-glossary.html"),
    join(distDir, "site/styles/style.css"),
    join(distDir, "site/scripts/term-popup.js"),
  ];

  for (const filePath of requiredPaths) {
    requireFile(filePath);
  }

  const tagGuidesDir = join(distDir, "tag-guides");
  requireFile(tagGuidesDir);

  for (const slug of readSourceTagGuideSlugs()) {
    requireFile(join(tagGuidesDir, `${slug}.html`));
  }
}

function checkNoSourceMirrors(distDir: string): void {
  const forbiddenFiles = walkFiles(distDir).filter((filePath) =>
    [".md", ".csv"].includes(extname(filePath)),
  );

  if (forbiddenFiles.length > 0) {
    fail(
      `dist/ must not contain source mirrors:\n${forbiddenFiles
        .map((filePath) => `- ${relative(repoRoot, filePath)}`)
        .join("\n")}`,
    );
  }
}

function checkIndexHtml(distDir: string): void {
  const indexPath = join(distDir, "index.html");
  const text = readText(
    indexPath,
    "Run npm run build before npm run verify:pages.",
  );
  const document = toDocument(text);
  const label = relative(repoRoot, indexPath);

  if (
    !document.querySelector("article.article.markdown-body.markdown-document")
  ) {
    fail(
      `${label} is missing an article.article.markdown-body.markdown-document wrapper`,
    );
  }

  assertContains(text, 'href="site/styles/style.css?v=', label);

  const glossaryLink = Array.from(document.querySelectorAll("a[href]")).find(
    (anchor) => anchor.getAttribute("href") === "domain-glossary.html",
  );
  if (!glossaryLink) {
    fail(`${label} is missing a link to the glossary`);
  }

  for (const slug of readSourceTagGuideSlugs()) {
    assertContains(text, `tag-guides/${slug}.html`, label);
  }
}

function checkGlossaryHtml(distDir: string): void {
  const glossaryPath = join(distDir, "domain-glossary.html");
  const text = readText(
    glossaryPath,
    "Run npm run build before npm run verify:pages.",
  );
  const document = toDocument(text);
  const label = relative(repoRoot, glossaryPath);

  const h1 = document.querySelector("h1");
  if (!h1) {
    fail(`${label} is missing an h1 title`);
  }

  if (
    !document.querySelector("article.article.markdown-body.markdown-document")
  ) {
    fail(
      `${label} is missing an article.article.markdown-body.markdown-document wrapper`,
    );
  }

  assertContains(text, 'href="site/styles/style.css?v=', label);
  assertContains(text, 'src="site/scripts/term-popup.js?v=', label);
}

function checkTagGuideHtml(distDir: string, slug: string): void {
  const htmlPath = join(distDir, "tag-guides", `${slug}.html`);
  const text = readText(
    htmlPath,
    "Run npm run build before npm run verify:pages.",
  );
  const document = toDocument(text);
  const label = `tag-guides/${slug}.html`;

  if (
    !document.querySelector("article.article.markdown-body.markdown-document")
  ) {
    fail(
      `${label} is missing an article.article.markdown-body.markdown-document wrapper`,
    );
  }

  const h1 = document.querySelector("h1");
  if (!h1) {
    fail(`${label} is missing an h1 title`);
  }

  const headingText = h1.textContent?.replace(/\s+/g, " ").trim() ?? "";
  if (!/^\d{2}\.\s+/.test(headingText)) {
    fail(`${label} has an unexpected title: "${headingText}"`);
  }

  const bodyText =
    document.body?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  if (slug !== "11-markdown-code-block-gallery") {
    if (!bodyText.includes("対象時点: 2026年5月")) {
      fail(`${label} is missing the target-time note`);
    }

    if (!bodyText.includes("この章で見直せること")) {
      fail(`${label} is missing the review checklist section`);
    }

    const topLink = Array.from(document.querySelectorAll("a[href]")).find(
      (anchor) => anchor.getAttribute("href") === "../index.html",
    );
    if (!topLink) {
      fail(`${label} is missing a link back to the top page`);
    }
  }

  assertContains(text, 'href="../site/styles/style.css?v=', label);
  assertContains(text, 'src="../site/scripts/term-popup.js?v=', label);
}

function checkTagGuideHtmlFiles(distDir: string): void {
  const slugs = readSourceTagGuideSlugs();
  if (slugs.length === 0) {
    fail("No tag guide source files were found in content/tag-guides.");
  }

  const tagGuidesDir = join(distDir, "tag-guides");
  const generatedSlugs = readdirSync(tagGuidesDir)
    .filter((name) => name.endsWith(".html"))
    .map((name) => name.replace(/\.html$/, ""))
    .sort((a, b) => a.localeCompare(b));

  if (
    generatedSlugs.length !== slugs.length ||
    generatedSlugs.some((slug, index) => slug !== slugs[index])
  ) {
    fail(
      `dist/tag-guides must contain the same HTML slugs as content/tag-guides.\nsource: ${slugs.join(", ")}\noutput: ${generatedSlugs.join(", ")}`,
    );
  }

  for (const slug of slugs) {
    checkTagGuideHtml(distDir, slug);
  }
}

function checkLocalLinksInDist(distDir: string): void {
  for (const filePath of walkFiles(distDir).filter((filePath) =>
    filePath.endsWith(".html"),
  )) {
    const text = readText(filePath);
    const document = toDocument(text);
    validateLocalLinks(filePath, document);
  }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  checkRequiredFiles(options.distDir);
  checkNoSourceMirrors(options.distDir);
  checkIndexHtml(options.distDir);
  checkGlossaryHtml(options.distDir);
  checkTagGuideHtmlFiles(options.distDir);
  checkLocalLinksInDist(options.distDir);
  console.log(`verified: ${relative(repoRoot, options.distDir)}`);
}

main();

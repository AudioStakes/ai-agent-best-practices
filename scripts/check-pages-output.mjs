#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const defaultDistDir = join(repoRoot, "dist");

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
      } else if (child.isFile()) {
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

function toDocument(text) {
  return new JSDOM(text).window.document;
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
  if (existsSync(absolute)) {
    return { absolute };
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

function readSourceTagGuideSlugs() {
  const tagGuidesDir = join(repoRoot, "content/tag-guides");
  return readdirSync(tagGuidesDir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""))
    .sort((a, b) => a.localeCompare(b));
}

function checkRequiredFiles(distDir) {
  const requiredPaths = [
    join(distDir, "index.html"),
    join(distDir, "domain-glossary.html"),
    join(distDir, "site/styles/style.css"),
    join(distDir, "site/styles/semantic-overrides.css"),
    join(distDir, "site/scripts/term-popup.js"),
  ];

  for (const path of requiredPaths) {
    requireFile(path);
  }

  const tagGuidesDir = join(distDir, "tag-guides");
  requireFile(tagGuidesDir);

  for (const slug of readSourceTagGuideSlugs()) {
    requireFile(join(tagGuidesDir, `${slug}.html`));
  }
}

function checkNoSourceMirrors(distDir) {
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

function checkIndexHtml(distDir) {
  const indexPath = join(distDir, "index.html");
  const text = readText(
    indexPath,
    "Run npm run build before npm run verify:pages.",
  );
  const document = toDocument(text);
  const label = relative(repoRoot, indexPath);

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

function checkGlossaryHtml(distDir) {
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

  assertContains(text, 'href="site/styles/style.css?v=', label);
  assertContains(text, 'src="site/scripts/term-popup.js?v=', label);
}

function checkTagGuideHtml(distDir, slug) {
  const htmlPath = join(distDir, "tag-guides", `${slug}.html`);
  const text = readText(
    htmlPath,
    "Run npm run build before npm run verify:pages.",
  );
  const document = toDocument(text);
  const label = `tag-guides/${slug}.html`;

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

function checkTagGuideHtmlFiles(distDir) {
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

function checkLocalLinksInDist(distDir) {
  for (const filePath of walkFiles(distDir).filter((filePath) =>
    filePath.endsWith(".html"),
  )) {
    const text = readText(filePath);
    const document = toDocument(text);
    validateLocalLinks(filePath, document);
  }
}

function main() {
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

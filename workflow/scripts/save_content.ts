#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import { type ArticleRow, readArticles } from "./article_rows.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const dryRun = args.has("--dry-run");
const overwrite = args.has("--overwrite");
const pendingOnly = !args.has("--all");
const saveImages = !args.has("--no-images");

const contentRoot = join(repoRoot, "archive/extracted");
const assetsRoot = join(repoRoot, "archive/assets");
const defaultTimeoutSeconds = 60;

type FetchOptions = {
  headers?: Record<string, string>;
};

const usage = (): void => {
  console.log(`Usage: tsx workflow/scripts/save_content.ts [options]

Options:
  --dry-run                   Show what would be saved without downloading pages.
  --overwrite                 Re-save Markdown even when the output file already exists.
  --refresh-days <days>       Re-save an existing Markdown file when it is older than this many days.
  --timeout-seconds <seconds> Skip a page or image request when it takes longer than this. Default: ${defaultTimeoutSeconds}.
  --no-images                 Save Markdown only. Do not download images.
  --all                       Process all rows, not only rows whose content file is missing.

Examples:
  npm run save:content
  tsx workflow/scripts/save_content.ts --all --refresh-days 30
  tsx workflow/scripts/save_content.ts --all --overwrite
  tsx workflow/scripts/save_content.ts --no-images

Output:
  archive/extracted/<source>/<id>.md
  archive/assets/<source>/<id>/image-001.<ext>
`);
};

if (args.has("--help") || args.has("-h")) {
  usage();
  process.exit(0);
}

const readNumberArg = (name: string): number | null => {
  const equalsPrefix = `${name}=`;
  const equalsArg = rawArgs.find((arg) => arg.startsWith(equalsPrefix));

  if (equalsArg) {
    return Number(equalsArg.slice(equalsPrefix.length));
  }

  const index = rawArgs.indexOf(name);
  if (index === -1) {
    return null;
  }

  return Number(rawArgs[index + 1]);
};

const refreshDays = readNumberArg("--refresh-days");
const timeoutSeconds =
  readNumberArg("--timeout-seconds") ?? defaultTimeoutSeconds;

if (
  refreshDays !== null &&
  (!Number.isFinite(refreshDays) || refreshDays < 0)
) {
  throw new Error("--refresh-days must be a non-negative number.");
}

if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
  throw new Error("--timeout-seconds must be a positive number.");
}

const normalizeSource = (source: string | undefined): string =>
  String(source ?? "unknown")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";

const ensureDir = (path: string): void => {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
};

const removeDirIfExists = (path: string): void => {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
};

const fileAgeDays = (path: string): number => {
  const { mtimeMs } = statSync(path);
  return (Date.now() - mtimeMs) / (1000 * 60 * 60 * 24);
};

const escapeYaml = (value: string | number | null | undefined): string => {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
};

const sanitizeMarkdown = (markdown: string): string =>
  markdown.replace(/\n{3,}/g, "\n\n").trim();

const extensionFromContentType = (
  contentType: string | null,
): string | null => {
  if (!contentType) return null;
  const [typePart] = contentType.split(";");
  const type = (typePart ?? "").trim().toLowerCase();

  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/avif": ".avif",
  };

  return map[type] ?? null;
};

const extensionFromUrl = (url: string): string | null => {
  try {
    const pathname = new URL(url).pathname;
    const ext = extname(pathname).toLowerCase();
    if (
      [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"].includes(ext)
    ) {
      return ext === ".jpeg" ? ".jpg" : ext;
    }
  } catch {
    // Ignore invalid image URLs.
  }

  return null;
};

const fetchWithTimeout = async (
  url: string,
  options: FetchOptions = {},
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 ai-agent-best-practices-content-archiver",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...(options.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
};

const shouldProcessContent = (
  outputPath: string,
): {
  process: boolean;
  reason: string;
} => {
  if (!existsSync(outputPath)) {
    return { process: true, reason: "missing content file" };
  }

  if (overwrite) {
    return { process: true, reason: "overwrite requested" };
  }

  if (refreshDays !== null) {
    const ageDays = fileAgeDays(outputPath);
    if (ageDays >= refreshDays) {
      return {
        process: true,
        reason: `content file is ${ageDays.toFixed(1)} days old`,
      };
    }

    return {
      process: false,
      reason: `content file is ${ageDays.toFixed(1)} days old; refresh threshold is ${refreshDays} days`,
    };
  }

  return { process: false, reason: "existing content file" };
};

const prepareArticleHtml = (document: Document): void => {
  document
    .querySelectorAll(
      "script, style, noscript, iframe, nav, header, footer, aside, form, button",
    )
    .forEach((node: Element) => {
      node.remove();
    });

  document.querySelectorAll("img").forEach((img: HTMLImageElement) => {
    const src =
      img.getAttribute("src") ||
      img.getAttribute("data-src") ||
      img.getAttribute("data-original");
    if (src) {
      img.setAttribute("src", src);
    }

    img.removeAttribute("srcset");
    img.removeAttribute("sizes");
  });
};

const downloadImages = async (
  articleDom: JSDOM,
  articleUrl: string,
  assetsDir: string,
  markdownPath: string,
): Promise<void> => {
  if (!saveImages) return;

  const images = [...articleDom.window.document.querySelectorAll("img")];
  if (images.length === 0) return;

  ensureDir(assetsDir);
  let index = 1;

  for (const img of images) {
    const src = img.getAttribute("src");
    if (!src || src.startsWith("data:")) continue;

    let absoluteUrl: string;
    try {
      absoluteUrl = new URL(src, articleUrl).toString();
    } catch {
      continue;
    }

    try {
      const response = await fetchWithTimeout(absoluteUrl, {
        headers: {
          accept:
            "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().startsWith("image/")) {
        throw new Error(
          `not an image: ${contentType || "unknown content-type"}`,
        );
      }

      const ext =
        extensionFromContentType(contentType) ??
        extensionFromUrl(absoluteUrl) ??
        ".img";
      const filename = `image-${String(index).padStart(3, "0")}${ext}`;
      const imagePath = join(assetsDir, filename);
      const bytes = Buffer.from(await response.arrayBuffer());

      writeFileSync(imagePath, bytes);

      const markdownRelativePath = relative(
        dirname(markdownPath),
        imagePath,
      ).replaceAll("\\", "/");
      img.setAttribute("src", markdownRelativePath);
      index += 1;
    } catch (error: unknown) {
      console.error(`image failed: ${absoluteUrl}`);
      console.error(
        `  ${error instanceof Error ? error.message : String(error)}`,
      );
      img.remove();
    }
  }
};

const configureTurndown = (): TurndownService => {
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  turndown.keep(["table", "thead", "tbody", "tr", "th", "td"]);

  turndown.addRule("fencedCodeWithLanguage", {
    filter: (node: Node) => {
      return (
        node.nodeName === "PRE" &&
        node instanceof HTMLElement &&
        node.querySelector("code") !== null
      );
    },
    replacement: (_content: string, node: Node) => {
      if (!(node instanceof HTMLElement)) {
        return "";
      }

      const code = node.querySelector("code");
      if (!code) {
        return "";
      }

      const className = code.getAttribute("class") || "";
      const language = className.match(/language-([^\s]+)/)?.[1] || "";
      return `\n\n\`\`\`${language}\n${code.textContent?.replace(/\n$/, "") ?? ""}\n\`\`\`\n\n`;
    },
  });

  return turndown;
};

const saveArticle = async (row: ArticleRow): Promise<"saved" | "skipped"> => {
  const id = row.id.trim();
  const url = row.url?.trim();
  const sourceDir = normalizeSource(row.source);

  if (!id || !url) {
    throw new Error(`Missing id or url: ${JSON.stringify(row)}`);
  }

  const outputDir = join(contentRoot, sourceDir);
  const outputPath = join(outputDir, `${id}.md`);
  const assetsDir = join(assetsRoot, sourceDir, id);
  const relativeOutputPath = `archive/extracted/${sourceDir}/${id}.md`;

  const { process, reason } = shouldProcessContent(outputPath);
  if (!process && !pendingOnly) {
    console.log(`skip existing: ${relativeOutputPath} (${reason})`);
    return "skipped";
  }
  if (!process && pendingOnly) {
    console.log(`skip existing: ${relativeOutputPath} (${reason})`);
    return "skipped";
  }

  console.log(`${dryRun ? "would save" : "saving"}: ${url}`);
  console.log(`  -> ${relativeOutputPath}`);

  if (dryRun) return "saved";

  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  prepareArticleHtml(dom.window.document);

  const reader = new Readability(dom.window.document, {
    keepClasses: false,
  });
  const article = reader.parse();

  if (!article?.content) {
    throw new Error("Readability could not extract main content.");
  }

  const articleDom = new JSDOM(article.content, { url });
  removeDirIfExists(assetsDir);
  await downloadImages(articleDom, url, assetsDir, outputPath);

  const turndown = configureTurndown();
  const markdownBody = sanitizeMarkdown(
    turndown.turndown(articleDom.window.document.body.innerHTML),
  );
  const capturedAt = new Date().toISOString();
  const title = article.title || row.title || id;
  const byline = article.byline || "";
  const excerpt = article.excerpt || "";

  const markdown = `---
id: "${escapeYaml(id)}"
title: "${escapeYaml(title)}"
url: "${escapeYaml(url)}"
source: "${escapeYaml(row.source)}"
category: "${escapeYaml(row.category)}"
captured_at: "${capturedAt}"
byline: "${escapeYaml(byline)}"
excerpt: "${escapeYaml(excerpt)}"
---

# ${title}

${markdownBody}
`;

  ensureDir(outputDir);
  writeFileSync(outputPath, markdown, "utf8");

  return "saved";
};

const main = async (): Promise<void> => {
  const rows = readArticles(join(repoRoot, "sources/articles.csv"));
  let saved = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const result = await saveArticle(row);
      if (result === "skipped") {
        skipped += 1;
      } else if (!dryRun) {
        saved += 1;
      }
    } catch (error) {
      failed += 1;
      console.error(`failed: ${row.id} ${row.url}`);
      console.error(error instanceof Error ? error.message : String(error));
    }
  }

  console.log("\nDone.");
  console.log(`saved: ${saved}`);
  console.log(`skipped: ${skipped}`);
  console.log(`failed: ${failed}`);

  if (dryRun) {
    console.log("Dry run only. No files were written.");
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error : String(error));
  process.exit(1);
});

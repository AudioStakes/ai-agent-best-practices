import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..");
const cssPath = path.join(repoRoot, "site/styles/style.css");
const githubMarkdownCssPath = path.join(
  repoRoot,
  "node_modules/github-markdown-css/github-markdown-light.css",
);
const packageDistAssetsScript = path.join(
  repoRoot,
  "workflow/scripts/package_dist_assets.ts",
);

function runProcess(args) {
  const child = spawn("tsx", [packageDistAssetsScript, ...args], {
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

test("site CSS stays focused on the shell, glossary, and term popup", async () => {
  const css = readFileSync(cssPath, "utf8");

  expect(css).toContain(".markdown-body a.term");
  expect(css).toContain(".markdown-body a.term:hover");
  expect(css).toContain(".markdown-body a.term:visited");
  expect(css).toContain(".term-popup");
  expect(css).toContain('[data-reviewable="true"]');
  expect(css).toContain(".html-review-launcher");
  expect(css).toContain(".html-review-dialog");
  expect(css).toContain(".glossary-table-wrap");
  expect(css).toContain("body.site-index :where(.article)");
  expect(css).toContain("body.tag-guide-page :where(.article)");
  expect(css).toContain("body.glossary-page :where(.article)");
  expect(css).toContain("body.glossary-page .glossary-cards");

  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "css-copy-"));
  const distDir = path.join(tempRoot, "dist");

  try {
    const result = await runProcess(["--dist-dir", distDir]);
    expect(result.code).toBe(0);

    const distCss = readFileSync(
      path.join(distDir, "site/styles/style.css"),
      "utf8",
    );
    expect(distCss).toContain(".term-popup");
    expect(distCss).toContain(".html-review-launcher");
    expect(distCss).toContain(".glossary-table-wrap");
    expect(
      readFileSync(path.join(distDir, "site/scripts/html-review.js"), "utf8"),
    ).toContain("HTML_REVIEW_VERSION");
    const distMarkdownCss = readFileSync(
      path.join(distDir, "site/styles/github-markdown.css"),
      "utf8",
    );
    expect(distMarkdownCss).not.toContain("prefers-color-scheme: dark");
    expect(distMarkdownCss).toContain(".markdown-body");
    expect(readFileSync(githubMarkdownCssPath, "utf8")).not.toContain(
      "prefers-color-scheme: dark",
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

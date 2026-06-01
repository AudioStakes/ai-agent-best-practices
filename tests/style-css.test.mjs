import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..");
const cssPath = path.join(repoRoot, "site/styles/style.css");
const packageDistAssetsScript = path.join(
  repoRoot,
  "workflow/scripts/package_dist_assets.js",
);

function runProcess(args) {
  const child = spawn("node", [packageDistAssetsScript, ...args], {
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

test("site CSS uses GitHub Markdown styling instead of legacy article cards", async () => {
  const css = readFileSync(cssPath, "utf8");

  expect(css).not.toContain(".markdown-body");
  expect(css).not.toContain(".markdown-document");
  expect(css).not.toContain(".markdown-alert");
  expect(css).not.toContain(".publication-note");
  expect(css).not.toContain(".rating-guide");
  expect(css).not.toContain(".checklist");
  expect(css).not.toContain(".semantic-list");

  expect(css).toContain(".term-popup");
  expect(css).toContain(".glossary-table-wrap");
  expect(css).toContain("body.site-index :where(.article)");
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
    expect(distCss).not.toContain(".semantic-overrides");
    expect(distCss).not.toContain(".markdown-alert");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

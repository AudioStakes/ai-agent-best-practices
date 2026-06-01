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

  expect(css).toContain(".markdown-body");
  expect(css).toContain("--color-canvas-subtle: #f6f8fa");
  expect(css).toContain(".markdown-alert-note");
  expect(css).toContain(".markdown-alert-warning");
  expect(css).toContain(".markdown-alert-caution");
  expect(css).toContain(
    ":where(.markdown-body, .markdown-document, .article) pre {",
  );
  expect(css).toContain("background-color: var(--color-canvas-subtle);");
  expect(css).toContain("font-family: var(--mono-stack);");

  expect(css).not.toMatch(/(^|\n)\.article\s*\{[^}]*box-shadow:/s);
  expect(css).not.toMatch(/(^|\n)pre\s*\{[^}]*background:\s*var\(--code-bg\)/s);

  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "css-copy-"));
  const distDir = path.join(tempRoot, "dist");

  try {
    const result = await runProcess(["--dist-dir", distDir]);
    expect(result.code).toBe(0);

    const distCss = readFileSync(
      path.join(distDir, "site/styles/style.css"),
      "utf8",
    );
    expect(distCss).toContain(".markdown-body");
    expect(distCss).toContain(".markdown-alert-note");
    expect(distCss).toContain(".markdown-alert-warning");
    expect(distCss).toContain(".markdown-alert-caution");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

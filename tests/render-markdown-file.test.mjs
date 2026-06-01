import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { test, expect } from "@playwright/test";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..");
const scriptPath = path.join(
  repoRoot,
  "workflow/scripts/render_markdown_file.js",
);
const sourcePath = path.join(
  repoRoot,
  "workflow/guides/github-markdown-style-guide.md",
);

function runProcess(args) {
  const child = spawn("node", [scriptPath, ...args], {
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

test("render_markdown_file.js converts markdown into standalone HTML", async () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "markdown-render-"));
  const outputPath = path.join(tempRoot, "guide.html");

  try {
    const result = await runProcess([sourcePath, outputPath]);
    expect(result.code).toBe(0);
    expect(existsSync(outputPath)).toBeTruthy();

    const html = readFileSync(outputPath, "utf8");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("GitHub Markdown Style Guide");
    expect(html).toContain('<article class="markdown-body">');
    expect(html).toContain("github-markdown.css");
    expect(html).toContain("style.css");
    expect(html).toContain("<table>");
    expect(html).toContain('type="checkbox"');
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

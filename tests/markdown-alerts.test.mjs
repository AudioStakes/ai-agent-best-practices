import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..");
const buildTagGuidesScript = path.join(
  repoRoot,
  "workflow/scripts/build_tag_guides_html.js",
);
const glossaryPath = path.join(repoRoot, "content/domain-glossary.md");

function runProcess(args) {
  const child = spawn("node", [buildTagGuidesScript, ...args], {
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

test("build_tag_guides_html.js converts GitHub alerts and keeps normal blockquotes", async () => {
  const inputDir = mkdtempSync(path.join(os.tmpdir(), "alerts-input-"));
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "alerts-output-"));

  try {
    writeFileSync(
      path.join(inputDir, "alerts.md"),
      `# Alert Test

> [!NOTE]
> This is a note.

> [!TIP]
> This is a tip.

> [!IMPORTANT]
> This is important.

> [!WARNING]
> This is a warning.

> [!CAUTION]
> This is caution.
`,
      "utf8",
    );

    writeFileSync(
      path.join(inputDir, "quote.md"),
      `# Quote Test

> This is a normal quote.
`,
      "utf8",
    );

    const result = await runProcess([
      "--input-dir",
      inputDir,
      "--output-dir",
      outputDir,
      "--glossary",
      glossaryPath,
    ]);

    expect(result.code).toBe(0);

    const alertDocument = new JSDOM(
      readFileSync(path.join(outputDir, "alerts.html"), "utf8"),
    ).window.document;
    expect(alertDocument.querySelector(".markdown-body")).toBeTruthy();
    expect(
      alertDocument.querySelector(".markdown-alert-note .markdown-alert-title")
        ?.textContent,
    ).toBe("Note");
    expect(
      alertDocument.querySelector(".markdown-alert-tip .markdown-alert-title")
        ?.textContent,
    ).toBe("Tip");
    expect(
      alertDocument.querySelector(
        ".markdown-alert-important .markdown-alert-title",
      )?.textContent,
    ).toBe("Important");
    expect(
      alertDocument.querySelector(
        ".markdown-alert-warning .markdown-alert-title",
      )?.textContent,
    ).toBe("Warning");
    expect(
      alertDocument.querySelector(
        ".markdown-alert-caution .markdown-alert-title",
      )?.textContent,
    ).toBe("Caution");
    expect(alertDocument.querySelector("blockquote")).toBeFalsy();

    const quoteDocument = new JSDOM(
      readFileSync(path.join(outputDir, "quote.html"), "utf8"),
    ).window.document;
    expect(quoteDocument.querySelector("blockquote")).toBeTruthy();
  } finally {
    rmSync(inputDir, { recursive: true, force: true });
    rmSync(outputDir, { recursive: true, force: true });
  }
});

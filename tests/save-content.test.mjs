import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import {
  configureTurndown,
  loadArticleHtml,
} from "../workflow/scripts/save_content.ts";
import { JSDOM } from "jsdom";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..");

test("loadArticleHtml prefers local singlefile output", async () => {
  const sourceDir = "example-provider";
  const id = "example-article";
  const localDir = path.join(repoRoot, "archive", "singlefile", sourceDir);
  const localPath = path.join(localDir, `${id}.html`);

  mkdirSync(localDir, { recursive: true });
  writeFileSync(localPath, "<html><body><p>local singlefile</p></body></html>", "utf8");

  const result = await loadArticleHtml({
    id,
    source: "Example Provider",
    url: "https://example.com/will-not-be-fetched",
  });

  expect(result.sourceLabel).toBe(path.relative(repoRoot, localPath));
  expect(result.html).toContain("local singlefile");

  rmSync(path.join(repoRoot, "archive", "singlefile", sourceDir), {
    recursive: true,
    force: true,
  });
});

test("configureTurndown handles fenced code without global HTMLElement", () => {
  const dom = new JSDOM("<body><pre><code class=\"language-ts\">const x = 1;</code></pre></body>");
  const markdown = configureTurndown().turndown(dom.window.document.body.innerHTML);

  expect(markdown).toContain("```ts");
  expect(markdown).toContain("const x = 1;");
});

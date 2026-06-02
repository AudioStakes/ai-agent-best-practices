import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { readArticles } from "../workflow/scripts/article_rows.ts";

test("readArticles supports the merged articles.csv schema", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "article-rows-"));
  const csvPath = path.join(tempDir, "articles.csv");

  writeFileSync(
    csvPath,
    [
      "url,id,title,category,provider,source_type,initial_tags,relevance,priority,notes",
      "https://example.com/a,example_a,Example A,agent_design,Example,official guide,tools; evals,high,P0,Example note",
    ].join("\n"),
    "utf8",
  );

  const rows = readArticles(csvPath);

  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    id: "example_a",
    title: "Example A",
    url: "https://example.com/a",
    source: "Example",
    status: "pending",
    category: "agent_design",
    source_type: "official guide",
    initial_tags: "tools; evals",
    relevance: "high",
    priority: "P0",
    notes: "Example note",
  });

  rmSync(tempDir, { recursive: true, force: true });
});

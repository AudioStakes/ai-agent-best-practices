import { expect, test } from "@playwright/test";
import {
  upsertMarkdownFrontmatter,
  upsertSinglefileComment,
} from "../workflow/scripts/backfill_article_dates.ts";

test("upsertMarkdownFrontmatter injects published and updated dates", () => {
  const markdown = `---
id: "SRC001"
title: "Example"
url: "https://example.com"
source: "Example"
category: "agent_design"
captured_at: "2026-06-02T00:00:00.000Z"
---

# Example

Body
`;

  const { content, changed } = upsertMarkdownFrontmatter(markdown, {
    publishedAt: "2024-01-02T03:04:05Z",
    updatedAt: "2024-05-06T07:08:09Z",
  });

  expect(changed).toBe(true);
  expect(content).toContain('published_at: "2024-01-02T03:04:05Z"');
  expect(content).toContain('updated_at: "2024-05-06T07:08:09Z"');
  expect(content).toContain("# Example");
});

test("upsertSinglefileComment prefixes article dates comment", () => {
  const html = "<!DOCTYPE html><html><body><p>hello</p></body></html>";
  const { content, changed } = upsertSinglefileComment(html, {
    publishedAt: "2024-01-02T03:04:05Z",
    updatedAt: "2024-05-06T07:08:09Z",
  });

  expect(changed).toBe(true);
  expect(content).toContain("article_dates");
  expect(content).toContain('published_at: "2024-01-02T03:04:05Z"');
  expect(content).toContain('updated_at: "2024-05-06T07:08:09Z"');
});

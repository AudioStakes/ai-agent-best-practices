import { expect, test } from "@playwright/test";
import { JSDOM } from "jsdom";
import {
  extractArticleDates,
  extractArticleDatesFromHtml,
  renderArticleDatesComment,
  stripLeadingArticleDatesComment,
} from "../workflow/scripts/article_dates.ts";

test("extractArticleDates prefers article meta tags", () => {
  const dom = new JSDOM(`
    <html>
      <head>
        <meta property="article:published_time" content="2024-01-02T03:04:05Z" />
        <meta property="article:modified_time" content="2024-05-06T07:08:09Z" />
      </head>
      <body></body>
    </html>
  `);

  expect(extractArticleDates(dom.window.document)).toEqual({
    publishedAt: "2024-01-02T03:04:05Z",
    updatedAt: "2024-05-06T07:08:09Z",
  });
});

test("extractArticleDates falls back to JSON-LD and comment rendering is stable", () => {
  const dom = new JSDOM(`
    <html>
      <head>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Article",
            "datePublished": "2024-02-03T04:05:06Z",
            "dateModified": "2024-06-07T08:09:10Z"
          }
        </script>
      </head>
      <body></body>
    </html>
  `);

  const dates = extractArticleDates(dom.window.document);
  expect(dates).toEqual({
    publishedAt: "2024-02-03T04:05:06Z",
    updatedAt: "2024-06-07T08:09:10Z",
  });

  const comment = renderArticleDatesComment(dates);
  expect(comment).toContain("article_dates");
  expect(comment).toContain('published_at: "2024-02-03T04:05:06Z"');
  expect(comment).toContain('updated_at: "2024-06-07T08:09:10Z"');
  expect(stripLeadingArticleDatesComment(`${comment}<html/>`)).toBe("<html/>");
});

test("extractArticleDatesFromHtml parses raw html strings", () => {
  const html = `
    <html>
      <head>
        <meta property="article:published_time" content="2024-03-04T05:06:07Z" />
        <meta property="article:modified_time" content="2024-07-08T09:10:11Z" />
      </head>
      <body></body>
    </html>
  `;

  expect(extractArticleDatesFromHtml(html)).toEqual({
    publishedAt: "2024-03-04T05:06:07Z",
    updatedAt: "2024-07-08T09:10:11Z",
  });
});

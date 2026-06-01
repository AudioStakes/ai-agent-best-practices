import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import { markdownToHtml } from "../workflow/scripts/markdown_to_html.js";

test("markdownToHtml renders representative GitHub Flavored Markdown", async () => {
  const markdown = `# Heading

Paragraph with \`inline code\`, a [link](https://example.com), and ~~strikethrough~~.

> Quoted line

- Bullet one
- Bullet two

1. First
2. Second

\`\`\`js
console.log("hello");
\`\`\`

| Name | Value |
| --- | --- |
| Alpha | Beta |

- [x] Done
- [ ] Todo
`;

  const html = await markdownToHtml(markdown);
  const document = new JSDOM(html).window.document;

  expect(document.querySelector("h1")?.textContent).toBe("Heading");
  expect(document.querySelector("ul")).toBeTruthy();
  expect(document.querySelector("ol")).toBeTruthy();
  expect(document.querySelector("pre code")?.className).toContain(
    "language-js",
  );
  expect(document.querySelector("code:not(pre code)")?.textContent).toContain(
    "inline code",
  );
  expect(document.querySelector("table")).toBeTruthy();
  expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
  expect(document.querySelector("del")?.textContent).toBe("strikethrough");
  expect(document.querySelector("a")?.getAttribute("href")).toBe(
    "https://example.com",
  );
  expect(document.querySelector("blockquote")?.textContent).toContain(
    "Quoted line",
  );
});

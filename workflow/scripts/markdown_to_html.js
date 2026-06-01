import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify, { allowDangerousHtml: true });

export async function markdownToHtml(markdown) {
  const file = await markdownProcessor.process(markdown);
  return String(file);
}

export function extractTitle(markdown, fallback) {
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^#\s+(.+?)\s*$/);
    if (match) {
      return match[1].trim();
    }
  }

  return fallback;
}

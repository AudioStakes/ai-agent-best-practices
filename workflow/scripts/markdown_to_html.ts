import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify, { allowDangerousHtml: true });

export const markdownToHtml = async (markdown: string): Promise<string> => {
  const file = await markdownProcessor.process(markdown);
  return String(file);
};

export const extractTitle = (markdown: string, fallback: string): string => {
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^#\s+(.+?)\s*$/);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return fallback;
};

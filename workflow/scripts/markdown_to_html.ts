import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

type SourcePositionLine = {
  column: number;
  line: number;
  offset?: number;
};

type SourcePosition = {
  end: SourcePositionLine;
  start: SourcePositionLine;
};

type HastNode = {
  children?: HastNode[];
  position?: SourcePosition;
  properties?: Record<string, unknown>;
  tagName?: string;
  type?: string;
};

const reviewableTagNames = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "li",
  "blockquote",
  "pre",
]);

const createMarkdownProcessor = (sourcePath?: string) => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true });

  if (sourcePath) {
    processor.use(function reviewSourceMetadataPlugin() {
      return (tree: unknown): void => {
        const visit = (node: HastNode | null | undefined): void => {
          if (!node || typeof node !== "object") {
            return;
          }

          if (node.type === "element" && typeof node.tagName === "string") {
            const position =
              node.position ??
              (node.tagName === "pre"
                ? node.children?.find(
                    (child): child is HastNode =>
                      Boolean(child) &&
                      child.type === "element" &&
                      child.tagName === "code" &&
                      Boolean(child.position),
                  )?.position
                : undefined);

            if (position && reviewableTagNames.has(node.tagName)) {
              node.properties = {
                ...(node.properties ?? {}),
                "data-reviewable": "true",
                "data-source-path": sourcePath,
                "data-source-start-line": String(position.start.line),
                "data-source-end-line": String(position.end.line),
              };
            }
          }

          for (const child of node.children ?? []) {
            visit(child);
          }
        };

        visit(tree as HastNode | null | undefined);
      };
    });
  }

  return processor.use(rehypeStringify, { allowDangerousHtml: true });
};

export const markdownToHtml = async (markdown: string): Promise<string> => {
  const file = await createMarkdownProcessor().process(markdown);
  return String(file);
};

export const markdownToHtmlWithSourceMetadata = async (
  markdown: string,
  sourcePath: string,
): Promise<string> => {
  const file = await createMarkdownProcessor(sourcePath).process(markdown);
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

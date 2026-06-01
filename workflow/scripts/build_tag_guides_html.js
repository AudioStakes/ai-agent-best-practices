#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { markdownToHtml } from "./markdown_to_html.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const defaultInputDir = join(repoRoot, "content/tag-guides");
const defaultOutputDir = join(repoRoot, "dist/tag-guides");
const defaultGlossaryPath = join(repoRoot, "content/domain-glossary.md");
const stylesheetVersion = "20260601-site-shell-3";
const popupScriptVersion = "20260601-site-shell-3";

function parseArgs(argv) {
  const options = {
    inputDir: defaultInputDir,
    outputDir: defaultOutputDir,
    glossaryPath: defaultGlossaryPath,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--input-dir" && next) {
      options.inputDir = resolve(next);
      index += 1;
    } else if (arg === "--output-dir" && next) {
      options.outputDir = resolve(next);
      index += 1;
    } else if (arg === "--glossary" && next) {
      options.glossaryPath = resolve(next);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelpAndExit();
    } else {
      throw new Error(
        `Unknown argument: ${arg}\nUse --help to see available options.`,
      );
    }
  }

  return options;
}

function printHelpAndExit() {
  console.log(`Usage:
  node workflow/scripts/build_tag_guides_html.js [--input-dir DIR] [--output-dir DIR] [--glossary FILE]

Defaults:
  --input-dir   ${defaultInputDir}
  --output-dir  ${defaultOutputDir}
  --glossary    ${defaultGlossaryPath}`);
  process.exit(0);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function readGlossaryDescriptions(glossaryPath) {
  if (!existsSync(glossaryPath)) {
    throw new Error(`Glossary file not found: ${glossaryPath}`);
  }

  const descriptions = new Map();
  const lines = readFileSync(glossaryPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(
      /^\| <a id="([^"]+)"><\/a>[^|]*\|[^|]*\|([^|]*)\|/,
    );

    if (match) {
      const id = match[1].trim();
      const description = match[2].trim();
      if (id) {
        descriptions.set(id, description);
      }
    }
  }

  return descriptions;
}

function readGlossaryTerms(glossaryPath) {
  const terms = [];
  const lines = readFileSync(glossaryPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(
      /^\| <a id="([^"]+)"><\/a>\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|/,
    );

    if (!match) {
      continue;
    }

    const id = match[1].trim();
    const english = match[2].trim();
    const japanese = match[3].trim();
    const description = match[4].trim();

    if (japanese && japanese !== "-") {
      terms.push({ id, term: japanese, description });
    }

    if (english && english !== "-" && !/^[A-Za-z0-9 ./-]+$/.test(english)) {
      terms.push({ id, term: english, description });
    }
  }

  return terms;
}

function slugifyHeading(text, usedIds) {
  const base =
    String(text)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, "and")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "section";

  let candidate = base;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

function rewriteLinks(document, glossaryDescriptions) {
  for (const anchor of document.querySelectorAll("a[href]")) {
    const href = anchor.getAttribute("href");
    if (!href) {
      continue;
    }

    const glossaryMatch = href.match(
      /^(?<prefix>(?:\.\.\/|\.\/)*)domain-glossary\.md#(?<id>[^?#]+)$/,
    );

    if (glossaryMatch?.groups) {
      const { prefix, id } = glossaryMatch.groups;
      const description = glossaryDescriptions.get(id) || "";
      anchor.classList.add("term");
      anchor.setAttribute("href", `${prefix}domain-glossary.html#${id}`);
      if (description) {
        anchor.setAttribute("data-description", description);
      }
      continue;
    }

    if (/^(https?:|mailto:|tel:|#)/.test(href)) {
      continue;
    }

    if (href.includes(".md")) {
      anchor.setAttribute("href", href.replace(/\.md(?=(?:[?#]|$))/g, ".html"));
    }
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTermMatcher(terms) {
  const uniqueTerms = [
    ...new Map(terms.map((entry) => [entry.term, entry])).values(),
  ];
  const sortedTerms = uniqueTerms
    .map((entry) => entry.term)
    .sort((a, b) => b.length - a.length);
  const pattern = sortedTerms.map(escapeRegExp).join("|");

  return {
    termsByText: new Map(uniqueTerms.map((entry) => [entry.term, entry])),
    regex: pattern ? new RegExp(pattern, "g") : null,
  };
}

function linkGlossaryTerms(document, article, glossaryTerms) {
  if (!article || glossaryTerms.length === 0) {
    return;
  }

  const { termsByText, regex } = buildTermMatcher(glossaryTerms);
  if (!regex) {
    return;
  }

  const filter = document.defaultView.NodeFilter;
  const skipTags = new Set(["A", "CODE", "PRE", "SCRIPT", "STYLE"]);
  const textNodes = [];
  const walker = document.createTreeWalker(article, filter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.nodeValue || "";
      if (!text.trim()) {
        return filter.FILTER_REJECT;
      }

      const parent = node.parentElement;
      if (!parent || skipTags.has(parent.tagName)) {
        return filter.FILTER_REJECT;
      }

      return filter.FILTER_ACCEPT;
    },
  });

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  for (const textNode of textNodes) {
    const text = textNode.nodeValue || "";
    regex.lastIndex = 0;
    if (!regex.test(text)) {
      continue;
    }

    regex.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    for (const match of text.matchAll(regex)) {
      const [matchedText] = match;
      const index = match.index ?? 0;
      if (index > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, index)),
        );
      }

      const term = termsByText.get(matchedText);
      if (term) {
        const anchor = document.createElement("a");
        anchor.className = "term";
        anchor.setAttribute(
          "href",
          `../domain-glossary.html#${escapeHtml(term.id)}`,
        );
        if (term.description) {
          anchor.setAttribute("data-description", term.description);
        }
        anchor.textContent = matchedText;
        fragment.appendChild(anchor);
      } else {
        fragment.appendChild(document.createTextNode(matchedText));
      }

      lastIndex = index + matchedText.length;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
  }
}

function annotateHeadings(document) {
  const usedIds = new Set();

  for (const heading of document.querySelectorAll("h1, h2, h3, h4, h5, h6")) {
    if (!heading.id) {
      heading.id = slugifyHeading(heading.textContent || "", usedIds);
    } else {
      usedIds.add(heading.id);
    }
  }
}

function getFenceToken(codeBlock) {
  return Array.from(codeBlock.classList).find((className) =>
    className.startsWith("language-"),
  );
}

function parseFenceToken(token) {
  const value = token.replace(/^language-/, "");
  const parts = value.split(".").filter(Boolean);
  const base = parts[0] || "";
  const tags = new Set(parts.slice(1));
  return { base, tags, raw: value };
}

function stripListMarker(line) {
  return line.replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, "").trim();
}

function createListElement(document, tagName, className, items) {
  const list = document.createElement(tagName);
  list.className = className;

  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  }

  return list;
}

function extractCodeExampleLabel(base) {
  const normalized = base.toLowerCase();
  if (normalized === "json") {
    return "JSON";
  }
  if (normalized === "markdown" || normalized === "md") {
    return "Markdown";
  }
  if (normalized === "text" || normalized === "txt") {
    return "Text";
  }
  if (normalized.startsWith("tone-")) {
    return "Text";
  }
  if (!normalized) {
    return "Code";
  }
  return normalized.toUpperCase();
}

function renderCodeExample(document, codeBlock, base) {
  const box = document.createElement("div");
  box.className = "code-example-box";

  const label = document.createElement("div");
  label.className = "code-example-label";
  label.textContent = extractCodeExampleLabel(base);
  box.appendChild(label);

  const pre = document.createElement("pre");
  pre.className = "code-example";

  const code = document.createElement("code");
  if (base && base !== "text") {
    code.classList.add(`language-${base}`);
  }
  code.innerHTML = codeBlock.innerHTML;
  pre.appendChild(code);
  box.appendChild(pre);
  return box;
}

function renderTakeaway(document, lines) {
  const box = document.createElement("div");
  box.className = "takeaway-box";

  lines.forEach((line, index) => {
    if (index > 0) {
      box.appendChild(document.createElement("br"));
    }
    box.appendChild(document.createTextNode(line));
  });

  return box;
}

async function renderDefinition(document, text) {
  const box = document.createElement("div");
  box.className = "definition-box";
  const dl = document.createElement("dl");
  const lines = text.split(/\r?\n/);
  let index = 0;

  const flushSection = async (title, sectionLines) => {
    const dt = document.createElement("dt");
    dt.textContent = title;
    const dd = document.createElement("dd");
    const html = (await markdownToHtml(sectionLines.join("\n"))).trim();
    dd.innerHTML = html || "";
    dl.append(dt, dd);
  };

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const headingMatch = line.match(/^#{2,6}\s+(.+)$/);
    if (headingMatch) {
      const title = headingMatch[1].trim();
      index += 1;
      const sectionLines = [];
      while (index < lines.length) {
        const nextLine = lines[index];
        if (/^#{2,6}\s+/.test(nextLine.trim())) {
          break;
        }
        sectionLines.push(nextLine);
        index += 1;
      }
      await flushSection(title, sectionLines);
      continue;
    }

    const colonMatch = line.match(/^(.+?)[：:]\s*(.*)$/);
    if (colonMatch) {
      const title = colonMatch[1].trim();
      const sectionLines = [colonMatch[2] || ""];
      index += 1;
      while (index < lines.length) {
        const nextLine = lines[index];
        if (!nextLine.trim()) {
          index += 1;
          break;
        }
        if (/^#{2,6}\s+/.test(nextLine.trim())) {
          break;
        }
        if (/^.+?[：:]\s*/.test(nextLine.trim())) {
          break;
        }
        sectionLines.push(nextLine);
        index += 1;
      }
      await flushSection(title, sectionLines);
      continue;
    }

    const title = line;
    index += 1;
    const sectionLines = [];
    while (index < lines.length) {
      const nextLine = lines[index];
      if (/^#{2,6}\s+/.test(nextLine.trim())) {
        break;
      }
      if (/^.+?[：:]\s*/.test(nextLine.trim())) {
        break;
      }
      sectionLines.push(nextLine);
      index += 1;
    }
    await flushSection(title, sectionLines);
  }

  if (dl.childNodes.length > 0) {
    box.appendChild(dl);
  }

  return box;
}

function renderStructuredList(document, lines) {
  const box = document.createElement("div");
  box.className = "structured-list";

  for (const line of lines) {
    const item = document.createElement("div");
    item.className = "structured-item";

    const match = line.match(/^(.+?)[：:]\s*(.+)$/);
    if (match) {
      const strong = document.createElement("strong");
      strong.textContent = match[1].trim();
      item.appendChild(strong);
      item.appendChild(document.createTextNode(match[2].trim()));
    } else {
      item.textContent = line;
    }

    box.appendChild(item);
  }

  return box;
}

function renderRiskLadder(document, text) {
  const box = document.createElement("div");
  box.className = "risk-ladder";
  const lines = text.split(/\r?\n/);
  let current = null;

  const finalize = () => {
    if (!current) {
      return;
    }

    const item = document.createElement("div");
    item.className = `risk-item ${current.className}`;
    const strong = document.createElement("strong");
    strong.textContent = current.label;
    item.appendChild(strong);
    item.appendChild(document.createTextNode(current.items.join(" / ")));
    box.appendChild(item);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const labelMatch = line.match(
      /^(低リスク|中リスク|高リスク|low risk|mid risk|high risk|low|mid|high)\s*[:：]?\s*(.*)$/i,
    );
    if (labelMatch) {
      finalize();

      const rawLabel = labelMatch[1].toLowerCase();
      const remainder = labelMatch[2].trim();
      const className =
        rawLabel.includes("低") || rawLabel.startsWith("low")
          ? "risk-low"
          : rawLabel.includes("中") || rawLabel.startsWith("mid")
            ? "risk-mid"
            : "risk-high";

      current = {
        className,
        label: labelMatch[1],
        items: remainder ? [remainder] : [],
      };
      continue;
    }

    if (current) {
      current.items.push(stripListMarker(line));
    }
  }

  finalize();
  return box;
}

function renderListFromLines(document, tagName, className, text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => stripListMarker(line))
    .filter(Boolean);
  return createListElement(document, tagName, className, lines);
}

function renderProcessSteps(document, text) {
  const textLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const items = [];

  if (textLines.length === 1 && /(?:→|->|↓)/.test(textLines[0])) {
    for (const part of textLines[0].split(/(?:→|->|↓)/)) {
      const cleaned = part.trim();
      if (cleaned) {
        items.push(cleaned);
      }
    }
  } else {
    for (const line of textLines) {
      if (/^(?:→|->|↓)+$/.test(line)) {
        continue;
      }
      const cleaned = stripListMarker(line);
      if (cleaned) {
        items.push(cleaned);
      }
    }
  }

  return createListElement(document, "ol", "process-steps", items);
}

function renderChecklist(document, text, question = false) {
  const className = question ? "checklist question-checklist" : "checklist";
  return renderListFromLines(document, "ul", className, text);
}

function renderGuidelineList(document, text) {
  return renderListFromLines(document, "ul", "guideline-list", text);
}

function renderRiskBox(document, text) {
  return renderListFromLines(document, "ul", "risk-box", text);
}

async function transformMarkedFences(document) {
  const codeBlocks = Array.from(
    document.querySelectorAll('pre > code[class*="language-"]'),
  );

  for (const codeBlock of codeBlocks) {
    const token = getFenceToken(codeBlock);
    if (!token) {
      continue;
    }

    const { base, tags } = parseFenceToken(token);
    const text = codeBlock.textContent || "";
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const firstTag = [...tags][0] || "";
    let replacement = null;

    if (base.startsWith("tone-") && tags.size === 0) {
      const list = document.createElement("div");
      list.className = "term-chip-list";
      list.dataset.tone = base.replace("tone-", "");

      for (const line of lines
        .map((line) => stripListMarker(line))
        .filter(Boolean)) {
        const chip = document.createElement("span");
        chip.textContent = line;
        list.appendChild(chip);
      }

      replacement = list;
    } else if (tags.has("takeaway")) {
      replacement = renderTakeaway(document, lines);
    } else if (tags.has("process")) {
      replacement = renderProcessSteps(document, text);
    } else if (tags.has("risk-ladder")) {
      replacement = renderRiskLadder(document, text);
    } else if (tags.has("risk")) {
      replacement = renderRiskBox(document, text);
    } else if (tags.has("question-checklist")) {
      replacement = renderChecklist(document, text, true);
    } else if (tags.has("checklist")) {
      replacement = renderChecklist(document, text, false);
    } else if (tags.has("guideline")) {
      replacement = renderGuidelineList(document, text);
    } else if (tags.has("definition")) {
      replacement = await renderDefinition(document, text);
    } else if (tags.has("structured")) {
      replacement = renderStructuredList(document, lines);
    } else if (
      tags.has("code-example") ||
      ["json", "markdown", "text"].includes(base)
    ) {
      replacement = renderCodeExample(document, codeBlock, base);
    } else if (firstTag === "code-example") {
      replacement = renderCodeExample(document, codeBlock, base);
    } else if (base === "json" || base === "markdown") {
      replacement = renderCodeExample(document, codeBlock, base);
    }

    if (replacement) {
      codeBlock.parentElement?.replaceWith(replacement);
    }
  }
}

async function buildPage(
  markdown,
  sourceFileName,
  glossaryDescriptions,
  glossaryTerms,
) {
  const rendered = await markdownToHtml(markdown);

  const dom = new JSDOM(`<article class="markdown-body">${rendered}</article>`);
  const { document } = dom.window;
  const article = document.querySelector("article");

  rewriteLinks(document, glossaryDescriptions);
  await transformMarkedFences(document);
  annotateHeadings(document);
  linkGlossaryTerms(document, article, glossaryTerms);

  const title =
    document.querySelector("h1")?.textContent?.trim() || sourceFileName;
  const body = article?.innerHTML ?? rendered;

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="../site/styles/github-markdown.css?v=${stylesheetVersion}" />
  <link rel="stylesheet" href="../site/styles/style.css?v=${stylesheetVersion}" />
  <script src="../site/scripts/term-popup.js?v=${popupScriptVersion}" defer></script>
</head>
<body class="tag-guide-page">
<div class="container"><p class="nav"><a href="../index.html">← Index</a><a href="../domain-glossary.html">用語集</a></p><article class="markdown-body">${body}</article></div>
</body>
</html>
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!existsSync(options.inputDir)) {
    throw new Error(`Input directory not found: ${options.inputDir}`);
  }

  const glossaryDescriptions = readGlossaryDescriptions(options.glossaryPath);
  const glossaryTerms = readGlossaryTerms(options.glossaryPath);
  mkdirSync(options.outputDir, { recursive: true });

  const entries = readdirSync(options.inputDir, { withFileTypes: true });
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  for (const fileName of markdownFiles) {
    const inputPath = join(options.inputDir, fileName);
    const outputPath = join(
      options.outputDir,
      fileName.replace(/\.md$/i, ".html"),
    );
    const markdown = readFileSync(inputPath, "utf8");
    const html = await buildPage(
      markdown,
      fileName,
      glossaryDescriptions,
      glossaryTerms,
    );
    writeFileSync(outputPath, html, "utf8");
    console.log(`generated: ${outputPath}`);
  }
}

main();

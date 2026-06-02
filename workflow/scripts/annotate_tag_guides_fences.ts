#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const defaultInputDir = join(repoRoot, "content/tag-guides");

type AnnotateOptions = {
  inputDir: string;
  check: boolean;
};

function parseArgs(argv: string[]): AnnotateOptions {
  const options: AnnotateOptions = {
    inputDir: defaultInputDir,
    check: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--input-dir" && next) {
      options.inputDir = resolve(next);
      index += 1;
    } else if (arg === "--check") {
      options.check = true;
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
  tsx workflow/scripts/annotate_tag_guides_fences.ts [--input-dir DIR] [--check]

Defaults:
  --input-dir   ${defaultInputDir}
  --check       Validate only; exit 1 if normalization is needed`);
  process.exit(0);
}

function splitLines(text: string): string[] {
  return String(text ?? "").split(/\r?\n/);
}

function nonEmptyLines(text: string): string[] {
  return splitLines(text)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isProcess(lines: string[]): boolean {
  return (
    lines.some((line) => /^\d+[.)]\s*/.test(line)) ||
    lines.some((line) => /(?:→|->|↓)/.test(line))
  );
}

function isRiskLadder(lines: string[]): boolean {
  return lines.some((line) =>
    /^(低リスク|中リスク|高リスク|low risk|mid risk|high risk|low|mid|high)\s*[:：]?/i.test(
      line,
    ),
  );
}

function isQuestionChecklist(lines: string[]): boolean {
  if (lines.length < 2) {
    return false;
  }

  const questionCount = lines.filter(
    (line) => /[?？]$/.test(line) || /か$/.test(line),
  ).length;
  return questionCount >= Math.ceil(lines.length / 2);
}

function isRiskList(lines: string[], tone: string): boolean {
  const riskKeywords = [
    "危険",
    "リスク",
    "削除",
    "送信",
    "本番",
    "機密",
    "権限",
    "認証",
    "外部",
    "購入",
    "支払い",
    "deploy",
    "delete",
    "publish",
    "approve",
    "secret",
    "token",
    "env",
    "rm -rf",
  ];

  if (tone === "bad") {
    return true;
  }

  return lines.some((line) =>
    riskKeywords.some((keyword) =>
      line.toLowerCase().includes(keyword.toLowerCase()),
    ),
  );
}

function isDefinition(text: string): boolean {
  return /^#{2,6}\s+/.test(text) || /^\s*.+?[：:]\s+/.test(text);
}

function isCodeLike(lines: string[], base: string): boolean {
  const joined = lines.join("\n");
  if (!joined) {
    return false;
  }

  if (base === "json" || base === "markdown" || base === "text") {
    return true;
  }

  if (/^#{2,6}\s+/.test(joined)) {
    return true;
  }

  if (/[{}()[\]<>]/.test(joined)) {
    return true;
  }

  if (/\b[a-zA-Z_][\w.-]*\([^)]*\)/.test(joined)) {
    return true;
  }

  if (/=>|::|:=|==|!=|<=|>=/.test(joined)) {
    return true;
  }

  if (lines.every((line) => /^[A-Za-z0-9_./-]+$/.test(line))) {
    return true;
  }

  return false;
}

function classifyToneFence(base: string, body: string): string {
  const lines = nonEmptyLines(body);
  const tone = base.replace("tone-", "");

  if (!lines.length) {
    return `${base}.takeaway`;
  }

  if (isRiskLadder(lines)) {
    return `${base}.risk-ladder`;
  }

  if (isProcess(lines)) {
    return `${base}.process`;
  }

  if (isQuestionChecklist(lines)) {
    return `${base}.question-checklist`;
  }

  if (isRiskList(lines, tone)) {
    return `${base}.risk`;
  }

  if (isDefinition(body)) {
    return `${base}.definition`;
  }

  if (isCodeLike(lines, base)) {
    return tone === "good" ? `${base}.guideline` : `${base}.code-example`;
  }

  if (lines.length === 1) {
    return `${base}.takeaway`;
  }

  return `${base}.guideline`;
}

function classifyFence(lang: string, body: string): string {
  const token = (lang || "").trim();
  if (!token) {
    return "";
  }

  if (token.includes(".")) {
    return token;
  }

  if (token === "json") {
    return "json.code-example";
  }

  if (token === "markdown") {
    return isDefinition(body) ? "markdown.definition" : "markdown.code-example";
  }

  if (token === "text") {
    return "text.code-example";
  }

  if (token.startsWith("tone-")) {
    return classifyToneFence(token, body);
  }

  return `${token}.code-example`;
}

function annotateMarkdown(markdown: string): string {
  const lines = splitLines(markdown);
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === undefined) {
      break;
    }
    const opening = line.match(/^```([^\s]*)\s*$/);

    if (!opening) {
      output.push(line);
      continue;
    }

    const lang = opening[1] || "";
    const bodyLines = [];
    index += 1;

    while (index < lines.length && lines[index] !== "```") {
      bodyLines.push(lines[index]);
      index += 1;
    }

    if (index >= lines.length) {
      throw new Error(
        "Unclosed code fence encountered while annotating markdown.",
      );
    }

    const body = bodyLines.join("\n");
    const annotated = classifyFence(lang, body);
    output.push(`\`\`\`${annotated}`);
    output.push(...bodyLines);
    output.push("```");
  }

  return output.join("\n");
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  if (!existsSync(options.inputDir)) {
    throw new Error(`Input directory not found: ${options.inputDir}`);
  }

  const entries = readdirSync(options.inputDir, { withFileTypes: true });
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const mismatchedFiles = [];

  for (const fileName of markdownFiles) {
    const inputPath = join(options.inputDir, fileName);
    const original = readFileSync(inputPath, "utf8");
    const annotated = annotateMarkdown(original);

    if (annotated !== original) {
      if (options.check) {
        mismatchedFiles.push(inputPath);
      } else {
        writeFileSync(inputPath, annotated, "utf8");
        console.log(`annotated: ${inputPath}`);
      }
    }
  }

  if (options.check && mismatchedFiles.length > 0) {
    console.error("Tag guide semantic fences are not normalized:");
    for (const filePath of mismatchedFiles) {
      console.error(`- ${filePath}`);
    }
    console.error("Run `npm run fix:tag-guides` to update them.");
    process.exitCode = 1;
  }
}

main();

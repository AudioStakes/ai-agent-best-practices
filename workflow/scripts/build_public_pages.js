#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { marked } from "marked";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const defaultDocsDir = join(repoRoot, "docs");
const tagGuidesSourceDir = join(repoRoot, "knowledge_templated/tag-guides");
const glossaryMarkdownSourcePath = join(repoRoot, "domain-glossary.md");
const buildRootPagesScript = join(
  repoRoot,
  "workflow/scripts/build_root_pages.js",
);
const buildTagGuidesScript = join(
  repoRoot,
  "workflow/scripts/build_tag_guides_html.js",
);
const annotateTagGuidesScript = join(
  repoRoot,
  "workflow/scripts/annotate_tag_guides_fences.js",
);

function parseArgs(argv) {
  const options = {
    docsDir: defaultDocsDir,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--docs-dir" && next) {
      options.docsDir = resolve(next);
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
  node workflow/scripts/build_public_pages.js [--docs-dir DIR]

Defaults:
  --docs-dir   ${defaultDocsDir}`);
  process.exit(0);
}

function runScript(scriptPath, args = []) {
  const result = spawnSync("node", [scriptPath, ...args], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: node ${scriptPath}`);
  }
}

function copyTextFile(sourcePath, destinationPath) {
  if (!existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  mkdirSync(dirname(destinationPath), { recursive: true });
  writeFileSync(destinationPath, readFileSync(sourcePath, "utf8"), "utf8");
}

function writeTextFile(destinationPath, text) {
  mkdirSync(dirname(destinationPath), { recursive: true });
  writeFileSync(destinationPath, text, "utf8");
}

function buildPublicIndexMarkdown() {
  return [
    "# AI Agent Best Practices Knowledge Base",
    "",
    "AIエージェントを使った開発経験がある人向けに、主要な公式ドキュメントを横断整理したナレッジベースです。",
    "",
    "## 対象時点",
    "",
    "> **対象時点: 2026年5月**",
    "",
    "## 対象読者",
    "",
    "AIエージェントを使った開発経験があり、主要な公式ドキュメントに基づいて活用を改善したい人向けです。",
    "",
    "## このナレッジベースで得られること",
    "",
    "エージェントの設計・評価・運用・コーディング活用に共通するベストプラクティスを整理できます。",
    "",
    "## 読み方",
    "",
    "このナレッジベースは、最初から順番に読む必要はありません。",
    "",
    "## 目次",
    "",
    "1. [エージェント設計系](tag-guides/01-agent-design.html)",
    "2. [ワークフロー設計系](tag-guides/02-workflow-design.html)",
    "3. [ツール利用系](tag-guides/03-tool-use.html)",
    "4. [コンテキスト設計系](tag-guides/04-context-engineering.html)",
    "5. [評価系](tag-guides/05-evals.html)",
    "6. [コーディングエージェント系](tag-guides/06-coding-agents.html)",
    "7. [本番運用系](tag-guides/07-production-operations.html)",
    "8. [セキュリティ・サンドボックス系](tag-guides/08-security-sandboxing.html)",
    "9. [マルチエージェント系](tag-guides/09-multi-agent.html)",
    "10. [ガバナンス系](tag-guides/10-governance.html)",
    "",
    "## 見本",
    "",
    "- [MarkdownコードブロックHTMLデザイン見本](tag-guides/11-markdown-code-block-gallery.html)",
    "",
    "## 公開範囲",
    "",
    "- 公開用ファイルは build output です。",
    "- 用語集は [domain-glossary.html](domain-glossary.html) で参照できます。",
    "- [public-page-problem-statement.md](public-page-problem-statement.md) に公開ページの問題設定をまとめています。",
    "",
    "## 対象外",
    "",
    "- AIエージェントをまだ使ったことがない人向けの入門",
    "- AIエージェントを使い始めたばかりの人向けのチュートリアル",
    "- AIエージェント関連の最新ニュースの収集",
    "- 特定ツールの詳しい使い方や操作手順の解説",
  ].join("\n");
}

function buildDocsIndexHtml(docsDir, markdown) {
  const body = marked.parse(markdown);
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Agent Best Practices Knowledge Base</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="container">
    <article class="article">
      ${body}
    </article>
  </div>
</body>
</html>
`;

  writeFileSync(join(docsDir, "index.html"), html, "utf8");
}

function syncTagGuideMarkdownFiles(docsTagGuidesDir) {
  const entries = readdirSync(tagGuidesSourceDir, { withFileTypes: true });
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  for (const fileName of markdownFiles) {
    copyTextFile(
      join(tagGuidesSourceDir, fileName),
      join(docsTagGuidesDir, fileName),
    );
  }
}

function syncPublicAssets(docsDir) {
  copyTextFile(
    join(repoRoot, "docs", "_config.yml"),
    join(docsDir, "_config.yml"),
  );
  copyTextFile(
    join(repoRoot, "docs", "public-page-problem-statement.md"),
    join(docsDir, "public-page-problem-statement.md"),
  );
  copyTextFile(
    join(repoRoot, "docs", "publishing-checklist.md"),
    join(docsDir, "publishing-checklist.md"),
  );
  copyTextFile(join(repoRoot, "style.css"), join(docsDir, "style.css"));
  copyTextFile(join(repoRoot, "term-popup.js"), join(docsDir, "term-popup.js"));
  copyTextFile(glossaryMarkdownSourcePath, join(docsDir, "domain-glossary.md"));

  const glossaryHtmlPath = join(repoRoot, "domain-glossary.html");
  const glossaryHtml = readFileSync(glossaryHtmlPath, "utf8").replace(
    /\s*<a href="README\.html">README<\/a>/,
    "",
  );
  writeFileSync(join(docsDir, "domain-glossary.html"), glossaryHtml, "utf8");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const docsTagGuidesDir = join(options.docsDir, "tag-guides");

  mkdirSync(options.docsDir, { recursive: true });
  rmSync(docsTagGuidesDir, { recursive: true, force: true });

  runScript(buildRootPagesScript);
  runScript(annotateTagGuidesScript);
  runScript(buildTagGuidesScript, ["--output-dir", docsTagGuidesDir]);
  const docsIndexMarkdown = buildPublicIndexMarkdown();
  writeTextFile(join(options.docsDir, "index.md"), docsIndexMarkdown);
  buildDocsIndexHtml(options.docsDir, docsIndexMarkdown);
  syncTagGuideMarkdownFiles(docsTagGuidesDir);
  syncPublicAssets(options.docsDir);

  console.log(`generated: ${join(options.docsDir, "index.html")}`);
  console.log(`generated: ${join(options.docsDir, "tag-guides")}`);
  console.log(`generated: ${join(options.docsDir, "domain-glossary.html")}`);
}

main();

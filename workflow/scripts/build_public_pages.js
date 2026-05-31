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
const docsIndexSourcePath = join(repoRoot, "docs/index.md");
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

function buildDocsIndexHtml(docsDir) {
  if (!existsSync(docsIndexSourcePath)) {
    throw new Error(`Source file not found: ${docsIndexSourcePath}`);
  }

  const markdown = readFileSync(docsIndexSourcePath, "utf8");
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
  copyTextFile(join(repoRoot, "style.css"), join(docsDir, "style.css"));
  copyTextFile(join(repoRoot, "term-popup.js"), join(docsDir, "term-popup.js"));
  copyTextFile(
    join(repoRoot, "domain-glossary.md"),
    join(docsDir, "domain-glossary.md"),
  );

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

  runScript(annotateTagGuidesScript);
  runScript(buildTagGuidesScript, ["--output-dir", docsTagGuidesDir]);
  copyTextFile(docsIndexSourcePath, join(options.docsDir, "index.md"));
  buildDocsIndexHtml(options.docsDir);
  syncTagGuideMarkdownFiles(docsTagGuidesDir);
  syncPublicAssets(options.docsDir);

  console.log(`generated: ${join(options.docsDir, "index.html")}`);
  console.log(`generated: ${join(options.docsDir, "tag-guides")}`);
  console.log(`generated: ${join(options.docsDir, "domain-glossary.html")}`);
}

main();

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

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const defaultDistDir = join(repoRoot, "dist");

function parseArgs(argv) {
  const options = {
    distDir: defaultDistDir,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--dist-dir" && next) {
      options.distDir = resolve(next);
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
  node workflow/scripts/build_public_pages.js [--dist-dir DIR]

Defaults:
  --dist-dir   ${defaultDistDir}`);
  process.exit(0);
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function copyTextFile(sourcePath, destinationPath) {
  if (!existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  ensureDir(dirname(destinationPath));
  writeFileSync(destinationPath, readFileSync(sourcePath, "utf8"), "utf8");
}

function removeFilesByExtension(dirPath, extension) {
  if (!existsSync(dirPath)) {
    return;
  }

  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(extension)) {
      rmSync(join(dirPath, entry.name), { force: true });
    }
  }
}

function copyDirectoryMarkdownFiles(sourceDir, destinationDir) {
  if (!existsSync(sourceDir)) {
    throw new Error(`Source directory not found: ${sourceDir}`);
  }

  ensureDir(destinationDir);
  removeFilesByExtension(destinationDir, ".md");

  const entries = readdirSync(sourceDir, { withFileTypes: true });
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  for (const fileName of markdownFiles) {
    copyTextFile(join(sourceDir, fileName), join(destinationDir, fileName));
  }
}

function copySiteAssets(distDir) {
  copyTextFile(
    join(repoRoot, "site/styles/style.css"),
    join(distDir, "site/styles/style.css"),
  );
  copyTextFile(
    join(repoRoot, "site/styles/semantic-overrides.css"),
    join(distDir, "site/styles/semantic-overrides.css"),
  );
  copyTextFile(
    join(repoRoot, "site/scripts/term-popup.js"),
    join(distDir, "site/scripts/term-popup.js"),
  );
}

function copySourceMirrors(distDir) {
  copyTextFile(
    join(repoRoot, "sources/articles.csv"),
    join(distDir, "sources/articles.csv"),
  );
  copyTextFile(join(repoRoot, "content/index.md"), join(distDir, "index.md"));
  copyTextFile(
    join(repoRoot, "content/domain-glossary.md"),
    join(distDir, "domain-glossary.md"),
  );
  copyDirectoryMarkdownFiles(
    join(repoRoot, "content/tag-guides"),
    join(distDir, "tag-guides"),
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  ensureDir(options.distDir);

  copySourceMirrors(options.distDir);
  copySiteAssets(options.distDir);

  console.log(`generated: ${join(options.distDir, "index.md")}`);
  console.log(`generated: ${join(options.distDir, "domain-glossary.md")}`);
  console.log(`generated: ${join(options.distDir, "sources/articles.csv")}`);
  console.log(`generated: ${join(options.distDir, "site")}`);
  console.log(`generated: ${join(options.distDir, "tag-guides")}`);
}

main();

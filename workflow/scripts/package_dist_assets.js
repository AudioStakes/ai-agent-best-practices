#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  node workflow/scripts/package_dist_assets.js [--dist-dir DIR]

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

function copySiteAssets(distDir) {
  copyTextFile(
    join(repoRoot, "site/styles/style.css"),
    join(distDir, "site/styles/style.css"),
  );
  copyTextFile(
    join(repoRoot, "node_modules/github-markdown-css/github-markdown.css"),
    join(distDir, "site/styles/github-markdown.css"),
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

function main() {
  const options = parseArgs(process.argv.slice(2));
  ensureDir(options.distDir);
  copySiteAssets(options.distDir);

  console.log(`generated: ${join(options.distDir, "site")}`);
}

main();

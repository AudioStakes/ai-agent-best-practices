#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type CompilerOptions,
  ModuleKind,
  ScriptTarget,
  transpileModule,
} from "typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const defaultDistDir = join(repoRoot, "dist");

type PackageOptions = {
  distDir: string;
};

const parseArgs = (argv: string[]): PackageOptions => {
  const options: PackageOptions = {
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
};

const printHelpAndExit = (): never => {
  console.log(`Usage:
  tsx workflow/scripts/package_dist_assets.ts [--dist-dir DIR]

Defaults:
  --dist-dir   ${defaultDistDir}`);
  process.exit(0);
};

const ensureDir = (path: string): void => {
  mkdirSync(path, { recursive: true });
};

const copyTextFile = (sourcePath: string, destinationPath: string): void => {
  if (!existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  ensureDir(dirname(destinationPath));
  writeFileSync(destinationPath, readFileSync(sourcePath, "utf8"), "utf8");
};

const transpileBrowserScript = (
  sourcePath: string,
  destinationPath: string,
): void => {
  const source = readFileSync(sourcePath, "utf8");
  const compilerOptions = {
    target: ScriptTarget.ES2022,
    module: ModuleKind.ES2022,
  } satisfies CompilerOptions;

  const result = transpileModule(source, {
    compilerOptions,
    fileName: sourcePath,
    reportDiagnostics: true,
  });

  if (result.diagnostics?.length) {
    const messages = result.diagnostics
      .map((diagnostic) => diagnostic.messageText)
      .join("\n");
    throw new Error(`Failed to transpile ${sourcePath}:\n${messages}`);
  }

  ensureDir(dirname(destinationPath));
  writeFileSync(destinationPath, result.outputText, "utf8");
};

const copySiteAssets = (distDir: string): void => {
  copyTextFile(
    join(repoRoot, "site/styles/style.css"),
    join(distDir, "site/styles/style.css"),
  );
  copyTextFile(
    join(
      repoRoot,
      "node_modules/github-markdown-css/github-markdown-light.css",
    ),
    join(distDir, "site/styles/github-markdown.css"),
  );
  transpileBrowserScript(
    join(repoRoot, "site/scripts/term-popup.ts"),
    join(distDir, "site/scripts/term-popup.js"),
  );
  transpileBrowserScript(
    join(repoRoot, "site/scripts/html-review.ts"),
    join(distDir, "site/scripts/html-review.js"),
  );
};

const main = (): void => {
  const options = parseArgs(process.argv.slice(2));
  ensureDir(options.distDir);
  copySiteAssets(options.distDir);

  console.log(`generated: ${join(options.distDir, "site")}`);
};

main();

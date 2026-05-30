#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const dryRun = args.has("--dry-run");
const overwrite = args.has("--overwrite");
const pendingOnly = !args.has("--all");

const csvPath = join(repoRoot, "articles.csv");
const outputRoot = join(repoRoot, "singlefile");

function usage() {
  console.log(`Usage: node scripts/save_singlefile.js [options]

Options:
  --dry-run             Show what would be saved without downloading pages.
  --overwrite           Re-save pages even when the output file already exists.
  --refresh-days <days> Re-save an existing file when it is older than this many days.
  --all                 Save all rows, not only rows whose status is pending or failed.

Examples:
  npm run save:singlefile
  node scripts/save_singlefile.js --all --refresh-days 30
  node scripts/save_singlefile.js --all --overwrite

Output:
  singlefile/<source>/<id>.html
`);
}

if (args.has("--help") || args.has("-h")) {
  usage();
  process.exit(0);
}

function readNumberArg(name) {
  const equalsPrefix = `${name}=`;
  const equalsArg = rawArgs.find((arg) => arg.startsWith(equalsPrefix));

  if (equalsArg) {
    return Number(equalsArg.slice(equalsPrefix.length));
  }

  const index = rawArgs.indexOf(name);
  if (index === -1) {
    return null;
  }

  return Number(rawArgs[index + 1]);
}

const refreshDays = readNumberArg("--refresh-days");

if (refreshDays !== null && (!Number.isFinite(refreshDays) || refreshDays < 0)) {
  throw new Error("--refresh-days must be a non-negative number.");
}

function normalizeSource(source) {
  return String(source || "unknown")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function ensureDir(path) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function fileAgeDays(path) {
  const { mtimeMs } = statSync(path);
  return (Date.now() - mtimeMs) / (1000 * 60 * 60 * 24);
}

function run(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: repoRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

function readArticles() {
  if (!existsSync(csvPath)) {
    throw new Error(`articles.csv was not found: ${csvPath}`);
  }

  const csv = readFileSync(csvPath, "utf8");
  return parse(csv, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });
}

function writeArticles(rows) {
  const columns = [
    "id",
    "title",
    "url",
    "source",
    "category",
    "status",
    "captured_at",
    "markdown_path",
    "raw_path",
  ];

  const csv = stringify(rows, {
    header: true,
    columns,
  });

  writeFileSync(csvPath, csv, "utf8");
}

function shouldRefreshExistingFile(outputPath) {
  if (overwrite) {
    return { refresh: true, reason: "overwrite requested" };
  }

  if (refreshDays === null) {
    return { refresh: false, reason: "existing file" };
  }

  const ageDays = fileAgeDays(outputPath);
  if (ageDays >= refreshDays) {
    return {
      refresh: true,
      reason: `existing file is ${ageDays.toFixed(1)} days old`,
    };
  }

  return {
    refresh: false,
    reason: `existing file is ${ageDays.toFixed(1)} days old; refresh threshold is ${refreshDays} days`,
  };
}

async function saveArticle(row) {
  const id = row.id?.trim();
  const url = row.url?.trim();
  const sourceDir = normalizeSource(row.source);

  if (!id || !url) {
    throw new Error(`Missing id or url: ${JSON.stringify(row)}`);
  }

  const outputDir = join(outputRoot, sourceDir);
  const outputPath = join(outputDir, `${id}.html`);
  const relativeOutputPath = `singlefile/${sourceDir}/${id}.html`;

  if (existsSync(outputPath)) {
    const { refresh, reason } = shouldRefreshExistingFile(outputPath);

    if (!refresh) {
      console.log(`skip existing: ${relativeOutputPath} (${reason})`);
      row.status = row.status || "saved";
      row.raw_path = row.raw_path || relativeOutputPath;
      return "skipped";
    }

    console.log(`refresh existing: ${relativeOutputPath} (${reason})`);
  }

  console.log(`${dryRun ? "would save" : "saving"}: ${url}`);
  console.log(`  -> ${relativeOutputPath}`);

  if (dryRun) {
    return "saved";
  }

  ensureDir(outputDir);

  await run("npx", [
    "single-file",
    url,
    outputPath,
  ]);

  row.status = "saved";
  row.captured_at = new Date().toISOString();
  row.raw_path = relativeOutputPath;

  return "saved";
}

async function main() {
  const rows = readArticles();
  let saved = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const status = String(row.status || "").trim().toLowerCase();
    const shouldProcess = pendingOnly
      ? status === "pending" || status === "failed" || status === ""
      : true;

    if (!shouldProcess) {
      skipped += 1;
      continue;
    }

    try {
      const result = await saveArticle(row);
      if (result === "skipped") {
        skipped += 1;
      } else if (!dryRun) {
        saved += 1;
      }
    } catch (error) {
      failed += 1;
      row.status = "failed";
      console.error(`failed: ${row.id} ${row.url}`);
      console.error(error.message);
    }
  }

  if (!dryRun) {
    writeArticles(rows);
  }

  console.log("\nDone.");
  console.log(`saved: ${saved}`);
  console.log(`skipped: ${skipped}`);
  console.log(`failed: ${failed}`);

  if (dryRun) {
    console.log("Dry run only. No files were written.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

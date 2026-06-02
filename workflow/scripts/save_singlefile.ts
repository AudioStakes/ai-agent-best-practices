#!/usr/bin/env node

import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import {
  extractArticleDates,
  renderArticleDatesComment,
  stripLeadingArticleDatesComment,
} from "./article_dates.js";
import { readArticles } from "./article_rows.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const dryRun = args.has("--dry-run");
const overwrite = args.has("--overwrite");
const pendingOnly = !args.has("--all");

const csvPath = join(repoRoot, "sources/articles.csv");
const outputRoot = join(repoRoot, "archive/singlefile");
const defaultTimeoutSeconds = 120;

type RunOptions = {
  timeoutMs: number;
};

const usage = (): void => {
  console.log(`Usage: tsx workflow/scripts/save_singlefile.ts [options]

Options:
  --dry-run             Show what would be saved without downloading pages.
  --overwrite           Re-save pages even when the output file already exists.
  --refresh-days <days> Re-save an existing file when it is older than this many days.
  --timeout-seconds <n> Timeout for SingleFile downloads (default: ${defaultTimeoutSeconds}).
  --all                 Save all rows, not only rows whose status is pending or failed.
  -h, --help            Show this help message.
`);
};

if (args.has("-h") || args.has("--help")) {
  usage();
  process.exit(0);
}

const refreshDaysArg = rawArgs.indexOf("--refresh-days");
const refreshDays =
  refreshDaysArg >= 0 ? Number(rawArgs[refreshDaysArg + 1]) : undefined;

if (
  refreshDaysArg >= 0 &&
  (rawArgs[refreshDaysArg + 1] === undefined ||
    !Number.isFinite(refreshDays) ||
    refreshDays === undefined ||
    refreshDays < 0)
) {
  throw new Error("--refresh-days must be a non-negative number.");
}

const timeoutSecondsArg = rawArgs.indexOf("--timeout-seconds");
const timeoutSeconds =
  timeoutSecondsArg >= 0
    ? Number(rawArgs[timeoutSecondsArg + 1])
    : defaultTimeoutSeconds;

if (
  timeoutSecondsArg >= 0 &&
  (rawArgs[timeoutSecondsArg + 1] === undefined ||
    !Number.isFinite(timeoutSeconds) ||
    timeoutSeconds <= 0)
) {
  throw new Error("--timeout-seconds must be a positive number.");
}

const normalizeSource = (source: string | undefined): string =>
  String(source ?? "unknown")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";

const ensureDir = (path: string): void => {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
};

const removeFileIfExists = (path: string): void => {
  if (existsSync(path)) {
    rmSync(path, { force: true });
  }
};

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const fileAgeDays = (path: string): number => {
  const { mtimeMs } = statSync(path);
  return (Date.now() - mtimeMs) / (1000 * 60 * 60 * 24);
};

const run = (
  command: string,
  commandArgs: string[],
  { timeoutMs }: RunOptions,
): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    let settled = false;
    let timedOut = false;

    const child = spawn(command, commandArgs, {
      cwd: repoRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    const timer = setTimeout(() => {
      timedOut = true;
      console.error(
        `timeout: ${command} exceeded ${(timeoutMs / 1000).toFixed(0)} seconds`,
      );
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!settled) {
          child.kill("SIGKILL");
        }
      }, 5000);
    }, timeoutMs);

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (timedOut) {
        reject(
          new Error(
            `${command} timed out after ${(timeoutMs / 1000).toFixed(0)} seconds`,
          ),
        );
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      if (signal) {
        reject(new Error(`${command} exited with signal ${signal}`));
        return;
      }

      reject(new Error(`${command} exited with code ${code}`));
    });
  });

const shouldRefreshExistingFile = (
  outputPath: string,
): { refresh: boolean; reason: string } => {
  if (overwrite) {
    return { refresh: true, reason: "overwrite requested" };
  }

  if (refreshDays === undefined) {
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
};

const saveArticle = async (row: {
  id: string;
  url?: string;
  source?: string;
  title?: string;
}): Promise<"saved" | "skipped"> => {
  const id = row.id.trim();
  const url = row.url?.trim();
  const sourceDir = normalizeSource(row.source);

  if (!id || !url) {
    throw new Error(`Missing id or url: ${JSON.stringify(row)}`);
  }

  const outputDir = join(outputRoot, sourceDir);
  const outputPath = join(outputDir, `${id}.html`);
  const tempOutputPath = join(outputDir, `${id}.tmp.html`);
  const relativeOutputPath = `archive/singlefile/${sourceDir}/${id}.html`;

  if (existsSync(outputPath)) {
    const { refresh, reason } = shouldRefreshExistingFile(outputPath);
    if (!refresh) {
      console.log(`skip ${reason}: ${relativeOutputPath}`);
      return "skipped";
    }
  }

  console.log(`${dryRun ? "would save" : "saving"}: ${url}`);
  console.log(` -> ${relativeOutputPath}`);

  if (dryRun) {
    return "saved";
  }

  ensureDir(outputDir);
  const maxAttempts = 5;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    removeFileIfExists(tempOutputPath);

    try {
      await run(
        "npx",
        [
          "single-file",
          url,
          tempOutputPath,
          "--browser-load-max-time",
          String(Math.max(timeoutSeconds * 1000, 120000)),
          "--browser-capture-max-time",
          String(Math.max(timeoutSeconds * 1000, 120000)),
        ],
        {
          timeoutMs: timeoutSeconds * 1000,
        },
      );

      if (!existsSync(tempOutputPath)) {
        throw new Error(
          `SingleFile finished but did not create output: ${tempOutputPath}`,
        );
      }

      renameSync(tempOutputPath, outputPath);

      const html = readFileSync(outputPath, "utf8");
      const dom = new JSDOM(html, { url });
      const dates = extractArticleDates(dom.window.document);
      const comment = renderArticleDatesComment(dates);
      if (comment) {
        writeFileSync(
          outputPath,
          `${comment}${stripLeadingArticleDatesComment(html)}`,
          "utf8",
        );
      }

      return "saved";
    } catch (error: unknown) {
      lastError = error;
      removeFileIfExists(tempOutputPath);

      if (attempt < maxAttempts) {
        console.log(
          `retry ${attempt}/${maxAttempts} after error for ${row.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        await sleep(1000 * attempt);
        continue;
      }

      throw error;
    } finally {
      removeFileIfExists(tempOutputPath);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to save ${url}`);
};

const main = async (): Promise<void> => {
  const rows = readArticles(csvPath);
  let saved = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const status = String(row.status || "")
      .trim()
      .toLowerCase();
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
    } catch (error: unknown) {
      failed += 1;
      console.error(`failed: ${row.id} ${row.url}`);
      console.error(error instanceof Error ? error.message : String(error));
    }
  }

  console.log(`saved: ${saved}`);
  console.log(`skipped: ${skipped}`);
  console.log(`failed: ${failed}`);
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

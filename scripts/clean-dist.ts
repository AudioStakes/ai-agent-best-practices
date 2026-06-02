#!/usr/bin/env node

import { existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const distDir = join(repoRoot, "dist");

type CleanResult = {
  removed: boolean;
  distDir: string;
};

const cleanDist = (targetDir: string): CleanResult => {
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
    return { removed: true, distDir: targetDir };
  }

  return { removed: false, distDir: targetDir };
};

const result = cleanDist(distDir);
if (result.removed) {
  console.log(`removed: ${result.distDir}`);
}

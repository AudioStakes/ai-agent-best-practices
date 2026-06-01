#!/usr/bin/env node

import { existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const distDir = join(repoRoot, "dist");

if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
  console.log(`removed: ${distDir}`);
}

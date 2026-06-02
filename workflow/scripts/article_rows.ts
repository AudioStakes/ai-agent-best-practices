#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";

export type ArticleRow = {
  id: string;
  title?: string;
  url?: string;
  source?: string;
  category?: string;
  status?: string;
  captured_at?: string;
  markdown_path?: string;
  raw_path?: string;
};

type RawRow = Record<string, unknown>;

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value;
  }

  if (value === undefined || value === null) {
    return undefined;
  }

  return String(value);
};

const requireString = (
  value: unknown,
  label: string,
  rowIndex: number,
): string => {
  const normalized = toStringValue(value)?.trim();
  if (!normalized) {
    throw new Error(`Invalid ${label} in articles.csv row ${rowIndex + 1}`);
  }

  return normalized;
};

const isRecord = (value: unknown): value is RawRow => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const readArticles = (csvPath: string): ArticleRow[] => {
  if (!existsSync(csvPath)) {
    throw new Error(`articles.csv was not found: ${csvPath}`);
  }

  const parsed: unknown = parse(readFileSync(csvPath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });

  if (!Array.isArray(parsed)) {
    throw new Error(`articles.csv must parse to an array: ${csvPath}`);
  }

  return parsed.map((row, index): ArticleRow => {
    if (!isRecord(row)) {
      throw new Error(`Invalid article row ${index + 1} in ${csvPath}`);
    }

    const articleRow: ArticleRow = {
      id: requireString(row.id, "id", index),
    };

    const title = toStringValue(row.title);
    if (title !== undefined) articleRow.title = title;

    const url = toStringValue(row.url);
    if (url !== undefined) articleRow.url = url;

    const source = toStringValue(row.source);
    if (source !== undefined) articleRow.source = source;

    const category = toStringValue(row.category);
    if (category !== undefined) articleRow.category = category;

    const status = toStringValue(row.status);
    if (status !== undefined) articleRow.status = status;

    const capturedAt = toStringValue(row.captured_at);
    if (capturedAt !== undefined) articleRow.captured_at = capturedAt;

    const markdownPath = toStringValue(row.markdown_path);
    if (markdownPath !== undefined) articleRow.markdown_path = markdownPath;

    const rawPath = toStringValue(row.raw_path);
    if (rawPath !== undefined) articleRow.raw_path = rawPath;

    return articleRow;
  });
};

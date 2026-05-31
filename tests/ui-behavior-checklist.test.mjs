import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(testDir, "..");
const checklistPath = path.join(testDir, "ui-behavior-checklist.json");
const serveScript = path.join(siteDir, "serve.sh");

const checklist = JSON.parse(await readFile(checklistPath, "utf8"));

const articlePages = [
  ["01-agent-design", "01. エージェント設計系"],
  ["02-workflow-design", "02. ワークフロー設計系"],
  ["03-tool-use", "03. ツール利用系"],
  ["04-context-engineering", "04. コンテキスト設計系"],
  ["05-evals", "05. 評価系"],
  ["06-coding-agents", "06. コーディングエージェント系"],
  ["07-production-operations", "07. 本番運用系"],
  ["08-security-sandboxing", "08. セキュリティ・サンドボックス系"],
  ["09-multi-agent", "09. マルチエージェントシステム系"],
  ["10-governance", "10. ガバナンス系"],
];

test.describe.configure({ mode: "serial" });

async function waitForHttp(url, retries = 60) {
  let lastError = null;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(
    `Timed out waiting for ${url}${lastError ? `: ${lastError.message}` : ""}`,
  );
}

async function startServer(args = []) {
  const child = spawn(serveScript, args, {
    cwd: siteDir,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stdout = [];
  const stderr = [];

  child.stdout.on("data", (chunk) => {
    stdout.push(chunk.toString("utf8"));
  });

  child.stderr.on("data", (chunk) => {
    stderr.push(chunk.toString("utf8"));
  });

  const port = Number(args[0] ?? 8000);
  const url = `http://127.0.0.1:${port}/`;

  try {
    await waitForHttp(url);
  } catch (error) {
    child.kill("SIGINT");
    await once(child, "close").catch(() => {});
    throw new Error(
      `${error.message}\nstdout:\n${stdout.join("")}\nstderr:\n${stderr.join("")}`,
    );
  }

  return {
    url,
    stop: async () => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGINT");
        await Promise.race([
          once(child, "close"),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
      }
    },
  };
}

test("ui checklist JSON stays machine-readable", async () => {
  expect(checklist.name).toBe("AI Agent Best Practices UI behavior checklist");
  expect(checklist.version).toBe("2026-05-31");
  expect(checklist.target).toBe("repo-root");
  expect(checklist.categories).toHaveLength(13);
});

test("serve.sh starts with the documented host and port settings", async () => {
  const defaults = await startServer();
  try {
    const response = await fetch(defaults.url);
    expect(response.headers.get("cache-control")).toBe(
      "no-store, no-cache, must-revalidate, max-age=0",
    );
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("expires")).toBe("0");
  } finally {
    await defaults.stop();
  }

  const customPort = await startServer(["8080"]);
  try {
    const response = await fetch(customPort.url);
    expect(await response.text()).toContain("AI Agent Best Practices");
  } finally {
    await customPort.stop();
  }

  const customHost = await startServer(["8081", "127.0.0.1"]);
  try {
    const response = await fetch(customHost.url);
    expect(response.ok).toBeTruthy();
  } finally {
    await customHost.stop();
  }
});

test("index links to every article and the glossary", async ({ page }) => {
  const server = await startServer();
  try {
    await page.goto(server.url);

    await expect(
      page.getByRole("link", { name: "READMEを読む" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "用語集を見る" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "用語集Markdown" }),
    ).toBeVisible();

    await expect(page.locator(".article-list > li")).toHaveCount(10);
    await expect(
      page.locator(".article-list > li > strong > a[href$='.html']"),
    ).toHaveCount(10);
    await expect(
      page.locator(".article-list > li .badges a[href$='.html']"),
    ).toHaveCount(10);
    await expect(
      page.getByRole("link", { name: "09. マルチエージェントシステム系" }),
    ).toHaveAttribute("href", "tag-guides/09-multi-agent.html");

    const title = await page.title();
    expect(title).not.toContain("[");
    expect(title).not.toContain("](");
  } finally {
    await server.stop();
  }
});

test("article pages keep the shared shell and readable headings", async ({
  page,
}) => {
  const server = await startServer();
  try {
    for (const [slug, heading] of articlePages) {
      await page.goto(`${server.url}tag-guides/${slug}.html`);

      await expect(page.locator('meta[charset="utf-8"]')).toHaveCount(1);
      await expect(
        page.locator('link[rel="stylesheet"][href*="style.css?v="]'),
      ).toHaveCount(1);
      await expect(page.locator('script[src*="term-popup.js?v="]')).toHaveCount(
        1,
      );
      await expect(page.locator("p.rating-guide")).toBeVisible();

      const title = await page.title();
      expect(title).toContain(heading);
      expect(title).not.toContain("[");
      expect(title).not.toContain("](");

      await expect(page.locator("h1")).toContainText(heading);
      expect(await page.locator("a.term").count()).toBeGreaterThan(0);
    }
  } finally {
    await server.stop();
  }
});

test("desktop term popups open on hover and focus", async ({ page }) => {
  const server = await startServer();
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${server.url}tag-guides/01-agent-design.html`);

    const firstTerm = page.locator("a.term").first();
    await expect(firstTerm).toHaveAttribute("aria-haspopup", "dialog");
    await expect(firstTerm).toHaveAttribute("aria-expanded", "false");

    await firstTerm.hover();
    const popup = page.locator("#term-popup");
    await expect(popup).toBeVisible();
    await expect(popup).toContainText(
      await firstTerm.getAttribute("data-description"),
    );
    await expect(firstTerm).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Escape");
    await expect(popup).toBeHidden();
    await expect(firstTerm).toHaveAttribute("aria-expanded", "false");

    await firstTerm.focus();
    await expect(popup).toBeVisible();
  } finally {
    await server.stop();
  }
});

test("mobile term popups open once and second tap follows the glossary link", async ({
  browser,
}) => {
  const server = await startServer();
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  try {
    await page.goto(`${server.url}tag-guides/01-agent-design.html`);

    const firstTerm = page.locator("a.term").first();
    const popup = page.locator("#term-popup");

    await firstTerm.tap();
    await expect(popup).toBeVisible();
    const popupTitleBefore = page.locator(".term-popup-title");
    await expect(popupTitleBefore).toHaveText(await firstTerm.textContent());
    const popupTitleContent = await popupTitleBefore.evaluate(
      (element) => window.getComputedStyle(element, "::before").content,
    );
    expect(popupTitleContent).toContain("ドメイン用語:");
    await expect(page.locator(".term-popup-close")).toBeVisible();

    const popupBox = await popup.boundingBox();
    expect(popupBox).not.toBeNull();
    if (!popupBox) {
      throw new Error("popup box was not available");
    }
    expect(popupBox.y).toBeLessThan(80);

    await expect(firstTerm).toHaveAttribute("aria-expanded", "true");

    await Promise.all([
      page.waitForURL(/domain-glossary\.html#agent/),
      firstTerm.tap(),
    ]);
  } finally {
    await context.close();
    await server.stop();
  }
});

test("domain glossary switches between desktop table and mobile cards", async ({
  page,
}) => {
  const server = await startServer();
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${server.url}domain-glossary.html#agent`);

    await expect(page.locator(".glossary-table-wrap")).toBeVisible();
    await expect(page.locator(".glossary-cards")).toBeHidden();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();

    await expect(page.locator(".glossary-cards")).toBeVisible();
    await expect(page.locator(".glossary-table-wrap")).toBeHidden();
    await expect(page.locator("#card-agent")).toBeVisible();
  } finally {
    await server.stop();
  }
});

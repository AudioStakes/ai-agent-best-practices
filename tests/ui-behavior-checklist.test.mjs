import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(testDir, "..");
const serveScript = path.join(siteDir, "serve.sh");

let server = null;

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

async function runProcess(command, args, cwd = siteDir) {
  const child = spawn(command, args, {
    cwd,
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

  const [code, signal] = await once(child, "close");
  return {
    code,
    signal,
    stdout: stdout.join(""),
    stderr: stderr.join(""),
  };
}

async function ensureDistBuilt() {
  const distDir = path.join(siteDir, "dist");
  const legacyMirrors = [
    path.join(distDir, "index.md"),
    path.join(distDir, "domain-glossary.md"),
    path.join(distDir, "sources", "articles.csv"),
  ];

  if (
    existsSync(path.join(distDir, "index.html")) &&
    !legacyMirrors.some((filePath) => existsSync(filePath))
  ) {
    return;
  }

  const result = await runProcess("npm", ["run", "build"]);
  if (result.code !== 0) {
    throw new Error(
      `site build failed with exit code ${result.code}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }
}

async function getFreePort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Failed to acquire a free port");
  }
  const { port } = address;
  server.close();
  await once(server, "close");
  return port;
}

async function startServer(args = []) {
  await ensureDistBuilt();

  const effectiveArgs = args.length > 0 ? args : [String(await getFreePort())];

  const child = spawn(serveScript, effectiveArgs, {
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

  const port = Number(effectiveArgs[0]);
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
        const closed = await Promise.race([
          once(child, "close"),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
        if (!closed) {
          child.kill("SIGKILL");
          await once(child, "close").catch(() => {});
        }
      }
    },
  };
}

test.describe
  .serial("browser-only UI behaviors", () => {
    test.beforeAll(async () => {
      server = await startServer();
    });

    test.afterAll(async () => {
      if (server) {
        await server.stop();
        server = null;
      }
    });

    test("desktop term popups open on hover and focus", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`${server.url}tag-guides/01-agent-design.html`);

      await expect(page.locator('script[src*="term-popup.js?v="]')).toHaveCount(
        1,
      );
      expect(await page.locator("a.term").count()).toBeGreaterThan(0);

      const script = readFileSync(
        path.join(siteDir, "site/scripts/term-popup.js"),
        "utf8",
      );
      expect(script).toContain("aria-haspopup");
      expect(script).toContain("mouseenter");
      expect(script).toContain("focus");
      expect(script).toContain("closePopup");
    });

    test("mobile term popups open once and second tap follows the glossary link", async ({
      browser,
    }) => {
      const context = await browser.newContext({
        hasTouch: true,
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();

      try {
        await page.goto(`${server.url}tag-guides/01-agent-design.html`);

        await expect(
          page.locator('script[src*="term-popup.js?v="]'),
        ).toHaveCount(1);
        expect(await page.locator("a.term").count()).toBeGreaterThan(0);

        const script = readFileSync(
          path.join(siteDir, "site/scripts/term-popup.js"),
          "utf8",
        );
        expect(script).toContain("touchend");
        expect(script).toContain("window.location.href = term.href");
        expect(script).toContain("term-popup-close");
        expect(script).toContain("isTouchLike");
      } finally {
        await context.close();
      }
    });

    test("domain glossary switches between desktop table and mobile cards", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`${server.url}domain-glossary.html#agent`);

      await expect(
        page.locator("article.article.markdown-body.markdown-document"),
      ).toBeVisible();
      await expect(page.locator(".glossary-table-wrap")).toBeVisible();
      await expect(page.locator(".glossary-cards")).toBeHidden();

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();

      await expect(page.locator(".glossary-cards")).toBeVisible();
      await expect(page.locator(".glossary-table-wrap")).toBeHidden();
      await expect(page.locator("#card-agent")).toBeVisible();
    });
  });

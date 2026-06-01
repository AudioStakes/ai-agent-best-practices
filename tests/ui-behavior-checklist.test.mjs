import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(testDir, "..");
const checklistPath = path.join(testDir, "ui-behavior-checklist.json");
const serveScript = path.join(siteDir, "serve.sh");
const buildTagGuidesScript = path.join(
  siteDir,
  "workflow/scripts/build_tag_guides_html.js",
);
const packageDistAssetsScript = path.join(
  siteDir,
  "workflow/scripts/package_dist_assets.js",
);
const annotateTagGuidesScript = path.join(
  siteDir,
  "workflow/scripts/annotate_tag_guides_fences.js",
);

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
  ["09-multi-agent", "09. マルチエージェント系"],
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

async function startServer(args = []) {
  await ensureDistBuilt();

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

  const customPortNumber = await getFreePort();
  const customPort = await startServer([String(customPortNumber)]);
  try {
    const response = await fetch(customPort.url);
    expect(await response.text()).toContain("AI Agent Best Practices");
  } finally {
    await customPort.stop();
  }

  const customHostPort = await getFreePort();
  const customHost = await startServer([String(customHostPort), "127.0.0.1"]);
  try {
    const response = await fetch(customHost.url);
    expect(response.ok).toBeTruthy();
  } finally {
    await customHost.stop();
  }
});

test("serve.sh fails when dist is missing", async () => {
  const tempRoot = mkdtempSync(
    path.join(os.tmpdir(), "serve-sh-missing-dist-"),
  );
  const scriptCopy = path.join(tempRoot, "serve.sh");
  writeFileSync(scriptCopy, readFileSync(serveScript, "utf8"));
  chmodSync(scriptCopy, 0o755);

  try {
    const result = await runProcess(scriptCopy, [], tempRoot);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain("dist/ was not found.");
    expect(result.stdout).toContain("Run `npm run build` before `./serve.sh`.");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("markdown code block gallery is linked from the home page", async () => {
  const port = await getFreePort();
  const server = await startServer([String(port)]);
  try {
    const home = await fetch(server.url);
    const homeHtml = await home.text();
    expect(homeHtml).toContain(
      "tag-guides/11-markdown-code-block-gallery.html",
    );

    const page = await fetch(
      new URL("tag-guides/11-markdown-code-block-gallery.html", server.url),
    );
    const pageHtml = await page.text();
    expect(pageHtml).toContain("11. MarkdownコードブロックHTMLデザイン見本");
    expect(pageHtml).toContain('class="guideline-list"');
    expect(pageHtml).toContain('class="risk-box"');
    expect(pageHtml).toContain('class="takeaway-box"');
    expect(pageHtml).toContain('class="process-steps"');
    expect(pageHtml).toContain('class="checklist"');
    expect(pageHtml).toContain('class="risk-ladder"');
    expect(pageHtml).toContain('class="definition-box"');
    expect(pageHtml).toContain('class="structured-list"');
    expect(pageHtml).toContain('class="code-example-box"');
  } finally {
    await server.stop();
  }
});

test("tag guide markdown can be regenerated into readable HTML", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "tag-guides-build-"));
  const outputDir = path.join(tempRoot, "tag-guides");
  const result = spawn(
    "node",
    [buildTagGuidesScript, "--output-dir", outputDir],
    {
      cwd: siteDir,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const stdout = [];
  const stderr = [];
  result.stdout.on("data", (chunk) => {
    stdout.push(chunk.toString("utf8"));
  });
  result.stderr.on("data", (chunk) => {
    stderr.push(chunk.toString("utf8"));
  });

  return once(result, "close")
    .then(([code]) => {
      if (code !== 0) {
        throw new Error(
          `tag guide build failed with exit code ${code}\nstdout:\n${stdout.join("")}\nstderr:\n${stderr.join("")}`,
        );
      }

      const generatedFiles = readdirSync(outputDir).filter((name) =>
        name.endsWith(".html"),
      );
      expect(generatedFiles).toHaveLength(11);

      const generated = readFileSync(
        path.join(outputDir, "01-agent-design.html"),
        "utf8",
      );
      expect(generated).toContain("<title>01. エージェント設計系</title>");
      expect(generated).toContain(
        '<p class="nav"><a href="../index.html">← Index</a><a href="../domain-glossary.html">用語集</a></p>',
      );
      expect(generated).toContain('class="publication-note"');
      expect(generated).toContain("対象時点:</strong> 2026年5月");
      expect(generated).toContain('class="rating-guide"');
      expect(generated).toContain('class="term"');
      expect(generated).toContain('href="../domain-glossary.html#agent"');
      expect(generated).toContain('href="../site/styles/style.css?v=');
      expect(generated).toContain('src="../site/scripts/term-popup.js?v=');

      const gallery = readFileSync(
        path.join(outputDir, "11-markdown-code-block-gallery.html"),
        "utf8",
      );
      expect(gallery).toContain("11. MarkdownコードブロックHTMLデザイン見本");
      expect(gallery).toContain('class="guideline-list"');
      expect(gallery).toContain('class="risk-box"');
      expect(gallery).toContain('class="takeaway-box"');
      expect(gallery).toContain('class="process-steps"');
      expect(gallery).toContain('class="checklist"');
      expect(gallery).toContain('class="risk-ladder"');
      expect(gallery).toContain('class="definition-box"');
      expect(gallery).toContain('class="structured-list"');
      expect(gallery).toContain('class="code-example-box"');
    })
    .finally(() => {
      rmSync(tempRoot, { recursive: true, force: true });
    });
});

test("public dist assets package only copies static assets", () => {
  const distDir = path.join(siteDir, "dist");
  return runProcess("node", [packageDistAssetsScript, "--dist-dir", distDir])
    .then((result) => {
      if (result.code !== 0) {
        throw new Error(
          `asset packaging failed with exit code ${result.code}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
        );
      }

      expect(readdirSync(distDir)).toContain("site");
      expect(readdirSync(path.join(distDir, "site"))).toContain("styles");
      expect(readdirSync(path.join(distDir, "site"))).toContain("scripts");
      expect(
        readFileSync(path.join(distDir, "site/styles/style.css"), "utf8"),
      ).toContain(".publication-note");
      expect(
        readFileSync(
          path.join(distDir, "site/styles/semantic-overrides.css"),
          "utf8",
        ),
      ).toContain("Deprecated");
      expect(
        readFileSync(path.join(distDir, "site/scripts/term-popup.js"), "utf8"),
      ).toContain('popup.id = "term-popup"');
      expect(readdirSync(distDir)).not.toContain("index.md");
      expect(readdirSync(distDir)).not.toContain("domain-glossary.md");
      expect(readdirSync(distDir)).not.toContain("sources");
    })
    .finally(() => {
      // Keep dist output in place for the rest of the test suite.
    });
});

test("tone-marked markdown fences become semantic chip lists", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "tone-fence-build-"));
  const inputDir = path.join(tempRoot, "input");
  const outputDir = path.join(tempRoot, "output");
  const markdownPath = path.join(inputDir, "sample.md");

  mkdirSync(inputDir, { recursive: true });
  writeFileSync(
    markdownPath,
    [
      "# Sample",
      "",
      "```tone-good",
      "必要な情報だけを",
      "分かりやすく",
      "```",
      "",
      "```tone-bad",
      "返却値が長すぎる",
      "```",
      "",
      "```tone-neutral",
      "プロジェクト概要",
      "```",
      "",
    ].join("\n"),
  );

  const result = spawn(
    "node",
    [buildTagGuidesScript, "--input-dir", inputDir, "--output-dir", outputDir],
    {
      cwd: siteDir,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const stdout = [];
  const stderr = [];
  result.stdout.on("data", (chunk) => {
    stdout.push(chunk.toString("utf8"));
  });
  result.stderr.on("data", (chunk) => {
    stderr.push(chunk.toString("utf8"));
  });

  return once(result, "close")
    .then(([code]) => {
      if (code !== 0) {
        throw new Error(
          `tone-marked build failed with exit code ${code}\nstdout:\n${stdout.join("")}\nstderr:\n${stderr.join("")}`,
        );
      }

      const generated = readFileSync(
        path.join(outputDir, "sample.html"),
        "utf8",
      );
      expect(generated).toContain(
        '<div class="term-chip-list" data-tone="good">',
      );
      expect(generated).toContain("<span>必要な情報だけを</span>");
      expect(generated).toContain(
        '<div class="term-chip-list" data-tone="bad">',
      );
      expect(generated).toContain(
        '<div class="term-chip-list" data-tone="neutral">',
      );
      expect(generated).not.toContain('<pre><code class="language-tone-good">');
    })
    .finally(() => {
      rmSync(tempRoot, { recursive: true, force: true });
    });
});

test("tag guide markdown fences can be annotated with semantic markers", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "tag-guides-annotate-"));
  const inputDir = path.join(tempRoot, "input");
  const markdownPath = path.join(inputDir, "sample.md");

  mkdirSync(inputDir, { recursive: true });
  writeFileSync(
    markdownPath,
    [
      "# Sample",
      "",
      "```tone-good",
      "AIに任せる仕事を、処理単位に分解する",
      "```",
      "",
      "```tone-neutral",
      "1. 調査する",
      "2. 修正する",
      "3. 検証する",
      "```",
      "",
      "```tone-neutral",
      "低リスク:",
      "- ファイルを読む",
      "中リスク:",
      "- ローカルファイルを編集する",
      "高リスク:",
      "- 削除する",
      "```",
      "",
      "```json",
      '{"status":"ok"}',
      "```",
      "",
      "```markdown",
      "## Goal",
      "...",
      "## Constraints",
      "...",
      "```",
      "",
    ].join("\n"),
  );

  const result = spawn(
    "node",
    [annotateTagGuidesScript, "--input-dir", inputDir],
    {
      cwd: siteDir,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const stdout = [];
  const stderr = [];
  result.stdout.on("data", (chunk) => {
    stdout.push(chunk.toString("utf8"));
  });
  result.stderr.on("data", (chunk) => {
    stderr.push(chunk.toString("utf8"));
  });

  return once(result, "close")
    .then(([code]) => {
      if (code !== 0) {
        throw new Error(
          `annotation build failed with exit code ${code}\nstdout:\n${stdout.join("")}\nstderr:\n${stderr.join("")}`,
        );
      }

      const annotated = readFileSync(markdownPath, "utf8");
      expect(annotated).toContain("```tone-good.takeaway");
      expect(annotated).toContain("```tone-neutral.process");
      expect(annotated).toContain("```tone-neutral.risk-ladder");
      expect(annotated).toContain("```json.code-example");
      expect(annotated).toContain("```markdown.definition");
    })
    .finally(() => {
      rmSync(tempRoot, { recursive: true, force: true });
    });
});

test("semantic markers become semantic HTML blocks", () => {
  const tempRoot = mkdtempSync(
    path.join(os.tmpdir(), "semantic-blocks-build-"),
  );
  const inputDir = path.join(tempRoot, "input");
  const outputDir = path.join(tempRoot, "output");
  const markdownPath = path.join(inputDir, "sample.md");

  mkdirSync(inputDir, { recursive: true });
  writeFileSync(
    markdownPath,
    [
      "# Sample",
      "",
      "```tone-good.takeaway",
      "AIに任せる仕事を、処理単位に分解する",
      "```",
      "",
      "```tone-neutral.process",
      "1. 調査する",
      "2. 修正する",
      "3. 検証する",
      "```",
      "",
      "```tone-neutral.risk-ladder",
      "低リスク:",
      "- ファイルを読む",
      "中リスク:",
      "- ローカルファイルを編集する",
      "高リスク:",
      "- 削除する",
      "```",
      "",
      "```json.code-example",
      '{"status":"ok"}',
      "```",
      "",
      "```markdown.definition",
      "## Goal",
      "...",
      "## Constraints",
      "...",
      "```",
      "",
    ].join("\n"),
  );

  const result = spawn(
    "node",
    [buildTagGuidesScript, "--input-dir", inputDir, "--output-dir", outputDir],
    {
      cwd: siteDir,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const stdout = [];
  const stderr = [];
  result.stdout.on("data", (chunk) => {
    stdout.push(chunk.toString("utf8"));
  });
  result.stderr.on("data", (chunk) => {
    stderr.push(chunk.toString("utf8"));
  });

  return once(result, "close")
    .then(([code]) => {
      if (code !== 0) {
        throw new Error(
          `semantic build failed with exit code ${code}\nstdout:\n${stdout.join("")}\nstderr:\n${stderr.join("")}`,
        );
      }

      const generated = readFileSync(
        path.join(outputDir, "sample.html"),
        "utf8",
      );
      expect(generated).toContain('class="takeaway-box"');
      expect(generated).toContain('class="process-steps"');
      expect(generated).toContain('class="risk-ladder"');
      expect(generated).toContain('class="code-example-box"');
      expect(generated).toContain('class="definition-box"');
    })
    .finally(() => {
      rmSync(tempRoot, { recursive: true, force: true });
    });
});

test("semantic blocks render as good, bad, or neutral colors", async ({
  page,
}) => {
  const server = await startServer();
  try {
    await page.goto(`${server.url}tag-guides/04-context-engineering.html`);

    const badBlock = page
      .locator("ul.risk-box")
      .filter({ hasText: "この機能を改善してください" });

    const goodBlock = page
      .locator("ul.guideline-list")
      .filter({ hasText: "必要な粒度で" });

    const neutralBlock = page
      .locator("div.takeaway-box")
      .filter({ hasText: "AIが次の判断に使える情報を返す" });

    const styleSheet = readFileSync(
      path.join(siteDir, "site/styles/style.css"),
      "utf8",
    );
    expect(styleSheet).toContain(".risk-box,");
    expect(styleSheet).toContain("background: var(--negative-bg);");
    expect(styleSheet).toContain(".guideline-list");
    expect(styleSheet).toContain("background: var(--good-bg);");
    expect(styleSheet).toContain(".takeaway-box");
    expect(styleSheet).toContain("background: var(--soft-strong);");

    await expect(badBlock).toHaveCount(1);
    await expect(goodBlock).toHaveCount(1);
    await expect(neutralBlock).toHaveCount(1);
  } finally {
    await server.stop();
  }
});

test("index links to every article and the glossary", async ({ page }) => {
  const server = await startServer();
  try {
    await page.goto(server.url);

    await expect(
      page.getByRole("link", { name: "用語集を見る" }),
    ).toBeVisible();

    await expect(page.locator(".article-list > li")).toHaveCount(10);
    await expect(
      page.locator(".article-list > li > strong > a[href$='.html']"),
    ).toHaveCount(10);
    await expect(
      page.locator(".article-list > li .badges a[href$='.html']"),
    ).toHaveCount(10);
    await expect(
      page.getByRole("link", { name: "09. マルチエージェント系" }),
    ).toHaveAttribute("href", "tag-guides/09-multi-agent.html");
    await expect(page.locator("a[href$='.md']")).toHaveCount(0);

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

    await expect(page.locator('script[src*="term-popup.js?v="]')).toHaveCount(
      1,
    );
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

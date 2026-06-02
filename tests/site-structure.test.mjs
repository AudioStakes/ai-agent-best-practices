import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { JSDOM } from "jsdom";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..");
const distDir = path.join(repoRoot, "dist");
const checklistPath = path.join(testDir, "ui-behavior-checklist.json");
const serveScript = path.join(repoRoot, "serve.sh");
const buildTagGuidesScript = path.join(
  repoRoot,
  "workflow/scripts/build_tag_guides_html.ts",
);
const packageDistAssetsScript = path.join(
  repoRoot,
  "workflow/scripts/package_dist_assets.ts",
);
const annotateTagGuidesScript = path.join(
  repoRoot,
  "workflow/scripts/annotate_tag_guides_fences.ts",
);

let distChecked = false;

async function runProcess(command, args, cwd = repoRoot) {
  const child = spawn(command, args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stdout = [];
  const stderr = [];

  child.stdout.on("data", (chunk) => stdout.push(chunk.toString("utf8")));
  child.stderr.on("data", (chunk) => stderr.push(chunk.toString("utf8")));

  const [code] = await once(child, "close");
  return {
    code,
    stdout: stdout.join(""),
    stderr: stderr.join(""),
  };
}

async function ensureDistBuilt() {
  if (distChecked) {
    return;
  }

  const legacyMirrors = [
    path.join(distDir, "index.md"),
    path.join(distDir, "domain-glossary.md"),
    path.join(distDir, "sources", "articles.csv"),
  ];

  if (
    existsSync(path.join(distDir, "index.html")) &&
    !legacyMirrors.some((filePath) => existsSync(filePath))
  ) {
    distChecked = true;
    return;
  }

  const result = await runProcess("npm", ["run", "build"]);
  if (result.code !== 0) {
    throw new Error(
      `site build failed with exit code ${result.code}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }

  distChecked = true;
}

function toDocument(text) {
  return new JSDOM(text).window.document;
}

function readDirHtml(dir) {
  return readdirSync(dir).filter((name) => name.endsWith(".html"));
}

test("ui checklist JSON stays machine-readable", async () => {
  const checklist = JSON.parse(readFileSync(checklistPath, "utf8"));

  expect(checklist.name).toBe("AI Agent Best Practices UI behavior checklist");
  expect(checklist.version).toBe("2026-05-31");
  expect(checklist.target).toBe("dist");
  expect(checklist.categories).toHaveLength(13);
});

test("serve.sh starts with the documented host and port settings", async () => {
  const serveScriptContents = readFileSync(serveScript, "utf8");
  expect(serveScriptContents).toContain(`PORT="\${1:-8000}"`);
  expect(serveScriptContents).toContain(`HOST="\${2:-0.0.0.0}"`);
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
  await ensureDistBuilt();

  const homeHtml = readFileSync(path.join(distDir, "index.html"), "utf8");
  expect(homeHtml).toContain("tag-guides/11-markdown-code-block-gallery.html");

  const pageHtml = readFileSync(
    path.join(distDir, "tag-guides/11-markdown-code-block-gallery.html"),
    "utf8",
  );
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
});

test("tag guide markdown can be regenerated into readable HTML", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "tag-guides-build-"));
  const outputDir = path.join(tempRoot, "tag-guides");
  const result = spawn(
    "tsx",
    [buildTagGuidesScript, "--output-dir", outputDir],
    {
      cwd: repoRoot,
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

      const generatedFiles = readDirHtml(outputDir);
      expect(generatedFiles).toHaveLength(11);

      const generated = readFileSync(
        path.join(outputDir, "01-agent-design.html"),
        "utf8",
      );
      expect(generated).toContain("<title>01. エージェント設計系</title>");
      expect(generated).toContain(
        '<p class="nav"><a href="../index.html">← Index</a><a href="../domain-glossary.html">用語集</a></p>',
      );
      expect(generated).toContain(
        '<article class="article markdown-body markdown-document">',
      );
      expect(generated).toContain('class="term"');
      expect(generated).toContain('href="../domain-glossary.html#agent"');
      expect(generated).toContain('href="../site/styles/style.css?v=');
      expect(generated).toContain('src="../site/scripts/term-popup.js?v=');
      expect(generated).toContain(
        'type="module" src="../site/scripts/html-review.js?v=',
      );
      expect(generated).toContain('data-reviewable="true"');

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
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "dist-assets-"));
  const distSubdir = path.join(tempRoot, "dist");

  return runProcess("tsx", [packageDistAssetsScript, "--dist-dir", distSubdir])
    .then((result) => {
      if (result.code !== 0) {
        throw new Error(
          `asset packaging failed with exit code ${result.code}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
        );
      }

      expect(readdirSync(distSubdir)).toContain("site");
      expect(readdirSync(path.join(distSubdir, "site"))).toContain("styles");
      expect(readdirSync(path.join(distSubdir, "site"))).toContain("scripts");
      const distCss = readFileSync(
        path.join(distSubdir, "site/styles/style.css"),
        "utf8",
      );
      expect(distCss).toContain(".term-popup");
      expect(distCss).toContain(".glossary-table-wrap");
      expect(
        readFileSync(
          path.join(distSubdir, "site/scripts/term-popup.js"),
          "utf8",
        ),
      ).toContain('popup.id = "term-popup"');
      expect(
        readFileSync(
          path.join(distSubdir, "site/scripts/html-review.js"),
          "utf8",
        ),
      ).toContain("HTML_REVIEW_VERSION");
      expect(readdirSync(distSubdir)).not.toContain("index.md");
      expect(readdirSync(distSubdir)).not.toContain("domain-glossary.md");
      expect(readdirSync(distSubdir)).not.toContain("sources");
    })
    .finally(() => {
      rmSync(tempRoot, { recursive: true, force: true });
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
    "tsx",
    [buildTagGuidesScript, "--input-dir", inputDir, "--output-dir", outputDir],
    {
      cwd: repoRoot,
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
        '<div class="term-chip-list" data-tone="good" data-reviewable="true"',
      );
      expect(generated).toContain("<span>必要な情報だけを</span>");
      expect(generated).toContain(
        '<div class="term-chip-list" data-tone="bad" data-reviewable="true"',
      );
      expect(generated).toContain(
        '<div class="term-chip-list" data-tone="neutral" data-reviewable="true"',
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
    "tsx",
    [annotateTagGuidesScript, "--input-dir", inputDir],
    {
      cwd: repoRoot,
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

test("tag guide annotation check fails without mutating source files", () => {
  const tempRoot = mkdtempSync(
    path.join(os.tmpdir(), "tag-guides-annotate-check-"),
  );
  const inputDir = path.join(tempRoot, "input");
  const markdownPath = path.join(inputDir, "sample.md");

  mkdirSync(inputDir, { recursive: true });
  const original = [
    "# Sample",
    "",
    "```tone-good",
    "AIに任せる仕事を、処理単位に分解する",
    "```",
    "",
  ].join("\n");
  writeFileSync(markdownPath, original);

  const result = spawn(
    "tsx",
    [annotateTagGuidesScript, "--input-dir", inputDir, "--check"],
    {
      cwd: repoRoot,
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
      expect(code).toBe(1);
      expect(stdout.join("")).toBe("");
      expect(stderr.join("")).toContain(
        "Tag guide semantic fences are not normalized:",
      );
      expect(stderr.join("")).toContain(
        "Run `npm run fix:tag-guides` to update them.",
      );
      expect(readFileSync(markdownPath, "utf8")).toBe(original);
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
    "tsx",
    [buildTagGuidesScript, "--input-dir", inputDir, "--output-dir", outputDir],
    {
      cwd: repoRoot,
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

test("index links to every article and the glossary", async () => {
  await ensureDistBuilt();

  const indexText = readFileSync(path.join(distDir, "index.html"), "utf8");
  const document = toDocument(indexText);

  expect(
    document.querySelector("article.article.markdown-body.markdown-document"),
  ).toBeTruthy();
  expect(indexText).toContain('href="site/styles/style.css?v=');
  expect(indexText).toContain("tag-guides/01-agent-design.html");
  expect(indexText).toContain("tag-guides/10-governance.html");
  expect(indexText).toContain('href="domain-glossary.html"');
});

test("article pages keep the shared shell and readable headings", async () => {
  await ensureDistBuilt();

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

  for (const [slug, heading] of articlePages) {
    const text = readFileSync(
      path.join(distDir, "tag-guides", `${slug}.html`),
      "utf8",
    );
    const document = toDocument(text);

    expect(document.querySelector('meta[charset="utf-8"]')).toBeTruthy();
    expect(text).toContain('href="../site/styles/style.css?v=');
    expect(text).toContain('src="../site/scripts/term-popup.js?v=');
    expect(text).toContain(
      '<article class="article markdown-body markdown-document">',
    );
    expect(document.querySelector("h1")?.textContent).toContain(heading);
    expect(text).toContain('class="term"');
  }
});

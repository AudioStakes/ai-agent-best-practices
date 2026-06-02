const VERSION = "20260602-html-review-3";

declare global {
  interface Window {
    __HTML_REVIEW_VERSION__?: string;
  }
}

type ReviewComment = {
  createdAt: number;
  endLine: number;
  id: string;
  sourcePath: string;
  startLine: number;
  text: string;
};

type ReviewDraft = {
  endLine: number;
  sourcePath: string;
  startLine: number;
};

type DialogState =
  | {
      mode: "hidden";
    }
  | {
      draft: ReviewDraft;
      mode: "editor";
    }
  | {
      mode: "list";
    };

window.__HTML_REVIEW_VERSION__ = VERSION;

const STORAGE_KEY = "html-review-comments";
const REVIEWABLE_SELECTOR = '[data-reviewable="true"]';

const toLineNumber = (value: string | null): number | null => {
  if (value === null) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getReviewDraft = (element: HTMLElement): ReviewDraft | null => {
  const sourcePath = element.getAttribute("data-source-path");
  const startLine = toLineNumber(
    element.getAttribute("data-source-start-line"),
  );
  const endLine = toLineNumber(element.getAttribute("data-source-end-line"));

  if (!sourcePath || !startLine) {
    return null;
  }

  return {
    sourcePath,
    startLine,
    endLine: endLine ?? startLine,
  };
};

const formatLineLabel = (draft: ReviewDraft): string => {
  return draft.startLine === draft.endLine
    ? `${draft.startLine}`
    : `${draft.startLine}-${draft.endLine}`;
};

const readComments = (): ReviewComment[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((entry) => {
      if (
        typeof entry !== "object" ||
        entry === null ||
        typeof (entry as ReviewComment).createdAt !== "number" ||
        typeof (entry as ReviewComment).endLine !== "number" ||
        typeof (entry as ReviewComment).id !== "string" ||
        typeof (entry as ReviewComment).sourcePath !== "string" ||
        typeof (entry as ReviewComment).startLine !== "number" ||
        typeof (entry as ReviewComment).text !== "string"
      ) {
        return [];
      }

      return [
        {
          createdAt: (entry as ReviewComment).createdAt,
          endLine: (entry as ReviewComment).endLine,
          id: (entry as ReviewComment).id,
          sourcePath: (entry as ReviewComment).sourcePath,
          startLine: (entry as ReviewComment).startLine,
          text: (entry as ReviewComment).text,
        },
      ];
    });
  } catch {
    return [];
  }
};

const writeComments = (comments: ReviewComment[]): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
};

const createButton = (className: string, label: string): HTMLButtonElement => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  return button;
};

const createStatus = (): HTMLParagraphElement => {
  const status = document.createElement("p");
  status.className = "html-review-status";
  status.setAttribute("aria-live", "polite");
  return status;
};

const getCommentMarkdown = (comment: ReviewComment): string => {
  const lineLabel =
    comment.startLine === comment.endLine
      ? `${comment.startLine}`
      : `${comment.startLine}-${comment.endLine}`;
  const body = comment.text
    .split(/\r?\n/)
    .map((line) => (line.trim() ? `  > ${line}` : "  >"))
    .join("\n");

  return `- \`${lineLabel}\`\n${body}`;
};

const buildMarkdownSummary = (comments: ReviewComment[]): string => {
  const sortedComments = [...comments].sort((left, right) => {
    const byPath = left.sourcePath.localeCompare(right.sourcePath);
    if (byPath !== 0) {
      return byPath;
    }

    const byLine = left.startLine - right.startLine;
    if (byLine !== 0) {
      return byLine;
    }

    return left.createdAt - right.createdAt;
  });

  const grouped = new Map<string, ReviewComment[]>();
  for (const comment of sortedComments) {
    const items = grouped.get(comment.sourcePath);
    if (items) {
      items.push(comment);
    } else {
      grouped.set(comment.sourcePath, [comment]);
    }
  }

  const lines = [
    "# Review Comments",
    "",
    "> 各コメントは、ファイル名と行番号の対応が分かる形式で表示しています。",
    "> 範囲コメントは開始行-終了行の形式です。",
    "",
  ];

  for (const [sourcePath, items] of grouped) {
    lines.push(`## \`${sourcePath}\``);

    for (const comment of items) {
      lines.push(getCommentMarkdown(comment));
    }

    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
};

const copyTextToClipboard = async (text: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.top = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  const successful = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!successful) {
    throw new Error("Clipboard copy failed");
  }
};

const launcher = document.createElement("button");
launcher.type = "button";
launcher.className = "html-review-launcher";
launcher.hidden = true;
launcher.setAttribute("aria-label", "レビューコメントを開く");

const launcherLabel = document.createElement("span");
launcherLabel.textContent = "レビュー";
launcher.appendChild(launcherLabel);

const launcherCount = document.createElement("span");
launcherCount.className = "count";
launcher.appendChild(launcherCount);

const overlay = document.createElement("div");
overlay.className = "html-review-overlay";
overlay.hidden = true;
overlay.setAttribute("aria-hidden", "true");

const dialog = document.createElement("div");
dialog.className = "html-review-dialog";
dialog.setAttribute("role", "dialog");
dialog.setAttribute("aria-modal", "true");
overlay.appendChild(dialog);

document.body.append(launcher, overlay);

let comments = readComments();
let dialogState: DialogState = { mode: "hidden" };
let statusNode: HTMLParagraphElement | null = null;
let activeSaveButton: HTMLButtonElement | null = null;

const updateLauncher = (): void => {
  launcherCount.textContent = `${comments.length}`;
  launcher.hidden = comments.length === 0;
};

const setStatus = (text: string): void => {
  if (statusNode) {
    statusNode.textContent = text;
  }
};

const closeDialog = (): void => {
  dialogState = { mode: "hidden" };
  activeSaveButton = null;
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");
  dialog.replaceChildren();
  setStatus("");
};

const clickActiveSaveButton = (): boolean => {
  if (!activeSaveButton || activeSaveButton.disabled) {
    return false;
  }

  activeSaveButton.click();
  return true;
};

const renderEmptyState = (): HTMLDivElement => {
  const empty = document.createElement("div");
  empty.className = "html-review-empty";
  empty.textContent =
    "コメントはまだありません。レビュー対象ブロックをクリックすると追加できます。";
  return empty;
};

const renderHeader = (title: string, subtitle: string): HTMLDivElement => {
  const header = document.createElement("div");
  header.className = "html-review-header";

  const textWrap = document.createElement("div");

  const heading = document.createElement("h2");
  heading.className = "html-review-title";
  heading.textContent = title;
  textWrap.appendChild(heading);

  const subheading = document.createElement("div");
  subheading.className = "html-review-subtitle";
  subheading.textContent = subtitle;
  textWrap.appendChild(subheading);

  const closeButton = createButton("html-review-close", "×");
  closeButton.setAttribute("aria-label", "閉じる");
  closeButton.addEventListener("click", closeDialog);

  header.append(textWrap, closeButton);
  return header;
};

const renderEditor = (draft: ReviewDraft): void => {
  const container = document.createDocumentFragment();
  container.appendChild(
    renderHeader(
      "レビューコメントを追加",
      `${draft.sourcePath} • ${formatLineLabel(draft)}`,
    ),
  );

  const body = document.createElement("div");
  body.className = "html-review-body";

  const editor = document.createElement("div");
  editor.className = "html-review-editor";

  const meta = document.createElement("div");
  meta.className = "html-review-meta";

  const source = document.createElement("code");
  source.textContent = draft.sourcePath;
  meta.appendChild(source);

  const lineInfo = document.createElement("span");
  lineInfo.textContent = `lines ${formatLineLabel(draft)}`;
  meta.appendChild(lineInfo);
  editor.appendChild(meta);

  const textarea = document.createElement("textarea");
  textarea.className = "html-review-input";
  textarea.placeholder = "改善コメントを入力";
  textarea.setAttribute("aria-label", "レビューコメント");
  editor.appendChild(textarea);

  body.appendChild(editor);
  container.appendChild(body);

  const footer = document.createElement("div");
  footer.className = "html-review-footer";

  statusNode = createStatus();
  footer.appendChild(statusNode);

  const actions = document.createElement("div");
  actions.className = "html-review-actions";

  const cancelButton = createButton("html-review-cancel", "キャンセル");
  cancelButton.addEventListener("click", closeDialog);

  const saveButton = createButton("html-review-save", "コメント");
  saveButton.disabled = true;
  activeSaveButton = saveButton;

  const syncSaveState = (): void => {
    saveButton.disabled = textarea.value.trim().length === 0;
  };

  textarea.addEventListener("input", syncSaveState);
  textarea.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.metaKey && event.key === "Enter" && !saveButton.disabled) {
      event.preventDefault();
      saveButton.click();
    }
  });

  saveButton.addEventListener("click", () => {
    const text = textarea.value.trim();
    if (!text) {
      return;
    }

    comments = [
      ...comments,
      {
        createdAt: Date.now(),
        endLine: draft.endLine,
        id:
          window.crypto?.randomUUID?.() ??
          `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        sourcePath: draft.sourcePath,
        startLine: draft.startLine,
        text,
      },
    ];
    writeComments(comments);
    updateLauncher();
    setStatus("コメントを保存しました");
    closeDialog();
  });

  actions.append(cancelButton, saveButton);
  footer.appendChild(actions);
  container.appendChild(footer);

  dialog.replaceChildren(container);
  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");
  dialogState = { draft, mode: "editor" };
  syncSaveState();
  window.requestAnimationFrame(() => {
    textarea.focus();
  });
};

const renderCommentItem = (comment: ReviewComment): HTMLDivElement => {
  const item = document.createElement("div");
  item.className = "html-review-comment";

  const source = document.createElement("div");
  source.className = "html-review-source";
  const code = document.createElement("code");
  code.textContent = comment.sourcePath;
  source.appendChild(code);
  const separator = document.createElement("span");
  separator.textContent = ` • ${formatLineLabel(comment)}`;
  source.appendChild(separator);
  item.appendChild(source);

  const text = document.createElement("div");
  text.className = "html-review-text";
  text.textContent = comment.text;
  item.appendChild(text);

  return item;
};

const renderList = (): void => {
  const container = document.createDocumentFragment();
  container.appendChild(
    renderHeader("レビュー一覧", `${comments.length}件のコメント`),
  );

  const body = document.createElement("div");
  body.className = "html-review-body";

  if (comments.length === 0) {
    body.appendChild(renderEmptyState());
  } else {
    const list = document.createElement("div");
    list.className = "html-review-list";

    for (const comment of comments) {
      list.appendChild(renderCommentItem(comment));
    }

    body.appendChild(list);
  }

  container.appendChild(body);

  const footer = document.createElement("div");
  footer.className = "html-review-footer";

  statusNode = createStatus();
  footer.appendChild(statusNode);

  const actions = document.createElement("div");
  actions.className = "html-review-actions";

  const copyButton = createButton("html-review-copy", "すべてコピー");
  copyButton.disabled = comments.length === 0;
  copyButton.addEventListener("click", async () => {
    if (comments.length === 0) {
      return;
    }

    try {
      await copyTextToClipboard(buildMarkdownSummary(comments));
      setStatus("Markdown をクリップボードにコピーしました");
    } catch {
      setStatus("コピーに失敗しました");
    }
  });

  const closeButton = createButton("html-review-cancel", "閉じる");
  closeButton.addEventListener("click", closeDialog);

  actions.append(copyButton, closeButton);
  footer.appendChild(actions);
  container.appendChild(footer);

  dialog.replaceChildren(container);
  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");
  dialogState = { mode: "list" };
  window.requestAnimationFrame(() => {
    copyButton.focus();
  });
};

const openList = (): void => {
  renderList();
};

const openEditor = (target: HTMLElement): void => {
  const draft = getReviewDraft(target);
  if (!draft) {
    return;
  }

  renderEditor(draft);
};

launcher.addEventListener("click", openList);

  overlay.addEventListener("click", (event: MouseEvent) => {
    if (event.target === overlay) {
      if (clickActiveSaveButton()) {
        return;
      }
      closeDialog();
    }
  });

document.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key === "Escape" && dialogState.mode !== "hidden") {
    event.preventDefault();
    closeDialog();
  }
});

document.addEventListener("click", (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  if (target.closest("a, button, input, textarea, select, summary, label")) {
    return;
  }

  const reviewable = target.closest<HTMLElement>(REVIEWABLE_SELECTOR);
  if (!reviewable) {
    return;
  }

    const draft = getReviewDraft(reviewable);
    if (!draft) {
      return;
    }

    event.preventDefault();
    if (dialogState.mode === "editor" && clickActiveSaveButton()) {
      return;
    }
    openEditor(reviewable);
  });

updateLauncher();

export {};

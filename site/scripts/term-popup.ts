const VERSION = "20260531-mobile-top-close-1";

type Tone = "bad" | "good" | "neutral";

type TonePatternMap = {
  bad: RegExp[];
  good: RegExp[];
};

declare global {
  interface Window {
    __TERM_POPUP_VERSION__?: string;
  }
}

const toneScoring: TonePatternMap = {
  bad: [
    /返却値が長すぎる/,
    /重要情報が埋もれる/,
    /エラー理由が分からない/,
    /エラー理由がわからない/,
    /次に何をすべきかわからない/,
    /次に何をすべきか分からない/,
    /悪い例/,
    /危険/,
    /曖昧/,
    /不明/,
    /失敗/,
    /多すぎる/,
    /少なすぎる/,
  ],
  good: [
    /次の判断に必要な情報だけを/,
    /分かりやすく/,
    /わかりやすく/,
    /構造化して/,
    /構造化する/,
    /必要なら根拠も含めて返す/,
    /良い例/,
    /良いツール結果/,
    /安全/,
    /明確/,
    /具体的/,
  ],
};

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function getSiblingText(node: Element, limit = 1): string {
  const texts: string[] = [];
  let current: Element | null = node.previousElementSibling;

  while (current && texts.length < limit) {
    const text = normalizeText(current.textContent);
    if (text) {
      texts.push(text);
    }
    current = current.previousElementSibling;
  }

  return texts.join(" ");
}

function classifyToneChipList(list: Element): Tone {
  const chips = Array.from(list.querySelectorAll("span")).map((chip) =>
    normalizeText(chip.textContent),
  );
  const content = chips.join(" ");
  const context = `${getSiblingText(list)} ${content}`;

  if (toneScoring.bad.some((pattern) => pattern.test(context))) {
    return "bad";
  }

  if (toneScoring.good.some((pattern) => pattern.test(context))) {
    return "good";
  }

  return "neutral";
}

const chipLists = Array.from(
  document.querySelectorAll<HTMLElement>(".term-chip-list"),
);
for (const list of chipLists) {
  const tone = classifyToneChipList(list);
  list.dataset.tone = tone;

  for (const chip of list.querySelectorAll("span")) {
    chip.dataset.tone = tone;
  }
}

const terms = Array.from(
  document.querySelectorAll<HTMLAnchorElement>("a.term[data-description]"),
);

if (terms.length > 0) {
  let activeTerm: HTMLAnchorElement | null = null;

  const popup = document.createElement("div");
  popup.id = "term-popup";
  popup.className = "term-popup";
  popup.setAttribute("role", "tooltip");
  popup.setAttribute("aria-hidden", "true");
  popup.hidden = true;
  document.body.appendChild(popup);

  function isTouchLike(): boolean {
    return (
      window.matchMedia?.("(hover: none), (pointer: coarse)")?.matches ===
        true || navigator.maxTouchPoints > 0
    );
  }

  function isMobileLayout(): boolean {
    return window.matchMedia?.("(max-width: 720px)")?.matches === true;
  }

  function getTermLabel(term: HTMLAnchorElement): string {
    return (term.textContent || "").replace(/\s+/g, " ").trim();
  }

  function renderPopup(term: HTMLAnchorElement): void {
    const description = term.getAttribute("data-description") || "";
    popup.replaceChildren();

    if (isMobileLayout()) {
      const header = document.createElement("div");
      header.className = "term-popup-header";

      const title = document.createElement("div");
      title.className = "term-popup-title";
      title.textContent = getTermLabel(term);
      header.appendChild(title);

      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "term-popup-close";
      closeButton.setAttribute("aria-label", "ポップアップを閉じる");
      closeButton.textContent = "×";
      closeButton.addEventListener("click", (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        closePopup();
      });
      header.appendChild(closeButton);

      popup.appendChild(header);
    }

    const body = document.createElement("div");
    body.className = "term-popup-description";
    body.textContent = description;
    popup.appendChild(body);
  }

  function setPopupPosition(term: HTMLAnchorElement): void {
    const rect = term.getBoundingClientRect();
    const mobile = isMobileLayout();

    if (mobile) {
      popup.style.left = "10px";
      popup.style.right = "10px";
      popup.style.top = "max(12px, calc(env(safe-area-inset-top, 0px) + 12px))";
      popup.style.bottom = "auto";
      popup.style.width = "auto";
      popup.style.maxWidth = "none";
      return;
    }

    const margin = 12;
    const width = Math.min(360, window.innerWidth - margin * 2);
    popup.style.width = `${width}px`;
    popup.style.maxWidth = `${width}px`;
    popup.style.right = "auto";
    popup.style.bottom = "auto";

    let left = rect.left;
    if (left + width > window.innerWidth - margin) {
      left = window.innerWidth - width - margin;
    }
    if (left < margin) {
      left = margin;
    }

    popup.style.left = `${left}px`;

    popup.style.top = "0px";
    popup.hidden = false;
    popup.dataset.open = "true";
    const popupHeight = popup.offsetHeight || 120;
    let top = rect.top - popupHeight - 10;
    if (top < margin) {
      top = rect.bottom + 10;
    }
    popup.style.top = `${top}px`;
  }

  function openPopup(term: HTMLAnchorElement): void {
    if (!term) {
      return;
    }

    if (activeTerm && activeTerm !== term) {
      activeTerm.setAttribute("aria-expanded", "false");
    }

    activeTerm = term;
    renderPopup(term);
    popup.hidden = false;
    popup.dataset.open = "true";
    popup.setAttribute("aria-hidden", "false");
    term.setAttribute("aria-expanded", "true");
    setPopupPosition(term);
  }

  function closePopup(): void {
    if (activeTerm) {
      activeTerm.setAttribute("aria-expanded", "false");
    }
    activeTerm = null;
    popup.hidden = true;
    delete popup.dataset.open;
    popup.setAttribute("aria-hidden", "true");
  }

  for (const term of terms) {
    term.setAttribute("aria-haspopup", "dialog");
    term.setAttribute("aria-expanded", "false");
    term.setAttribute("aria-describedby", "term-popup");

    term.addEventListener("mouseenter", () => {
      if (!isTouchLike()) {
        openPopup(term);
      }
    });

    term.addEventListener("mouseleave", () => {
      if (!isTouchLike()) {
        closePopup();
      }
    });

    term.addEventListener("focus", () => {
      if (!isTouchLike()) {
        openPopup(term);
      }
    });

    term.addEventListener("blur", () => {
      if (!isTouchLike()) {
        setTimeout(() => {
          if (document.activeElement !== term) {
            closePopup();
          }
        }, 120);
      }
    });

    term.addEventListener(
      "touchend",
      (event: TouchEvent) => {
        const alreadyOpen = activeTerm === term && !popup.hidden;
        event.preventDefault();
        event.stopPropagation();

        if (alreadyOpen) {
          window.location.href = term.href;
          return;
        }

        openPopup(term);
      },
      { passive: false },
    );

    term.addEventListener("click", (event: MouseEvent) => {
      if (isTouchLike()) {
        const alreadyOpen = activeTerm === term && !popup.hidden;
        if (!alreadyOpen) {
          event.preventDefault();
          openPopup(term);
        }
      }
    });
  }

  document.addEventListener("click", (event: MouseEvent) => {
    if (!activeTerm) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest("a.term") || target.closest("#term-popup")) {
      return;
    }

    closePopup();
  });

  document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closePopup();
    }
  });

  window.addEventListener(
    "scroll",
    () => {
      if (activeTerm && !popup.hidden && !isMobileLayout()) {
        setPopupPosition(activeTerm);
      }
    },
    { passive: true },
  );

  window.addEventListener("resize", () => {
    if (activeTerm && !popup.hidden) {
      renderPopup(activeTerm);
      setPopupPosition(activeTerm);
    }
  });
}

window.__TERM_POPUP_VERSION__ = VERSION;

export {};

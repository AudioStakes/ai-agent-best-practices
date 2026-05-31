(() => {
  const VERSION = "20260531-mobile-top-close-1";
  const terms = Array.from(document.querySelectorAll('a.term[data-description]'));
  if (!terms.length) return;

  let activeTerm = null;
  let lastTouchTime = 0;

  const popup = document.createElement('div');
  popup.id = 'term-popup';
  popup.className = 'term-popup';
  popup.setAttribute('role', 'tooltip');
  popup.setAttribute('aria-hidden', 'true');
  popup.hidden = true;
  document.body.appendChild(popup);

  function isTouchLike() {
    return (
      (window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches) ||
      navigator.maxTouchPoints > 0
    );
  }

  function isMobileLayout() {
    return window.matchMedia && window.matchMedia('(max-width: 720px)').matches;
  }

  function getTermLabel(term) {
    return (term.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function renderPopup(term) {
    const description = term.getAttribute('data-description') || '';
    popup.replaceChildren();

    if (isMobileLayout()) {
      const header = document.createElement('div');
      header.className = 'term-popup-header';

      const title = document.createElement('div');
      title.className = 'term-popup-title';
      title.textContent = getTermLabel(term);
      header.appendChild(title);

      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'term-popup-close';
      closeButton.setAttribute('aria-label', 'ポップアップを閉じる');
      closeButton.textContent = '×';
      closeButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        closePopup();
      });
      header.appendChild(closeButton);

      popup.appendChild(header);
    }

    const body = document.createElement('div');
    body.className = 'term-popup-description';
    body.textContent = description;
    popup.appendChild(body);
  }

  function setPopupPosition(term) {
    const rect = term.getBoundingClientRect();
    const mobile = isMobileLayout();

    if (mobile) {
      popup.style.left = '10px';
      popup.style.right = '10px';
      popup.style.top = 'max(12px, calc(env(safe-area-inset-top, 0px) + 12px))';
      popup.style.bottom = 'auto';
      popup.style.width = 'auto';
      popup.style.maxWidth = 'none';
      return;
    }

    const margin = 12;
    const width = Math.min(360, window.innerWidth - margin * 2);
    popup.style.width = width + 'px';
    popup.style.maxWidth = width + 'px';
    popup.style.right = 'auto';
    popup.style.bottom = 'auto';

    let left = rect.left;
    if (left + width > window.innerWidth - margin) left = window.innerWidth - width - margin;
    if (left < margin) left = margin;

    popup.style.left = left + 'px';

    // First place above the term. If it would go off screen, place below.
    popup.style.top = '0px';
    popup.hidden = false;
    popup.dataset.open = 'true';
    const popupHeight = popup.offsetHeight || 120;
    let top = rect.top - popupHeight - 10;
    if (top < margin) top = rect.bottom + 10;
    popup.style.top = top + 'px';
  }

  function openPopup(term) {
    if (!term) return;
    if (activeTerm && activeTerm !== term) {
      activeTerm.setAttribute('aria-expanded', 'false');
    }
    activeTerm = term;
    renderPopup(term);
    popup.hidden = false;
    popup.dataset.open = 'true';
    popup.setAttribute('aria-hidden', 'false');
    term.setAttribute('aria-expanded', 'true');
    setPopupPosition(term);
  }

  function closePopup() {
    if (activeTerm) activeTerm.setAttribute('aria-expanded', 'false');
    activeTerm = null;
    popup.hidden = true;
    delete popup.dataset.open;
    popup.setAttribute('aria-hidden', 'true');
  }

  for (const term of terms) {
    term.setAttribute('aria-haspopup', 'dialog');
    term.setAttribute('aria-expanded', 'false');
    term.setAttribute('aria-describedby', 'term-popup');

    term.addEventListener('mouseenter', () => {
      if (!isTouchLike()) openPopup(term);
    });

    term.addEventListener('mouseleave', () => {
      if (!isTouchLike()) closePopup();
    });

    term.addEventListener('focus', () => {
      if (!isTouchLike()) openPopup(term);
    });

    term.addEventListener('blur', () => {
      if (!isTouchLike()) {
        setTimeout(() => {
          if (document.activeElement !== term) closePopup();
        }, 120);
      }
    });

    term.addEventListener('touchend', (event) => {
      lastTouchTime = Date.now();
      const alreadyOpen = activeTerm === term && !popup.hidden;
      if (!alreadyOpen) {
        event.preventDefault();
        event.stopPropagation();
        openPopup(term);
      }
      // When it is already open, do not prevent default: the second tap follows the link.
    }, { passive: false });

    term.addEventListener('click', (event) => {
      // On touch devices, the first tap opens the popup. The second tap follows the link.
      if (isTouchLike()) {
        const alreadyOpen = activeTerm === term && !popup.hidden;
        const justHandledByTouch = Date.now() - lastTouchTime < 700;
        if (!alreadyOpen || justHandledByTouch) {
          event.preventDefault();
          if (!alreadyOpen) openPopup(term);
        }
      }
    });
  }

  document.addEventListener('click', (event) => {
    if (!activeTerm) return;
    if (event.target.closest && (event.target.closest('a.term') || event.target.closest('#term-popup'))) return;
    closePopup();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePopup();
  });

  window.addEventListener('scroll', () => {
    if (activeTerm && !popup.hidden && !isMobileLayout()) setPopupPosition(activeTerm);
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (activeTerm && !popup.hidden) {
      renderPopup(activeTerm);
      setPopupPosition(activeTerm);
    }
  });

  window.__TERM_POPUP_VERSION__ = VERSION;
})();

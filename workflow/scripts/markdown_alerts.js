const ALERT_TYPES = new Map([
  ["NOTE", { className: "note", title: "Note" }],
  ["TIP", { className: "tip", title: "Tip" }],
  ["IMPORTANT", { className: "important", title: "Important" }],
  ["WARNING", { className: "warning", title: "Warning" }],
  ["CAUTION", { className: "caution", title: "Caution" }],
]);

function getLeadingAlertMarker(firstParagraph) {
  const firstTextNode = firstParagraph?.firstChild;
  if (firstTextNode?.nodeType !== 3) {
    return null;
  }

  const value = firstTextNode.nodeValue ?? "";
  const match = value.match(
    /^(\s*)\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](\s*)/i,
  );

  if (!match) {
    return null;
  }

  return {
    type: match[2].toUpperCase(),
    markerLength: match[0].length,
  };
}

function trimEmptyParagraph(paragraph) {
  return paragraph.textContent?.trim().length === 0;
}

function removeAlertMarker(firstParagraph, markerLength) {
  const firstTextNode = firstParagraph.firstChild;
  if (firstTextNode?.nodeType !== 3) {
    return;
  }

  firstTextNode.nodeValue = (firstTextNode.nodeValue ?? "").slice(markerLength);
  if (firstTextNode.nodeValue.length === 0) {
    firstTextNode.remove();
  }
}

export function transformMarkdownAlerts(document) {
  const blockquotes = [...document.querySelectorAll("blockquote")];

  for (const blockquote of blockquotes) {
    const firstElementChild = blockquote.firstElementChild;
    if (firstElementChild?.tagName !== "P") {
      continue;
    }

    const marker = getLeadingAlertMarker(firstElementChild);
    if (!marker) {
      continue;
    }

    const alertType = ALERT_TYPES.get(marker.type);
    if (!alertType) {
      continue;
    }

    removeAlertMarker(firstElementChild, marker.markerLength);

    const alert = document.createElement("div");
    alert.className = `markdown-alert markdown-alert-${alertType.className}`;

    const title = document.createElement("p");
    title.className = "markdown-alert-title";
    title.textContent = alertType.title;
    alert.appendChild(title);

    const nodes = [...blockquote.childNodes];

    for (const node of nodes) {
      if (node === firstElementChild && trimEmptyParagraph(firstElementChild)) {
        continue;
      }

      alert.appendChild(node);
    }

    blockquote.replaceWith(alert);
  }
}

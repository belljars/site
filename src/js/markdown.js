const { escapeHtml } = require("./utils");

function slugifyHeading(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[`~!@#$%^&*()+=<>{}[\]\\|:;"',.?/]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function findClosingParen(text, startIndex) {
  let depth = 0;

  for (let i = startIndex; i < text.length; i += 1) {
    const char = text[i];
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

function replaceMarkdownLinks(text) {
  let output = "";
  let index = 0;

  while (index < text.length) {
    const labelStart = text.indexOf("[", index);
    if (labelStart === -1) {
      output += text.slice(index);
      break;
    }

    const imageStart = labelStart > 0 && text[labelStart - 1] === "!";
    const tokenStart = imageStart ? labelStart - 1 : labelStart;
    const labelEnd = text.indexOf("]", labelStart + 1);
    if (labelEnd === -1 || text[labelEnd + 1] !== "(") {
      output += text.slice(index, labelStart + 1);
      index = labelStart + 1;
      continue;
    }

    const urlStart = labelEnd + 1;
    const urlEnd = findClosingParen(text, urlStart);
    if (urlEnd === -1) {
      output += text.slice(index, tokenStart + 1);
      index = tokenStart + 1;
      continue;
    }

    output += text.slice(index, tokenStart);
    const label = text.slice(labelStart + 1, labelEnd);
    const url = text.slice(urlStart + 1, urlEnd);
    if (imageStart) {
      output += `<img src="${escapeHtml(url)}" alt="${label}" />`;
    } else {
      output += `<a href="${escapeHtml(url)}">${label}</a>`;
    }
    index = urlEnd + 1;
  }

  return output;
}

function inlineParse(text) {
  if (!text) {
    return "";
  }

  const codeSpans = [];
  let output = text.replace(/`([^`]+)`/g, (_, code) => {
    const token = `@@CODESPAN_${codeSpans.length}@@`;
    codeSpans.push(code);
    return token;
  });

  output = escapeHtml(output);
  output = replaceMarkdownLinks(output);
  output = output.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/~~(.+?)~~/g, "<del>$1</del>");
  output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  output = output.replace(
    /&lt;(https?:\/\/[^<\s]+)&gt;/g,
    '<a href="$1">$1</a>'
  );
  output = output.replace(/@@CODESPAN_(\d+)@@/g, (_, index) => {
    const code = codeSpans[Number(index)] || "";
    return `<code>${escapeHtml(code)}</code>`;
  });

  return output;
}

function getIndentLevel(line) {
  return line.match(/^\s*/)[0].replace(/\t/g, "  ").length;
}

function parseTableRow(line) {
  const trimmed = line.trim();
  const rawCells = trimmed
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|");
  return rawCells.map((cell) => cell.trim());
}

function isTableDivider(line) {
  const cells = parseTableRow(line);
  if (!cells.length) {
    return false;
  }
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function getTableAlignment(cell) {
  if (cell.startsWith(":") && cell.endsWith(":")) {
    return "center";
  }
  if (cell.endsWith(":")) {
    return "right";
  }
  if (cell.startsWith(":")) {
    return "left";
  }
  return "";
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let inCodeBlock = false;
  let codeLanguage = "";
  let inBlockquote = false;
  let paragraph = [];
  const listStack = [];
  const headingCounts = new Map();

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inlineParse(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  const closeListItem = () => {
    const currentList = listStack[listStack.length - 1];
    if (currentList && currentList.hasOpenItem) {
      html.push("</li>");
      currentList.hasOpenItem = false;
    }
  };

  const closeList = () => {
    closeListItem();
    const currentList = listStack.pop();
    if (currentList) {
      html.push(`</${currentList.type}>`);
    }
  };

  const closeListsToIndent = (indent) => {
    while (listStack.length && listStack[listStack.length - 1].indent > indent) {
      closeList();
    }
  };

  const closeAllLists = () => {
    while (listStack.length) {
      closeList();
    }
  };

  const closeBlockquote = () => {
    if (inBlockquote) {
      html.push("</blockquote>");
      inBlockquote = false;
    }
  };

  const openList = (type, indent) => {
    html.push(`<${type}>`);
    listStack.push({ type, indent, hasOpenItem: false });
  };

  const renderListItem = (itemText) => {
    const taskMatch = itemText.match(/^\[( |x|X)\]\s+(.+)$/);
    if (!taskMatch) {
      return { className: "", content: inlineParse(itemText) };
    }

    const isChecked = taskMatch[1].toLowerCase() === "x";
    const checkbox = `<input type="checkbox" disabled${
      isChecked ? " checked" : ""
    } />`;
    return {
      className: ' class="task-list-item"',
      content: `${checkbox} ${inlineParse(taskMatch[2])}`,
    };
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const trimmed = line.trim();

    if (inCodeBlock) {
      if (trimmed.startsWith("```")) {
        html.push("</code></pre>");
        inCodeBlock = false;
        codeLanguage = "";
      } else {
        html.push(`${escapeHtml(line)}`);
      }
      continue;
    }

    if (trimmed.startsWith("```")) {
      flushParagraph();
      closeAllLists();
      closeBlockquote();
      codeLanguage = trimmed.slice(3).trim();
      const className = codeLanguage
        ? ` class="language-${escapeHtml(codeLanguage)}"`
        : "";
      html.push(`<pre><code${className}>`);
      inCodeBlock = true;
      continue;
    }

    if (inBlockquote && !trimmed.startsWith(">")) {
      closeBlockquote();
    }

    if (trimmed === "") {
      flushParagraph();
      closeAllLists();
      closeBlockquote();
      continue;
    }

    if (/^---\s*$/.test(trimmed)) {
      flushParagraph();
      closeAllLists();
      closeBlockquote();
      html.push("<hr />");
      continue;
    }

    if (
      trimmed.includes("|") &&
      lineIndex + 1 < lines.length &&
      isTableDivider(lines[lineIndex + 1])
    ) {
      flushParagraph();
      closeAllLists();
      closeBlockquote();

      const headers = parseTableRow(line);
      const alignments = parseTableRow(lines[lineIndex + 1]).map(getTableAlignment);
      html.push("<table>");
      html.push("<thead><tr>");
      for (let index = 0; index < headers.length; index += 1) {
        const alignment = alignments[index] ? ` style="text-align: ${alignments[index]}"` : "";
        html.push(`<th${alignment}>${inlineParse(headers[index])}</th>`);
      }
      html.push("</tr></thead>");
      html.push("<tbody>");

      lineIndex += 2;
      while (lineIndex < lines.length) {
        const rowLine = lines[lineIndex];
        if (!rowLine.trim() || !rowLine.includes("|")) {
          lineIndex -= 1;
          break;
        }
        const cells = parseTableRow(rowLine);
        html.push("<tr>");
        for (let index = 0; index < headers.length; index += 1) {
          const alignment = alignments[index]
            ? ` style="text-align: ${alignments[index]}"`
            : "";
          html.push(
            `<td${alignment}>${inlineParse(cells[index] || "")}</td>`
          );
        }
        html.push("</tr>");
        lineIndex += 1;
      }

      html.push("</tbody>");
      html.push("</table>");
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      closeAllLists();
      closeBlockquote();
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      const baseSlug = slugifyHeading(headingText) || "section";
      const duplicateCount = headingCounts.get(baseSlug) || 0;
      headingCounts.set(baseSlug, duplicateCount + 1);
      const headingId =
        duplicateCount === 0 ? baseSlug : `${baseSlug}-${duplicateCount + 1}`;
      html.push(
        `<h${level} id="${headingId}">${inlineParse(headingText)}</h${level}>`
      );
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph();
      closeAllLists();
      if (!inBlockquote) {
        html.push("<blockquote>");
        inBlockquote = true;
      }
      const quoteText = trimmed.replace(/^>\s?/, "");
      html.push(`<p>${inlineParse(quoteText)}</p>`);
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (unorderedMatch || orderedMatch) {
      flushParagraph();
      closeBlockquote();
      const indent = getIndentLevel(line);
      const nextType = unorderedMatch ? "ul" : "ol";
      const itemText = unorderedMatch ? unorderedMatch[1] : orderedMatch[1];

      closeListsToIndent(indent);

      const currentList = listStack[listStack.length - 1];
      if (!currentList || indent > currentList.indent) {
        openList(nextType, indent);
      } else if (currentList.type !== nextType) {
        closeList();
        openList(nextType, indent);
      } else if (currentList.hasOpenItem) {
        closeListItem();
      }

      const activeList = listStack[listStack.length - 1];
      const renderedItem = renderListItem(itemText);
      html.push(`<li${renderedItem.className}>${renderedItem.content}`);
      activeList.hasOpenItem = true;
      continue;
    }

    if (listStack.length) {
      closeAllLists();
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  closeAllLists();
  closeBlockquote();
  if (inCodeBlock) {
    html.push("</code></pre>");
  }

  return html.join("\n");
}

module.exports = {
  markdownToHtml,
};

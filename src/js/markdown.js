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

function protectPatterns(text, pattern, tokenPrefix, values) {
  return text.replace(pattern, (match) => {
    const token = `@@${tokenPrefix}_${values.length}@@`;
    values.push(match);
    return token;
  });
}

function restoreProtectedTokens(text, tokenPrefix, values) {
  return text.replace(new RegExp(`@@${tokenPrefix}_(\\d+)@@`, "g"), (_, index) => {
    return values[Number(index)] || "";
  });
}

function applyDelimitedFormatting(text, delimiter, tagName) {
  const escapedDelimiter = delimiter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(^|[^A-Za-z0-9])${escapedDelimiter}([^${escapedDelimiter}\\s](?:.*?[^${escapedDelimiter}\\s])?)${escapedDelimiter}(?![A-Za-z0-9])`,
    "g"
  );

  return text.replace(pattern, (_, prefix, content) => {
    return `${prefix}<${tagName}>${content}</${tagName}>`;
  });
}

function autolinkBareUrls(text) {
  return text.replace(/(^|[\s(>])((https?:\/\/)[^\s<]+)/g, (match, prefix, url) => {
    const trailingMatch = url.match(/[),.!?;:]+$/);
    const trailing = trailingMatch ? trailingMatch[0] : "";
    const cleanUrl = trailing ? url.slice(0, -trailing.length) : url;
    return `${prefix}<a href="${cleanUrl}">${cleanUrl}</a>${trailing}`;
  });
}

function isRawHtmlLine(line) {
  return /^(?:<!--[\s\S]*-->|<\/?[A-Za-z][\w:-]*(?:\s[^>]*)?\s*\/?>|<([A-Za-z][\w:-]*)(?:\s[^>]*)?>.*<\/\1>)$/.test(
    line
  );
}

function getRawHtmlBlockOpenTag(line) {
  const match = line.match(/^<([A-Za-z][\w:-]*)(?:\s[^>]*)?>$/);
  if (!match || /\/>$/.test(line) || /^<\//.test(line)) {
    return "";
  }
  return match[1].toLowerCase();
}

function normalizeFootnoteId(id) {
  return id
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function collectFootnotes(markdown) {
  const lines = markdown.split(/\r?\n/);
  const contentLines = [];
  const footnotes = new Map();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^\[\^([^\]]+)\]:\s*(.*)$/);
    if (!match) {
      contentLines.push(line);
      continue;
    }

    const id = match[1].trim();
    const content = [match[2].trim()];

    while (index + 1 < lines.length) {
      const nextLine = lines[index + 1];
      if (/^( {2,}|\t+)/.test(nextLine)) {
        content.push(nextLine.trim());
        index += 1;
        continue;
      }
      break;
    }

    footnotes.set(id, content.join(" ").trim());
  }

  return {
    markdown: contentLines.join("\n"),
    footnotes,
  };
}

function inlineParse(text, context = null) {
  if (!text) {
    return "";
  }

  const codeSpans = [];
  const rawHtml = [];
  const htmlTags = [];
  const escapedChars = [];
  let output = text.replace(/`([^`]+)`/g, (_, code) => {
    const token = `@@CODESPAN_${codeSpans.length}@@`;
    codeSpans.push(code);
    return token;
  });

  output = protectPatterns(
    output,
    /<!--[\s\S]*?-->|<\/?[A-Za-z][\w:-]*(?:\s[^>]*)?>/g,
    "RAWHTML",
    rawHtml
  );
  output = output.replace(/\\([\\`*{}\[\]()#+\-.!_|~>])/g, (_, char) => {
    const token = `@@ESCAPED_${escapedChars.length}@@`;
    escapedChars.push(char);
    return token;
  });

  output = escapeHtml(output);
  output = replaceMarkdownLinks(output);
  output = output.replace(/\[\^([^\]]+)\]/g, (match, rawId) => {
    if (!context || !context.footnotes.has(rawId)) {
      return match;
    }

    const safeId = normalizeFootnoteId(rawId) || "note";
    if (!context.footnoteOrder.includes(rawId)) {
      context.footnoteOrder.push(rawId);
    }

    const referenceCount = (context.footnoteReferenceCounts.get(rawId) || 0) + 1;
    context.footnoteReferenceCounts.set(rawId, referenceCount);
    const referenceId =
      referenceCount === 1
        ? `fnref-${safeId}`
        : `fnref-${safeId}-${referenceCount}`;

    const footnoteNumber = context.footnoteOrder.indexOf(rawId) + 1;
    return (
      `<sup id="${referenceId}">` +
      `<a href="#fn-${safeId}" class="footnote-ref">[${footnoteNumber}]</a>` +
      "</sup>"
    );
  });
  output = protectPatterns(
    output,
    /<\/?[A-Za-z][\w:-]*(?:\s[^>]*)?>/g,
    "HTMLTAG",
    htmlTags
  );
  output = applyDelimitedFormatting(output, "**", "strong");
  output = applyDelimitedFormatting(output, "__", "strong");
  output = output.replace(/~~(.+?)~~/g, "<del>$1</del>");
  output = applyDelimitedFormatting(output, "*", "em");
  output = applyDelimitedFormatting(output, "_", "em");
  output = output.replace(
    /&lt;(https?:\/\/[^<\s]+)&gt;/g,
    '<a href="$1">$1</a>'
  );
  output = autolinkBareUrls(output);
  output = restoreProtectedTokens(output, "HTMLTAG", htmlTags);
  output = restoreProtectedTokens(output, "RAWHTML", rawHtml);
  output = output.replace(/@@CODESPAN_(\d+)@@/g, (_, index) => {
    const code = codeSpans[Number(index)] || "";
    return `<code>${escapeHtml(code)}</code>`;
  });
  output = output.replace(/@@ESCAPED_(\d+)@@/g, (_, index) => {
    const char = escapedChars[Number(index)] || "";
    return escapeHtml(char);
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
  const collected = collectFootnotes(markdown);
  const lines = collected.markdown.split(/\r?\n/);
  const html = [];
  let inCodeBlock = false;
  let codeLanguage = "";
  let inBlockquote = false;
  let rawHtmlBlockTag = "";
  let blockquoteParagraph = [];
  let paragraph = [];
  const listStack = [];
  const headingCounts = new Map();
  const inlineContext = {
    footnotes: collected.footnotes,
    footnoteOrder: [],
    footnoteReferenceCounts: new Map(),
  };

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inlineParse(paragraph.join(" "), inlineContext)}</p>`);
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

  const flushBlockquoteParagraph = () => {
    if (blockquoteParagraph.length) {
      html.push(
        `<p>${inlineParse(blockquoteParagraph.join(" "), inlineContext)}</p>`
      );
      blockquoteParagraph = [];
    }
  };

  const closeBlockquote = () => {
    if (inBlockquote) {
      flushBlockquoteParagraph();
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
      return { className: "", content: inlineParse(itemText, inlineContext) };
    }

    const isChecked = taskMatch[1].toLowerCase() === "x";
    const checkbox = `<input type="checkbox" disabled${
      isChecked ? " checked" : ""
    } />`;
    return {
      className: ' class="task-list-item"',
      content: `${checkbox} ${inlineParse(taskMatch[2], inlineContext)}`,
    };
  };

  const renderFootnotes = () => {
    if (!inlineContext.footnoteOrder.length) {
      return;
    }

    html.push('<section class="footnotes">');
    html.push("<hr />");
    html.push("<ol>");
    for (
      let index = 0;
      index < inlineContext.footnoteOrder.length;
      index += 1
    ) {
      const rawId = inlineContext.footnoteOrder[index];
      const safeId = normalizeFootnoteId(rawId) || "note";
      const content = inlineContext.footnotes.get(rawId) || "";
      html.push(
        `<li id="fn-${safeId}">` +
          `${inlineParse(content, inlineContext)} ` +
          `<a href="#fnref-${safeId}" class="footnote-backref">Back</a>` +
          "</li>"
      );
    }
    html.push("</ol>");
    html.push("</section>");
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

    if (rawHtmlBlockTag) {
      html.push(line);
      if (trimmed.toLowerCase() === `</${rawHtmlBlockTag}>`) {
        rawHtmlBlockTag = "";
      }
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

    const rawHtmlOpenTag = getRawHtmlBlockOpenTag(trimmed);
    if (rawHtmlOpenTag) {
      flushParagraph();
      closeAllLists();
      closeBlockquote();
      rawHtmlBlockTag = rawHtmlOpenTag;
      html.push(line);
      continue;
    }

    if (isRawHtmlLine(trimmed)) {
      flushParagraph();
      closeAllLists();
      closeBlockquote();
      html.push(line);
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
        const alignment = alignments[index]
          ? ` style="text-align: ${alignments[index]}"`
          : "";
        html.push(
          `<th${alignment}>${inlineParse(headers[index], inlineContext)}</th>`
        );
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
            `<td${alignment}>` +
              `${inlineParse(cells[index] || "", inlineContext)}` +
              "</td>"
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
        `<h${level} id="${headingId}">` +
          `${inlineParse(headingText, inlineContext)}` +
          `</h${level}>`
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
      if (quoteText.trim() === "") {
        flushBlockquoteParagraph();
      } else {
        blockquoteParagraph.push(quoteText.trim());
      }
      continue;
    }

    if (
      lineIndex + 1 < lines.length &&
      /^ {0,3}:\s+(.+)$/.test(lines[lineIndex + 1])
    ) {
      flushParagraph();
      closeAllLists();
      closeBlockquote();
      html.push("<dl>");
      html.push(`<dt>${inlineParse(trimmed, inlineContext)}</dt>`);
      while (
        lineIndex + 1 < lines.length &&
        /^ {0,3}:\s+(.+)$/.test(lines[lineIndex + 1])
      ) {
        lineIndex += 1;
        const definition = lines[lineIndex].replace(/^ {0,3}:\s+/, "");
        html.push(`<dd>${inlineParse(definition, inlineContext)}</dd>`);
      }
      html.push("</dl>");
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
  renderFootnotes();

  return html.join("\n");
}

module.exports = {
  markdownToHtml,
};

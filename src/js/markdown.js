const { escapeHtml } = require("./utils");

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
  output = output.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" />`;
  });
  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    return `<a href="${escapeHtml(url)}">${label}</a>`;
  });
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  output = output.replace(/@@CODESPAN_(\d+)@@/g, (_, index) => {
    const code = codeSpans[Number(index)] || "";
    return `<code>${escapeHtml(code)}</code>`;
  });

  return output;
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let inCodeBlock = false;
  let codeLanguage = "";
  let listType = null;
  let inBlockquote = false;
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inlineParse(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  const closeBlockquote = () => {
    if (inBlockquote) {
      html.push("</blockquote>");
      inBlockquote = false;
    }
  };

  for (const line of lines) {
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
      closeList();
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
      closeList();
      closeBlockquote();
      continue;
    }

    if (/^---\s*$/.test(trimmed)) {
      flushParagraph();
      closeList();
      closeBlockquote();
      html.push("<hr />");
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      closeBlockquote();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${inlineParse(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph();
      closeList();
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
      const nextType = unorderedMatch ? "ul" : "ol";
      const itemText = unorderedMatch ? unorderedMatch[1] : orderedMatch[1];
      if (listType !== nextType) {
        closeList();
        html.push(`<${nextType}>`);
        listType = nextType;
      }
      html.push(`<li>${inlineParse(itemText)}</li>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();
  closeBlockquote();
  if (inCodeBlock) {
    html.push("</code></pre>");
  }

  return html.join("\n");
}

module.exports = {
  markdownToHtml,
};

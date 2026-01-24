const fs = require("fs/promises");
const path = require("path");

const config = {
  siteTitle: "My Site",
  contentDir: path.join(__dirname, "content"),
  outputDir: path.join(__dirname, "output"),
  assetsDir: path.join(__dirname, "output", "assets"),
  indexName: "index",
};

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function findMarkdownFiles(dir) {
  let results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(await findMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) {
    return { frontmatter: {}, body: raw };
  }

  const lines = raw.split(/\r?\n/);
  if (lines.length < 3 || lines[0].trim() !== "---") {
    return { frontmatter: {}, body: raw };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) {
    return { frontmatter: {}, body: raw };
  }

  const frontmatter = {};
  for (let i = 1; i < endIndex; i += 1) {
    const line = lines[i];
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value.startsWith("[") && value.endsWith("]")) {
      const list = value
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      frontmatter[key] = list;
    } else if (key === "tags" && value.includes(",")) {
      frontmatter[key] = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (value !== "") {
      frontmatter[key] = value;
    }
  }

  const body = lines.slice(endIndex + 1).join("\n");
  return { frontmatter, body };
}

function extractTitle(body, frontmatter, filePath) {
  if (frontmatter.title) {
    return frontmatter.title;
  }
  const headingMatch = body.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }
  const baseName = path.basename(filePath, path.extname(filePath));
  return baseName.replace(/[-_]+/g, " ").trim();
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

function extractWikiLinks(markdown) {
  const links = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let match = null;
  while ((match = regex.exec(markdown)) !== null) {
    const [target, label] = match[1].split("|");
    links.push({
      target: (target || "").trim(),
      label: (label || "").trim(),
    });
  }
  return links;
}

function buildNavTree(fileIndex) {
  const root = { name: "", type: "dir", children: [] };

  const getOrCreateDir = (parent, name) => {
    let node = parent.children.find(
      (child) => child.type === "dir" && child.name === name
    );
    if (!node) {
      node = { name, type: "dir", children: [] };
      parent.children.push(node);
    }
    return node;
  };

  for (const file of fileIndex.values()) {
    const segments = file.relPathNoExt.split("/");
    let current = root;
    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      const isLast = i === segments.length - 1;
      if (isLast) {
        current.children.push({
          name: segment,
          type: "file",
          slug: file.slugLower,
        });
      } else {
        current = getOrCreateDir(current, segment);
      }
    }
  }

  const sortChildren = (node) => {
    node.children.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "dir" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    node.children.forEach((child) => {
      if (child.type === "dir") {
        sortChildren(child);
      }
    });
  };

  sortChildren(root);
  return root;
}

function relativeLink(fromPath, toPath) {
  const rel = path.relative(path.dirname(fromPath), toPath);
  if (!rel) {
    return path.basename(toPath);
  }
  return toPosixPath(rel);
}

function buildNavHtml(tree, currentFile, fileIndex) {
  const renderNode = (node) => {
    if (node.type === "dir") {
      const children = node.children.map(renderNode).join("");
      return `<li class="nav-dir"><span>${escapeHtml(
        node.name
      )}</span><ul>${children}</ul></li>`;
    }

    const target = fileIndex.get(node.slug);
    if (!target) {
      return "";
    }
    const href = relativeLink(currentFile.outPath, target.outPath);
    const isActive = node.slug === currentFile.slugLower;
    const className = isActive ? ' class="active"' : "";
    return `<li class="nav-file"><a href="${href}"${className}>${escapeHtml(
      target.title
    )}</a></li>`;
  };

  return `<ul class="nav-tree">${tree.children.map(renderNode).join("")}</ul>`;
}

function resolveWikiTarget(target, fileIndex, nameIndex) {
  const cleaned = target.replace(/\.md$/i, "").trim();
  if (!cleaned) {
    return null;
  }
  const posixTarget = toPosixPath(cleaned);
  const slugLower = posixTarget.toLowerCase();

  if (fileIndex.has(slugLower)) {
    return fileIndex.get(slugLower);
  }

  if (!posixTarget.includes("/")) {
    const candidates = nameIndex.get(slugLower);
    if (candidates && candidates.length) {
      return fileIndex.get(candidates[0]) || null;
    }
  }

  return null;
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function renderMarkdownWithWikiLinks(markdown, currentFile, fileIndex, nameIndex) {
  const placeholders = [];
  let tokenCounter = 0;
  const replaced = markdown.replace(/\[\[([^\]]+)\]\]/g, (_, inner) => {
    const [target, label] = inner.split("|");
    const token = `@@WIKILINK_${tokenCounter}@@`;
    placeholders.push({
      token,
      target: (target || "").trim(),
      label: (label || "").trim(),
    });
    tokenCounter += 1;
    return token;
  });

  let html = markdownToHtml(replaced);
  for (const placeholder of placeholders) {
    const resolved = resolveWikiTarget(
      placeholder.target,
      fileIndex,
      nameIndex
    );
    const linkText = placeholder.label || placeholder.target;
    if (!resolved) {
      html = html.replace(
        placeholder.token,
        `<span class="broken-link">${escapeHtml(linkText)}</span>`
      );
      continue;
    }
    const href = relativeLink(currentFile.outPath, resolved.outPath);
    html = html.replace(
      placeholder.token,
      `<a href="${href}">${escapeHtml(linkText)}</a>`
    );
  }

  return html;
}

function buildSearchIndex(pages) {
  return pages.map((page) => ({
    slug: page.slugLower,
    title: page.title,
    url: toPosixPath(path.relative(config.outputDir, page.outPath)),
    preview: page.preview,
    tags: page.frontmatter.tags || [],
  }));
}

function templateHtml({
  title,
  nav,
  content,
  backlinks,
  styleHref,
  scriptHref,
  searchIndexHref,
  siteRoot,
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} | ${escapeHtml(config.siteTitle)}</title>
  <link rel="stylesheet" href="${styleHref}" />
</head>
<body>
  <header class="site-header">
    <div class="site-title">${escapeHtml(config.siteTitle)}</div>
    <button class="search-trigger" type="button" aria-label="Open search">
      Search
    </button>
  </header>
  <div class="layout">
    <nav class="sidebar">
      ${nav}
    </nav>
    <main class="content">
      <article>
        ${content}
      </article>
      ${
        backlinks
          ? `<aside class="backlinks">
        <h3>Linked References</h3>
        ${backlinks}
      </aside>`
          : ""
      }
    </main>
  </div>
  <div class="search-modal" hidden>
    <div class="search-panel">
      <input type="search" placeholder="Search..." />
      <ul class="search-results"></ul>
    </div>
  </div>
  <script src="${scriptHref}" data-search-index="${searchIndexHref}" data-site-root="${siteRoot}"></script>
</body>
</html>`;
}

async function writeAssets() {
  const css = `:root {
  --bg: #f4f1ec;
  --fg: #22201d;
  --muted: #6d645d;
  --accent: #bb5a2b;
  --border: #ded6cb;
  --sidebar: #f8f6f2;
  --code-bg: #efe8df;
  --shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: "Source Serif 4", "Georgia", serif;
  color: var(--fg);
  background: linear-gradient(160deg, #f7f3ed 0%, #f1ebe1 100%);
  min-height: 100vh;
}

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--border);
  background: rgba(248, 246, 242, 0.9);
  position: sticky;
  top: 0;
  z-index: 10;
}

.site-title {
  font-size: 1.4rem;
  letter-spacing: 0.02em;
}

.search-trigger {
  border: 1px solid var(--border);
  background: white;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  font-size: 0.9rem;
  cursor: pointer;
}

.layout {
  display: grid;
  grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
  gap: 2rem;
  padding: 2rem;
}

.sidebar {
  background: var(--sidebar);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 1.5rem;
  max-height: calc(100vh - 8rem);
  overflow: auto;
  box-shadow: var(--shadow);
}

.nav-tree {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.75rem;
}

.nav-dir > span {
  font-weight: 600;
  color: var(--muted);
}

.nav-dir ul {
  list-style: none;
  padding-left: 1rem;
  margin: 0.5rem 0 0;
  display: grid;
  gap: 0.35rem;
}

.nav-file a {
  color: inherit;
  text-decoration: none;
}

.nav-file a.active {
  color: var(--accent);
  font-weight: 600;
}

.content {
  max-width: 860px;
}

article {
  background: white;
  border-radius: 22px;
  padding: 2rem;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

article h1,
article h2,
article h3,
article h4 {
  margin-top: 2rem;
}

pre {
  background: var(--code-bg);
  padding: 1rem;
  border-radius: 12px;
  overflow: auto;
}

code {
  background: var(--code-bg);
  padding: 0.15rem 0.35rem;
  border-radius: 6px;
}

a {
  color: var(--accent);
}

.broken-link {
  color: #b73c3c;
  text-decoration: underline dotted;
}

.backlinks {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  color: var(--muted);
}

.backlinks ul {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0;
  display: grid;
  gap: 0.35rem;
}

.search-modal {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: start center;
  padding-top: 10vh;
  background: rgba(27, 24, 20, 0.4);
  backdrop-filter: blur(6px);
}

.search-panel {
  width: min(640px, 90vw);
  background: white;
  border-radius: 20px;
  padding: 1.5rem;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.search-panel input {
  width: 100%;
  padding: 0.65rem 0.8rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  font-size: 1rem;
}

.search-results {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: grid;
  gap: 0.75rem;
}

.search-results li {
  padding: 0.6rem 0.8rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  cursor: pointer;
}

.search-results li strong {
  display: block;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    max-height: none;
  }
}
`;

  const js = `(() => {
  const modal = document.querySelector(".search-modal");
  const input = modal ? modal.querySelector("input") : null;
  const resultsList = modal ? modal.querySelector(".search-results") : null;
  const trigger = document.querySelector(".search-trigger");
  const script =
    document.currentScript || document.querySelector("script[data-search-index]");
  const indexUrl = script?.dataset?.searchIndex || "assets/search-index.json";
  const siteRoot = script?.dataset?.siteRoot || ".";

  const state = {
    index: [],
    open: false,
  };

  const toggleModal = (nextOpen) => {
    if (!modal) return;
    state.open = nextOpen;
    modal.hidden = !nextOpen;
    if (nextOpen && input) {
      input.value = "";
      input.focus();
      renderResults([]);
    }
  };

  const buildUrl = (item) => {
    const base = siteRoot === "." ? "" : siteRoot.replace(/\/$/, "");
    return base ? base + "/" + item.url : item.url;
  };

  const renderResults = (items) => {
    if (!resultsList) return;
    resultsList.innerHTML = "";
    items.forEach((item) => {
      const li = document.createElement("li");
      li.tabIndex = 0;
      li.innerHTML = "<strong>" + item.title + "</strong><span>" + item.preview + "</span>";
      li.addEventListener("click", () => {
        window.location.href = buildUrl(item);
      });
      resultsList.appendChild(li);
    });
  };

  const searchIndex = (query) => {
    if (!query) return [];
    const normalized = query.toLowerCase();
    return state.index
      .map((item) => {
        let score = 0;
        if (item.title.toLowerCase().includes(normalized)) {
          score += 2;
        }
        if (item.preview.toLowerCase().includes(normalized)) {
          score += 1;
        }
        return { ...item, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  };

  const handleKeydown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      toggleModal(!state.open);
    } else if (event.key === "Escape" && state.open) {
      toggleModal(false);
    }
  };

  if (trigger) {
    trigger.addEventListener("click", () => toggleModal(true));
  }
  document.addEventListener("keydown", handleKeydown);

  if (input) {
    input.addEventListener("input", () => {
      const results = searchIndex(input.value.trim());
      renderResults(results);
    });
  }

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        toggleModal(false);
      }
    });
  }

  fetch(indexUrl)
    .then((response) => response.json())
    .then((data) => {
      state.index = Array.isArray(data) ? data : [];
    })
    .catch(() => {
      state.index = [];
    });
})();`;

  await fs.writeFile(path.join(config.assetsDir, "style.css"), css, "utf8");
  await fs.writeFile(path.join(config.assetsDir, "script.js"), js, "utf8");
}

async function main() {
  await fs.rm(config.outputDir, { recursive: true, force: true });
  await fs.mkdir(config.assetsDir, { recursive: true });

  let markdownFiles = [];
  try {
    markdownFiles = await findMarkdownFiles(config.contentDir);
  } catch (error) {
    console.error("Failed to read content directory:", error.message);
    return;
  }

  const fileIndex = new Map();
  const nameIndex = new Map();

  for (const filePath of markdownFiles) {
    const raw = await fs.readFile(filePath, "utf8");
    const { frontmatter, body } = parseFrontmatter(raw);
    const relPath = toPosixPath(
      path.relative(config.contentDir, filePath)
    ).replace(/\.md$/i, "");
    const slugLower = relPath.toLowerCase();
    const title = extractTitle(body, frontmatter, filePath);
    const outPath = path.join(config.outputDir, relPath + ".html");
    const baseLower = path.basename(relPath).toLowerCase();

    const entry = {
      absPath: filePath,
      relPathNoExt: relPath,
      slugLower,
      baseLower,
      title,
      frontmatter,
      body,
      outPath,
    };

    fileIndex.set(slugLower, entry);
    if (!nameIndex.has(baseLower)) {
      nameIndex.set(baseLower, []);
    }
    nameIndex.get(baseLower).push(slugLower);
  }

  const backlinks = new Map();
  const brokenLinks = [];

  for (const file of fileIndex.values()) {
    const wikiLinks = extractWikiLinks(file.body);
    for (const link of wikiLinks) {
      const resolved = resolveWikiTarget(link.target, fileIndex, nameIndex);
      if (!resolved) {
        brokenLinks.push({ from: file.slugLower, target: link.target });
        continue;
      }
      if (!backlinks.has(resolved.slugLower)) {
        backlinks.set(resolved.slugLower, new Set());
      }
      backlinks.get(resolved.slugLower).add(file.slugLower);
    }
  }

  const navTree = buildNavTree(fileIndex);
  const pages = [];

  for (const file of fileIndex.values()) {
    const styleHref = relativeLink(
      file.outPath,
      path.join(config.assetsDir, "style.css")
    );
    const scriptHref = relativeLink(
      file.outPath,
      path.join(config.assetsDir, "script.js")
    );
    const searchIndexHref = relativeLink(
      file.outPath,
      path.join(config.assetsDir, "search-index.json")
    );
    const siteRoot = toPosixPath(
      path.relative(path.dirname(file.outPath), config.outputDir) || "."
    );
    const navHtml = buildNavHtml(navTree, file, fileIndex);
    const contentHtml = renderMarkdownWithWikiLinks(
      file.body,
      file,
      fileIndex,
      nameIndex
    );
    const preview = stripHtml(contentHtml).slice(0, 160);

    const incoming = backlinks.get(file.slugLower) || new Set();
    let backlinksHtml = "";
    if (incoming.size) {
      backlinksHtml =
        "<ul>" +
        Array.from(incoming)
          .map((slug) => {
            const source = fileIndex.get(slug);
            if (!source) {
              return "";
            }
            const href = relativeLink(file.outPath, source.outPath);
            return `<li><a href="${href}">${escapeHtml(
              source.title
            )}</a></li>`;
          })
          .join("") +
        "</ul>";
    }

    const pageHtml = templateHtml({
      title: file.title,
      nav: navHtml,
      content: contentHtml,
      backlinks: backlinksHtml || null,
      styleHref,
      scriptHref,
      searchIndexHref,
      siteRoot,
    });

    await fs.mkdir(path.dirname(file.outPath), { recursive: true });
    await fs.writeFile(file.outPath, pageHtml, "utf8");

    pages.push({
      slugLower: file.slugLower,
      title: file.title,
      outPath: file.outPath,
      preview,
      frontmatter: file.frontmatter,
    });
  }

  const searchIndex = buildSearchIndex(pages);
  await fs.writeFile(
    path.join(config.assetsDir, "search-index.json"),
    JSON.stringify(searchIndex, null, 2),
    "utf8"
  );

  await writeAssets();

  console.log(`Generated ${pages.length} page(s).`);
  if (brokenLinks.length) {
    console.log("Broken wiki-links:");
    brokenLinks.forEach((link) => {
      console.log(`- ${link.from} -> ${link.target}`);
    });
  }
}

main().catch((error) => {
  console.error("Build failed:", error);
  process.exitCode = 1;
});

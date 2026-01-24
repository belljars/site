const fs = require("fs/promises");
const path = require("path");
const config = require("./config");
const { findMarkdownFiles } = require("./files");
const { parseFrontmatter, extractTitle } = require("./frontmatter");
const { markdownToHtml } = require("./markdown");
const { buildNavTree, buildNavHtml } = require("./nav");
const { templateHtml } = require("./template");
const { writeAssets } = require("./assets");
const { toPosixPath, relativeLink } = require("./utils");

async function main() {
  let siteTitle = config.siteTitle;
  let footerHtml = "";
  try {
    const metaRaw = await fs.readFile(
      path.join(config.rootDir, "meta.json"),
      "utf8"
    );
    const meta = JSON.parse(metaRaw);
    const context = Array.isArray(meta.context) ? meta.context[0] : null;
    if (context && typeof context === "object") {
      if (typeof context.name === "string" && context.name.trim()) {
        siteTitle = context.name.trim();
      }
      if (typeof context.footer_html === "string") {
        footerHtml = context.footer_html;
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

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
  for (const filePath of markdownFiles) {
    const raw = await fs.readFile(filePath, "utf8");
    const { frontmatter, body } = parseFrontmatter(raw);
    const relPath = toPosixPath(
      path.relative(config.contentDir, filePath)
    ).replace(/\.md$/i, "");
    const slugLower = relPath.toLowerCase();
    const title = extractTitle(body, frontmatter, filePath);
    const outPath = path.join(config.outputDir, relPath + ".html");
    const entry = {
      absPath: filePath,
      relPathNoExt: relPath,
      slugLower,
      title,
      frontmatter,
      body,
      outPath,
    };

    fileIndex.set(slugLower, entry);
  }

  const navTree = buildNavTree(fileIndex);

  for (const file of fileIndex.values()) {
    const styleHref = relativeLink(
      file.outPath,
      path.join(config.assetsDir, "style.css")
    );
    const navHtml = buildNavHtml(navTree, file, fileIndex);
    const contentHtml = markdownToHtml(file.body);

    const pageHtml = templateHtml({
      title: file.title,
      nav: navHtml,
      content: contentHtml,
      backlinks: null,
      styleHref,
      siteTitle,
      footerHtml,
    });

    await fs.mkdir(path.dirname(file.outPath), { recursive: true });
    await fs.writeFile(file.outPath, pageHtml, "utf8");

  }

  await writeAssets();

  console.log(`Generated ${fileIndex.size} page(s).`);
}

module.exports = {
  main,
};

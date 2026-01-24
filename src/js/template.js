const { escapeHtml } = require("./utils");

function templateHtml({
  title,
  nav,
  content,
  backlinks,
  styleHref,
  siteTitle,
  footerHtml,
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} | ${escapeHtml(siteTitle)}</title>
  <link rel="stylesheet" href="${styleHref}" />
</head>
<body>
  <header class="site-header">
    <div class="site-title">${escapeHtml(siteTitle)}</div>
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
  ${footerHtml || ""}
</body>
</html>`;
}

module.exports = {
  templateHtml,
};

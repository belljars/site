const { escapeHtml } = require("./utils");
const config = require("./config");

function templateHtml({ title, nav, content, backlinks, styleHref }) {
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
</body>
</html>`;
}

module.exports = {
  templateHtml,
};

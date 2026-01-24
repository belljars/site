const path = require("path");

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function relativeLink(fromPath, toPath) {
  const rel = path.relative(path.dirname(fromPath), toPath);
  if (!rel) {
    return path.basename(toPath);
  }
  return toPosixPath(rel);
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

module.exports = {
  toPosixPath,
  escapeHtml,
  relativeLink,
  stripHtml,
};

const path = require("path");

const rootDir = path.join(__dirname, "..", "..");

module.exports = {
  rootDir,
  siteTitle: "My Site",
  contentDir: path.join(rootDir, "content"),
  outputDir: path.join(rootDir, "output"),
  assetsDir: path.join(rootDir, "output", "assets"),
  fontDir: path.join(rootDir, "src", "font"),
  indexName: "index",
};

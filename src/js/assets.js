const fs = require("fs/promises");
const path = require("path");
const config = require("./config");

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function writeAssets() {
  const cssPath = path.join(config.rootDir, "src", "css", "base.css");
  const css = await fs.readFile(cssPath, "utf8");

  await fs.writeFile(path.join(config.assetsDir, "style.css"), css, "utf8");

  try {
    await fs.access(config.fontDir);
    const outputFontDir = path.join(config.outputDir, "font");
    await copyDir(config.fontDir, outputFontDir);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

module.exports = {
  writeAssets,
};

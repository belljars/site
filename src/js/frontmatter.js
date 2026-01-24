const path = require("path");

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

module.exports = {
  parseFrontmatter,
  extractTitle,
};

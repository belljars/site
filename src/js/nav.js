const { escapeHtml, relativeLink } = require("./utils");

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
      if (node === root) {
        const aIsHome = a.type === "file" && a.slug === "index";
        const bIsHome = b.type === "file" && b.slug === "index";
        if (aIsHome !== bIsHome) {
          return aIsHome ? -1 : 1;
        }
      }
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

function buildNavHtml(tree, currentFile, fileIndex) {
  const hasActiveDescendant = (node, activeSlug) => {
    if (node.type === "file") {
      return node.slug === activeSlug;
    }
    return node.children.some((child) => hasActiveDescendant(child, activeSlug));
  };

  const renderNode = (node) => {
    if (node.type === "dir") {
      const children = node.children.map(renderNode).join("");
      const isOpen = hasActiveDescendant(node, currentFile.slugLower);
      return `<li class="nav-dir"><details${
        isOpen ? " open" : ""
      }><summary>${escapeHtml(node.name)}</summary><ul>${children}</ul></details></li>`;
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

module.exports = {
  buildNavTree,
  buildNavHtml,
};

# Static Site Generator Plan

## Core Concept
A simple static site generator that converts a directory of Markdown files into a linked website, mimicking Obsidian's wiki-link structure. Pure HTML/CSS/vanilla JS output.

## Directory Structure

```
site/
├── content/           # Source markdown files
│   ├── index.md
│   ├── notes/
│   │   ├── note1.md
│   │   └── note2.md
│   └── projects/
│       └── project1.md
├── output/            # Generated static site
│   ├── index.html
│   ├── notes/
│   │   ├── note1.html
│   │   └── note2.html
│   ├── projects/
│   │   └── project1.html
│   └── assets/
│       ├── style.css
│       └── search.js
└── generator.js       # Build script
```

## Markdown Features

### Supported Syntax
- Headers (`#`, `##`, etc.)
- Bold/italic (`**bold**`, `*italic*`)
- Links (`[text](url)`)
- Wiki-links (`[[note-name]]` or `[[note-name|display text]]`)
- Lists (ordered and unordered)
- Code blocks (` ``` `)
- Inline code (`` `code` ``)
- Images (`![alt](path)`)
- Blockquotes (`>`)
- Horizontal rules (`---`)

### Wiki-Link Resolution
- `[[note-name]]` automatically finds `note-name.md` anywhere in content/
- Converts to relative HTML links
- Creates backlinks automatically
- Handles nested directories

## Generator Script (Node.js)

### Main Functions

**1. File Discovery**
- Recursively scan `content/` directory
- Build file index with paths and titles
- Extract frontmatter (optional YAML at top of files)

**2. Markdown Parsing**
- Convert markdown to HTML (use a lightweight library like `marked`)
- Parse wiki-links before markdown conversion
- Resolve wiki-links to relative paths
- Generate slug from filename

**3. Link Processing**
- Find all wiki-links in content
- Build backlink index (which pages link to which)
- Replace wiki-links with proper relative HTML links
- Handle broken links gracefully (show as plain text with class)

**4. HTML Generation**
- Wrap parsed content in HTML template
- Add navigation sidebar (directory tree)
- Add backlinks section at bottom
- Include metadata (title, date modified)

**5. Asset Generation**
- Copy CSS file to output/assets/
- Generate search index JSON
- Copy search.js to output/assets/

## HTML Template Structure

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{page-title}</title>
    <link rel="stylesheet" href="/assets/style.css">
</head>
<body>
    <nav class="sidebar">
        <!-- Directory tree navigation -->
    </nav>
    
    <main class="content">
        <article>
            <!-- Parsed markdown content -->
        </article>
        
        <aside class="backlinks">
            <h3>Linked References</h3>
            <!-- List of pages linking here -->
        </aside>
    </main>
    
    <script src="/assets/search.js"></script>
</body>
</html>
```

## CSS Features

- Responsive layout (sidebar collapses on mobile)
- Typography optimized for reading
- Syntax highlighting for code blocks
- Hover states for links
- Dark/light theme toggle (CSS variables)
- Print-friendly styles

## Vanilla JavaScript Features

### search.js
- Client-side search using generated index
- Filter pages by title and content
- Keyboard shortcuts (Ctrl+K for search)
- No external dependencies

### Features:
- Search modal toggle
- Fuzzy matching
- Highlight search terms
- Navigate results with arrow keys

## Build Process

```bash
node generator.js
```

**Steps:**
1. Clean output directory
2. Scan content directory
3. Parse all markdown files
4. Build link graph
5. Generate HTML for each file
6. Create navigation structure
7. Generate search index
8. Copy static assets
9. Report broken links


## Key Advantages

- **No build server needed** - just open HTML files
- **Fast** - vanilla JS loads instantly
- **Portable** - works offline, no dependencies at runtime
- **Familiar** - Obsidian users can use same linking syntax
- **Simple** - easy to understand and modify
- **Hostable anywhere** - works on any static host (GitHub Pages, Netlify, etc.)

## Implementation Priority

1. Basic markdown → HTML conversion
2. Wiki-link parsing and resolution
3. Directory tree navigation
4. Backlinks generation
5. Search functionality
6. Theme and styling
7. Frontmatter support
8. Image handling


# Static Site Generator Concept

## Core Concept
A simple static site generator that converts a directory of Markdown files into a linked website, mimicking Obsidian's wiki-link structure. Pure HTML/CSS/vanilla JS output.

## Repository Structure

```
site/
├── build.js           # Generator script (Node.js)
├── content/           # Source markdown files
│   ├── index.md
│   ├── notes/
│   │   ├── note1.md
│   │   └── note2.md
│   └── projects/
│       └── project1.md
├── output/            # Generated static site (gitignored)
│   ├── index.html
│   ├── notes/
│   │   ├── note1.html
│   │   └── note2.html
│   ├── projects/
│   │   └── project1.html
│   └── assets/
│       ├── style.css
│       └── script.js
├── CONTEXT.md         # AI assistant context/instructions
└── README.md          # Project documentation
```

## Markdown Philosophy

### Supported Syntax
The generator supports standard markdown elements: headers, emphasis, links, lists, code blocks, images, blockquotes, and horizontal rules. The key addition is wiki-link syntax borrowed from Obsidian.

### Wiki-Link System
Wiki-links use double bracket notation to reference other notes. They can be simple references or include custom display text. The generator resolves these links by searching the entire content directory, making location transparent. Links are case-insensitive and work across nested directories.

### Frontmatter
Optional YAML frontmatter at the top of files can store metadata like custom titles, dates, or tags.

## Generator Architecture

### File Discovery
The generator recursively scans the content directory to build a complete index of all markdown files. Each file gets a slug derived from its path, which serves as its unique identifier. The index maps slugs to file paths, titles, and metadata.

### Markdown Processing
Each markdown file goes through several transformation stages. First, frontmatter is extracted if present. Then wiki-links are identified and temporarily replaced with placeholders. The markdown is converted to HTML. Finally, placeholders are replaced with proper HTML anchor tags pointing to the resolved pages.

### Link Resolution
When a wiki-link is encountered, the generator searches the file index for a matching note. It calculates the relative path between the current file and the target file, then generates an appropriate HTML link. If no match is found, it marks the link as broken.

### Backlink Graph
After parsing all files, the generator builds a reverse index showing which pages link to which. This enables automatic backlink sections at the bottom of each page, showing all incoming references.

### HTML Generation
Each parsed markdown file is wrapped in a consistent HTML template. The template includes a navigation sidebar showing the directory structure, the main content area, and a backlinks section if applicable.

### Asset Generation
The generator produces CSS and JavaScript files that are copied to the output directory. It also creates a search index JSON file containing metadata about all pages for client-side search.

## HTML Structure

The generated pages follow a consistent structure with a header containing the site title and search trigger, a sidebar with hierarchical navigation, a main content area for the parsed markdown, and an optional backlinks section. A hidden search modal is included for the search functionality.

## Styling Approach

The CSS uses custom properties for theming, allowing easy color scheme changes. The layout is responsive, with the sidebar collapsing on smaller screens. Typography is optimized for long-form reading with appropriate line heights and spacing. The design respects system color scheme preferences for automatic dark mode.

### Layout System
The page uses a grid-based layout with the sidebar fixed and the content area scrollable. The content has a maximum width for comfortable reading. Navigation items are nested to reflect directory structure.

### Component Styling
Code blocks receive syntax highlighting through CSS classes. Backlink lists are styled distinctly from the main content. Navigation trees use indentation and collapsible sections. The search modal appears as an overlay with backdrop blur.

## Client-Side Functionality

### Search System
The search functionality operates entirely client-side using the generated JSON index. Users can search by title or content snippet. Results are scored and ranked by relevance, with title matches weighted higher than content matches.

### Keyboard Navigation
The interface supports keyboard shortcuts for common actions. Search can be triggered with a keyboard shortcut. Results can be navigated with arrow keys. The escape key dismisses modals. Enter activates the selected result.

### Navigation Enhancement
The sidebar navigation can expand and collapse folder structures. The current page is highlighted in the navigation tree. Scroll positions are remembered when navigating between pages.

### Theme Control
Users can override the system color scheme preference. The choice is stored in browser local storage and persists across sessions.

## Search Index Structure

The search index is a JSON array containing an entry for each page. Each entry includes the page slug, title, URL path, a content preview, and any tags from frontmatter. This allows the search system to quickly filter and rank results without loading full page content.

## Build Process Flow

The build script starts by cleaning the output directory. It then scans the content directory to discover all markdown files. Each file is parsed to extract content, metadata, and links. The link graph is built to establish relationships between pages. The script validates that all wiki-links point to existing pages. HTML is generated for each page using the template system. The navigation tree is constructed from the file structure. Asset files are generated or copied to the output directory. Finally, the script reports statistics including page count and any broken links found.

## Configuration

The generator uses a simple configuration object defined at the top of the build script. This includes the site title, input and output directory paths, and the default index page name.

## File Purposes

### CONTEXT.md
This file serves as documentation for AI assistants working with the codebase. It explains the architecture, design decisions, and conventions used throughout the project. It provides context that helps AI tools understand the intent behind the code and make appropriate suggestions.

### README.md
The README serves as user-facing documentation. It explains what the project does, how to install and use it, how to write content using the markdown and wiki-link syntax, how to build and deploy the site, and how to customize appearance or behavior.

## Design Principles

**Simplicity** - The entire generator is a single Node.js script with minimal dependencies. The output is pure static files that work anywhere.

**Speed** - Generated sites load instantly with no build server, no JavaScript frameworks, and no runtime processing.

**Portability** - The output works offline and can be deployed to any static host without configuration.

**Familiarity** - Users of Obsidian can use the same linking syntax they're accustomed to.

**Transparency** - The generator maintains the directory structure of the source content in the output, making URLs predictable.


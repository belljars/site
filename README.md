# site

Minimal static site generator for my own personal archive. To use this, just empty the content directory.
Highly customizable in `src/css/base.css`

## usage

```bash
node build.js
```
It will rebuild `output` folder, which the HTML site will be located in, so there is no need for manual deletion.

`meta.json` supports a plain-text `footer` field for footer content.

## index page

The build always writes an `index.html` page. If `content/index.md` exists, its Markdown is rendered at the top of the page. If it does not exist, a default index introduction is generated.

After the optional Markdown content, the index page includes a generated `Posts` directory with links to every content page except the index page itself.

## supported markdown

- Headings: `#` through `######`
- Paragraphs
- Fenced code blocks with optional language names
- Inline code
- Raw HTML passthrough for inline tags and HTML blocks
- Bold, italic, and strikethrough
- Underscore emphasis with `__bold__` and `_italic_`
- Links and images
- Autolinked URLs such as `<https://example.com>` and bare `https://example.com`
- Horizontal rules with `---`
- Blockquotes
- Definition lists with `Term` followed by `: Definition`
- Footnotes with `[^id]` references and `[^id]: Note` definitions
- Ordered and unordered lists
- Nested lists by indentation
- Task list items with `[ ]` and `[x]`
- Tables with pipe syntax
- Escaped Markdown punctuation, such as `\*literal asterisks\*`

```markdown
| Name | Count | Status |
| :--- | ----: | :----: |
| Alpha | 12 | Ready |
| Beta | 7 | Draft |
```

Table alignment is controlled by the divider row: `:---` for left, `---:` for right, and `:---:` for centered.

# site

Minimal static site generator for my own personal archive. To use this, just empty the content directory.
Highly customizable in `src/css/base.css`

## usage

```bash
node build.js
```
It will rebuild `output` folder, which the HTML site will be located in, so there is no need for manual deletion.

`meta.json` supports a plain-text `footer` field for footer content.

## markdown support

| Format | Status | Notes |
| --- | --- | --- |
| Paragraphs | Supported | Blank lines split paragraphs |
| Headings (`#`-`######`) | Supported | Generates heading `id` attributes |
| Fenced code blocks | Supported | Triple backticks only; optional language class |
| Inline code | Supported | Single backticks |
| Raw HTML | Supported | Passed through for inline tags and HTML blocks |
| Bold | Supported | `**text**` and `__text__` |
| Italic | Supported | `*text*` and `_text_` |
| Strikethrough | Supported | `~~text~~` |
| Links | Supported | `[label](url)` |
| Images | Supported | `![alt](url)` |
| Autolinks | Supported | Bare URLs and angle-bracket URLs like `<https://example.com>` |
| Horizontal rules | Supported | `---` on its own line |
| Blockquotes | Supported | `>` lines |
| Ordered and unordered lists | Supported | `1.`, `-`, `*`, `+`, with indentation-based nesting |
| Task lists | Supported | `[ ]` and `[x]` inside list items |
| Tables | Supported | Pipe tables with alignment markers |

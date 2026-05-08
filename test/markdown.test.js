const assert = require("assert");
const { markdownToHtml } = require("../src/js/markdown");

const input = `# Hello World

This is **bold** and _italic_.

- [x] Done
- [ ] Todo

| Name | Count |
| :--- | ----: |
| Alpha | 12 |
`;

const html = markdownToHtml(input);

assert(html.includes('<h1 id="hello-world">Hello World</h1>'));
assert(html.includes("<strong>bold</strong>"));
assert(html.includes("<em>italic</em>"));
assert(
  /<li class="task-list-item"><input type="checkbox" disabled checked \/> Done\s*<\/li>/.test(
    html
  )
);
assert(
  /<li class="task-list-item"><input type="checkbox" disabled \/> Todo\s*<\/li>/.test(
    html
  )
);
assert(html.includes("<table>"));
assert(html.includes('<th style="text-align: left">Name</th>'));
assert(html.includes('<td style="text-align: right">12</td>'));

console.log("markdown.test.js passed");

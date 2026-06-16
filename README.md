# Chen Muyang Portfolio - Vue Version

This branch is the Vue architecture version of the portfolio site for
`cmuyang23333.top`.

It is a static Vue 3 single page app. It can be hosted directly by GitHub Pages,
Tencent Cloud Page One, or any static hosting service.

## Local Preview

No install step is required for the current static version.

```bash
python3 -m http.server 4174
```

Open:

```text
http://127.0.0.1:4174
```

## Main Files

- `src/data/content.js`: homepage text, navigation labels, contact info, filter labels
- `src/data/projects.js`: project cards, project categories, details, images, PDFs, embeds
- `src/views/`: page components
- `src/components/SiteHeader.js`: logo, nav, return button
- `src/styles/main.css`: desktop and mobile layout
- `images/`: image assets
- `pdf/`: project PDF files
- `code/`: project source-code snippets shown on detail pages
- `assets/fonts/`: local fonts

## Change Contact Info

Edit `src/data/content.js`:

```js
contact: {
  image: "/images/概念画像 1.webp",
  items: [
    { label: "WeChat", value: "wxsbsdwlsjxy" },
    { label: "ins", value: "justinyang265" },
    { label: "Email", value: "278513492@qq.com" }
  ]
}
```

## Project Categories

Each project in `src/data/projects.js` has a `discipline` field.

Available values:

```js
"visual"   // 视觉设计 / Visual Design
"ui"       // UI 设计 / UI Design
"product"  // 工业产品设计 / Industrial Product
"others"   // 其他 / Others
"unpublished" // 未公开 / Unpublished, blurred and not clickable
"vibe-coding" // vibe coding / web tools
```

Example:

```js
{
  "slug": "flow",
  "sourceFile": "流.html",
  "category": "school",
  "discipline": "ui",
  "image": "/images/study/3.webp",
  ...
}
```

## Edit an Existing Project

In `src/data/projects.js`, find the project by `slug`.

Common fields:

```js
{
  "slug": "flow",
  "discipline": "ui",
  "image": "/images/study/3.webp",
  "title": {
    "en": "FLOW-music composition app",
    "zh": "《流》-音乐创作app"
  },
  "details": {
    "en": {
      "title": "Co-Creative Software Design-flow流",
      "description": "English project description...",
      "hero": "/images/study/flow/Group 217.png",
      "images": [],
      "iframes": [
        "https://embed.figma.com/design/...?...node-id=1667-835&embed-host=share"
      ],
      "pdfs": [
        "/pdf/flow.pdf"
      ],
      "codeBlocks": [
        {
          "title": "Prototype Arduino code",
          "language": "arduino",
          "src": "/code/example.ino"
        }
      ]
    },
    "zh": {
      "title": "共创软件设计-flow流",
      "description": "中文项目描述...",
      "hero": "/images/study/flow/Group 217.png",
      "images": [],
      "iframes": [
        "https://embed.figma.com/design/...?...node-id=1667-835&embed-host=share"
      ],
      "pdfs": [
        "/pdf/flow.pdf"
      ],
      "codeBlocks": [
        {
          "title": "原型 Arduino 代码展示",
          "language": "arduino",
          "src": "/code/example.ino"
        }
      ]
    }
  }
}
```

Notes:

- `image` is the card image in the project grid.
- `details.en.hero` and `details.zh.hero` are the main detail-page images.
- `details.*.images` are extra output images shown below the intro.
- `details.*.iframes` can include Figma, Bilibili, YouTube, Vimeo, etc.
- `details.*.codeBlocks` shows source-code panels. Put the code file in `code/`.
- YouTube and Vimeo embeds automatically show `需 VPN 观看`.
- Figma embeds should use `https://embed.figma.com/design/...` URLs with the correct `node-id`.

## Add a New Project

1. Add images to `images/`.
2. Add PDFs to `pdf/` if needed.
3. Add a new object to the `projects` array in `src/data/projects.js`.

Template:

```js
{
  "slug": "new-project-slug",
  "sourceFile": "",
  "category": "portfolio",
  "discipline": "visual",
  "image": "/images/path/to/card-image.webp",
  "title": {
    "en": "English card title",
    "zh": "中文卡片标题"
  },
  "details": {
    "en": {
      "title": "English detail title",
      "description": "English project description.",
      "hero": "/images/path/to/hero-image.webp",
      "images": [
        "/images/path/to/output-1.webp",
        "/images/path/to/output-2.webp"
      ],
      "iframes": [
        "https://embed.figma.com/design/FILE_KEY/FILE_NAME?node-id=NODE_ID&embed-host=share"
      ],
      "pdfs": [
        "/pdf/project.pdf"
      ],
      "codeBlocks": [
        {
          "title": "Code block title",
          "language": "javascript",
          "src": "/code/project-code.js"
        }
      ],
      "sectionLabels": []
    },
    "zh": {
      "title": "中文详情标题",
      "description": "中文项目描述。",
      "hero": "/images/path/to/hero-image.webp",
      "images": [
        "/images/path/to/output-1.webp",
        "/images/path/to/output-2.webp"
      ],
      "iframes": [
        "https://embed.figma.com/design/FILE_KEY/FILE_NAME?node-id=NODE_ID&embed-host=share"
      ],
      "pdfs": [
        "/pdf/project.pdf"
      ],
      "codeBlocks": [
        {
          "title": "代码栏标题",
          "language": "javascript",
          "src": "/code/project-code.js"
        }
      ],
      "sectionLabels": []
    }
  },
  "legacy": {}
}
```

4. Save the file and refresh the local preview.
5. Click the category filter to confirm the new project appears in the correct group.
6. Open the project detail page and check all images, PDFs, and embeds.

## Get a Correct Figma Embed URL

1. Open the target Figma project.
2. Select the exact frame/page you want the portfolio to show.
3. Copy the share/embed link.
4. Confirm the URL contains a project-specific `node-id`, for example:

```text
node-id=1667-835
```

5. Paste the URL into `details.en.iframes` and `details.zh.iframes`.

## Deployment

### GitHub Pages for `openai-official-test`

This branch can be deployed to GitHub Pages with the included workflow:

```text
.github/workflows/deploy-openai-official-test-pages.yml
```

Use these repository settings:

```text
Pages source: GitHub Actions
Custom domain: cmuyang23333.top
```

The GitHub Pages site is static. It cannot run `scripts/ai-workflow-server.mjs`
and must not store an OpenAI API key in frontend code. For real generation,
configure a separate workflow backend, such as a Cloudflare Worker, and expose
only its public base URL to the frontend:

```text
Repository variable: VITE_WORKFLOW_API_BASE
Example value: https://your-workflow-api.example.com
```

The earlier Cloudflare Worker note used `VITE_APP_API_BASE_URL`; this branch
also accepts that name as a backward-compatible alias. Prefer
`VITE_WORKFLOW_API_BASE` because this project calls workflow-specific routes,
not a generic image-generation widget.

For GitHub Pages static branch deployment, editing `.env.local.example` will
not affect the live site. That file is only a template. Use the runtime config
file instead:

```text
workflow-config.js
```

Example:

```js
window.AI_WORKFLOW_CONFIG = {
  apiBase: "https://gpt.278513492.workers.dev"
};
```

You can also test a backend without committing config by opening:

```text
https://cmuyang23333.top/?workflowApiBase=https://gpt.278513492.workers.dev#/zh/project/ai-mcp-workflow
```

If Cloudflare is proxying `cmuyang23333.top` and a Worker route handles
`/api/ai-workflow/*` on the same domain, set:

```text
VITE_WORKFLOW_API_BASE=same-origin
```

The configured backend must provide these routes:

```text
GET  /api/ai-workflow/status
GET  /api/ai-workflow/config
POST /api/ai-workflow/sticker-backgrounds
POST /api/ai-workflow/text-layer
```

If `VITE_WORKFLOW_API_BASE` is not set, the static page at `cmuyang23333.top`
will show a clear backend-configuration message instead of trying to call a
nonexistent GitHub Pages API route.

Do not copy the old Contact-page example or `/v1/images/generations` client
module into this branch. The demo needs the existing workflow API because it
passes reference images, runs the three sticker pieces serially, and generates
the text layer from the top sticker.

For Tencent Cloud EdgeOne Pages / Page One, this branch includes `edgeone.json`
with these build settings:

```text
Install command: npm install
Build command: npm run build
Output directory: ./dist
Node version: 22.17.1
```

For direct static hosting, upload the branch contents as-is.

Important root files and folders:

```text
index.html
src/
vendor/
images/
assets/
pdf/
favicon.svg
CNAME
```

The current `CNAME` is:

```text
cmuyang23333.top
```

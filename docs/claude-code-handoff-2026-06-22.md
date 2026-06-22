# Claude Code 执行记录与交接文档 — 2026-06-22

> 目的：把本轮 Claude Code 执行的所有操作、关键决策与对话结论导出，方便 codex 了解项目进展并安全集成。
> 角色分工：codex 负责广义前端 / Task-Map，Claude Code 负责**范围受限的服务端任务**（主要改 `scripts/ai-workflow-server.mjs`）。

---

## 0. TL;DR（最快速了解）

本轮 Claude Code 完成了三件事：

1. **服务端 provider 感知的图片格式处理 + 强制文字颜色模式**（提交 `6f94784`，分支 `feat/company-backend-handoff`）。
2. **文字图层按颜色匹配 matte 渲染 + 仅抠除连通 matte 的透明化**（提交 `fb34b2b`，同分支）+ 新增本地测试 `scripts/text-layer-matte.test.mjs`（不调真实生图 API）。
3. **删除失效的 `CNAME` 文件及其构建拷贝步骤**（提交 `ca36933`，已推送到 `origin/main`）。

> 注意：1、2 的服务端代码在 **`feat/company-backend-handoff`** 分支，**尚未合并进 main**。3 在 **main**。

---

## 1. 分支拓扑现状

```
origin/main                       ca36933  Remove inert CNAME file and its build copy step  ← 本轮新增并已推送
                                  b99f417  Update CNAME (cmuyang23333.top)
                                  88f5ed9  Merge workflow-ofox into main
                                  e287fb4  Pass project slug to site header   ← 与下方分支的 merge-base

feat/company-backend-handoff      fb34b2b  Render text layer on color-matched matte ...      ← 本轮
（origin 已同步）                  6f94784  Add provider-aware image formats and forced ...    ← 本轮
                                  7654f3a  Add company backend handoff branch docs
                                  ...（构建于 e287fb4 之上）
```

本分支相对 `merge-base(origin/main)` 的改动文件（注意：其中前端文件由 codex 在更早轮次改动，**非本轮 Claude Code 所改**）：

```
docs/company-backend-deployment-handoff.md  | 138 +
scripts/ai-workflow-server.mjs              | 394 +++---   ← 本轮 Claude Code（仅此文件 + 下方测试）
scripts/text-layer-matte.test.mjs           | 122 +        ← 本轮 Claude Code 新增
src/components/AIWorkflowDemo.js             | 147 +++      ← codex（前端，本轮未动）
src/styles/main.css                          |  24 +        ← codex（样式，本轮未动）
```

**合并提示**：main 与本分支唯一会冲突的历史点是 `CNAME` —— 现已在 main 删除该文件。本分支不含 `CNAME` 改动，未来合并不再有域名文件冲突。

---

## 2. 本轮服务端改动详解（`scripts/ai-workflow-server.mjs`）

### 2.1 Provider 感知的图片参数（提交 `6f94784`）

官方 OpenAI（`api.openai.com`）与 OFOX Adapter（`api.ofox.io/v1`）**不接受相同参数**，OFOX 对 `/images/edits` 上的多余字段敏感。新增：

- `detectImageProvider(baseUrl)` → `"openai"` / `"ofox"` / `"compatible"`。
- `imageRequestParams({provider, outputFormat, isEdit})`：
  - **openai**：同时带 `output_format` + `quality`。
  - **ofox**：始终带 `output_format`；`quality` 仅在 edits 且有 extras 时带。
  - **compatible**：保守的 legacy 行为。
- `requestOpenAIImage` 现为 provider 感知；超时错误打标 `error.isTimeout = true`。

### 2.2 背景贴纸：JPEG 优先，PNG 回退

- `requestStickerImageWithFormatFallback(kind, prompt, referenceImage, editSize)`：依次尝试 `[preferred, "png"]`；若网关拒绝 JPEG 则回退 PNG，**不让整轮失败**；遇到 `error.isTimeout` 立即抛出（不无谓回退）。
- 默认 `IMAGE_OUTPUT_FORMAT = process.env.OPENAI_IMAGE_OUTPUT_FORMAT || "jpeg"`。
- `parseOpenAIImageResponse(response, requestedFormat)`：MIME = `sniffImageMime(buffer) || mimeForFormat(requestedFormat) || "image/png"` —— **按实际返回字节判定 MIME，不再假装是 PNG**。

### 2.3 文字图层：颜色匹配 matte + 连通抠图（提交 `fb34b2b`）

**核心思想**：gpt-image-2 不支持透明背景，因此用「白底或黑底 matte + 本地服务端 flood-fill 抠图」实现透明 PNG，**没有切换模型到 gpt-image-1**。

- 文字白稿与透明抠图**始终用 PNG**（本地抠图解码器仅支持 PNG；JPEG 无 alpha）。`textLayerOutputFormat()` 硬编码返回 `"png"`。
- `resolveMatte(textColorMode, topStickerImage)` 按模式选底色：
  - `dark` → 白底 + 深色字（`matteMode:"white"`, `matteColor:"#ffffff"`, `textBrightness:"dark"`, `brightnessSource:"forced-dark"`）。
  - `light` → 黑底 + 浅/白色字（`matteMode:"black"`, `matteColor:"#000000"`, `textBrightness:"light"`, `brightnessSource:"forced-light"`）。
  - `auto` → 测量 `topStickerImage` 亮度：无法解码→白底/dark/`auto-default`；亮度 <128→黑底/light/`auto-measured`；否则白底/dark/`auto-measured`。
- `removeConnectedMatte(dataUrl, matteMode)`（由 `removeConnectedWhiteBackground` 改名）：**仅删除与画布四周连通的 matte 区域**（从边界做连通域 flood-fill），**保留字体内部的白色高光、黑色描边、阴影与纹理** —— 不再全局删近白/近黑像素。
- 辅助：`isNearBlackPixel`、`isMattePixel`、`matteFeatherAlpha`、`measureDecorationBrightness`（相对亮度 `0.2126R+0.7152G+0.0722B`）。
- `makeTextLayerSvg` 新增 `textBrightness` 参数；文字颜色**永不为纯黑 `#000000`**（dark 时 fill `#1d2118` / stroke `#f3efe4`），浅色字带可读描边/阴影。
- `handleTextLayer` 计算 matte、构建动态 prompt（含底色与 matte 规则）、把 `matteMode` 传给抠图，并在响应顶层与 `debug` 中返回 `matteMode` / `matteColor`，**让抠图阶段明确知道本次用的是黑底还是白底**。
- **前端兼容**：资产 key 仍保留 `whiteDraft`（即便底色可能是黑），避免破坏当前前端读取。前端 `AIWorkflowDemo.js` 当前**尚未发送 `textColorMode`**（预期由 codex 后续轮次补上）；服务端已能优雅接受缺省。

### 2.4 导出（供测试使用）

`handleStickerBackgrounds, handleTextLayer, route, workflowStatus, removeConnectedMatte, resolveMatte, encodeRgbaToPng, decodePngToRgba`。

---

## 3. 本地测试 `scripts/text-layer-matte.test.mjs`（新增，不调真实 API）

内存合成 32×32 PNG，验证抠图只删连通 matte、保留内部细节：

- **Test 1**：白底 + 深色字块 + 内部白色高光 → 角落 alpha=0、字体不透明、**内部高光保留**。
- **Test 2**：黑底 + 浅色字块 + 内部黑色细节 → 角落 alpha=0、字体不透明、**内部黑色细节保留**。
- **Test 3**：`resolveMatte` 模式映射（dark→白底、light→黑底、auto 默认与按亮度测量）。

运行：`node scripts/text-layer-matte.test.mjs` —— 全部 PASS。

---

## 4. 实测结果（用临时 key 实跑，key 不落盘）

> 临时 key 仅作内联环境变量使用，**从未写入 `.env.local` 或任何文件**（该仓库 `.env.local` 未被 gitignore）。

- **OFOX Adapter** 与 **官方 OpenAI**（模型 `gpt-image-2`）均实测通过：
  - 背景贴纸返回 JPEG，MIME 正确；文字层为 PNG；三种颜色模式可用；纯黑被避免。
- **Matte 抠图实测**：
  - dark/白底 → ~88.3% 透明 / 11.6% 不透明 / 角落 alpha 0。
  - light/黑底 → ~82.5% 透明 / 14.7% 不透明 / 角落 alpha 0。
- **OFOX light 模式偶发 180s/170s 超时**：为网关瞬时延迟，非代码 bug；代码正确回退 SVG，重试成功（auto 在两次超时间隔约 23s 成功）。

---

## 5. CNAME / EdgeOne 自定义域名结论（已与用户确认并据此执行）

**结论：仓库里的 `CNAME` 文件对 EdgeOne 完全无效，是历史遗留。**

- `CNAME` 文件是 **GitHub Pages 专用**约定。本仓库 **未启用 GitHub Pages**（Pages API 返回 404），无人读取它。
- 本仓库通过 **EdgeOne** 部署（`edgeone.json`），自定义域名 `muyang23333.top` 在 **EdgeOne 控制台**绑定，**不读仓库的 `CNAME` 文件**。
- 因此 main 之前把 `CNAME` 改成 `cmuyang23333.top` **不会**与 EdgeOne 的 `muyang23333.top` 绑定冲突 —— 它只是一行没人消费的文本。
- 用户说明：`cmuyang23333.top` 后期上正式版工具，且**用的不是 MYportfolio 这个库**，会在另一个库 + 另一个 EdgeOne 项目独立绑定。
- **执行（方案 2）**：删除仓库 `CNAME` 文件，并从 `scripts/copy-static-assets.mjs` 的 `entries` 去掉 `"CNAME"`，使 `dist/` 不再产出它，消除“两个域名打架”的错觉。提交 `ca36933`，已推送 `origin/main`。
- 验证：`npm run build` 后 `dist/CNAME` 不再生成。

---

## 5.5 前端文字配色选择器（本轮新增，替 codex 代劳）

> 用户说明：这本属 codex 的前端活，本轮 Claude Code 代为完成，特此在交接文档标注，便于 codex 知悉。

服务端早已能接受 `textColorMode`（`auto`/`dark`/`light`，经 `normalizeTextColorMode` 归一，默认 `auto`），但前端 `AIWorkflowDemo.js` 之前**没有把这个字段发出来**，所以线上只能走默认 auto，无法切换 dark/light。本轮补齐前端：

改动文件：**`src/components/AIWorkflowDemo.js`**（唯一改动文件，未碰 CSS / 其他组件）。

- `data` 新增 `textColorMode: "auto"`。
- 新增多语言文案：`textColorModeTitle` / `textColorAuto` / `textColorDark` / `textColorLight` / `textColorHint`（zh + en 均补）。
- 文字层输入栏在字体风格选择行下方，**新增一组三按钮**（自动 / 深色字 / 浅色字），复用现有 `.ai-workflow-toolrow` 样式（加修饰类 `ai-workflow-toolrow--color`，**未新增 CSS**，所以即便 codex 后续想加样式也不冲突），下方用现有 `.ai-status-line` 显示说明文案。
- `runTextLayer` 的请求体新增 `textColorMode: this.textColorMode`，发往 `/api/ai-workflow/text-layer`。

验证：`node --check` 通过；`npm run build` 成功；新代码确认进入 `dist/assets/index-*.js`；Vite dev server 启动无报错、组件经转译正常服务（HTTP 200，无 error/warn）。**未做真人浏览器点选验证**（环境无法驱动 GUI），但编译/转译/构建/产物四层均已确认。

> 给 codex 的提醒：服务端响应顶层与 `debug` 还会返回 `matteMode` / `matteColor`，前端目前**尚未读取展示**（见待办）。如果 codex 想给三按钮加专属视觉样式，可针对 `.ai-workflow-toolrow--color` 写 CSS。

---

## 6. 本轮执行操作清单（按顺序）

1. `brew upgrade claude-code`：2.1.169 → 2.1.176。
2. 服务端 provider 感知格式 + 文字颜色模式 → 提交 `6f94784`（`feat/company-backend-handoff`，已推 origin）。
3. 文字层 matte 渲染 + 连通抠图 + 新增本地测试 → 提交 `fb34b2b`（同分支，已推 origin）。
4. 删除失效 CNAME + 构建拷贝项 → 提交 `ca36933`（`main`，已推 origin）。
5. 把 `feat/company-backend-handoff` 合并进 `main`（含本轮服务端成果 + codex 之前的前端改动）→ merge commit `c020aae`，已推 origin；交接文档提交 `cb5a8e7`。
6. 前端补齐 `textColorMode` 配色选择器（`AIWorkflowDemo.js`）→ 见 §5.5，本次随交接文档更新一并提交并推 main。
7. 每轮结束运行自检：`node --check`、`git diff --check`、`npm run build`（前端额外用 Vite dev server 验证转译）。

---

## 7. 给 codex 的后续待办 / 未验证项

- [x] **前端发送 `textColorMode`**：已在本轮完成（见 §5.5），`AIWorkflowDemo.js` 现在带 auto/dark/light 发往 `/api/ai-workflow/text-layer`。
- [ ] **前端读取 `matteMode`/`matteColor`**：服务端已在响应顶层与 `debug` 返回，前端**仍未**读取/展示，可用于抠图阶段提示或调试展示。
- [ ] **配色三按钮视觉样式**（可选）：本轮复用了 `.ai-workflow-toolrow` 默认样式，未加专属 CSS；如需独立外观，针对 `.ai-workflow-toolrow--color` 补 `src/styles/main.css`。
- [ ] **真人浏览器验证**：本轮 `textColorMode` 选择器只做到编译/转译/构建/产物四层验证，未做 GUI 点选实测，建议在 EdgeOne 或本地 GUI 实际点一遍 dark/light 看产图。
- [ ] **域名收尾**：`cmuyang23333.top` 正式版在另一个库，与本仓库无关；本仓库 EdgeOne 仍绑 `muyang23333.top`（在控制台，不依赖任何仓库文件）。

---

## 8. 约束备忘（Claude Code 自检标准，供后续轮次遵守）

- **只改明确点名的文件**（通常是 `scripts/ai-workflow-server.mjs`）；不动 UI 结构 / key / git / 无关重构。本轮经用户明确授权扩大了范围：改了 `scripts/copy-static-assets.mjs`（CNAME 方案 2）、新增测试文件、并在用户点名「替 codex 代劳」后改了前端 `src/components/AIWorkflowDemo.js`（§5.5 配色选择器）。这些都是**用户显式授权**的越界，默认仍应只动点名文件。
- 结束前必跑：`node --check <file>`、`git diff --check`、`npm run build`。
- **未经明确要求不 commit / 不 push**。本轮 CNAME 删除是用户明确要求提交并推 main。
- 临时 API key 仅内联使用，**绝不落盘**。

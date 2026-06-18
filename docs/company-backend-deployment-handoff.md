# 直播间贴片工具后端部署交接

## 目标

请将当前直播间贴片 demo 的后端部署到公司可长期运行的服务器或函数环境中，供网页端和后续 PC 端应用调用。

前端静态页面可以继续单独部署；后端需要提供 OpenAI-compatible 生图接口代理、隐藏 API Key、处理跨域，并避免前端直接暴露公司密钥。

## 推荐代码来源

- GitHub 仓库：`https://github.com/akdddddcccc/akdddddcccc.github.io`
- 分支：`ofox2.0`
- 当前后端核心文件：`scripts/ai-workflow-server.mjs`
- EdgeOne 函数入口：`cloud-functions/api/ai-workflow/`
- 工作流规则文档：`docs/workflow-source.md`
- 环境变量示例：`.env.local.example`

## 后端接口

前端会调用以下接口：

- `GET /api/ai-workflow/status`
- `POST /api/ai-workflow/config`
- `POST /api/ai-workflow/sticker-backgrounds`
- `POST /api/ai-workflow/text-layer`

其中主要生图接口是：

- `sticker-backgrounds`：第一轮上贴、下贴、侧贴背景图生成，支持 `kind=top|bottom|side` 单张重生。
- `text-layer`：第二轮文字图层生成，以上贴为主参考图，可选字体参考图只用于字形、笔势和局部质感。

## 必要环境变量

建议先按 ofox 公司 API 配置：

```bash
OPENAI_API_KEY=公司提供的 key
OPENAI_BASE_URL=https://api.ofox.io/v1
OPENAI_PROVIDER_LABEL=Company API

AI_WORKFLOW_DOC_PATH=docs/workflow-source.md
AI_WORKFLOW_DOC_MAX_CHARS=12000
AI_WORKFLOW_DOC_CACHE=0

OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_QUALITY=low
OPENAI_IMAGE_OUTPUT_FORMAT=jpeg
OPENAI_TEXT_LAYER_OUTPUT_FORMAT=png

OPENAI_IMAGE_USE_EDITS=1
OPENAI_IMAGE_EDIT_FIELD=image
OPENAI_IMAGE_EDIT_INCLUDE_EXTRAS=0
OPENAI_IMAGE_TIMEOUT_MS=180000

AI_WORKFLOW_GENERATION_MODE=sequential
OPENAI_TEXT_LAYER_USE_API=1
OPENAI_TEXT_LAYER_USE_FONT_REFERENCE=1
OPENAI_TEXT_LAYER_USE_SOURCE_REFERENCE=0
```

如公司 API 对 `images/edits` 支持不稳定，可以先改：

```bash
OPENAI_IMAGE_USE_EDITS=0
```

但这会降低参考图一致性，建议优先让图生图链路跑通。

## 部署建议

优先建议部署为一个独立 Node 服务，而不是让云函数同步等待完整生图流程：

```bash
npm install
node scripts/ai-workflow-server.mjs
```

默认服务端口为 `8787`。如果部署在公司服务器，请由反向代理或网关暴露为：

```text
https://公司域名/api/ai-workflow/...
```

然后前端的 `VITE_WORKFLOW_API_BASE` 或页面本机配置指向这个后端地址。

如果继续使用 EdgeOne 函数，现有入口在：

```text
cloud-functions/api/ai-workflow/
```

但需要注意同步等待生图容易触发平台时长限制。长期方案建议改为“提交任务 -> 队列处理 -> 前端轮询/回调取结果”。

## 需要研发确认的问题

1. 公司 ofox key 是否支持 `gpt-image-2` 的 `/v1/images/generations`。
2. 公司 ofox key 是否支持 `/v1/images/edits` 图生图；字段名是否为 `image`。
3. 返回图片是 `b64_json` 还是临时 URL。如果是 URL，服务器是否能稳定下载该 URL。
4. 单次请求最长允许多久，是否会被 Nginx、网关、函数平台或 WAF 提前断开。
5. 是否有 rate limit、并发限制、日额度或单模型额度。
6. 公司服务器是否允许访问 `https://api.ofox.io/v1`，以及返回图片所在域名。
7. 是否需要按访客/IP/账号做调用次数限制和日志留存。

## 验收标准

1. `GET /api/ai-workflow/status` 返回 `hasOpenAIKey: true`，并显示正确 `baseUrl`。
2. 第一轮可以按 `上贴 -> 下贴 -> 侧贴` 顺序串行生成。
3. 第一轮每张图可以单独重生。
4. 第二轮上传字体参考图后，状态中能看到“已附带上传字体参考图”。
5. 批量导出的上贴、下贴和效果图保留透明羽化过渡，不是硬边。
6. API key 不出现在前端代码、浏览器 Network 请求体、GitHub 仓库或构建产物中。

## 给前端配置的地址

研发部署完成后，请提供：

```text
WORKFLOW_API_BASE=https://公司域名/api/ai-workflow
```

前端只需要调用这个 base URL，不需要知道公司 API Key。

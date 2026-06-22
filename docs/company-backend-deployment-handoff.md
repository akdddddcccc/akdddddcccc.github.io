# 公司后端部署交接说明

## 分支用途

本分支用于公司内部后端部署交接，以及后续单位视觉形象适配。

请不要基于 `ofox2.0` 直接做公司部署改造。`ofox2.0` 是 EdgeOne 演示部署分支，应保持独立稳定。

## 代码来源

- GitHub 仓库：`https://github.com/akdddddcccc/akdddddcccc.github.io`
- 公司交接分支：`feat/company-backend-handoff`
- 当前工作流后端核心：`scripts/ai-workflow-server.mjs`
- 工作流规则文档：`docs/workflow-source.md`
- 环境变量示例：`.env.local.example`

## 公司部署目标

部署一个公司内部可长期运行的后端服务，用公司购买的 ofox API 直接完成生图。

目标不是个人作品集的双 API / 访客配额方案，也不是个人 OpenAI 官方 API fallback 方案。公司内部版本应优先保持单一链路：

```text
前端/PC 端应用 -> 公司后端 -> 公司 ofox API -> 返回图片结果
```

API Key 必须只保存在公司后端环境变量中，不进入前端代码、构建产物、GitHub 仓库或浏览器请求。

## 需要部署的接口

前端会调用：

- `GET /api/ai-workflow/status`
- `POST /api/ai-workflow/sticker-backgrounds`
- `POST /api/ai-workflow/text-layer`

本地配置接口：

- `POST /api/ai-workflow/config`

公司生产环境可以不开放 `config` 给普通用户，改为只读取服务器环境变量。

## 推荐环境变量

```bash
OPENAI_API_KEY=公司 ofox key
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

如果公司 ofox 的 `/images/edits` 图生图不稳定，可以临时改：

```bash
OPENAI_IMAGE_USE_EDITS=0
```

但这会降低参考图一致性。正式演示建议优先让图生图链路跑通。

## 推荐部署方式

优先建议部署为独立 Node 服务，而不是让 EdgeOne 云函数同步等待完整生图流程。

本地启动方式：

```bash
npm install
node scripts/ai-workflow-server.mjs
```

默认端口是 `8787`。公司服务器可通过 Nginx 或网关反代为：

```text
https://公司域名/api/ai-workflow/...
```

前端只需要配置：

```text
WORKFLOW_API_BASE=https://公司域名/api/ai-workflow
```

## 研发需要重点确认

1. 公司服务器能否稳定访问 `https://api.ofox.io/v1`。
2. 公司 ofox key 是否支持 `gpt-image-2`。
3. 公司 ofox key 是否支持 `/v1/images/edits`，上传字段是否为 `image`。
4. ofox 返回图片是 `b64_json` 还是临时 URL。
5. 如果返回临时 URL，公司服务器能否稳定下载该图片 URL。
6. Nginx、网关、WAF 或服务器平台是否会在 60/120/180 秒提前断开请求。
7. 是否需要公司内部账号、IP、设备或访问码限制。
8. 是否需要保存调用日志、失败原因、用量统计和操作人信息。

## 当前已知接口行为

第一轮贴片背景：

- 串行顺序：上贴 -> 下贴 -> 侧贴。
- 支持单张重生：请求体传 `kind=top|bottom|side`。
- 禁止无参考图文生图兜底，避免生成与参考图无关的假结果。

第二轮文字图层：

- 上贴是颜色、材质、小装饰的主参考。
- 上传字体参考图只影响字形、笔势、字面局部质感。
- 字体参考图不应决定背景、主色、场景或大装饰。

导出：

- 上贴/下贴导出应保留透明羽化。
- 批量导出 PNG 与预览效果应一致。

## 验收标准

1. `GET /api/ai-workflow/status` 返回 `hasOpenAIKey: true`。
2. 第一轮能生成上贴、下贴、侧贴，且每张可单独重生。
3. 第二轮上传字体参考图后，前端状态能看到“已附带上传字体参考图”。
4. 生成失败时能区分超时、key 问题、额度/限流、图片 URL 下载失败。
5. API Key 不暴露在前端和 GitHub。
6. 公司版本 UI 文案和视觉元素可后续替换为单位视觉形象。

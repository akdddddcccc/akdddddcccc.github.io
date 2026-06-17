# 直播间贴片后端部署（单位服务器）

一套代码、两套部署。靠环境变量区分行为，互不影响。

| 实例 | 服务对象 | API 策略 | 关键 env |
|---|---|---|---|
| **P 作品集** | muyang23333.top / cmuyang23333.top | 官方优先，每访客 20 次后回退 ofox | `QUOTA_ENABLED=1` + 官方 key + `FALLBACK_*` ofox key |
| **U 单位** | 单位前端变体 | 直连 ofox | `QUOTA_ENABLED` 不设 + ofox key 填在 `OPENAI_*` |

> 一轮完整流程 = 4 次图像调用（上/侧/下贴 + 文字图层）。`QUOTA_CALLS=20` = 5 轮。

## 前提：公网 HTTPS

作品集是 HTTPS 站，浏览器禁止它调用 HTTP 接口。后端**必须**有公网可达的 HTTPS 域名（如 `api.单位域名.com`）。用 `deploy/nginx-ai-workflow.conf` 反代 + certbot 签证书即可。

## 部署步骤（实例 P）

1. 把仓库放到服务器，如 `/opt/ai-workflow/portfolio`，装 Node 20+。
2. 复制 `.env.local.example` 为 `.env.local`，按下面填写：
   ```
   QUOTA_ENABLED=1
   QUOTA_CALLS=20
   OPENAI_API_KEY=<OpenAI 官方 key>
   OPENAI_BASE_URL=https://api.openai.com/v1
   FALLBACK_OPENAI_API_KEY=<ofox key>
   FALLBACK_OPENAI_BASE_URL=https://api.ofox.io/v1
   QUOTA_STORE_PATH=/var/lib/ai-workflow/visitor-quota.json
   ```
3. 装服务：把 `deploy/ai-workflow.service` 放到 `/etc/systemd/system/`，改好 `User`/`WorkingDirectory`，然后
   ```
   sudo systemctl daemon-reload && sudo systemctl enable --now ai-workflow
   ```
4. 配 nginx：`deploy/nginx-ai-workflow.conf` 改好域名，`certbot --nginx -d api.单位域名.com`，reload。
5. 在 `index.html` 把 `window.__AI_WORKFLOW_API_BASE__` 设成 `"https://api.单位域名.com"`，重新部署作品集静态站。

## 部署实例 U（单位前端变体）

同样流程，但 `.env.local` **不要** `QUOTA_ENABLED`，把 ofox key 填进 `OPENAI_API_KEY` / `OPENAI_BASE_URL`，前端用裁剪变体并指向实例 U 的域名。

## CORS

后端已对所有来源放行（`Access-Control-Allow-Origin: *`）并暴露 `X-Visitor-Token`。要收紧成只允许两个作品集域名，改 `scripts/ai-workflow-server.mjs` 里的 `sendJson` 头即可。

## 自检

```
curl https://api.单位域名.com/api/ai-workflow/status
```
返回 JSON 且 `quota.enabled=true`（实例 P）即正常。每次响应带 `X-Visitor-Token`，前端会存进 localStorage 作为额度身份。

## 回退

后端默认（不设 `QUOTA_ENABLED`）行为与改造前完全一致。要整体回退，切回改造前的提交或关掉该 env 即可，不影响桌面端和本地用法。

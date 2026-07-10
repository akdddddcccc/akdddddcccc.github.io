# 两个网站字体统一与 Task Map 项目页排版优化

请对以下网站对应的前端项目进行修改：

1. `http://muyang-tool.noteach.com.cn/`
2. `https://cmuyang23333.top/`
3. 重点页面：`https://muyang23333.top/#/zh/project/task-map-prototype`

本次任务分为两个部分：

1. 统一两个网站的中英文字体
2. 优化 `task-map-prototype` 项目详情页中，“进入正式版工作台”按钮以下的文本排版和内容结构

请先定位对应仓库、路由、组件、数据文件和全局样式，再开始修改。不要直接部署。完成本地修改、构建验证和截图后，先汇报结果。

---

## 一、两个网站统一字体

### 修改目标

普通 UI 和正文统一使用以下字体栈：

- 英文、数字、英文标点：`Inter`
- macOS / iOS 中文：`PingFang SC`
- Windows 中文：`Microsoft YaHei`
- 其他平台中文：`Noto Sans CJK SC`、`Noto Sans SC` 或系统无衬线字体

不要修改：图标字体、Iconfont、Material Icons、Font Awesome、SVG、Logo、图片内部文字、代码块、代码编辑器等宽字体、用户上传字体、Canvas 业务字体、文字生成工具中的目标字体。

优先安装：

```bash
npm install @fontsource/inter
```

入口文件按需引入：

```js
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
```

全局 CSS 定义：

```css
:root {
  --font-ui:
    "Inter",
    "PingFang SC",
    "Microsoft YaHei",
    "微软雅黑",
    "Noto Sans CJK SC",
    "Noto Sans SC",
    sans-serif;
}

html,
body,
button,
input,
textarea,
select {
  font-family: var(--font-ui);
}
```

全项目搜索并处理：

```text
SimSun
宋体
STSong
Songti SC
serif
Times New Roman
Georgia
font-family
fontFamily
font:
```

重点检查 `src/styles`、`src/assets`、`src/components`、`src/views`、`src/pages`、`App.vue`、`main.js`、`main.ts`、`index.css`、`global.css`、`style.css`、Sass/Less、CSS Modules、Vue scoped CSS、JSX/TSX 内联样式、Tailwind、UI 框架主题变量、导航、表单、按钮、弹窗、页脚和移动端菜单。

如果使用 Tailwind，将 `fontFamily.sans` 改为上述字体栈，并将普通 UI 中的 `font-serif` 改为 `font-sans`。明确用于展示的衬线标题可以保留，但需要在汇报中说明。

禁止使用：

```css
* {
  font-family: var(--font-ui) !important;
}
```

替换后检查标题换行、按钮宽度、导航溢出、正文粗细、placeholder、图标、字体 404、中英文数字混排。保留现有 `font-weight`，仅在明显失衡时做最小调整。

---

## 二、优化 Task Map 项目详情页

目标页面：

```text
https://muyang23333.top/#/zh/project/task-map-prototype
```

请定位对应页面组件、共用详情组件、Markdown/JSON 内容、国际化字段、样式文件和图片配置。

### Hero 第一屏保持不变

以下内容布局、比例、对齐、尺寸、图片、按钮位置、跳转、视觉风格和交互逻辑均保持：

- 左上角 `CHEN MUYANG`
- 右上角返回按钮
- 左侧封面图
- `VIBE CODING`
- `AI 任务甘特图工作台`
- 项目简介
- `进入正式版工作台` 按钮

Hero 只同步应用新的字体系统，不做其他版式改动。

### 只修改 Hero 以下内容

解决以下问题：重复项目名称、重复大标题、奇怪断行、标题过重正文过轻、页面像 PPT 拼接、区块内外间距失衡、图片前缺少说明、功能标题放在图片下方、产品叙事不清、内容都挤在左侧、阅读顺序不明确。

保持与其他项目详情页一致：不新增独立 Footer、More Projects、上一个/下一个项目导航，不修改全站共用 Footer，不改变其他项目页的结束方式和底部逻辑。

### 推荐内容结构

```text
Hero（保持现状）
↓
Product Overview
↓
Why
↓
Step 01 确定任务结构
↓
Step 02 建立任务依赖关系
↓
Step 03 生成时间规划
↓
Step 04 导出执行方案
↓
Current Status
↓
沿用原项目详情页结束结构
```

### Product Overview

删除 Hero 以下重复的大标题，改为：

```text
PRODUCT OVERVIEW

让 AI 帮你
先想清楚，再开始执行
```

正文：

```text
Task Map 不是一个只记录待办事项的工具。

它从一个总目标出发，帮助用户先建立任务结构，
随后梳理依赖关系、安排时间，
最终形成可执行、可导出的任务计划。
```

桌面端使用左右布局：左侧文字，右侧现有任务结构图或主视觉；移动端单列。

### Why

```text
WHY

复杂任务最大的难点，
不是执行。

而是不知道
应该先做什么。
```

下方四项采用轻量两列网格，移动端单列：

```text
01 任务拆解
把模糊的大目标拆成可以处理的任务节点

02 依赖关系
识别任务之间的先后、并行和承接关系

03 时间规划
把任务结构转换为可以调整的时间安排

04 方案导出
输出便于保存、查看和分享的任务计划
```

不要做成厚重卡片，只用编号、小标题、简短说明、细分割线和留白。

### Step 01–04

所有步骤统一结构：

```text
STEP 01
功能标题
简短说明
图片
```

功能标题和说明必须放在图片上方。

```text
STEP 01
确定任务结构
AI 将复杂目标拆解为清晰、可执行的任务节点，帮助用户先明确任务边界，再进入后续规划。

STEP 02
建立任务依赖关系
通过父子、并行、承接和前后依赖关系，将零散任务组织为完整的执行网络。

STEP 03
生成时间规划
在任务结构确定后，将任务映射到时间轴，生成可以继续调整的甘特图计划。

STEP 04
导出执行方案
将规划结果导出为便于保存、查看和分享的文件，支持 PDF、HTML 等格式。
```

如果现有图片数量或实际功能不同，必须按真实产品匹配，不要为凑四步错误配图。

### Current Status

```text
CURRENT STATUS

Prototype
正在持续开发
```

已完成：

- AI 任务拆解
- 任务结构编辑
- 甘特图生成
- 本地文件导出

规划中：

- 云端同步
- 多人协作
- AI Agent
- 历史版本管理

采用轻量边框、细分割线、极浅背景；禁止强阴影、高饱和渐变、后台面板风格和大量圆角卡片。

---

## 三、统一排版规范

Eyebrow：`11px / 600 / 1.4 / 0.08em`

Section Title：桌面端 `clamp(44px, 5vw, 72px)`，移动端 `clamp(36px, 11vw, 52px)`，`font-weight: 700`，避免奇怪断行。

Step Title：`clamp(28px, 3vw, 42px)`，`font-weight: 600~700`。

Lead：桌面端 `20px / 500 / 1.65`，移动端 `17px`。

Body：`15~16px / 400 / 1.8`，不要通过缩小字体容纳信息。

Caption：`12px / 400 / 1.6`，仅用于图片说明、版本号和次要信息。

Hero 以下容器建议：

```css
.project-content-container {
  width: min(1200px, calc(100% - 48px));
  margin-inline: auto;
}

.project-copy {
  max-width: 680px;
}

.project-media {
  width: 100%;
  max-width: 1000px;
}
```

区块间距：桌面端 `96~128px`，移动端 `64~80px`。移动端左右边距不低于 `20px`。

图片保持原比例，不强行裁切；图片前必须有说明；不要为每张图片使用不同阴影、圆角和装饰。

区块背景只能做极轻微变化，并优先复用现有变量；禁止高饱和渐变、玻璃拟态、强阴影、多层卡片和全站不一致的纹理。

正文、功能说明、状态列表均左对齐，长段落不要居中。

---

## 四、移动端检查

重点检查：`375px`、`390px`、`430px`、`768px`。

要求：Product Overview、Why、Step、Current Status 全部适配单列；正文不低于 `15px`，行高不低于 `1.7`，左右边距不低于 `20px`；无单字悬挂、异常三四行标题、图片越界和横向滚动；返回按钮和工作台按钮功能正常；不新增独立移动端 Footer。

---

## 五、禁止修改

不要修改 Hero 布局、封面图结构、按钮跳转、返回逻辑、工作台路由、工作台内部界面、节点拖拽、连线逻辑、状态管理、数据结构、导出功能、国际化字段含义、全站 Footer、其他项目页结束方式和与本次字体及排版无关的业务代码。

如果修改共用组件，必须验证其他项目详情页不受影响。

---

## 六、实施顺序

1. 确认两个网站对应的前端项目
2. 定位全局样式和字体入口
3. 安装并引入 Inter
4. 建立统一字体变量
5. 排查并替换普通 UI 中的宋体和 serif
6. 确保图标字体和业务字体不受影响
7. 定位 `task-map-prototype` 页面组件和内容数据
8. 明确 Hero 边界并保持不变
9. 删除 Hero 以下重复标题
10. 重构 Product Overview
11. 新增 Why
12. 整理 Step 01–04
13. 将功能标题移到图片上方
14. 新增 Current Status
15. 保留原有结束结构
16. 完成移动端适配
17. 测试其他项目详情页
18. 执行构建验证

不要一开始重写整个共用详情组件，优先进行局部、可控修改。

---

## 七、完成后汇报

请给出：

1. 修改的仓库和分支
2. 修改文件列表
3. Inter 引入方式
4. 原项目中发现的宋体和 serif 声明
5. 被保留的字体声明及原因
6. `task-map-prototype` 组件路径
7. 数据或国际化文件路径
8. Hero 是否保持未改
9. Product Overview、Why、Step 01–04、Current Status 的实现方式
10. 页面底部如何保持与其他项目页一致
11. 修改后的字号、行高、内容宽度和区块间距
12. 桌面端与移动端测试结果
13. 是否影响其他项目详情页
14. 构建结果
15. 修改前后截图

只完成本地修改、构建验证和截图。不要自动部署，不要自动提交到生产环境。
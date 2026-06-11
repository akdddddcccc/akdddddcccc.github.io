export default {
  name: "AIWorkflowDemo",
  props: {
    lang: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      promptText: this.lang === "zh"
        ? "按直播间调性生成一组套图：上贴、侧贴、下贴背景，边缘需要适合后续透明渐隐。"
        : "Generate a sticker set for the live-room tone: top, side, and bottom backgrounds with edges ready for transparent fading.",
      textLayerPrompt: this.lang === "zh"
        ? "参考上贴背景质感，保留原文案，只调整字体气质、颜色和局部强调方式。"
        : "Reference the top sticker texture, preserve the copy, and adjust only type tone, color, and emphasis.",
      copyText: this.lang === "zh"
        ? "例如：\n“NOBOOK · 618 狂欢季\n重走真理诞生路”"
        : "Example:\n“NOBOOK · 618 Campaign\nTrace the birth of truth”",
      statusText: this.lang === "zh" ? "等待输入" : "Waiting",
      runningStep: "",
      referenceUrl: "",
      referenceName: this.lang === "zh" ? "用于提取背景风格" : "For background style extraction",
      fontReferenceName: this.lang === "zh" ? "用于提取文字、版式、字体特征和风格" : "For copy, layout, font features, and style",
      liveRoomUrl: "",
      liveRoomName: this.lang === "zh" ? "等待上传截图" : "Waiting for screenshot",
      activeFadeTarget: "top",
      topPathPoints: [],
      bottomPathPoints: [],
      isDrawing: false,
      referenceObjectUrl: "",
      liveRoomObjectUrl: "",
      textInteraction: null,
      textLayerVisible: true,
      boardSize: {
        width: 560,
        height: 560
      },
      textLayer: {
        x: 0,
        y: 0,
        width: 300,
        height: 88
      },
      assets: [
        { title: this.lang === "zh" ? "文字图层" : "Text layer", copy: this.lang === "zh" ? "纯白/纯黑底，等待抠透明" : "White or black backing for cutout", ready: true },
        { title: this.lang === "zh" ? "上贴背景" : "Top background", copy: this.lang === "zh" ? "保留上部，边缘渐隐" : "Keep upper portion with fade", ready: true },
        { title: this.lang === "zh" ? "侧贴背景" : "Side background", copy: this.lang === "zh" ? "用于左侧或侧边贴片" : "For side placement", ready: false },
        { title: this.lang === "zh" ? "下贴背景" : "Bottom background", copy: this.lang === "zh" ? "保留下部，方便叠直播间" : "Keep lower portion for live-room overlay", ready: false },
        { title: this.lang === "zh" ? "贴片效果图" : "Composite preview", copy: this.lang === "zh" ? "方便直播间参考布局" : "For live-room layout reference", ready: true }
      ]
    };
  },
  computed: {
    labels() {
      return {
        zh: {
          kicker: "interactive demo",
          title: "路径融合测试台",
          intro: "按功能步骤重新排布：先生成三贴背景，再生成文字图层，最后上传直播间底图进行路径融合和批量导出。",
          stickerInput: "贴片 input",
          textInput: "文字层 input",
          fusionInput: "融合 input",
          prototypeInput: "原型输入",
          uploadReference: "上传参考图",
          uploadOptional: "上传参考图（非必需）",
          uploadLiveRoom: "上传无贴片直播间截图",
          prompt: "语言描述引导",
          textContent: "文本内容",
          run: "执行当前步骤",
          running: "执行中...",
          output: "output",
          stickerOutput: "贴片输出",
          topBg: "上贴背景",
          sideBg: "侧贴",
          bottomBg: "下贴背景",
          topText: "上贴文字",
          cutout: "自动抠图（api 提供自）",
          transparentPng: "透明 png",
          stickerEffect: "贴片效果",
          liveRoomBase: "直播间底图",
          topFade: "上贴渐隐线",
          bottomFade: "下贴渐隐线",
          clearLine: "清除当前线",
          placeText: "置入文字框",
          exportTitle: "图层清单 批量导出",
          exportAll: "批量导出",
          exportPath: "导出路径数据",
          downloadPlan: "下载流程说明",
          fontOne: "纤细黑逸宋体",
          fontTwo: "书法张扬体",
          learnReference: "学习参考图",
          waitingUpload: "等待上传截图"
        },
        en: {
          kicker: "interactive demo",
          title: "Blend path test bench",
          intro: "Reordered by workflow: generate sticker backgrounds, create the text layer, then upload a live-room base for path blending and batch export.",
          stickerInput: "sticker input",
          textInput: "text layer input",
          fusionInput: "fusion input",
          prototypeInput: "Prototype input",
          uploadReference: "Upload reference",
          uploadOptional: "Upload reference (optional)",
          uploadLiveRoom: "Upload live-room screenshot without stickers",
          prompt: "Prompt guidance",
          textContent: "Text content",
          run: "Run current step",
          running: "Running...",
          output: "output",
          stickerOutput: "Sticker output",
          topBg: "Top background",
          sideBg: "Side",
          bottomBg: "Bottom background",
          topText: "Top text",
          cutout: "Auto cutout (API)",
          transparentPng: "Transparent png",
          stickerEffect: "Sticker effect",
          liveRoomBase: "Live-room base",
          topFade: "Top fade line",
          bottomFade: "Bottom fade line",
          clearLine: "Clear current line",
          placeText: "Place text box",
          exportTitle: "Layer list Batch export",
          exportAll: "Batch export",
          exportPath: "Export path data",
          downloadPlan: "Download workflow note",
          fontOne: "Thin serif",
          fontTwo: "Expressive script",
          learnReference: "Learn reference",
          waitingUpload: "Waiting for screenshot"
        }
      }[this.lang];
    },
    stepCards() {
      return [
        { key: "sticker-bg", index: "01", title: this.lang === "zh" ? "贴片背景" : "Sticker bg" },
        { key: "text-layer", index: "02", title: this.lang === "zh" ? "文字层" : "Text layer" },
        { key: "fusion", index: "03", title: this.lang === "zh" ? "融合素材" : "Fusion" },
        { key: "fusion", index: "04", title: this.lang === "zh" ? "导出" : "Export" }
      ];
    },
    topStickerHeight() {
      return Math.round(this.boardSize.height * 0.28);
    },
    bottomStickerHeight() {
      return Math.round(this.boardSize.height * 0.32);
    },
    bottomStickerY() {
      return this.boardSize.height - this.bottomStickerHeight;
    },
    sideStickerWidth() {
      return Math.round(this.boardSize.width * 0.27);
    },
    sideStickerHeight() {
      return Math.round(this.boardSize.height * 0.36);
    },
    topPathD() {
      return this.pointsToPath(this.topPathPoints);
    },
    bottomPathD() {
      return this.pointsToPath(this.bottomPathPoints);
    },
    topMaskPoints() {
      const line = this.normalizedPath(this.topPathPoints, this.topStickerHeight * 0.72, "top");
      const path = line.map((point) => `${Math.round(point.x)},${Math.round(point.y)}`).join(" ");
      return `0,0 ${this.boardSize.width},0 ${this.boardSize.width},${Math.round(line[line.length - 1].y)} ${path} 0,${Math.round(line[0].y)}`;
    },
    bottomMaskPoints() {
      const line = this.normalizedPath(this.bottomPathPoints, this.bottomStickerY + this.bottomStickerHeight * 0.28, "bottom");
      const path = line.map((point) => `${Math.round(point.x)},${Math.round(point.y)}`).join(" ");
      return `0,${Math.round(line[0].y)} ${path} ${this.boardSize.width},${Math.round(line[line.length - 1].y)} ${this.boardSize.width},${this.boardSize.height} 0,${this.boardSize.height}`;
    },
    textLayerDisplay() {
      return this.copyText.replace(/^Example:\n?|^例如：\n?/, "").replace(/[“”"]/g, "").trim();
    },
    textLayerStyle() {
      return {
        left: `${this.textLayer.x}px`,
        top: `${this.textLayer.y}px`,
        width: `${this.textLayer.width}px`,
        height: `${this.textLayer.height}px`
      };
    }
  },
  mounted() {
    this.resizeCompositionForDisplay();
    this.centerTextLayer();
    window.addEventListener("resize", this.resizeCompositionForDisplay);
    window.addEventListener("pointermove", this.moveTextLayer);
    window.addEventListener("pointerup", this.endTextInteraction);
  },
  beforeUnmount() {
    if (this.referenceObjectUrl) URL.revokeObjectURL(this.referenceObjectUrl);
    if (this.liveRoomObjectUrl) URL.revokeObjectURL(this.liveRoomObjectUrl);
    window.removeEventListener("resize", this.resizeCompositionForDisplay);
    window.removeEventListener("pointermove", this.moveTextLayer);
    window.removeEventListener("pointerup", this.endTextInteraction);
  },
  methods: {
    loadReference(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      if (this.referenceObjectUrl) URL.revokeObjectURL(this.referenceObjectUrl);
      this.referenceObjectUrl = URL.createObjectURL(file);
      this.referenceUrl = this.referenceObjectUrl;
      this.referenceName = file.name;
      this.statusText = this.lang === "zh" ? "参考图已载入" : "Reference loaded";
    },
    loadFontReference(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      this.fontReferenceName = file.name;
      this.statusText = this.lang === "zh" ? "字体参考图已载入" : "Font reference loaded";
    },
    loadLiveRoom(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      if (this.liveRoomObjectUrl) URL.revokeObjectURL(this.liveRoomObjectUrl);
      this.liveRoomObjectUrl = URL.createObjectURL(file);
      this.liveRoomUrl = this.liveRoomObjectUrl;
      this.liveRoomName = file.name;
      this.statusText = this.lang === "zh" ? "直播间截图已载入，可以绘制融合路径" : "Live-room screenshot loaded";
    },
    simulateRun(step) {
      this.runningStep = step;
      this.statusText = this.labels.running;
      window.setTimeout(() => {
        this.runningStep = "";
        this.statusText = this.statusByStep(step);
        if (step === "sticker-bg") {
          this.assets[1].ready = true;
          this.assets[2].ready = true;
          this.assets[3].ready = true;
        }
        if (step === "text-layer" || step === "cutout" || step === "place-text") {
          this.assets[0].ready = true;
        }
        if (step === "export") {
          this.assets.forEach((asset) => {
            asset.ready = true;
          });
        }
      }, 680);
    },
    statusByStep(step) {
      const zh = {
        "sticker-bg": "已生成上贴、侧贴、下贴背景占位结果",
        "text-layer": "已生成文字图层占位结果",
        cutout: "已抠出透明 png 占位结果",
        "place-text": "文字框已置入合成预览",
        export: "已准备批量导出清单"
      };
      const en = {
        "sticker-bg": "Top, side, and bottom placeholders generated",
        "text-layer": "Text layer placeholder generated",
        cutout: "Transparent png placeholder generated",
        "place-text": "Text box placed in preview",
        export: "Batch export list ready"
      };
      return (this.lang === "zh" ? zh : en)[step] || (this.lang === "zh" ? "已完成" : "Done");
    },
    setFadeTarget(target) {
      this.activeFadeTarget = target;
      this.statusText = target === "top"
        ? (this.lang === "zh" ? "正在绘制上贴渐隐线：线以上保留" : "Drawing top fade line: keep above the line")
        : (this.lang === "zh" ? "正在绘制下贴渐隐线：线以下保留" : "Drawing bottom fade line: keep below the line");
    },
    resizeCompositionForDisplay() {
      const board = this.$refs.compositionBoard;
      if (!board) return;
      const rect = board.getBoundingClientRect();
      this.boardSize.width = Math.max(1, Math.round(rect.width));
      this.boardSize.height = Math.max(1, Math.round(rect.height));
      this.keepTextLayerInBounds();
      this.resizeCanvasForDisplay();
    },
    resizeCanvasForDisplay() {
      const canvas = this.$refs.pathCanvas;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      const ctx = canvas.getContext("2d");
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      this.redrawPath();
    },
    getPoint(event) {
      const rect = this.$refs.pathCanvas.getBoundingClientRect();
      return this.constrainPointToSticker({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }, this.activeFadeTarget);
    },
    constrainPointToSticker(point, target) {
      const padding = 18;
      const x = Math.min(Math.max(point.x, 0), this.boardSize.width);
      if (target === "top") {
        return { x, y: Math.min(Math.max(point.y, padding), this.topStickerHeight - padding) };
      }
      return { x, y: Math.min(Math.max(point.y, this.bottomStickerY + padding), this.boardSize.height - padding) };
    },
    startDrawing(event) {
      this.isDrawing = true;
      if (this.activeFadeTarget === "top") {
        this.topPathPoints = [this.getPoint(event)];
      } else {
        this.bottomPathPoints = [this.getPoint(event)];
      }
      this.$refs.pathCanvas.setPointerCapture(event.pointerId);
      this.redrawPath();
    },
    continueDrawing(event) {
      if (!this.isDrawing) return;
      const point = this.getPoint(event);
      const pathPoints = this.activeFadeTarget === "top" ? this.topPathPoints : this.bottomPathPoints;
      const last = pathPoints[pathPoints.length - 1];
      if (Math.hypot(point.x - last.x, point.y - last.y) > 4) {
        if (this.activeFadeTarget === "top") {
          this.topPathPoints = [...pathPoints, point];
        } else {
          this.bottomPathPoints = [...pathPoints, point];
        }
        this.redrawPath();
      }
    },
    endDrawing(event) {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      if (event.pointerId !== undefined) this.$refs.pathCanvas.releasePointerCapture(event.pointerId);
      this.statusText = this.activeFadeTarget === "top"
        ? (this.lang === "zh" ? "上贴渐隐线已记录，线以下进入透明过渡" : "Top fade line recorded")
        : (this.lang === "zh" ? "下贴渐隐线已记录，线以上进入透明过渡" : "Bottom fade line recorded");
    },
    redrawPath() {
      const canvas = this.$refs.pathCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      this.drawPath(ctx, this.topPathPoints, "rgba(255, 255, 255, 0.9)", "rgba(11, 11, 15, 0.8)");
      this.drawPath(ctx, this.bottomPathPoints, "rgba(255, 255, 255, 0.9)", "rgba(11, 11, 15, 0.8)");
    },
    drawPath(ctx, pathPoints, haloColor, strokeColor) {
      if (pathPoints.length < 2) return;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = haloColor;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
      for (let i = 1; i < pathPoints.length - 1; i += 1) {
        const midX = (pathPoints[i].x + pathPoints[i + 1].x) / 2;
        const midY = (pathPoints[i].y + pathPoints[i + 1].y) / 2;
        ctx.quadraticCurveTo(pathPoints[i].x, pathPoints[i].y, midX, midY);
      }
      ctx.stroke();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    },
    clearPath() {
      if (this.activeFadeTarget === "top") {
        this.topPathPoints = [];
      } else {
        this.bottomPathPoints = [];
      }
      this.redrawPath();
      this.statusText = this.activeFadeTarget === "top"
        ? (this.lang === "zh" ? "上贴渐隐线已清除" : "Top fade line cleared")
        : (this.lang === "zh" ? "下贴渐隐线已清除" : "Bottom fade line cleared");
    },
    pointsToPath(points) {
      if (points.length < 2) return "";
      const commands = [`M ${points[0].x} ${points[0].y}`];
      for (let i = 1; i < points.length - 1; i += 1) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        commands.push(`Q ${points[i].x} ${points[i].y} ${midX} ${midY}`);
      }
      commands.push(`L ${points[points.length - 1].x} ${points[points.length - 1].y}`);
      return commands.join(" ");
    },
    normalizedPath(points, fallbackY, target) {
      const source = points.length > 1 ? points : this.defaultFadeLine(fallbackY);
      const sorted = [...source].sort((a, b) => a.x - b.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      return [
        this.constrainPointToSticker({ x: 0, y: first.y }, target),
        ...sorted.map((point) => this.constrainPointToSticker(point, target)),
        this.constrainPointToSticker({ x: this.boardSize.width, y: last.y }, target)
      ];
    },
    defaultFadeLine(y) {
      return [
        { x: 0, y },
        { x: this.boardSize.width * 0.35, y: y + 8 },
        { x: this.boardSize.width * 0.7, y: y - 10 },
        { x: this.boardSize.width, y }
      ];
    },
    placeTextLayer() {
      this.textLayerVisible = true;
      this.centerTextLayer();
      this.simulateRun("place-text");
    },
    centerTextLayer() {
      this.textLayer.width = Math.min(360, this.boardSize.width * 0.68);
      this.textLayer.height = 92;
      this.textLayer.x = (this.boardSize.width - this.textLayer.width) / 2;
      this.textLayer.y = Math.max(18, (this.topStickerHeight - this.textLayer.height) / 2);
    },
    keepTextLayerInBounds() {
      this.textLayer.width = Math.min(this.textLayer.width, this.boardSize.width - 24);
      this.textLayer.height = Math.min(this.textLayer.height, this.boardSize.height - 24);
      this.textLayer.x = Math.min(Math.max(this.textLayer.x, 12), this.boardSize.width - this.textLayer.width - 12);
      this.textLayer.y = Math.min(Math.max(this.textLayer.y, 12), this.boardSize.height - this.textLayer.height - 12);
    },
    startTextDrag(event) {
      this.textInteraction = {
        type: "drag",
        startX: event.clientX,
        startY: event.clientY,
        x: this.textLayer.x,
        y: this.textLayer.y
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    startTextResize(event) {
      this.textInteraction = {
        type: "resize",
        startX: event.clientX,
        width: this.textLayer.width,
        height: this.textLayer.height,
        centerX: this.textLayer.x + this.textLayer.width / 2,
        centerY: this.textLayer.y + this.textLayer.height / 2
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    moveTextLayer(event) {
      if (!this.textInteraction) return;
      const deltaX = event.clientX - this.textInteraction.startX;
      const deltaY = event.clientY - this.textInteraction.startY;
      if (this.textInteraction.type === "drag") {
        this.textLayer.x = this.textInteraction.x + deltaX;
        this.textLayer.y = this.textInteraction.y + deltaY;
      } else {
        const nextWidth = Math.max(180, this.textInteraction.width + deltaX * 2);
        const ratio = this.textInteraction.height / this.textInteraction.width;
        this.textLayer.width = Math.min(nextWidth, this.boardSize.width - 24);
        this.textLayer.height = Math.max(64, this.textLayer.width * ratio);
        this.textLayer.x = this.textInteraction.centerX - this.textLayer.width / 2;
        this.textLayer.y = this.textInteraction.centerY - this.textLayer.height / 2;
      }
      this.keepTextLayerInBounds();
    },
    endTextInteraction() {
      this.textInteraction = null;
    },
    downloadPathData() {
      const data = {
        type: "blend-path",
        createdAt: new Date().toISOString(),
        topPointCount: this.topPathPoints.length,
        bottomPointCount: this.bottomPathPoints.length,
        topPoints: this.topPathPoints,
        bottomPoints: this.bottomPathPoints
      };
      this.downloadBlob(JSON.stringify(data, null, 2), "blend-path.json", "application/json;charset=utf-8");
    },
    downloadPlan() {
      const plan = [
        "AI MCP Workflow",
        "",
        "1. Upload a reference image and generate top, side, and bottom sticker backgrounds.",
        "2. Create a text layer, then cut it into transparent png.",
        "3. Upload a live-room base, overlay sticker layers, and draw fade paths.",
        "4. Batch export text layers, background layers, side layer, and composite preview.",
        "",
        "Background prompt:",
        this.promptText,
        "",
        "Text prompt:",
        this.textLayerPrompt,
        "",
        "Copy:",
        this.copyText
      ].join("\n");
      this.downloadBlob(plan, "ai-mcp-workflow.txt", "text/plain;charset=utf-8");
    },
    downloadBlob(content, filename, type) {
      const blob = new Blob([content], { type });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }
  },
  template: `
    <section class="task-map-demo ai-workflow-demo" aria-label="AI MCP workflow demo">
      <div class="task-map-demo__intro">
        <p class="task-map-demo__kicker">{{ labels.kicker }}</p>
        <h2>{{ labels.title }}</h2>
        <p>{{ labels.intro }}</p>
      </div>

      <div class="ai-workflow-tabs" aria-label="Workflow steps">
        <a v-for="step in stepCards" :key="step.index" :href="'#' + step.key">
          <span>{{ step.index }}</span>
          <strong>{{ step.title }}</strong>
        </a>
      </div>

      <div class="ai-workflow-flow">
        <article id="sticker-bg" class="ai-workflow-step">
          <div class="ai-workflow-column ai-workflow-column--input">
            <div class="task-map-panel__header">
              <div>
                <span>{{ labels.stickerInput }}</span>
                <h3>{{ labels.prototypeInput }}</h3>
              </div>
            </div>
            <label class="ai-workflow-upload" for="aiWorkflowReference">
              <input id="aiWorkflowReference" type="file" accept="image/*" @change="loadReference" />
              <strong>+</strong>
              <span>{{ labels.uploadReference }}</span>
              <small>{{ referenceName }}</small>
            </label>
            <label class="ai-workflow-field">
              <span>{{ labels.prompt }}</span>
              <textarea v-model="promptText" rows="3"></textarea>
            </label>
            <button type="button" class="ai-workflow-button" :disabled="runningStep === 'sticker-bg'" @click="simulateRun('sticker-bg')">
              {{ runningStep === "sticker-bg" ? labels.running : labels.run }}
            </button>
          </div>

          <div class="ai-workflow-column">
            <div class="task-map-panel__header">
              <div>
                <span>{{ labels.output }}</span>
                <h3>{{ labels.stickerOutput }}</h3>
              </div>
            </div>
            <div class="ai-sticker-board">
              <img v-if="referenceUrl" :src="referenceUrl" alt="Reference preview" />
              <div class="ai-sticker-piece ai-sticker-piece--top">{{ labels.topBg }}</div>
              <div class="ai-sticker-piece ai-sticker-piece--side">{{ labels.sideBg }}</div>
              <div class="ai-sticker-piece ai-sticker-piece--bottom">{{ labels.bottomBg }}</div>
            </div>
          </div>
        </article>

        <article id="text-layer" class="ai-workflow-step">
          <div class="ai-workflow-column ai-workflow-column--input">
            <div class="task-map-panel__header">
              <div>
                <span>{{ labels.textInput }}</span>
                <h3>{{ labels.prototypeInput }}</h3>
              </div>
            </div>
            <label class="ai-workflow-field">
              <span>{{ labels.textContent }}</span>
              <textarea v-model="copyText" rows="5"></textarea>
            </label>
            <label class="ai-workflow-field">
              <span>{{ labels.prompt }}</span>
              <textarea v-model="textLayerPrompt" rows="3"></textarea>
            </label>
            <div class="ai-workflow-toolrow">
              <button type="button">{{ labels.fontOne }}</button>
              <button type="button">{{ labels.fontTwo }}</button>
              <button type="button">{{ labels.learnReference }}</button>
            </div>
            <label class="ai-workflow-upload ai-workflow-upload--short" for="aiWorkflowFontReference">
              <input id="aiWorkflowFontReference" type="file" accept="image/*" @change="loadFontReference" />
              <strong>+</strong>
              <span>{{ labels.uploadOptional }}</span>
              <small>{{ fontReferenceName }}</small>
            </label>
            <button type="button" class="ai-workflow-button" :disabled="runningStep === 'text-layer'" @click="simulateRun('text-layer')">
              {{ runningStep === "text-layer" ? labels.running : labels.run }}
            </button>
          </div>

          <div class="ai-workflow-column">
            <div class="task-map-panel__header">
              <div>
                <span>{{ labels.output }}</span>
                <h3>{{ labels.stickerOutput }}</h3>
              </div>
            </div>
            <div class="ai-text-preview">{{ labels.topText }}</div>
            <div class="ai-transparent-export">
              <button type="button" class="ai-workflow-button" @click="simulateRun('cutout')">{{ labels.cutout }}</button>
              <span>{{ labels.transparentPng }}</span>
            </div>
          </div>
        </article>

        <article id="fusion" class="ai-workflow-step ai-workflow-step--fusion">
          <div class="ai-workflow-column ai-workflow-column--input">
            <div class="task-map-panel__header">
              <div>
                <span>{{ labels.fusionInput }}</span>
                <h3>{{ labels.prototypeInput }}</h3>
              </div>
            </div>
            <label class="ai-workflow-upload ai-workflow-upload--tall" for="aiWorkflowLiveRoom">
              <input id="aiWorkflowLiveRoom" type="file" accept="image/*" @change="loadLiveRoom" />
              <strong>+</strong>
              <span>{{ labels.uploadLiveRoom }}</span>
              <small>{{ liveRoomName }}</small>
            </label>
          </div>

          <div class="ai-workflow-column">
            <div class="ai-workflow-heading-inline">
              <div class="task-map-panel__header">
                <div>
                  <span>{{ labels.output }}</span>
                  <h3>{{ labels.stickerEffect }}</h3>
                </div>
              </div>
              <div class="ai-workflow-toolrow">
                <button type="button" :class="{ active: activeFadeTarget === 'top' }" @click="setFadeTarget('top')">{{ labels.topFade }}</button>
                <button type="button" :class="{ active: activeFadeTarget === 'bottom' }" @click="setFadeTarget('bottom')">{{ labels.bottomFade }}</button>
                <button type="button" @click="clearPath">{{ labels.clearLine }}</button>
                <button type="button" @click="placeTextLayer">{{ labels.placeText }}</button>
              </div>
            </div>
            <div ref="compositionBoard" class="ai-composition-board">
              <img v-if="liveRoomUrl" :src="liveRoomUrl" alt="Live-room screenshot" />
              <div class="ai-composition-center">{{ labels.liveRoomBase }}</div>
              <svg class="ai-sticker-composite" :viewBox="'0 0 ' + boardSize.width + ' ' + boardSize.height" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <filter id="aiFadeBlur" x="-5%" y="-5%" width="110%" height="110%">
                    <feGaussianBlur stdDeviation="18" />
                  </filter>
                  <mask id="aiTopStickerMask" maskUnits="userSpaceOnUse">
                    <rect :width="boardSize.width" :height="boardSize.height" fill="black" />
                    <polygon :points="topMaskPoints" fill="white" />
                    <path v-if="topPathD" :d="topPathD" fill="none" stroke="white" stroke-width="64" stroke-linecap="round" stroke-linejoin="round" filter="url(#aiFadeBlur)" opacity="0.72" />
                  </mask>
                  <mask id="aiBottomStickerMask" maskUnits="userSpaceOnUse">
                    <rect :width="boardSize.width" :height="boardSize.height" fill="black" />
                    <polygon :points="bottomMaskPoints" fill="white" />
                    <path v-if="bottomPathD" :d="bottomPathD" fill="none" stroke="white" stroke-width="64" stroke-linecap="round" stroke-linejoin="round" filter="url(#aiFadeBlur)" opacity="0.72" />
                  </mask>
                </defs>
                <rect class="ai-sticker-fill" x="0" y="0" :width="boardSize.width" :height="topStickerHeight" mask="url(#aiTopStickerMask)" />
                <rect class="ai-sticker-fill ai-sticker-fill--side" x="0" :y="topStickerHeight" :width="sideStickerWidth" :height="sideStickerHeight" />
                <rect class="ai-sticker-fill" x="0" :y="bottomStickerY" :width="boardSize.width" :height="bottomStickerHeight" mask="url(#aiBottomStickerMask)" />
                <text class="ai-sticker-label" :x="boardSize.width / 2" :y="Math.max(42, topStickerHeight * 0.46)" text-anchor="middle">{{ labels.topBg }}</text>
                <text class="ai-sticker-label" :x="sideStickerWidth / 2" :y="topStickerHeight + sideStickerHeight / 2" text-anchor="middle">{{ labels.sideBg }}</text>
                <text class="ai-sticker-label" :x="boardSize.width / 2" :y="bottomStickerY + bottomStickerHeight * 0.55" text-anchor="middle">{{ labels.bottomBg }}</text>
              </svg>
              <div
                v-if="textLayerVisible"
                class="ai-draggable-text-layer"
                :style="textLayerStyle"
                @pointerdown="startTextDrag"
              >
                <div class="ai-text-layer-content">{{ textLayerDisplay }}</div>
                <button class="ai-text-resize-handle" type="button" aria-label="Resize text box" @pointerdown.stop="startTextResize"></button>
              </div>
              <canvas
                ref="pathCanvas"
                @pointerdown="startDrawing"
                @pointermove="continueDrawing"
                @pointerup="endDrawing"
                @pointerleave="endDrawing"
              ></canvas>
            </div>
          </div>

          <div class="ai-export-panel">
            <div class="task-map-panel__header">
              <div>
                <span>{{ labels.output }}</span>
                <h3>{{ labels.exportTitle }}</h3>
              </div>
            </div>
            <div class="ai-workflow-assets ai-workflow-assets--grid">
              <label v-for="asset in assets" :key="asset.title" :class="{ ready: asset.ready }">
                <input type="checkbox" :checked="asset.ready" @change="asset.ready = $event.target.checked" />
                <strong>{{ asset.title }}</strong>
                <small>{{ asset.copy }}</small>
              </label>
            </div>
            <div class="ai-export-actions">
              <button type="button" class="ai-workflow-button" @click="simulateRun('export')">{{ labels.exportAll }}</button>
              <button type="button" class="ai-workflow-button" @click="downloadPathData">{{ labels.exportPath }}</button>
              <button type="button" class="ai-workflow-button" @click="downloadPlan">{{ labels.downloadPlan }}</button>
            </div>
            <p class="ai-status-line">{{ statusText }}</p>
          </div>
        </article>
      </div>
    </section>
  `
};

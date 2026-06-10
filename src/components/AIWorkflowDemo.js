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
      activeStep: "extract",
      statusText: this.lang === "zh" ? "等待输入" : "Waiting",
      running: false,
      referenceUrl: "",
      referenceName: this.lang === "zh" ? "未选择参考图" : "No reference selected",
      promptText: this.lang === "zh"
        ? "结合直播间底图生成一组套图：上贴、侧贴、下贴背景；保持文字文案不变，只调整配色并输出透明文字图层。"
        : "Generate a sticker set from the live-room background: top, side, and bottom layers. Preserve the copy, adjust only the color, and export a transparent text layer.",
      pathPoints: [],
      isDrawing: false,
      objectUrl: "",
      assets: [
        { title: this.lang === "zh" ? "文字图层" : "Text layer", copy: this.lang === "zh" ? "纯白/纯黑底，等待抠透明" : "White or black backing for cutout", ready: true },
        { title: this.lang === "zh" ? "上贴背景" : "Top layer", copy: this.lang === "zh" ? "保留上部，边缘渐隐" : "Keep upper edge with fade", ready: false },
        { title: this.lang === "zh" ? "侧贴背景" : "Side layer", copy: this.lang === "zh" ? "用于左侧或侧边贴片" : "For side composition", ready: false },
        { title: this.lang === "zh" ? "下贴背景" : "Bottom layer", copy: this.lang === "zh" ? "保留下部，方便叠直播间" : "Keep bottom edge for overlay", ready: false }
      ]
    };
  },
  computed: {
    labels() {
      return {
        zh: {
          kicker: "interactive demo",
          title: "路径融合测试台",
          intro: "按住下方画布拖动，记录一条用于边缘透明过渡的路径。当前为前端原型，后续会把路径数据交给真实 API 生成 mask。",
          input: "原型输入",
          upload: "上传参考图",
          uploadHint: "用于提取文字、版式、字体特征和背景风格",
          prompt: "语言描述",
          run: "模拟执行当前步骤",
          running: "执行中...",
          output: "图层清单",
          downloadPlan: "下载流程说明",
          clearPath: "清除路径",
          exportPath: "导出路径数据",
          ready: "准备就绪",
          drawable: "可手绘路径",
          loaded: "参考图已载入",
          done: "已生成占位结果",
          pathDone: "路径已记录",
          pathCleared: "路径已清除",
          testTitle: "路径融合测试",
          testCopy: "在半透明画布按住鼠标左键拖动，系统会记录一条平滑路径；后续 API 会把这条路径转成边缘透明过渡 mask。"
        },
        en: {
          kicker: "interactive demo",
          title: "Blend path test bench",
          intro: "Drag on the canvas to record a path for transparent edge blending. This prototype will later pass path data into an API-generated mask.",
          input: "Prototype input",
          upload: "Upload reference",
          uploadHint: "For text, layout, font features, and background style",
          prompt: "Prompt",
          run: "Simulate current step",
          running: "Running...",
          output: "Layer list",
          downloadPlan: "Download workflow note",
          clearPath: "Clear path",
          exportPath: "Export path data",
          ready: "Ready",
          drawable: "Draw enabled",
          loaded: "Reference loaded",
          done: "Placeholder generated",
          pathDone: "Path recorded",
          pathCleared: "Path cleared",
          testTitle: "Blend path test",
          testCopy: "Hold the left mouse button and drag across the translucent canvas. The prototype records a smooth path for a future edge-fade mask API."
        }
      }[this.lang];
    },
    stepCards() {
      return {
        zh: [
          { key: "extract", title: "文字图层", copy: "提取文案与布局" },
          { key: "background", title: "三贴背景", copy: "生成上/侧/下贴" },
          { key: "blend", title: "路径融合", copy: "手绘边缘过渡" },
          { key: "export", title: "导出图层", copy: "透明底与参考图" }
        ],
        en: [
          { key: "extract", title: "Text layer", copy: "Extract copy and layout" },
          { key: "background", title: "Sticker set", copy: "Generate top, side, bottom" },
          { key: "blend", title: "Blend path", copy: "Draw edge transition" },
          { key: "export", title: "Export", copy: "Layers and references" }
        ]
      }[this.lang];
    },
    stepLabels() {
      return {
        zh: {
          extract: "01 · 文字图层生成",
          background: "02 · 三贴背景生成",
          blend: "03 · 手绘路径融合",
          export: "04 · 图层导出"
        },
        en: {
          extract: "01 · Text layer generation",
          background: "02 · Sticker set generation",
          blend: "03 · Hand-drawn blend path",
          export: "04 · Layer export"
        }
      }[this.lang];
    },
    activeStepLabel() {
      return this.stepLabels[this.activeStep];
    }
  },
  mounted() {
    this.resizeCanvasForDisplay();
    window.addEventListener("resize", this.resizeCanvasForDisplay);
  },
  beforeUnmount() {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    window.removeEventListener("resize", this.resizeCanvasForDisplay);
  },
  methods: {
    setActiveStep(step) {
      this.activeStep = step;
      this.statusText = step === "blend" ? this.labels.drawable : this.labels.ready;
    },
    loadReference(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = URL.createObjectURL(file);
      this.referenceUrl = this.objectUrl;
      this.referenceName = file.name;
      this.statusText = this.labels.loaded;
    },
    simulateRun() {
      this.running = true;
      this.statusText = this.labels.running;
      window.setTimeout(() => {
        this.running = false;
        this.statusText = this.labels.done;
        const waiting = this.assets.find((asset) => !asset.ready);
        if (waiting) waiting.ready = true;
      }, 780);
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
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    },
    startDrawing(event) {
      this.isDrawing = true;
      this.pathPoints = [this.getPoint(event)];
      this.$refs.pathCanvas.setPointerCapture(event.pointerId);
      this.setActiveStep("blend");
      this.redrawPath();
    },
    continueDrawing(event) {
      if (!this.isDrawing) return;
      const point = this.getPoint(event);
      const last = this.pathPoints[this.pathPoints.length - 1];
      if (Math.hypot(point.x - last.x, point.y - last.y) > 4) {
        this.pathPoints.push(point);
        this.redrawPath();
      }
    },
    endDrawing(event) {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      if (event.pointerId !== undefined) this.$refs.pathCanvas.releasePointerCapture(event.pointerId);
      this.statusText = this.labels.pathDone;
    },
    redrawPath() {
      const canvas = this.$refs.pathCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      if (this.pathPoints.length < 2) return;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(11, 11, 15, 0.84)";
      ctx.shadowColor = "rgba(11, 11, 15, 0.18)";
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.pathPoints[0].x, this.pathPoints[0].y);
      for (let i = 1; i < this.pathPoints.length - 1; i += 1) {
        const midX = (this.pathPoints[i].x + this.pathPoints[i + 1].x) / 2;
        const midY = (this.pathPoints[i].y + this.pathPoints[i + 1].y) / 2;
        ctx.quadraticCurveTo(this.pathPoints[i].x, this.pathPoints[i].y, midX, midY);
      }
      ctx.stroke();
      ctx.restore();
    },
    clearPath() {
      this.pathPoints = [];
      this.redrawPath();
      this.setActiveStep("blend");
      this.statusText = this.labels.pathCleared;
    },
    downloadPathData() {
      const data = {
        type: "blend-path",
        createdAt: new Date().toISOString(),
        pointCount: this.pathPoints.length,
        points: this.pathPoints
      };
      this.downloadBlob(JSON.stringify(data, null, 2), "blend-path.json", "application/json;charset=utf-8");
    },
    downloadPlan() {
      const plan = [
        "AI MCP Workflow",
        "",
        "1. Upload a reference image and extract text, layout, and font features.",
        "2. Generate top, side, and bottom sticker backgrounds from the prompt.",
        "3. Draw a path over the live-room background to control transparent edge blending.",
        "4. Recolor text while preserving the copy.",
        "5. Cut out the transparent text layer.",
        "6. Export all layers for Figma, Photoshop, or live assets.",
        "",
        "Prompt:",
        this.promptText
      ].join("\n");
      this.downloadBlob(plan, "ai-mcp-workflow.txt", "text/plain;charset=utf-8");
    },
    downloadBlob(content, filename, type) {
      const blob = new Blob([content], { type });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    }
  },
  template: `
    <section class="task-map-demo ai-workflow-demo" aria-label="AI MCP workflow demo">
      <div class="task-map-demo__intro">
        <p class="task-map-demo__kicker">{{ labels.kicker }}</p>
        <h2>{{ labels.title }}</h2>
        <p>{{ labels.intro }}</p>
      </div>

      <div class="ai-workflow-shell">
        <aside class="ai-workflow-panel">
          <div class="task-map-panel__header">
            <div>
              <span>INPUT</span>
              <h3>{{ labels.input }}</h3>
            </div>
          </div>

          <label class="ai-workflow-upload" for="aiWorkflowReference">
            <input id="aiWorkflowReference" type="file" accept="image/*" @change="loadReference" />
            <strong>+</strong>
            <span>{{ labels.upload }}</span>
            <small>{{ labels.uploadHint }}</small>
          </label>

          <label class="ai-workflow-field">
            <span>{{ labels.prompt }}</span>
            <textarea v-model="promptText" rows="5"></textarea>
          </label>

          <div class="ai-workflow-modes">
            <button
              v-for="step in stepCards"
              :key="step.key"
              type="button"
              :class="{ active: activeStep === step.key }"
              @click="setActiveStep(step.key)"
            >
              <strong>{{ step.title }}</strong>
              <span>{{ step.copy }}</span>
            </button>
          </div>

          <button type="button" class="ai-workflow-button ai-workflow-button--dark" :disabled="running" @click="simulateRun">
            {{ running ? labels.running : labels.run }}
          </button>
        </aside>

        <section class="ai-workflow-stage">
          <header>
            <span>{{ activeStepLabel }}</span>
            <em>{{ statusText }}</em>
          </header>

          <div class="ai-workflow-canvas-area">
            <div class="ai-workflow-test-note">
              <strong>{{ labels.testTitle }}</strong>
              <span>{{ labels.testCopy }}</span>
            </div>

            <div class="ai-workflow-reference">
              <div>
                <img v-if="referenceUrl" :src="referenceUrl" alt="Reference image" />
                <span v-else>Reference</span>
              </div>
              <p>{{ referenceName }}</p>
            </div>

            <div class="ai-workflow-layers">
              <div>Top sticker</div>
              <div>Side sticker</div>
              <div>Transparent text</div>
              <div>Bottom sticker</div>
            </div>

            <canvas
              ref="pathCanvas"
              @pointerdown="startDrawing"
              @pointermove="continueDrawing"
              @pointerup="endDrawing"
              @pointerleave="endDrawing"
            ></canvas>
          </div>
        </section>

        <aside class="ai-workflow-panel">
          <div class="task-map-panel__header">
            <div>
              <span>OUTPUT</span>
              <h3>{{ labels.output }}</h3>
            </div>
          </div>

          <div class="ai-workflow-assets">
            <div v-for="asset in assets" :key="asset.title" :class="{ ready: asset.ready }">
              <i></i>
              <strong>{{ asset.title }}</strong>
              <small>{{ asset.copy }}</small>
            </div>
          </div>

          <button type="button" class="ai-workflow-button" @click="downloadPlan">{{ labels.downloadPlan }}</button>
          <button type="button" class="ai-workflow-button" @click="clearPath">{{ labels.clearPath }}</button>
          <button type="button" class="ai-workflow-button" @click="downloadPathData">{{ labels.exportPath }}</button>
        </aside>
      </div>
    </section>
  `
};

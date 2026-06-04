export default {
  name: "ProjectDetailView",
  props: {
    lang: {
      type: String,
      required: true
    },
    project: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      loadedCodeBlocks: []
    };
  },
  computed: {
    detail() {
      return this.project?.details?.[this.lang] || {};
    },
    title() {
      return this.detail.title || this.project?.title?.[this.lang] || "";
    },
    description() {
      return this.detail.description || this.title;
    },
    titleParts() {
      return this.buildTitleParts(this.title);
    },
    hero() {
      return this.detail.hero || this.project?.image;
    },
    legacyUrl() {
      return this.project?.legacy?.[this.lang] || "";
    },
    outputImages() {
      return this.detail.images || [];
    },
    pdfs() {
      return this.detail.pdfs || [];
    },
    codeBlockRefs() {
      return this.detail.codeBlocks || [];
    },
    embeds() {
      return (this.detail.iframes || []).map((src, index) => ({
        label: this.embedLabel(src, index),
        src: src.startsWith("//") ? `https:${src}` : src,
        requiresVpn: this.embedRequiresVpn(src),
        figmaUrl: this.figmaUrl(src)
      }));
    }
  },
  watch: {
    codeBlockRefs: {
      handler() {
        this.loadCodeBlocks();
      },
      immediate: true
    }
  },
  methods: {
    embedLabel(src, index) {
      if (src.includes("figma.com")) return "Figma";
      if (src.includes("bilibili.com")) return "Bilibili";
      if (src.includes("vimeo.com")) return "Vimeo";
      if (src.includes("youtube.com")) return "YouTube";
      return `${this.lang === "zh" ? "嵌入内容" : "Embed"} ${index + 1}`;
    },
    embedRequiresVpn(src) {
      return ["youtube.com", "youtu.be", "vimeo.com"].some((domain) => src.includes(domain));
    },
    figmaUrl(src) {
      if (!src.includes("embed.figma.com")) return "";
      try {
        const url = new URL(src);
        const nodeId = url.searchParams.get("node-id");
        url.hostname = "www.figma.com";
        url.searchParams.delete("embed-host");
        if (nodeId) url.searchParams.set("node-id", nodeId);
        return url.toString();
      } catch {
        return "";
      }
    },
    languageLabel(language) {
      return (language || "text").toUpperCase();
    },
    buildTitleParts(value) {
      const parts = [];
      const source = value || "";
      const separatorPattern = /\s*(———|——|—|\s+-\s+)\s*/g;
      let lastIndex = 0;
      let match;

      while ((match = separatorPattern.exec(source))) {
        if (match.index > lastIndex) {
          parts.push({
            type: "text",
            value: source.slice(lastIndex, match.index)
          });
        }

        parts.push({
          type: "separator",
          value: "·"
        });
        lastIndex = separatorPattern.lastIndex;
      }

      if (lastIndex < source.length) {
        parts.push({
          type: "text",
          value: source.slice(lastIndex)
        });
      }

      return parts.length ? parts : [{ type: "text", value: source }];
    },
    async loadCodeBlocks() {
      const refs = this.codeBlockRefs;
      if (!refs.length) {
        this.loadedCodeBlocks = [];
        return;
      }

      const blocks = await Promise.all(refs.map(async (block) => {
        try {
          const response = await fetch(block.src);
          if (!response.ok) throw new Error(`Unable to load ${block.src}`);
          return {
            ...block,
            code: await response.text()
          };
        } catch {
          return {
            ...block,
            code: this.lang === "zh" ? "代码资源加载失败" : "Code resource failed to load"
          };
        }
      }));

      this.loadedCodeBlocks = blocks;
    },
    async copyCode(block) {
      if (!navigator.clipboard || !block.code) return;
      await navigator.clipboard.writeText(block.code);
    },
    disciplineLabel(key) {
      const labels = {
        en: {
          visual: "Visual Design",
          ui: "UI Design",
          product: "Industrial Product",
          others: "Others"
        },
        zh: {
          visual: "视觉设计",
          ui: "UI 设计",
          product: "工业产品设计",
          others: "其他"
        }
      };
      return labels[this.lang][key] || key;
    }
  },
  template: `
    <section v-if="project" class="project-detail">
      <div class="project-hero">
        <img :src="hero" :alt="title" />
        <div class="project-copy">
          <p class="project-kicker">{{ disciplineLabel(project.discipline) }}</p>
          <h1>
            <template v-for="(part, index) in titleParts" :key="index">
              <span v-if="part.type === 'separator'" class="title-separator">{{ part.value }}</span>
              <span v-else>{{ part.value }}</span>
            </template>
          </h1>
          <p>{{ description }}</p>
        </div>
      </div>

      <section v-if="pdfs.length" class="download-row">
        <a v-for="pdf in pdfs" :key="pdf" class="download-link" :href="pdf" target="_blank" rel="noreferrer">
          {{ lang === 'zh' ? '项目 PDF 下载' : 'Project PDF download' }}
        </a>
      </section>

      <section v-if="outputImages.length" class="output-gallery">
        <img v-for="image in outputImages" :key="image" :src="image" :alt="title" />
      </section>

      <section v-if="loadedCodeBlocks.length" class="code-stack">
        <article v-for="block in loadedCodeBlocks" :key="block.src" class="code-panel">
          <header class="code-panel__header">
            <div>
              <h2>{{ block.title }}</h2>
              <span>{{ languageLabel(block.language) }}</span>
            </div>
            <button type="button" class="code-copy" @click="copyCode(block)">
              {{ lang === 'zh' ? '复制' : 'Copy' }}
            </button>
          </header>
          <pre class="code-panel__body"><code :class="'language-' + block.language">{{ block.code }}</code></pre>
        </article>
      </section>

      <section v-if="embeds.length" class="embed-stack">
        <article v-for="embed in embeds" :key="embed.src" class="embed-panel">
          <h2>{{ embed.label }}</h2>
          <iframe
            :key="embed.src + '-' + project.slug"
            :src="embed.src"
            loading="lazy"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
          <p v-if="embed.requiresVpn" class="embed-note">
            {{ lang === 'zh' ? '需 VPN 观看' : 'VPN required to view' }}
          </p>
        </article>
      </section>
    </section>
    <section v-else class="project-detail project-detail--empty">
      <h1>{{ lang === 'zh' ? '作品未找到' : 'Project not found' }}</h1>
      <a class="text-link" :href="'#/' + lang + '/projects/school'">
        {{ lang === 'zh' ? '返回作品列表' : 'Back to projects' }}
      </a>
    </section>
  `
};

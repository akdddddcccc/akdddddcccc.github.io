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
    embeds() {
      return (this.detail.iframes || []).map((src, index) => ({
        label: this.embedLabel(src, index),
        src: src.startsWith("//") ? `https:${src}` : src,
        requiresVpn: this.embedRequiresVpn(src),
        figmaUrl: this.figmaUrl(src)
      }));
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
          <h1>{{ title }}</h1>
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

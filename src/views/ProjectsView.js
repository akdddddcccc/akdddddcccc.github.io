import { content, projects } from "../data/content.js";

export default {
  name: "ProjectsView",
  props: {
    lang: {
      type: String,
      required: true
    },
    kind: {
      type: String,
      required: true
    }
  },
  computed: {
    activeKind() {
      return ["all", "visual", "ui", "product", "others"].includes(this.kind) ? this.kind : "all";
    },
    filters() {
      return content.projectFilters[this.lang];
    },
    projects() {
      if (this.activeKind === "all") return projects;
      return projects.filter((project) => project.discipline === this.activeKind);
    }
  },
  methods: {
    projectHref(project) {
      return project.closed ? null : `#/${this.lang}/project/${project.slug}`;
    }
  },
  template: `
    <section class="project-browser" aria-label="Projects">
      <div class="project-filterbar" aria-label="Project categories">
        <a
          v-for="filter in filters"
          :key="filter.key"
          class="filter-button"
          :class="{ active: activeKind === filter.key }"
          :href="'#/' + lang + '/projects/' + filter.key"
        >{{ filter.label }}</a>
      </div>

      <div class="project-grid">
        <article
          v-for="project in projects"
          :key="project.slug"
          class="project-card"
          :class="{ 'project-card--closed': project.closed }"
        >
          <a v-if="projectHref(project)" :href="projectHref(project)" class="project-card__link">
            <img class="project-card__image" :src="project.image" :alt="project.title[lang]" />
            <span class="project-card__title">{{ project.title[lang] }}</span>
          </a>
          <div v-else class="project-card__link">
            <img class="project-card__image" :src="project.image" :alt="project.title[lang]" />
            <span class="project-card__title">{{ project.title[lang] }}</span>
          </div>
        </article>
      </div>
    </section>
  `
};

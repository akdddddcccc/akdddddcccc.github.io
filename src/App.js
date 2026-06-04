import { computed, onMounted, onUnmounted, reactive } from "/vendor/vue.esm-browser.prod.js";
import { content, findProject } from "./data/content.js";
import SiteHeader from "./components/SiteHeader.js";
import HomeView from "./views/HomeView.js";
import AboutView from "./views/AboutView.js";
import ContactView from "./views/ContactView.js";
import ProjectsView from "./views/ProjectsView.js";
import ProjectDetailView from "./views/ProjectDetailView.js";

function getHashPath() {
  return window.location.hash.replace(/^#/, "") || "/";
}

export default {
  name: "App",
  components: {
    SiteHeader,
    HomeView,
    AboutView,
    ContactView,
    ProjectsView,
    ProjectDetailView
  },
  setup() {
    const route = reactive({ path: getHashPath() });
    const updateRoute = () => {
      route.path = getHashPath();
      window.scrollTo({ top: 0, behavior: "instant" });
    };

    onMounted(() => window.addEventListener("hashchange", updateRoute));
    onUnmounted(() => window.removeEventListener("hashchange", updateRoute));

    const parts = computed(() => route.path.split("/").filter(Boolean));
    const lang = computed(() => (["en", "zh"].includes(parts.value[0]) ? parts.value[0] : null));
    const page = computed(() => parts.value[1] || "home");
    const kind = computed(() => {
      const value = parts.value[2] || "all";
      return ["visual", "ui", "product", "others", "all"].includes(value) ? value : "all";
    });
    const slug = computed(() => parts.value[2] || "");
    const project = computed(() => findProject(slug.value));
    const activeSection = computed(() => {
      if (page.value === "projects" || page.value === "project") return "artwork";
      return page.value;
    });
    const returnKind = computed(() => project.value?.discipline || kind.value || "all");

    return {
      content,
      route,
      lang,
      page,
      kind,
      project,
      activeSection,
      returnKind
    };
  },
  template: `
    <HomeView v-if="!lang" />
    <template v-else>
      <SiteHeader
        :lang="lang"
        :active-section="activeSection"
        :return-kind="returnKind"
        :compact="page === 'project'"
      />
      <main>
        <AboutView v-if="page === 'about'" :lang="lang" />
        <ContactView v-else-if="page === 'contact'" :lang="lang" />
        <ProjectDetailView
          v-else-if="page === 'project'"
          :lang="lang"
          :project="project"
        />
        <ProjectsView
          v-else
          :lang="lang"
          :kind="kind"
        />
      </main>
    </template>
  `
};

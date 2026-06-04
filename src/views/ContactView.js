import { content } from "../data/content.js";

export default {
  name: "ContactView",
  computed: {
    contact() {
      return content.contact;
    }
  },
  template: `
    <section class="contact-page">
      <img class="contact-image" :src="contact.image" alt="Concept portrait" />
      <div class="contact-list">
        <p v-for="item in contact.items" :key="item.label">
          <strong>{{ item.label }}</strong>
          <span>{{ item.value }}</span>
        </p>
      </div>
    </section>
  `
};

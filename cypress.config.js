const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "http://37.27.17.198:8084/cs/",
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});

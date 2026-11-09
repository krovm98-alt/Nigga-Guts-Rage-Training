const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "tests/browser",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:8765/Nigga-Guts-Rage-Training/",
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_BUNDLED
        ? undefined
        : process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "node tests/server.cjs",
    url: "http://127.0.0.1:8765/Nigga-Guts-Rage-Training/",
    reuseExistingServer: true,
  },
});

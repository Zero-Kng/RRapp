import { defineConfig, devices } from "@playwright/test";

// Ponta a ponta contra o backend local (Docker + runserver). Não roda no CI.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
  },
  // Usa o Edge que já vem no Windows: dispensa baixar o Chromium do Playwright (~150 MB)
  projects: [{ name: "edge", use: { ...devices["Desktop Edge"], channel: "msedge" } }],
});

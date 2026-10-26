import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// The test process reads the Clerk keys and test users' emails from .env.local.
dotenv.config({ path: ".env.local", quiet: true });

const APP_PORT = 3100;
const FAKE_MUSEUM_PORT = 4010;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global.setup.ts",
  timeout: 90_000,
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${APP_PORT}`, trace: "retain-on-failure" },
  webServer: [
    {
      command: "node e2e/fake-museum.mjs",
      url: `http://localhost:${FAKE_MUSEUM_PORT}/api/v1/artworks/search?limit=0`,
      env: { FAKE_MUSEUM_PORT: String(FAKE_MUSEUM_PORT) },
    },
    {
      command: `npx next dev --port ${APP_PORT}`,
      url: `http://localhost:${APP_PORT}`,
      timeout: 120_000,
      env: { MUSEUM_API_BASE: `http://localhost:${FAKE_MUSEUM_PORT}/api/v1` },
    },
  ],
});

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.TEST_BASE_URL ?? "http://localhost:3100",
    locale: "lt-LT",
    timezoneId: "Europe/Vilnius",
    trace: "off",
  },
});

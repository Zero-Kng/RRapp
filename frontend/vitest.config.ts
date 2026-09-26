import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/testes/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      css: false,
      // Testes que digitam em vários campos passam de 5 s (o padrão) em máquinas mais lentas
      testTimeout: 15_000,
    },
  }),
);

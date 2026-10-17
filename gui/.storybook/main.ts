import { resolve } from "node:path";

import type { StorybookConfig } from "@storybook/react-vite";
import { loadConfigFromFile, mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  // StrictMode as in main.tsx: the app counts on effects running twice in development.
  framework: { name: "@storybook/react-vite", options: { strictMode: true } },
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  // The theme draws the ground, and no story is published anywhere.
  features: {
    backgrounds: false,
    sidebarOnboardingChecklist: false,
    menuOnboardingChecklist: false,
  },
  // Storybook's dev server replaces the app's server options: the folders the app's watcher leaves
  // alone, such as the copy of index.html in android/, would reload every story.
  async viteFinal(viteConfig, { configType }) {
    if (configType !== "DEVELOPMENT") {
      return viteConfig;
    }
    const app = await loadConfigFromFile(
      { command: "serve", mode: "development" },
      undefined,
      resolve(import.meta.dirname, ".."),
    );
    return mergeConfig(viteConfig, { server: { watch: app?.config.server?.watch ?? {} } });
  },
};

export default config;

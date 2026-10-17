import { resolve } from "node:path";

import type { StorybookConfig } from "@storybook/react-vite";
import { loadConfigFromFile, mergeConfig } from "vite";

// Node loads this file itself, and finds an import only by its full name.
import { PACK_VARIABLE, readStoryPack, storyPackPlugin } from "./pack.ts";

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
  async viteFinal(viteConfig, { configType }) {
    const packFolder = process.env[PACK_VARIABLE] ?? "";
    if (configType !== "DEVELOPMENT") {
      // A built Storybook is a site that can be handed around; a pack stays on this machine.
      if (packFolder !== "") {
        throw new Error(`${PACK_VARIABLE} is set: a resource pack never goes into a build`);
      }
      return mergeConfig(viteConfig, { plugins: [storyPackPlugin(null)] });
    }
    // Storybook's dev server replaces the app's server options: the folders the app's watcher
    // leaves alone, such as the copy of index.html in android/, would reload every story.
    const app = await loadConfigFromFile(
      { command: "serve", mode: "development" },
      undefined,
      resolve(import.meta.dirname, ".."),
    );
    return mergeConfig(viteConfig, {
      plugins: [storyPackPlugin(packFolder === "" ? null : readStoryPack(packFolder))],
      server: { watch: app?.config.server?.watch ?? {} },
    });
  },
};

export default config;

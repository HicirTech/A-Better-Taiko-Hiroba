import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hicirtech.taikohiroba",
  appName: "A Better Taiko Hiroba",
  webDir: "out/web",
  // Capacitor's native logger prints every Set-Cookie it stores, value included.
  loggingBehavior: "none",
  plugins: {
    // Left off: patching fetch would hide the final URL a lost session is recognised by.
    CapacitorHttp: { enabled: false },
    // Held until the app draws its own cover, or for this long if the app never says so.
    SplashScreen: { launchShowDuration: 3_000 },
  },
};

export default config;

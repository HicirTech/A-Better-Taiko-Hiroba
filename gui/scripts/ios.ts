/** The iOS build and run workflow behind the ios:* package scripts; it needs a Mac with Xcode. */
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import pkg from "../package.json";
import { buildWeb, fail, guiRoot, run, runLive } from "./capacitor-run";

const [command, target, host = "127.0.0.1"] = process.argv.slice(2);
const project = join(guiRoot, "ios", "App");

// Unsigned: whoever installs the app signs it with their own Apple account.
function buildForDevice(configuration: "Debug" | "Release", settings: string[] = []): void {
  run(
    [
      "xcodebuild",
      "-project",
      "App.xcodeproj",
      "-scheme",
      "App",
      "-configuration",
      configuration,
      "-destination",
      "generic/platform=iOS",
      ...settings,
      "CODE_SIGNING_ALLOWED=NO",
      "build",
    ],
    project,
  );
}

/** Builds the release app and packs it as release/ABTH-<version>.ipa. */
function buildIpa(): void {
  const derivedData = join(project, "build");
  buildForDevice("Release", [
    "-derivedDataPath",
    derivedData,
    `MARKETING_VERSION=${pkg.version}`,
    `CURRENT_PROJECT_VERSION=${pkg.version}`,
  ]);
  const staging = join(derivedData, "ipa");
  rmSync(staging, { recursive: true, force: true });
  run([
    "ditto",
    join(derivedData, "Build", "Products", "Release-iphoneos", "App.app"),
    join(staging, "Payload", "App.app"),
  ]);
  const releaseFolder = join(guiRoot, "release");
  const ipa = join(releaseFolder, `ABTH-${pkg.version}.ipa`);
  mkdirSync(releaseFolder, { recursive: true });
  rmSync(ipa, { force: true });
  run(["zip", "-qry", ipa, "Payload"], staging);
}

switch (command) {
  case "build":
    buildWeb("ios");
    buildForDevice("Debug");
    break;
  case "ipa":
    buildWeb("ios");
    buildIpa();
    break;
  case "run":
    if (target === undefined) {
      fail("Usage: bun run ios:run -- <simulator id>");
    }
    buildWeb("ios");
    run(["bun", "x", "cap", "run", "ios", "--no-sync", "--target", target]);
    break;
  case "live":
    if (target === undefined) {
      fail("Usage: bun run ios:live -- <simulator id> [host]");
    }
    runLive("ios", target, host);
    break;
  default:
    fail(
      "Usage: bun run ios:build | ios:ipa | ios:run <simulator id> | ios:live <simulator id> [host]",
    );
}

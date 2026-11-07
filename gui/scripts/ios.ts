/** The iOS build and run workflow behind the ios:* package scripts; it needs a Mac with Xcode. */
import { join } from "node:path";

import { buildWeb, fail, guiRoot, run, runLive } from "./capacitor-run";

const [command, target, host = "127.0.0.1"] = process.argv.slice(2);

switch (command) {
  case "build":
    buildWeb("ios");
    run(
      [
        "xcodebuild",
        "-project",
        "App.xcodeproj",
        "-scheme",
        "App",
        "-configuration",
        "Debug",
        "-destination",
        "generic/platform=iOS",
        "CODE_SIGNING_ALLOWED=NO",
        "build",
      ],
      join(guiRoot, "ios", "App"),
    );
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
    fail("Usage: bun run ios:build | ios:run <simulator id> | ios:live <simulator id> [host]");
}

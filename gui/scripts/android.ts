/** The Android build and run workflow behind the android:* package scripts. */
import { join } from "node:path";

import { buildWeb, fail, guiRoot, run, runLive } from "./capacitor-run";

const [command, serial, lanIp] = process.argv.slice(2);

function buildApk(task: "assembleDebug" | "assembleRelease"): void {
  buildWeb("android");
  const gradle =
    process.platform === "win32" ? ["cmd.exe", "/d", "/c", "gradlew.bat"] : ["./gradlew"];
  run([...gradle, task], join(guiRoot, "android"));
}

switch (command) {
  case "apk":
    buildApk("assembleDebug");
    break;
  case "run":
    if (serial === undefined) {
      fail("Usage: bun run android:run -- <adb serial>");
    }
    buildApk("assembleDebug");
    run(["bun", "x", "cap", "run", "android", "--no-sync", "--target", serial]);
    break;
  case "live":
    if (serial === undefined || lanIp === undefined) {
      fail("Usage: bun run android:live -- <adb serial> <LAN IP>");
    }
    runLive("android", serial, lanIp);
    break;
  case "release":
    buildApk("assembleRelease");
    break;
  default:
    fail(
      "Usage: bun run android:apk | android:run <serial> | android:live <serial> <LAN IP> | android:release",
    );
}

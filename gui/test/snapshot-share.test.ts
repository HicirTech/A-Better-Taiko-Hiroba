import { expect, test } from "bun:test";

import { type DesktopPictures, desktopShare } from "../src/platform/desktop-share";
import { snapshotName } from "../src/snapshots/snapshot-png";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** The preload's two verbs, noting what they were handed; a save answers `saved`. */
function preload(saved: "saved" | "cancelled") {
  const handed: string[] = [];
  const pictures: DesktopPictures = {
    copy: (png) => {
      handed.push(`copy ${png.byteLength}`);
      return Promise.resolve();
    },
    save: (png, name) => {
      handed.push(`save ${png.byteLength} ${name}`);
      return Promise.resolve(saved);
    },
  };
  return { pictures, handed };
}

test("a snapshot's file is named for what it shows and the day it was made", () => {
  expect(snapshotName("abth-rating", new Date(2026, 9, 26, 23, 59))).toBe(
    "abth-rating-2026-10-26.png",
  );
  expect(snapshotName("abth-profile", new Date(2027, 0, 5))).toBe("abth-profile-2027-01-05.png");
});

test("the desktop offers the clipboard first, then a file", () => {
  expect(desktopShare(preload("saved").pictures).ways).toEqual(["copy", "save"]);
});

test("the desktop copies a picture, and saves it under its name", async () => {
  const { pictures, handed } = preload("saved");
  const share = desktopShare(pictures);

  expect(await share.hand("copy", PNG, "abth-rating-2026-10-26.png")).toBe("done");
  expect(await share.hand("save", PNG, "abth-rating-2026-10-26.png")).toBe("done");

  expect(handed).toEqual(["copy 8", "save 8 abth-rating-2026-10-26.png"]);
});

test("a save the player turns down in the save box is no failure", async () => {
  const share = desktopShare(preload("cancelled").pictures);

  expect(await share.hand("save", PNG, "abth-profile-2026-10-26.png")).toBe("dismissed");
});

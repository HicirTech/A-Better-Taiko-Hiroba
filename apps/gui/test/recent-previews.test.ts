import { describe, expect, test } from "bun:test";
import { err, ok, type Result } from "@abth/core";

import { createRecentPreviews } from "../src/hiroba-session/recent-previews";
import type { CostumePreviewFailure, CostumeSet } from "../src/session-port";
import { pictureOf, withFace } from "./history-fixtures";

type Answer = Result<string, CostumePreviewFailure>;

/** A preview that answers each set with its own picture, and records what it was asked. */
function answering() {
  const asked: CostumeSet[] = [];
  const preview = async (set: CostumeSet): Promise<Answer> => {
    asked.push(set);
    return ok(pictureOf(`face ${set.colorFace}`));
  };
  return { asked, preview };
}

describe("createRecentPreviews", () => {
  test("keeps the picture of a set it served, and gives it back for exactly that set", async () => {
    const previews = createRecentPreviews();
    const { preview } = answering();

    const served = await previews.keeping(preview)(withFace(3));

    expect(served).toEqual(ok(pictureOf("face 3")));
    expect(previews.pictureOf(withFace(3))).toBe(pictureOf("face 3"));
    expect(previews.pictureOf(withFace(4))).toBeNull();
    expect(previews.pictureOf({ ...withFace(3), costume5: 0 })).toBeNull();
  });

  test("asks the preview it wraps what the window asked, and gives back its answer as it is", async () => {
    const previews = createRecentPreviews();
    const { asked, preview } = answering();

    await previews.keeping(preview)(withFace(3));

    expect(asked).toEqual([withFace(3)]);
  });

  test("keeps no picture for a preview that did not come, and gives its failure back", async () => {
    const previews = createRecentPreviews();
    const failure = err({ code: "preview=notPng" });

    const served = await previews.keeping(async () => failure)(withFace(3));

    expect(served).toBe(failure);
    expect(previews.pictureOf(withFace(3))).toBeNull();
  });

  test("keeps the last eight sets, and the oldest goes", async () => {
    const previews = createRecentPreviews();
    const serve = previews.keeping(answering().preview);
    const faces = Array.from({ length: 9 }, (_, at) => at + 1);

    for (const face of faces) {
      await serve(withFace(face));
    }

    expect(faces.map((face) => previews.pictureOf(withFace(face)) !== null)).toEqual([
      false,
      ...Array(8).fill(true),
    ]);
  });

  test("counts a set served again as the newest, with its newest picture", async () => {
    const previews = createRecentPreviews();
    let latest = "first";
    const serve = previews.keeping(async (set) => ok(pictureOf(`${latest} ${set.colorFace}`)));

    await serve(withFace(1));
    for (const face of [2, 3, 4, 5, 6, 7, 8]) {
      await serve(withFace(face));
    }
    latest = "second";
    await serve(withFace(1));
    await serve(withFace(9));

    expect(previews.pictureOf(withFace(1))).toBe(pictureOf("second 1"));
    expect(previews.pictureOf(withFace(2))).toBeNull();
    expect(previews.pictureOf(withFace(3))).toBe(pictureOf("first 3"));
  });

  test("forgets every picture when it is cleared", async () => {
    const previews = createRecentPreviews();
    const serve = previews.keeping(answering().preview);
    await serve(withFace(1));
    await serve(withFace(2));

    previews.clear();

    expect([1, 2].map((face) => previews.pictureOf(withFace(face)))).toEqual([null, null]);
  });

  test("keeps no picture that lands after it was cleared, which is the next session's to ask for", async () => {
    const previews = createRecentPreviews();
    let land: (answer: Answer) => void = () => undefined;
    const late = new Promise<Answer>((resolve) => {
      land = resolve;
    });
    const asking = previews.keeping(() => late)(withFace(1));

    previews.clear();
    land(ok(pictureOf("late")));

    expect(await asking).toEqual(ok(pictureOf("late")));
    expect(previews.pictureOf(withFace(1))).toBeNull();
  });

  test("keeps pictures again after it was cleared", async () => {
    const previews = createRecentPreviews();
    const serve = previews.keeping(answering().preview);
    previews.clear();

    await serve(withFace(1));

    expect(previews.pictureOf(withFace(1))).toBe(pictureOf("face 1"));
  });
});

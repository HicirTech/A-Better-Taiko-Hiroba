import { describe, expect, test } from "bun:test";

import { createMemoryPictureStore, PICTURE_EPOCH } from "../src/hiroba-session";
import { CHART_PICTURE_MAX_BYTES, createDrawnCharts } from "../src/shared/song-catalogue";
import { FFMPEG_JPEG, png } from "./picture-fixtures";

const DRAWN = png(816, 1191);
const padded = (bytes: Uint8Array, length: number) => {
  const whole = new Uint8Array(length);
  whole.set(bytes);
  return whole;
};

describe("createDrawnCharts", () => {
  test("keeps a drawn chart and gives it back after a relaunch, each chart apart", async () => {
    const store = createMemoryPictureStore();
    await createDrawnCharts(store).keep("1001", "oni", DRAWN);

    const relaunched = createDrawnCharts(store);
    expect(await relaunched.read("1001", "oni")).toEqual({
      src: expect.stringMatching(/^data:image\/png;base64,/),
      width: 816,
      height: 1191,
    });
    expect(await relaunched.read("1001", "ura")).toBeNull();
    expect(await relaunched.read("1002", "oni")).toBeNull();
  });

  test("keeps it shared, under a name that holds the epoch", async () => {
    const store = createMemoryPictureStore();
    await createDrawnCharts(store).keep("1001", "oni", DRAWN);
    const key = { scope: "shared", player: null, name: `${PICTURE_EPOCH}/drawn/1001/oni` } as const;
    expect(await store.get(key)).toEqual(DRAWN);
  });

  test("keeps nothing but a PNG of a chart picture's size", async () => {
    const drawn = createDrawnCharts(createMemoryPictureStore());
    await drawn.keep("1001", "easy", FFMPEG_JPEG);
    await drawn.keep("1001", "normal", padded(DRAWN, CHART_PICTURE_MAX_BYTES + 1));
    await drawn.keep("1001", "hard", padded(DRAWN, CHART_PICTURE_MAX_BYTES));
    expect(await drawn.read("1001", "easy")).toBeNull();
    expect(await drawn.read("1001", "normal")).toBeNull();
    expect(await drawn.read("1001", "hard")).not.toBeNull();
  });
});

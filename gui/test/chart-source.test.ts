import { describe, expect, test } from "bun:test";

import { keepChartSource, keptChartSource } from "../src/shared/song-catalogue/chart-source";
import { memoryStorage, refusing } from "./storage-fakes";

describe("keptChartSource", () => {
  test("takes ABTH CDN's drawings until another source is picked", () => {
    expect(keptChartSource(memoryStorage())).toBe("cdn");
  });

  test.each(["tja", "wiki"] as const)("keeps %p once picked on this device", (source) => {
    const storage = memoryStorage();
    keepChartSource(source, storage);
    expect(keptChartSource(storage)).toBe(source);
  });

  test("falls back to ABTH CDN for a store that refuses or holds something else", () => {
    const storage = memoryStorage();
    storage.setItem("abth.chartSource", "wikiwiki");
    expect(keptChartSource(storage)).toBe("cdn");
    expect(keptChartSource(refusing)).toBe("cdn");
  });
});

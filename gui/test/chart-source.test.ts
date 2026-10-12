import { describe, expect, test } from "bun:test";

import { keepChartSource, keptChartSource } from "../src/songs/chart-source";
import { memoryStorage, refusing } from "./storage-fakes";

describe("keptChartSource", () => {
  test("draws the charts from TJA until taiko.wiki is picked", () => {
    expect(keptChartSource(memoryStorage())).toBe("tja");
  });

  test("keeps the source picked on this device", () => {
    const storage = memoryStorage();
    keepChartSource("wiki", storage);
    expect(keptChartSource(storage)).toBe("wiki");
  });

  test("falls back to TJA for a store that refuses or holds something else", () => {
    const storage = memoryStorage();
    storage.setItem("abth.chartSource", "wikiwiki");
    expect(keptChartSource(storage)).toBe("tja");
    expect(keptChartSource(refusing)).toBe("tja");
  });
});

import { describe, expect, test } from "bun:test";
import { err, ok, type Transport, type TransportFailure, type TransportRequest } from "@abth/core";
import { keepRatingData, loadRatingData } from "../src/rating/rating-data-cache";
import { RATING_DATA_URL } from "../src/shared/rating-data/rating-links";
import { ratingDataOf, readRatingData } from "../src/shared/rating-data/read-rating-data";
import type { SongCatalogueFailure } from "../src/shared/song-catalogue";
import { memoryStorage, refusing } from "./storage-fakes";

const CHART = {
  constant: 9.8,
  totalNotes: 765,
  rollSeconds: 8.08,
  balloonCount: 6,
  composite: 28.16,
  avgDensity: 40.99,
  instDensity: 66.98,
  separation: 14.53,
  bpmChange: 3.22,
  hsChange: 38.33,
};
const ANSWER = JSON.stringify([{ id: 817, title: "a", constants: { oni: CHART } }]);
const FEED = RATING_DATA_URL.ourtaikoV1;
const SENT_AT = 1_780_000_000_000;

function answering(status: number, body: string) {
  const asked: { request: TransportRequest; signal: AbortSignal | undefined }[] = [];
  const transport: Transport = {
    send: async (request, signal) => {
      asked.push({ request, signal });
      return ok({ status, url: request.url, headers: {}, body: new TextEncoder().encode(body) });
    },
  };
  return { asked, transport };
}

describe("readRatingData", () => {
  test("sends nothing and says so when there is no address", async () => {
    const { asked, transport } = answering(200, ANSWER);
    expect(await readRatingData(transport, undefined, () => SENT_AT)).toEqual(
      err({ code: "notConfigured" }),
    );
    expect(asked).toEqual([]);
  });

  test("reads the data with one GET, under a timeout, and keeps its text", async () => {
    const { asked, transport } = answering(200, ANSWER);
    expect(await readRatingData(transport, FEED, () => SENT_AT)).toEqual(
      ok({ text: ANSWER, sentAt: SENT_AT }),
    );
    expect(asked.map(({ request }) => request)).toEqual([{ method: "GET", url: FEED }]);
    expect(asked[0]?.signal?.aborted).toBe(false);
  });

  type FailureCase = [kind: TransportFailure["kind"], code: SongCatalogueFailure["code"]];
  test.each<FailureCase>([
    ["unreachable", "unreachable"],
    ["timedOut", "timedOut"],
    ["cancelled", "timedOut"],
  ])("answers %s as the code %s", async (kind, code) => {
    const transport: Transport = { send: async (request) => err({ kind, url: request.url }) };
    expect(await readRatingData(transport, FEED)).toEqual(err({ code }));
  });

  test.each([404, 500, 304])("answers badAnswer to the status %d", async (status) => {
    const { transport } = answering(status, ANSWER);
    expect(await readRatingData(transport, FEED)).toEqual(err({ code: "badAnswer" }));
  });

  test.each(["<html>Not found</html>", "{}", "[]", "", '[{"id":1,"constants":{}}]'])(
    "answers badAnswer to %p, which holds no song",
    async (body) => {
      const { transport } = answering(200, body);
      expect(await readRatingData(transport, FEED)).toEqual(err({ code: "badAnswer" }));
    },
  );
});

describe("ratingDataOf", () => {
  test("reads the songs in the text, or nothing from text that holds none", () => {
    expect(ratingDataOf(ANSWER)?.get("817")?.get(4)?.notes).toBe(765);
    expect(ratingDataOf("not json")).toBeNull();
  });
});

describe("the kept rating data", () => {
  test("is kept on the device for its system, and read back", () => {
    const storage = memoryStorage();
    expect(loadRatingData("ourtaikoV1", storage)).toBeNull();
    keepRatingData("ourtaikoV1", { text: ANSWER, sentAt: SENT_AT }, storage);
    expect(loadRatingData("ourtaikoV1", storage)).toEqual({ text: ANSWER, sentAt: SENT_AT });
  });

  test("reads as none when it is broken or from another version", () => {
    const storage = memoryStorage();
    storage.setItem("abth.ratingData.ourtaikoV1", "{");
    expect(loadRatingData("ourtaikoV1", storage)).toBeNull();
    storage.setItem("abth.ratingData.ourtaikoV1", JSON.stringify({ v: 2, text: "", sentAt: 1 }));
    expect(loadRatingData("ourtaikoV1", storage)).toBeNull();
  });

  test("works on without a store, or with one that refuses", () => {
    expect(loadRatingData("ourtaikoV1", undefined)).toBeNull();
    expect(loadRatingData("ourtaikoV1", refusing)).toBeNull();
    expect(() =>
      keepRatingData("ourtaikoV1", { text: ANSWER, sentAt: SENT_AT }, refusing),
    ).not.toThrow();
  });
});

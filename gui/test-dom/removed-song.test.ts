import { describe, expect, test } from "bun:test";
import { createTranslator } from "@abth/i18n";
import { act, render } from "@testing-library/react/pure";
import { createElement, Fragment } from "react";

import { RECORD } from "../../core/test/score-fixtures";
import { ChartList } from "../src/know-yourself/chart-list";
import type { SongLook } from "../src/shared/song-catalogue/song-look";
import { PlayRow } from "../src/songs/play-row";
import { useRemovedNote } from "../src/songs/removed-song";
import { known } from "../test/known-fixtures";
import { inADocument } from "./document";
import { writeLane } from "./write-fakes";

inADocument();

const EN = createTranslator("en");
const lookOf = (songNo: string): SongLook => ({
  songNo,
  name: `Song ${songNo}`,
  lang: "en",
  artists: [],
  genres: [],
  levels: null,
});

const rowOf = (container: Element, songNo: string) => {
  const row = container.querySelector(`[data-song-no="${songNo}"]`);
  if (row === null) {
    throw new Error(`no row of ${songNo}`);
  }
  return row;
};

const press = (element: Element | null) => {
  if (!(element instanceof HTMLElement)) {
    throw new Error("nothing to press");
  }
  act(() => element.click());
};

describe("a song Hiroba took off its lists", () => {
  test("has its play row marked beside its score, and a press that opens no dialog", () => {
    const play = (removed: boolean) =>
      render(
        createElement(PlayRow, {
          play: {
            songTitle: "#660",
            genre: null,
            level: 4,
            crown: "gold",
            scoreRank: 6,
            record: RECORD,
          },
          lane: writeLane().lane,
          order: 0,
          i18n: EN,
          onOpen: () => undefined,
          removed,
        }),
      ).container;

    const removed = play(true);
    const listed = play(false);

    expect(removed.querySelector(".song-line .removed-mark .MuiChip-label")?.textContent).toBe(
      "Removed",
    );
    expect(removed.querySelector("button.song-open")?.getAttribute("aria-haspopup")).toBeNull();
    expect(listed.querySelector(".removed-mark")).toBeNull();
    expect(listed.querySelector("button.song-open")?.getAttribute("aria-haspopup")).toBe("dialog");
  });

  test("has its chart in a list marked and kept from ticks and the nearest, its press left to the page", () => {
    const pressed: string[] = [];
    const added: (readonly string[])[] = [];
    const { container } = render(
      createElement(ChartList, {
        id: "gaps",
        charts: [
          known({ songNo: "1001", crown: "played", removed: true }),
          known({ songNo: "1002", crown: "played" }),
        ],
        note: () => "",
        narrows: false,
        lookOf,
        opener: (chart) => () => pressed.push(chart.songNo),
        lane: writeLane().lane,
        i18n: EN,
        onAdd: (songs) => added.push(songs),
      }),
    );
    const removed = rowOf(container, "1001");

    press(removed.querySelector("button.song-open"));
    press(container.querySelector("#gaps-add-nearest"));

    expect(removed.querySelector(".removed-mark .MuiChip-label")?.textContent).toBe("Removed");
    expect(removed.querySelector("input")?.disabled).toBe(true);
    expect(rowOf(container, "1002").querySelector("input")?.disabled).toBe(false);
    expect(pressed).toEqual(["1001"]);
    expect(added).toEqual([["1002"]]);
  });

  test("is told of at the window's foot once a press asks", () => {
    function Told() {
      const removed = useRemovedNote("removed-note", EN);
      return createElement(
        Fragment,
        null,
        createElement("button", { id: "tell", type: "button", onClick: removed.tell }),
        removed.note,
      );
    }
    render(createElement(Told));

    expect(document.querySelector("#removed-note")).toBeNull();
    press(document.querySelector("#tell"));

    expect(document.querySelector("#removed-note .MuiSnackbarContent-message")?.textContent).toBe(
      "This song was removed from the game: Hiroba no longer lists it. These are the scores read before.",
    );
  });
});

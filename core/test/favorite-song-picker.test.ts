import { describe, expect, test } from "bun:test";

import { readSongPicker, type Transport } from "../src/index";
import { fakeFavorites } from "./favorite-fixtures";
import { ORIGIN } from "./profile-fixtures";

const GENRE_PAGES = [1, 2, 3, 4, 5, 6, 7, 8].map((genre) => `GET select_song.php?genre=${genre}`);

function handoffOf(routes: readonly string[]): URLSearchParams {
  const handoff = routes.find((route) => route.startsWith("GET form_data.php?"));
  return new URLSearchParams(handoff?.slice("GET form_data.php?".length));
}

describe("readSongPicker", () => {
  test("reads the editor, opens the picker as the editor's button does, then each genre", async () => {
    const { hiroba, transport, routes } = fakeFavorites();
    const read = await readSongPicker({ transport, hirobaOrigin: ORIGIN });
    expect(routes().map((route) => route.split("?")[0])).toEqual([
      "GET portal_favorite_song_select.php",
      "GET form_data.php",
      ...GENRE_PAGES.map((route) => route.split("?")[0]),
    ]);
    expect(routes().slice(2)).toEqual(GENRE_PAGES);
    expect([...handoffOf(routes())]).toEqual([
      ["from", "/portal_favorite_song_select.php"],
      ["list_type", "song"],
      ["_tckt", hiroba.token],
      ["song_no", "1001"],
      ["bsf", "0"],
    ]);
    // 1002 sits in two genres and is offered once.
    expect(read).toEqual({ ok: true, value: { songs: ["1001", "1002"], ura: ["1001"] } });
    expect(JSON.stringify(read)).not.toContain(hiroba.token);
  });

  test("hands the picker the 裏 entry set, and an empty form when no song is", async () => {
    const ura = fakeFavorites();
    ura.hiroba.bsf = "1";
    await readSongPicker({ transport: ura.transport, hirobaOrigin: ORIGIN });
    expect(handoffOf(ura.routes()).get("bsf")).toBe("1");

    const none = fakeFavorites();
    none.hiroba.song = null;
    none.hiroba.bsf = "";
    await readSongPicker({ transport: none.transport, hirobaOrigin: ORIGIN });
    expect(handoffOf(none.routes()).get("song_no")).toBe("");
    expect(handoffOf(none.routes()).get("bsf")).toBe("");
  });

  test("stops at a handoff that does not answer 200, naming it", async () => {
    const { transport, routes } = fakeFavorites();
    const failing: Transport = {
      send: async (request) => {
        const sent = await transport.send(request);
        return sent.ok && request.url.includes("/form_data.php")
          ? { ...sent, value: { ...sent.value, status: 500 } }
          : sent;
      },
    };
    const read = await readSongPicker({ transport: failing, hirobaOrigin: ORIGIN });
    expect(routes().at(-1)?.startsWith("GET form_data.php?")).toBe(true);
    expect(read.ok === false && read.error.detail).toStartWith("path=/select_song.php status=500");
  });

  test("stops at the first genre when the handoff did not open the picker", async () => {
    const { transport, routes } = fakeFavorites();
    const staleToken: Transport = {
      send: (request) =>
        transport.send(
          request.url.includes("/form_data.php")
            ? { ...request, url: request.url.replace(/_tckt=\w+/, "_tckt=stale") }
            : request,
        ),
    };
    const read = await readSongPicker({ transport: staleToken, hirobaOrigin: ORIGIN });
    expect(routes().at(-1)).toBe("GET select_song.php?genre=1");
    expect(read.ok === false && read.error.kind).toBe("unexpectedPage");
    expect(read.ok === false && read.error.detail).toStartWith("path=/index.php status=200");
  });

  test("stops at a genre it cannot read, naming the page", async () => {
    const { hiroba, transport } = fakeFavorites();
    hiroba.picker = { 4: [{ songNo: "12a", ura: false }] };
    const read = await readSongPicker({ transport, hirobaOrigin: ORIGIN });
    expect(read.ok === false && read.error.kind).toBe("unexpectedPage");
    expect(read.ok === false && read.error.detail).toContain(
      "parse=unreadableValue@#songList a[href]",
    );
  });

  test("reads a session that is gone as such", async () => {
    const { transport } = fakeFavorites();
    const gone: Transport = {
      send: () => transport.send({ method: "GET", url: `${ORIGIN}/login.php` }),
    };
    const read = await readSongPicker({ transport: gone, hirobaOrigin: ORIGIN });
    expect(read).toEqual({ ok: false, error: { kind: "loggedOut" } });
  });
});

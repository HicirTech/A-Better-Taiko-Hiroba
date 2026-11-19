import { describe, expect, test } from "bun:test";
import {
  GAME_SETTINGS_WRITE,
  type GameSettings,
  type GameSettingsEditorReading,
  parseGameSettingsPage,
} from "@abth/core";

import { CONTROL } from "../scripts/mock-controls";
import type { MockSession } from "../scripts/mock-costume";
import {
  BAD_SHAPE_MESSAGE,
  BAD_VALUE_MESSAGE,
  createGameSettingsEditor,
} from "../scripts/mock-game-settings";
import {
  appSettingsOf,
  type GameSettingsState,
  INITIAL_GAME_SETTINGS,
} from "../scripts/mock-game-settings-lists";

const START = appSettingsOf(INITIAL_GAME_SETTINGS);

function standIn() {
  let issued = 0;
  let ended = false;
  const editor = createGameSettingsEditor({
    issue: (session) => {
      issued += 1;
      session.ticket = `ticket-${issued}`;
      return session.ticket;
    },
  });
  const session: MockSession = { cardChosen: true };
  const read = (): GameSettingsEditorReading => {
    const parsed = parseGameSettingsPage(editor.page(session));
    if (!parsed.ok) {
      throw new Error(`the stand-in's page did not read: ${JSON.stringify(parsed.error)}`);
    }
    return parsed.value;
  };
  /** The body the app sends for `target`, from a fresh read of the page. */
  const bodyFor = (target: GameSettings) =>
    new URLSearchParams(
      GAME_SETTINGS_WRITE.save(read(), target).form.map(([name, value]): [string, string] => [
        name,
        typeof value === "string" ? value : value.reveal(),
      ]),
    );
  const save = async (form: URLSearchParams) =>
    (await editor
      .save(session, form, () => {
        ended = true;
      })
      .json()) as { result: number; errmsg: string };
  const hook = (path: string, query = "") => editor.hook(path, new URLSearchParams(query));
  return { editor, session, read, bodyFor, save, hook, ended: () => ended };
}

const stateOf = (editor: ReturnType<typeof standIn>["editor"]): GameSettingsState => ({
  ...editor.state(),
});

describe("the settings stand-in's page", () => {
  test("reads in core as the made-up player's settings, with the 双打 list open", () => {
    const reading = standIn().read();

    expect(reading.state).toEqual(START);
    expect(reading.doubleChartsLocked).toBe(false);
    expect(reading.choices.tone.map((choice) => choice.label)).toContain("闇のマキナ");
  });

  test("says the 双打 list is shut once a hook shuts it", async () => {
    const world = standIn();
    await world.hook(CONTROL.gameSettings, "shut=1")?.json();

    expect(world.read().doubleChartsLocked).toBe(true);
  });
});

describe("the settings stand-in's save", () => {
  test("stores the body the app sends: the folder by its lists, 双打 by its hidden half", async () => {
    const world = standIn();
    const target: GameSettings = {
      ...START,
      speed: "35",
      doubleCharts: "0",
      folderDifficulty: "5",
      folderStars: "99",
    };

    const body = world.bodyFor(target);
    // The halves Hiroba does not read say otherwise here: what it stores comes from the others.
    body.set("select_double_song_disp", "1");
    body.set("default_difficulty_course", "1");

    expect(await world.save(body)).toEqual({ result: 0, errmsg: "" });
    expect(world.read().state).toEqual(target);
  });

  test("refuses a body without what the page's script adds, with 600, and changes nothing", async () => {
    const world = standIn();
    const body = world.bodyFor({ ...START, voice: "0" });
    body.delete("disp_level_chassis");

    expect(await world.save(body)).toEqual({ result: 600, errmsg: BAD_SHAPE_MESSAGE });
    expect(stateOf(world.editor)).toEqual(INITIAL_GAME_SETTINGS);
  });

  test.each<[label: string, change: Partial<Record<string, string>>]>([
    ["a ★ the difficulty in the body cannot take", { select_default_difficulty_course: "1" }],
    ["a value no list offers", { country_code: "ATA" }],
  ])("refuses %s with 25, and changes nothing", async (_label, change) => {
    const world = standIn();
    const body = world.bodyFor(START);
    for (const [name, value] of Object.entries(change)) {
      body.set(name, value ?? "");
    }

    expect(await world.save(body)).toEqual({ result: 25, errmsg: BAD_VALUE_MESSAGE });
    expect(stateOf(world.editor)).toEqual(INITIAL_GAME_SETTINGS);
  });

  test("answers 705 to a token no longer the newest", async () => {
    const world = standIn();
    const body = world.bodyFor({ ...START, voice: "0" });
    world.editor.page(world.session);

    expect((await world.save(body)).result).toBe(705);
  });

  test("answers what a hook asks, once: a code with words, or a save that stores nothing", async () => {
    const world = standIn();
    world.hook(CONTROL.gameSettingsNextResult, "code=26&message=x");
    expect(await world.save(world.bodyFor({ ...START, voice: "0" }))).toEqual({
      result: 26,
      errmsg: "x",
    });

    world.hook(CONTROL.gameSettingsNoopSave);
    expect((await world.save(world.bodyFor({ ...START, voice: "0" }))).result).toBe(0);
    expect(stateOf(world.editor).voice).toBe("1");

    expect((await world.save(world.bodyFor({ ...START, voice: "0" }))).result).toBe(0);
    expect(stateOf(world.editor).voice).toBe("0");
  });

  test("ends every session after a save a hook marked", async () => {
    const world = standIn();
    world.hook(CONTROL.gameSettingsExpireOnSave);
    await world.save(world.bodyFor({ ...START, voice: "0" }));

    expect(world.ended()).toBe(true);
  });
});

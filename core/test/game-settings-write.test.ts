import { describe, expect, test } from "bun:test";

import {
  changeGameSettings,
  GAME_SETTINGS_FIELDS,
  type GameSettings,
  openGameSettings,
  type Transport,
  type WriteOutcome,
} from "../src/index";
import {
  appendedFields,
  BAD_VALUE_MESSAGE,
  fakeGameSettings,
  PAGE_PATH,
  SAVE_PATH,
  SETTINGS,
  servedFields,
} from "./game-settings-fixtures";
import { NOON_JST, ORIGIN } from "./profile-fixtures";

const IN_THE_BREAK = new Date("2026-09-26T20:30:00Z");
const READ = `GET ${PAGE_PATH}`;
const SAVE = `POST ${SAVE_PATH}`;
const changed = (changes: Partial<GameSettings>): GameSettings => ({ ...SETTINGS, ...changes });

function change(
  transport: Transport,
  target: GameSettings,
  options: { expected?: GameSettings; now?: Date } = {},
): Promise<WriteOutcome<GameSettings>> {
  return changeGameSettings(
    { expected: options.expected ?? SETTINGS, target },
    { transport, hirobaOrigin: ORIGIN, now: () => options.now ?? NOON_JST, crossCheck: true },
  );
}

describe("openGameSettings", () => {
  test("reads the settings, their lists and the lock with one GET, and leaves the token behind", async () => {
    const { hiroba, transport, routes } = fakeGameSettings();
    hiroba.doubleChartsShut = true;
    const opened = await openGameSettings({ transport, hirobaOrigin: ORIGIN });

    expect(routes()).toEqual([READ]);
    expect(opened.ok && opened.value.state).toEqual(SETTINGS);
    expect(opened.ok && opened.value.choices.tone.map((choice) => choice.value)).toEqual([
      "0",
      "1",
      "9",
      "21",
    ]);
    expect(opened.ok && opened.value.doubleChartsLocked).toBe(true);
    expect(opened.ok && Object.keys(opened.value)).toEqual([
      "state",
      "choices",
      "doubleChartsLocked",
    ]);
    expect(JSON.stringify(opened)).not.toContain(hiroba.token);
  });

  test("reads a session that is gone as such", async () => {
    const { transport } = fakeGameSettings();
    const gone: Transport = {
      send: () => transport.send({ method: "GET", url: `${ORIGIN}/login.php` }),
    };

    expect(await openGameSettings({ transport: gone, hirobaOrigin: ORIGIN })).toEqual({
      ok: false,
      error: { kind: "loggedOut" },
    });
  });
});

describe("changeGameSettings' requests", () => {
  test("reads the page, posts the whole form once as its script does, and reads the page back", async () => {
    const { hiroba, transport, routes, posts } = fakeGameSettings();
    const target = changed({ speed: "35", voice: "1", folderOrder: "4" });
    const outcome = await change(transport, target);

    expect(routes()).toEqual([READ, SAVE, READ]);
    const [save] = posts();
    expect(save?.form).toEqual([
      ["_tckt", "1".padStart(32, "0")],
      ...servedFields(target),
      ...appendedFields(target),
    ]);
    expect(save?.headers).toEqual({
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json, text/javascript, */*; q=0.01",
      Origin: ORIGIN,
      Referer: `${ORIGIN}/${PAGE_PATH}`,
    });
    expect(hiroba.settings).toEqual(target);
    expect(outcome).toMatchObject({
      kind: "applied",
      before: SETTINGS,
      after: target,
      cross: "off",
    });
  });

  test("puts each pair's value in both its halves, so whichever Hiroba reads stores it", async () => {
    const { hiroba, transport, posts } = fakeGameSettings();
    const target = changed({ doubleCharts: "0", folderDifficulty: "5", folderStars: "99" });
    const outcome = await change(transport, target);

    const form = posts()[0]?.form ?? [];
    const pairs: readonly (readonly [hidden: string, list: string, value: string])[] = [
      ["double_song_disp", "select_double_song_disp", "0"],
      ["default_difficulty_course", "select_default_difficulty_course", "5"],
      ["default_difficulty_star", "select_default_difficulty_star", "99"],
    ];
    for (const [hidden, list, value] of pairs) {
      expect(form).toContainEqual([hidden, value]);
      expect(form).toContainEqual([list, value]);
    }
    expect(hiroba.settings).toEqual(target);
    expect(outcome.kind).toBe("applied");
  });

  test("sends the drum sound's hidden twin as served, then the sound wanted", async () => {
    const { transport, posts } = fakeGameSettings();
    await change(transport, changed({ tone: "21" }));

    const sounds = (posts()[0]?.form ?? []).filter(([name]) => name === "default_tone_setting");
    expect(sounds).toEqual([
      ["default_tone_setting", "0"],
      ["default_tone_setting", "21"],
    ]);
  });

  test("leaves the 双打 list out while the page shuts it, as the script's serialize does", async () => {
    const { hiroba, transport, posts } = fakeGameSettings();
    hiroba.doubleChartsShut = true;
    const target = changed({ speed: "35" });
    const outcome = await change(transport, target);

    const form = posts()[0]?.form ?? [];
    expect(form.map(([name]) => name)).not.toContain("select_double_song_disp");
    expect(form).toContainEqual(["double_song_disp", SETTINGS.doubleCharts]);
    expect(form).toHaveLength(31);
    expect(outcome).toMatchObject({ kind: "applied", after: target });
  });

  test("sends the save once, whatever the answer", async () => {
    const { hiroba, transport, posts } = fakeGameSettings();
    hiroba.save = { code: 999, stores: false, message: "" };
    await change(transport, changed({ voice: "1" }));

    expect(posts()).toHaveLength(1);
  });
});

describe("changeGameSettings' result codes, by the settings read back", () => {
  type CodeCase = [
    label: string,
    save: { code: number; stores: boolean; message?: string },
    expected: Record<string, unknown>,
  ];
  test.each<CodeCase>([
    ["0 with the settings changed", { code: 0, stores: true }, { kind: "applied" }],
    [
      "0 with the old settings read back",
      { code: 0, stores: false },
      { kind: "notApplied", reason: { kind: "unchanged" } },
    ],
    [
      "25, a value refused, in Hiroba's words",
      { code: 25, stores: false, message: BAD_VALUE_MESSAGE },
      { kind: "notApplied", reason: { kind: "refused", code: 25, message: BAD_VALUE_MESSAGE } },
    ],
    [
      "600, the body refused",
      { code: 600, stores: false },
      { kind: "notApplied", reason: { kind: "refused", code: 600, message: null } },
    ],
    [
      "705, which this page's script shows in Hiroba's words as any other",
      { code: 705, stores: false, message: "sample" },
      { kind: "notApplied", reason: { kind: "refused", code: 705, message: "sample" } },
    ],
    [
      "3, which is no not-synced code here",
      { code: 3, stores: false },
      { kind: "notApplied", reason: { kind: "refused", code: 3, message: null } },
    ],
    [
      "27, a code the script does not name",
      { code: 27, stores: false },
      { kind: "notApplied", reason: { kind: "failed", code: 27 } },
    ],
    ["a refusal the settings read back contradict", { code: 1, stores: true }, { kind: "applied" }],
  ])("%s", async (_label, save, expected) => {
    const { hiroba, transport } = fakeGameSettings();
    hiroba.save = { message: "", ...save };

    expect(await change(transport, changed({ voice: "1" }))).toMatchObject(expected);
  });

  test("is diverged when the settings read back are neither the old nor the new", async () => {
    const { hiroba, transport } = fakeGameSettings();
    hiroba.afterSave = () => {
      hiroba.settings.skip = "0";
    };

    expect(await change(transport, changed({ voice: "1" }))).toMatchObject({
      kind: "diverged",
      after: changed({ voice: "1", skip: "0" }),
    });
  });
});

describe("changeGameSettings' refusals before anything is posted", () => {
  type RefusedCase = [label: string, target: GameSettings, field: string];
  test.each<RefusedCase>([
    ["a speed the page does not list", changed({ speed: "45" }), GAME_SETTINGS_FIELDS.notOffered],
    [
      "a ★ the difficulty in the same settings cannot take",
      changed({ folderDifficulty: "1", folderStars: "8" }),
      GAME_SETTINGS_FIELDS.stars,
    ],
  ])("refuses %s", async (_label, target, field) => {
    const { transport, routes } = fakeGameSettings();

    expect(await change(transport, target)).toEqual({ kind: "invalidTarget", field });
    expect(routes()).toEqual([READ]);
  });

  test("refuses a 双打 change while the page shuts that list", async () => {
    const { hiroba, transport, routes } = fakeGameSettings();
    hiroba.doubleChartsShut = true;

    expect(await change(transport, changed({ doubleCharts: "0" }))).toEqual({
      kind: "invalidTarget",
      field: GAME_SETTINGS_FIELDS.locked,
    });
    expect(routes()).toEqual([READ]);
  });

  test("posts nothing for the settings that are set already", async () => {
    const { transport, routes } = fakeGameSettings();

    expect(await change(transport, SETTINGS)).toEqual({ kind: "nothingToChange" });
    expect(routes()).toEqual([READ]);
  });

  test("posts nothing when the settings changed elsewhere since the page was read", async () => {
    const { hiroba, transport, routes } = fakeGameSettings();
    hiroba.settings.region = "TWN";

    expect(await change(transport, changed({ voice: "1" }))).toEqual({
      kind: "changedSincePreview",
      current: changed({ region: "TWN" }),
    });
    expect(routes()).toEqual([READ]);
  });

  test("sends nothing in Hiroba's daily break", async () => {
    const { transport, routes } = fakeGameSettings();

    expect(await change(transport, changed({ voice: "1" }), { now: IN_THE_BREAK })).toEqual({
      kind: "maintenance",
    });
    expect(routes()).toEqual([]);
  });

  test("a session that is gone before the save is sessionGone, with nothing posted", async () => {
    const { transport, routes } = fakeGameSettings();
    const gone: Transport = {
      send: () => transport.send({ method: "GET", url: `${ORIGIN}/login.php` }),
    };

    expect(await change(gone, changed({ voice: "1" }))).toEqual({
      kind: "sessionGone",
      writeMayHaveHappened: false,
    });
    expect(routes()).toEqual(["GET login.php"]);
  });
});

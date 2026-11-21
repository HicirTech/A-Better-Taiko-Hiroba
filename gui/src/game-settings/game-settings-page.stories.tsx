import { err, ok } from "@abth/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import type { GameSettingsView, HirobaSessionPort } from "../shared/session-port";
import type { StoryGlobals } from "../story-kit/env";
import { STORY_GAME_SETTINGS } from "../story-kit/game-settings";
import { found, press } from "../story-kit/steps";
import { appOn, readAgain } from "../story-kit/story-app";
import { neverAnswers } from "../story-kit/story-port";

const meta = {
  title: "Pages/Game settings/GameSettingsPage",
  tags: ["game-settings"],
  parameters: { layout: "fullscreen" },
  render: appOn("gameSettings"),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// A whole window's first reads can take longer than a play's usual wait of a second.
const FIRST_READS_MS = 10_000;
const SAVE = { answer: "json", code: 0, message: null, report: "status=200 code=0" } as const;
const BAD_VALUE = "不明な値が設定されています。再度設定してください。";

const reading = (view: GameSettingsView) => () => Promise.resolve(ok(view));
const changeTwo = async () => {
  await found("#game-settings-voice-0", FIRST_READS_MS);
  await press("#game-settings-voice-0");
  await press("#game-settings-skip-1");
};
const changeAndSync = async () => {
  await changeTwo();
  await press("#game-settings-save");
};

/** Every setting as Hiroba's page holds it, in five cards, and the bar at the foot. */
export const InTheWindow: Story = {};

/** Two settings changed: the bar's Sync to Hiroba and Reset open. */
export const Changed: Story = { play: changeTwo };

/** A sync on its way: the settings held still under the bar's words. */
export const Syncing: Story = {
  render: appOn("gameSettings", { changeGameSettings: neverAnswers }),
  play: changeAndSync,
};

/** Hiroba refused the sync: its words in the note, and its settings back on the page. */
export const Refused: Story = {
  render: appOn("gameSettings", {
    changeGameSettings: ({ expected }) =>
      Promise.resolve({
        kind: "notApplied",
        before: expected,
        after: expected,
        reason: { kind: "refused", code: 25, message: BAD_VALUE },
        save: { ...SAVE, code: 25, message: BAD_VALUE },
        cross: "off",
      }),
  }),
  play: changeAndSync,
};

/** Hiroba held other settings when read back: the note says so, and the page shows them. */
export const ReadBackDiffered: Story = {
  render: appOn("gameSettings", {
    changeGameSettings: ({ expected, target }) =>
      Promise.resolve({
        kind: "diverged",
        before: expected,
        expectedAfter: target,
        after: { ...target, skip: expected.skip },
        save: SAVE,
        cross: "off",
      }),
  }),
  play: changeAndSync,
};

export const Reading: Story = {
  render: appOn("gameSettings", { openGameSettings: neverAnswers }),
};

export const ReadFailed: Story = {
  render: appOn("gameSettings", {
    openGameSettings: () => Promise.resolve(err({ kind: "unreachable" })),
  }),
};

/** A read again that failed, on a computer: its note above the settings it held. */
export const ReadAgainFailed: Story = {
  render: (args, context: { readonly globals: StoryGlobals }) => {
    let reads = 0;
    const openGameSettings: HirobaSessionPort["openGameSettings"] = () => {
      reads += 1;
      return Promise.resolve(reads === 1 ? ok(STORY_GAME_SETTINGS) : err({ kind: "timedOut" }));
    };
    return appOn("gameSettings", { openGameSettings })(args, context);
  },
  play: async (context) => {
    await found("#game-settings-voice-0", FIRST_READS_MS);
    await readAgain(context);
  },
};

/** In a competition with Double Play charts: that row shut, saying why. */
export const DoubleChartsLocked: Story = {
  render: appOn("gameSettings", {
    openGameSettings: reading({ ...STORY_GAME_SETTINGS, doubleChartsLocked: true }),
  }),
  play: async () => {
    const card = await found("#game-settings-song-select", FIRST_READS_MS);
    card.scrollIntoView({ block: "center" });
  },
};

/** The folder's ★ list open under Easy: the ★ Easy cannot take shut, as on Hiroba's page. */
export const StarsShutByTheDifficulty: Story = {
  render: appOn("gameSettings", {
    openGameSettings: reading({
      ...STORY_GAME_SETTINGS,
      state: { ...STORY_GAME_SETTINGS.state, folderDifficulty: "1", folderStars: "5" },
    }),
  }),
  play: async () => {
    await found("#game-settings-folderStars", FIRST_READS_MS);
    await press("#game-settings-folderStars");
  },
};

/** A value the app has no words for, here a speed Hiroba might add, in Hiroba's own words. */
export const HirobasOwnWords: Story = {
  render: appOn("gameSettings", {
    openGameSettings: reading({
      ...STORY_GAME_SETTINGS,
      state: { ...STORY_GAME_SETTINGS.state, speed: "45" },
      choices: {
        ...STORY_GAME_SETTINGS.choices,
        speed: [...STORY_GAME_SETTINGS.choices.speed, { value: "45", label: "４．５倍" }],
      },
    }),
  }),
};

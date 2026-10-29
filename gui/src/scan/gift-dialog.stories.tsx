import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import type { Gift } from "../shared/gifts/gift-code";
import { DEFAULT_SHOWN } from "../shared/song-catalogue/shown-difficulty";
import { i18nOf, localeOf } from "../story-kit/env";
import { FOLDER_SONGS } from "../story-kit/favorites";
import { lookOf } from "../story-kit/songs";
import { GiftDialog, type GiftDialogProps } from "./gift-dialog";

type Args = Pick<GiftDialogProps, "gift" | "open" | "syncing" | "onAccept" | "onClose">;

const GIFT: Gift = {
  songs: FOLDER_SONGS.slice(0, 4),
  giver: "ドン子ちゃん",
  title: "お誕生日おめでとう！",
  madeAt: Date.UTC(2026, 9, 29, 3, 15, 30),
  shown: true,
};

const meta = {
  title: "Dialogs/GiftDialog",
  tags: ["scan"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => (
    <GiftDialog
      {...args}
      look={(songNo) => lookOf(songNo, localeOf(globals))}
      shownDifficulty={DEFAULT_SHOWN}
      i18n={i18nOf(globals)}
    />
  ),
  args: { gift: GIFT, open: true, syncing: false, onAccept: fn(), onClose: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A scanned gift: who gave it and when, its songs, and what accepting does to the folder. */
export const Shown: Story = {};

/** A mystery gift: no songs until it is accepted. */
export const Mystery: Story = { args: { gift: { ...GIFT, shown: false } } };

/** A gift with no title of its own. */
export const Untitled: Story = { args: { gift: { ...GIFT, title: "", songs: ["1004"] } } };

/** Accepted: the songs on their way to Hiroba's folder, the buttons waiting under the bar. */
export const Syncing: Story = { args: { gift: { ...GIFT, shown: false }, syncing: true } };

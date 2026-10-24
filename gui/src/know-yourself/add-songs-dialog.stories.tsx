import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { FavoriteSet } from "../shared/sets/favorite-sets";
import { modalLookOf, touchOf } from "../story-kit/devices";
import { i18nOf } from "../story-kit/env";
import { STORY_SETS } from "../story-kit/sets";
import { AddSongsDialog } from "./add-songs-dialog";

interface Args {
  readonly songs: readonly string[];
  readonly onAdd: (set: FavoriteSet, added: readonly string[]) => void;
  readonly onNewSet: () => void;
  readonly onClose: () => void;
}

const meta = {
  title: "Dialogs/AddSongsDialog",
  tags: ["know-yourself"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => (
    <AddSongsDialog
      {...args}
      sets={STORY_SETS}
      touchFirst={touchOf(globals)}
      modalLook={modalLookOf(globals)}
      i18n={i18nOf(globals)}
    />
  ),
  args: {
    songs: ["1001", "1010", "1020", "1021", "1022"],
    onAdd: fn(),
    onNewSet: fn(),
    onClose: fn(),
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Which set takes the songs: each says how many it has room for, a full one is shut. */
export const WhichSet: Story = {};

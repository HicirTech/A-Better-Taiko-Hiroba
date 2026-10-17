import { err } from "@abth/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { STORY_SCORES } from "../story-kit/scores";
import { appOn, readAgain } from "../story-kit/story-app";

const meta = {
  title: "Pages/Scores/ScoresPage",
  tags: ["scores"],
  parameters: { layout: "fullscreen" },
  render: appOn("scores"),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every played chart, narrowed and sorted by the chips over them; a chart opens its details. */
export const InTheWindow: Story = {};

/** No score kept yet: how to read them. */
export const NothingKept: Story = {
  render: appOn("scores", {
    scores: () => Promise.resolve({ scores: [], unread: 0, songs: [] }),
  }),
};

/** A read that stopped at a chart's details. */
export const ReadFailed: Story = {
  render: appOn("scores", {
    readScores: () =>
      Promise.resolve(
        err({
          kind: "unexpectedPage",
          detail: "path=/score_detail.php status=200",
          at: { kind: "detail", songNo: "1005", songTitle: "約束の向こう側", level: 4 },
        }),
      ),
  }),
  play: readAgain,
};

/** Charts the lists named that a read has yet to detail. */
export const SomeUnread: Story = {
  render: appOn("scores", { scores: () => Promise.resolve({ ...STORY_SCORES, unread: 12 }) }),
};

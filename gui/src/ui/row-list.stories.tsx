import type { RecentPlay } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";

import { PLAY_ROW_PX, PlayRow } from "../history/play-row";
import { i18nOf } from "../story-kit/env";
import { STORY_PLAYS } from "../story-kit/plays";
import { STORY_LANE } from "../story-kit/story-pictures";
import { RowList } from "./row-list";

interface Numbered {
  readonly key: string;
  readonly play: RecentPlay;
}

const keyOf = (row: Numbered) => row.key;

/** The story's plays over and over, each row its own. */
const numbered = (count: number): readonly Numbered[] =>
  Array.from({ length: count }, (_, at) => STORY_PLAYS[at % STORY_PLAYS.length])
    .filter((play) => play !== undefined)
    .map((play, at) => ({ key: String(at), play }));

const FEW = numbered(12);
const MANY = numbered(5000);

const list = (rows: readonly Numbered[], i18n: Translator) => (
  <Box sx={{ maxWidth: 640 }}>
    <RowList id="story-rows" rows={rows} keyOf={keyOf} rowPx={PLAY_ROW_PX}>
      {({ play }, index, place) => (
        <PlayRow
          play={play}
          lane={STORY_LANE}
          order={index}
          i18n={i18n}
          onOpen={action("open details")}
          place={place}
        />
      )}
    </RowList>
  </Box>
);

const meta = {
  title: "Rows and lists/RowList",
  tags: ["ui"],
  render: (_args, { globals }) => list(FEW, i18nOf(globals)),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A short list: as tall as its rows, each measured where it is drawn. */
export const AFewRows: Story = {};

/** Five thousand rows: only those near the window are in the page, drawn as the page scrolls. */
export const ThousandsOfRows: Story = {
  render: (_args, { globals }) => list(MANY, i18nOf(globals)),
};

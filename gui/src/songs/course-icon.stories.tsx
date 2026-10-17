import { Stack } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { DIFFICULTY_LABEL } from "../favorites/genre-look";
import { DIFFICULTIES } from "../song-catalogue/types";
import { i18nOf } from "../story-kit/env";
import { STORY_LANE } from "../story-kit/story-pictures";
import { CourseIcon } from "./course-icon";

const meta = {
  title: "Pictures/CourseIcon",
  tags: ["songs"],
  render: (_args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Stack direction="row" spacing={1}>
        {DIFFICULTIES.map((difficulty, order) => (
          <CourseIcon
            key={difficulty}
            difficulty={difficulty}
            lane={STORY_LANE}
            order={order}
            label={i18n.t(DIFFICULTY_LABEL[difficulty])}
          />
        ))}
      </Stack>
    );
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Each difficulty as Hiroba draws it. */
export const EveryDifficulty: Story = {};

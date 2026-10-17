import type { MessageKey } from "@abth/i18n";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { i18nOf } from "../story-kit/env";
import { RatingRadar } from "./rating-radar";

/** The six skills the radar draws, in the page's order, with made-up values. */
const SKILLS: readonly (readonly [MessageKey, number])[] = [
  ["rating.figure.power", 8.1],
  ["rating.figure.stamina", 6.4],
  ["rating.figure.speed", 9.2],
  ["rating.figure.accuracy", 7.7],
  ["rating.figure.rhythm", 5.9],
  ["rating.figure.complex", 6.8],
];

const meta = {
  title: "Stats/RatingRadar",
  tags: ["rating"],
  render: (_args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Box sx={{ maxWidth: 360 }}>
        <RatingRadar
          figures={SKILLS.map(([name, value]) => ({ name: i18n.t(name), value }))}
          format={(value) => i18n.number(value)}
        />
      </Box>
    );
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The player's skills, each a spoke of the radar, its value at the spoke's end. */
export const Skills: Story = {};

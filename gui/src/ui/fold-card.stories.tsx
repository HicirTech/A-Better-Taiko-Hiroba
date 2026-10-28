import { Box, Typography } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { i18nOf } from "../story-kit/env";
import { FoldCard } from "./fold-card";

const meta = {
  title: "Cards and sections/FoldCard",
  tags: ["ui"],
  render: (_args, { globals }) => {
    const { t } = i18nOf(globals);
    return (
      <Box sx={{ maxWidth: 720 }}>
        <FoldCard
          id="story-know"
          title={t("know.ladder")}
          summary={t("know.wall", { stars: 8 })}
          details={() => <Typography color="text.secondary">{t("know.noWall")}</Typography>}
        />
      </Box>
    );
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A folded card: its title and one sentence, and a chevron that opens what is behind it. */
export const Folded: Story = {};

/** Nothing more to show: no chevron, and the card is no button. */
export const NothingBehind: Story = {
  render: (_args, { globals }) => {
    const { t } = i18nOf(globals);
    return (
      <Box sx={{ maxWidth: 720 }}>
        <FoldCard
          id="story-know"
          title={t("know.ladder")}
          summary={t("know.noWall")}
          details={null}
        />
      </Box>
    );
  },
};

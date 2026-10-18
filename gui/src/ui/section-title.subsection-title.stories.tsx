import { Box, Skeleton, Typography } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { i18nOf } from "../story-kit/env";
import { SectionTitle, SubsectionTitle } from "./section-title";

// What a title stands over: the stories show the title, not what it titles.
const content = (height: number) => (
  <Skeleton variant="rounded" height={height} animation={false} />
);
const TILES = { display: "grid", gridTemplateColumns: "repeat(5, 56px)", gap: 1 } as const;

const meta = {
  title: "Cards and sections/SubsectionTitle",
  tags: ["ui"],
  render: (_args, { globals }) => (
    <Box sx={{ maxWidth: 600 }}>
      <SubsectionTitle id="story-subtitle">{i18nOf(globals).t("scores.sections")}</SubsectionTitle>
      {content(96)}
    </Box>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A part's title over what it titles, 8 px apart, as a score's sections stand in its details. */
export const AboveItsContent: Story = {};

/** Words that belong to the title follow it on its row, as the note density's peak does. */
export const WithWordsAfterIt: Story = {
  render: (_args, { globals }) => {
    const { t } = i18nOf(globals);
    return (
      <Box sx={{ maxWidth: 600 }}>
        <SubsectionTitle
          end={
            <Typography variant="body2" color="text.secondary">
              {t("details.densityPeak", { value: 10 })}
            </Typography>
          }
        >
          {t("details.density")}
        </SubsectionTitle>
        {content(120)}
      </Box>
    );
  },
};

/** A group's title over its tiles, as the costume's colours and items have on a wide window. */
export const OverTiles: Story = {
  render: (_args, { globals }) => (
    <Box sx={{ maxWidth: 600 }}>
      <SubsectionTitle level={2}>{i18nOf(globals).t("costume.tab.colours")}</SubsectionTitle>
      <Box sx={TILES}>
        {[0, 1, 2].map((tile) => (
          <Skeleton key={tile} variant="rounded" height={56} animation={false} />
        ))}
      </Box>
    </Box>
  ),
};

/** The two kinds together: a section's title, then a part's title inside it. */
export const UnderASectionTitle: Story = {
  render: (_args, { globals }) => {
    const { t } = i18nOf(globals);
    return (
      <Box sx={{ maxWidth: 600 }}>
        <SectionTitle>{t("panel.ranks")}</SectionTitle>
        {content(48)}
        <Box sx={{ pt: 2 }}>
          <SubsectionTitle>{t("scores.sections")}</SubsectionTitle>
          {content(96)}
        </Box>
      </Box>
    );
  },
};

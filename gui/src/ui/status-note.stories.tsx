import { Box, Card, CardContent, Skeleton, Stack, Typography } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { PAGE_HEIGHT } from "../navigation/app-frame";
import { i18nOf } from "../story-kit/env";
import { StatusNote } from "./status-note";

const CHIPS = [80, 170, 72, 64];

const meta = {
  title: "Status/StatusNote",
  tags: ["ui"],
  parameters: { layout: "fullscreen" },
  // As the frame holds a page: the top band's room over it and the bottom room under it.
  render: (_args, { globals }) => (
    <Box sx={{ pt: 8, pb: 4, px: 2 }}>
      <Stack spacing={2} sx={{ minHeight: PAGE_HEIGHT }}>
        <StatusNote id="story-note" fill>
          {i18nOf(globals).t("scores.emptyReadAgain")}
        </StatusNote>
      </Stack>
    </Box>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A page with nothing to show yet: the words in the middle of the window, saying how to fill it. */
export const APageWithNothing: Story = {};

/** A search and its filters found nothing: the words in the middle of what is left below them. */
export const NothingMatches: Story = {
  render: (_args, { globals }) => (
    <Box sx={{ pt: 8, pb: 4, px: 2 }}>
      <Stack spacing={2} sx={{ minHeight: PAGE_HEIGHT }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          {CHIPS.map((width) => (
            <Skeleton
              key={width}
              variant="rounded"
              width={width}
              height={32}
              sx={{ borderRadius: 4 }}
            />
          ))}
        </Box>
        <StatusNote fill>{i18nOf(globals).t("scores.noMatch")}</StatusNote>
      </Stack>
    </Box>
  ),
};

/** In a card, where its list would be: the words centred in their place. */
export const InACard: Story = {
  render: (_args, { globals }) => {
    const { t } = i18nOf(globals);
    return (
      <Box sx={{ p: 2, maxWidth: 600 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 500 }}>
              {t("favorites.folder.heading")}
            </Typography>
            <StatusNote>{t("favorites.folderEmpty")}</StatusNote>
          </CardContent>
        </Card>
      </Box>
    );
  },
};

/** What the last read found, over the list it speaks of: the same grey words, in their place. */
export const WhatTheReadFound: Story = {
  render: (_args, { globals }) => {
    const { t, number } = i18nOf(globals);
    return (
      <Box sx={{ p: 2, maxWidth: 900 }}>
        <StatusNote>{t("scores.unread", { count: number(12) })}</StatusNote>
        <Stack spacing={1}>
          {CHIPS.map((width) => (
            <Skeleton key={width} variant="rounded" height={56} animation={false} />
          ))}
        </Stack>
      </Box>
    );
  },
};

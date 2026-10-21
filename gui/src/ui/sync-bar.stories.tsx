import { Box, Button, Skeleton, Stack } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { BAR_TEXT_BUTTON, SYNC_BAR_PAGE, SyncBar, type SyncBarProps } from "./sync-bar";

type Args = Omit<SyncBarProps, "i18n">;

const ROWS = [...Array(16).keys()];

const meta = {
  title: "Buttons/SyncBar",
  tags: ["ui"],
  args: { id: "story", canSync: true, canReset: true, saving: false, onSync: fn(), onReset: fn() },
  render: (args: Args, { globals }) => <SyncBar {...args} i18n={i18nOf(globals)} />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Something on the page has changed: Reset drops it, Sync to Hiroba sends it. */
export const Changed: Story = {};

/** Nothing has changed yet: the bar stays, its buttons shut. */
export const NothingChanged: Story = { args: { canSync: false, canReset: false } };

/** The costume's bar: its History before the bar's own buttons. */
export const WithHistory: Story = {
  render: (args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <SyncBar
        {...args}
        start={<Button sx={BAR_TEXT_BUTTON}>{i18n.t("costume.history")}</Button>}
        i18n={i18n}
      />
    );
  },
};

/** A set shown on Favourites: nothing to drop, only Sync to Hiroba. */
export const ASetToSync: Story = {
  render: (args, { globals }) => <SyncBar {...args} onReset={undefined} i18n={i18nOf(globals)} />,
};

/** A write on its way: its words over a moving bar stand in for the buttons. */
export const Saving: Story = { args: { saving: true } };

/** At a page's foot, under content taller than the window: it stays at the window's foot. */
export const AtThePageFoot: Story = {
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => (
    <Box sx={{ pt: 8, pb: 4, px: 2 }}>
      <Box sx={SYNC_BAR_PAGE}>
        <Stack spacing={2} sx={{ pb: 2 }}>
          {ROWS.map((row) => (
            <Skeleton key={row} variant="rounded" height={48} animation={false} />
          ))}
        </Stack>
        <SyncBar {...args} i18n={i18nOf(globals)} />
      </Box>
    </Box>
  ),
};

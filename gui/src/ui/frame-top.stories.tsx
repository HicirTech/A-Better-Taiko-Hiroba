import { Paper, Skeleton, Stack } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import { AppFrame } from "../navigation/app-frame";
import { PAGE_REGISTRY } from "../pages/registry";
import { i18nOf } from "../story-kit/env";
import { FrameTop } from "./frame-top";

const meta = {
  title: "Navigation/FrameTop",
  tags: ["ui"],
  parameters: { layout: "fullscreen" },
  render: (_args, { globals }) => (
    <AppFrame
      page="overview"
      onNavigate={action("navigate")}
      i18n={i18nOf(globals)}
      pages={PAGE_REGISTRY}
    >
      <FrameTop>
        <Paper sx={{ height: 48, borderRadius: 6 }} />
      </FrameTop>
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={180} />
        <Skeleton variant="rounded" height={240} />
      </Stack>
    </AppFrame>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A page's bar across the window's top band, clear of the menu button, as the song search's is. */
export const BarInTheTopBand: Story = {};

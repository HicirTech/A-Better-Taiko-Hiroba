import { Box, Skeleton, Stack } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { onDevice } from "../story-kit/devices";
import { touchDrag } from "../story-kit/touch";
import { PULL_RESISTANCE, PULL_THRESHOLD_PX } from "./pull-gesture";
import { PullToRead } from "./pull-to-read";

interface Args {
  readonly canRead: boolean;
  readonly onRead: () => void;
  readonly onHeld?: (() => void) | undefined;
}

const FINGER = { x: 200, y: 120 };

/** A finger put on the page and drawn down by `pulledPx` of pull, and held there. */
const pulledBy =
  (pulledPx: number) =>
  ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const main = canvasElement.querySelector("main");
    if (main !== null) {
      touchDrag(main, FINGER, { x: FINGER.x, y: FINGER.y + pulledPx / PULL_RESISTANCE });
    }
  };

const meta = {
  title: "Status/PullToRead",
  tags: ["read-again"],
  parameters: { layout: "fullscreen" },
  globals: onDevice("phone"),
  render: (args) => (
    <Box component="main" sx={{ minHeight: 400, p: 2 }}>
      <PullToRead active {...args} />
      <Stack spacing={1}>
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="rectangular" height={120} />
        <Skeleton variant="text" width="40%" />
      </Stack>
    </Box>
  ),
  args: { canRead: true, onRead: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A pull on its way: the ring fills toward the point where letting go reads again. */
export const Pulling: Story = { play: pulledBy(PULL_THRESHOLD_PX / 2) };

/** Past the point: letting go reads again. */
export const PastThePoint: Story = { play: pulledBy(PULL_THRESHOLD_PX + 8) };

/** On Scores a pull held past the point for six seconds reads every score again. */
export const HeldPastThePoint: Story = {
  args: { onHeld: fn() },
  play: pulledBy(PULL_THRESHOLD_PX + 8),
};

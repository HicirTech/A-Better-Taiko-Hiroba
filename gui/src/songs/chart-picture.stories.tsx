import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import type { HirobaSessionPort } from "../shared/session-port";
import { i18nOf } from "../story-kit/env";
import { neverAnswers, STORY_CHART_PORT } from "../story-kit/story-port";
import { ChartPicture } from "./chart-picture";
import type { ShownChart } from "./chart-viewer";

interface Args {
  readonly onOpen: (chart: ShownChart) => void;
}

const FIRST_PICTURE = "https://charts.stand-in.invalid/__charts/1001/oni-1.png";

const picture = (
  args: Args,
  i18n: Translator,
  port: Pick<HirobaSessionPort, "readChartPicture">,
) => (
  <Box sx={{ maxWidth: 480 }}>
    <ChartPicture
      url={FIRST_PICTURE}
      label={i18n.t("details.picture", { difficulty: i18n.t("difficulty.oni"), number: 1 })}
      port={port}
      i18n={i18n}
      onOpen={args.onOpen}
    />
  </Box>
);

const meta = {
  title: "Pictures/ChartPicture",
  tags: ["songs"],
  render: (args, { globals }) => picture(args, i18nOf(globals), STORY_CHART_PORT),
  args: { onOpen: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** taiko.wiki's picture of a chart, as wide as its column; a tap opens it on the whole screen. */
export const Shown: Story = {};

/** A skeleton while it is on its way. */
export const OnItsWay: Story = {
  render: (args, { globals }) => picture(args, i18nOf(globals), { readChartPicture: neverAnswers }),
};

/** Why it did not come, its code, and a retry. */
export const Failed: Story = {
  render: (args, { globals }) =>
    picture(args, i18nOf(globals), {
      readChartPicture: () =>
        Promise.resolve({ ok: false, error: { code: "chartPicture=unreachable" } }),
    }),
};

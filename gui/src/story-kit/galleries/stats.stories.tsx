import type { Meta, StoryObj } from "@storybook/react-vite";

import * as ShareRows from "../../know-yourself/share-rows.stories";
import * as LegendItem from "../../profile/legend-item.stories";
import * as ShareBar from "../../profile/share-block.share-bar.stories";
import * as ShareLegend from "../../profile/share-block.share-legend.stories";
import * as ShareBlock from "../../profile/share-block.stories";
import * as RatingRadar from "../../rating/rating-radar.stories";
import * as ChartDensitySection from "../../songs/chart-density.stories";
import * as DensityLine from "../../songs/density-line.stories";
import { Gallery } from "../gallery";

const meta = {
  title: "Stats/Side by side",
  tags: ["gallery"],
  parameters: { layout: "fullscreen" },
  render: (_args, context) => (
    <Gallery
      context={context}
      members={[
        { name: "ShareBar", meta: ShareBar.default, story: ShareBar.Ranks },
        { name: "ShareLegend", meta: ShareLegend.default, story: ShareLegend.Icons },
        { name: "LegendItem", meta: LegendItem.default, story: LegendItem.WithIcon },
        { name: "ShareBlock", meta: ShareBlock.default, story: ShareBlock.Ranks },
        { name: "ShareRows", meta: ShareRows.default, story: ShareRows.ByStarLevel },
        { name: "RatingRadar", meta: RatingRadar.default, story: RatingRadar.Skills },
        { name: "DensityLine", meta: DensityLine.default, story: DensityLine.Line },
        {
          name: "ChartDensitySection",
          meta: ChartDensitySection.default,
          story: ChartDensitySection.Shown,
        },
      ]}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every bar, legend and chart the app draws its numbers with. */
export const SideBySide: Story = { name: "Side by side" };

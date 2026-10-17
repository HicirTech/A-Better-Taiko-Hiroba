import type { Meta, StoryObj } from "@storybook/react-vite";

import * as ItemPicture from "../../my-page/costume-item-grid.item-picture.stories";
import * as CostumePreviewBox from "../../my-page/costume-preview-box.stories";
import * as MedalCard from "../../my-page/medal-card.stories";
import * as MyDonPortrait from "../../my-page/my-don-portrait.stories";
import * as ScorePanel from "../../my-page/score-panel.stories";
import * as TitlePlate from "../../my-page/title-plate.stories";
import * as HirobaIcon from "../../pictures/hiroba-icon.stories";
import * as ChartPicture from "../../songs/chart-picture.stories";
import * as ChartPictures from "../../songs/chart-pictures.stories";
import * as CourseIcon from "../../songs/course-icon.stories";
import { Gallery } from "../gallery";

const meta = {
  title: "Pictures/Side by side",
  tags: ["gallery"],
  parameters: { layout: "fullscreen" },
  render: (_args, context) => (
    <Gallery
      context={context}
      members={[
        { name: "HirobaIcon", meta: HirobaIcon.default, story: HirobaIcon.RankIcon },
        { name: "CourseIcon", meta: CourseIcon.default, story: CourseIcon.EveryDifficulty },
        { name: "ItemPicture", meta: ItemPicture.default, story: ItemPicture.Shown },
        { name: "MyDonPortrait", meta: MyDonPortrait.default, story: MyDonPortrait.Shown },
        {
          name: "CostumePreviewBox",
          meta: CostumePreviewBox.default,
          story: CostumePreviewBox.Shown,
        },
        { name: "TitlePlate", meta: TitlePlate.default, story: TitlePlate.Shown },
        { name: "ScorePanel", meta: ScorePanel.default, story: ScorePanel.Shown },
        { name: "MedalCard", meta: MedalCard.default, story: MedalCard.Collecting },
        { name: "ChartPicture", meta: ChartPicture.default, story: ChartPicture.Shown },
        { name: "ChartPictures", meta: ChartPictures.default, story: ChartPictures.Drawn },
      ]}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hiroba's pictures and the charts' as the app draws them, with what it lays over them. */
export const SideBySide: Story = { name: "Side by side" };

import type { Meta, StoryObj } from "@storybook/react-vite";

import * as FolderCard from "../../favorites/folder-card.stories";
import * as SetView from "../../favorites/set-view.stories";
import * as SongCard from "../../favorites/song-card.stories";
import * as BandItem from "../../know-yourself/band-item.stories";
import * as CrownsItem from "../../know-yourself/crowns-item.stories";
import * as KnowItem from "../../know-yourself/know-item.stories";
import * as NearMissItem from "../../know-yourself/near-miss-item.stories";
import * as RanksItem from "../../know-yourself/ranks-item.stories";
import * as PartHead from "../../my-page/costume-part-panel.part-head.stories";
import * as OverviewHeader from "../../my-page/overview-header.stories";
import * as PanelCard from "../../my-page/panel-card.stories";
import * as NameSection from "../../name-title/name-section.stories";
import * as TitleSection from "../../name-title/title-section.stories";
import * as GroupDetails from "../../pipelines-page/group-details.stories";
import * as PipelineSection from "../../pipelines-page/pipeline-section.stories";
import * as AppearanceSection from "../../settings/appearance-section.stories";
import * as GitHubSection from "../../settings/github-section.stories";
import * as ScoresSection from "../../settings/scores-section.stories";
import * as SettingsSection from "../../settings/settings-section.stories";
import * as SongDataSection from "../../settings/song-data-section.stories";
import * as SongLevelsSection from "../../settings/song-levels-section.stories";
import * as UpdatesSection from "../../settings/updates-section.stories";
import * as SectionCard from "../../ui/section-card.stories";
import * as SectionTitle from "../../ui/section-title.stories";
import * as SubsectionTitle from "../../ui/section-title.subsection-title.stories";
import { Gallery } from "../gallery";

const meta = {
  title: "Cards and sections/Side by side",
  tags: ["gallery"],
  parameters: { layout: "fullscreen" },
  render: (_args, context) => (
    <Gallery
      context={context}
      members={[
        {
          name: "OverviewHeader",
          meta: OverviewHeader.default,
          story: OverviewHeader.Shown,
          wide: true,
        },
        { name: "SectionCard", meta: SectionCard.default, story: SectionCard.Stacked },
        {
          name: "SectionTitle",
          meta: SectionTitle.default,
          story: SectionTitle.WithThingsAtItsEnd,
        },
        {
          name: "SubsectionTitle",
          meta: SubsectionTitle.default,
          story: SubsectionTitle.UnderASectionTitle,
        },
        { name: "PanelCard", meta: PanelCard.default, story: PanelCard.RanksAndCrowns },
        { name: "SongCard", meta: SongCard.default, story: SongCard.Picked },
        { name: "FolderCard", meta: FolderCard.default, story: FolderCard.NotASet },
        { name: "SetView", meta: SetView.default, story: SetView.Shown },
        { name: "KnowItem", meta: KnowItem.default, story: KnowItem.Folded },
        { name: "CrownsItem", meta: CrownsItem.default, story: CrownsItem.ClearLadder },
        { name: "RanksItem", meta: RanksItem.default, story: RanksItem.ScoreRanks },
        { name: "BandItem", meta: BandItem.default, story: BandItem.HitsPerSecond },
        { name: "NearMissItem", meta: NearMissItem.default, story: NearMissItem.NearAFullCombo },
        { name: "PartHead", meta: PartHead.default, story: PartHead.Heading },
        { name: "TitleSection", meta: TitleSection.default, story: TitleSection.Title },
        { name: "NameSection", meta: NameSection.default, story: NameSection.Nickname },
        { name: "SettingsSection", meta: SettingsSection.default, story: SettingsSection.Section },
        {
          name: "AppearanceSection",
          meta: AppearanceSection.default,
          story: AppearanceSection.AsInstalled,
        },
        { name: "UpdatesSection", meta: UpdatesSection.default, story: UpdatesSection.Idle },
        {
          name: "SongLevelsSection",
          meta: SongLevelsSection.default,
          story: SongLevelsSection.ShownFirst,
        },
        { name: "ScoresSection", meta: ScoresSection.default, story: ScoresSection.DefaultSort },
        { name: "SongDataSection", meta: SongDataSection.default, story: SongDataSection.Sources },
        { name: "GitHubSection", meta: GitHubSection.default, story: GitHubSection.Repository },
        { name: "PipelineSection", meta: PipelineSection.default, story: PipelineSection.Cells },
        { name: "GroupDetails", meta: GroupDetails.default, story: GroupDetails.Running },
      ]}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every card, section and heading, to see how each page titles and frames its parts. */
export const SideBySide: Story = { name: "Side by side" };

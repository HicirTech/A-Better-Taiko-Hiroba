import type { Meta, StoryObj } from "@storybook/react-vite";
import * as SongFilters from "../../favorites/song-filters.stories";
import * as ScoreFilters from "../../scores/score-filters.stories";
import * as FilterToggles from "../../ui/filter-chip.filter-toggles.stories";
import * as MultiFilterChip from "../../ui/filter-chip.multi-filter-chip.stories";
import * as FilterChip from "../../ui/filter-chip.stories";
import * as LabelChip from "../../ui/label-chip.stories";
import { Gallery } from "../gallery";

const meta = {
  title: "Chips and filters/Side by side",
  tags: ["gallery"],
  parameters: { layout: "fullscreen" },
  render: (_args, context) => (
    <Gallery
      context={context}
      members={[
        { name: "FilterChip", meta: FilterChip.default, story: FilterChip.NothingChosen },
        {
          name: "FilterChip, chosen",
          meta: FilterChip.default,
          story: FilterChip.ChosenInItsColour,
        },
        {
          name: "FilterChip, always a choice",
          meta: FilterChip.default,
          story: FilterChip.AlwaysAChoice,
        },
        {
          name: "MultiFilterChip",
          meta: MultiFilterChip.default,
          story: MultiFilterChip.SeveralTicked,
        },
        { name: "FilterToggles", meta: FilterToggles.default, story: FilterToggles.OneChosen },
        { name: "LabelChip", meta: LabelChip.default, story: LabelChip.InTheThemesColour },
        { name: "LabelChip, genres", meta: LabelChip.default, story: LabelChip.Genres },
        { name: "SongFilters", meta: SongFilters.default, story: SongFilters.AllChosen },
        { name: "ScoreFilters", meta: ScoreFilters.default, story: ScoreFilters.AsAVisitStarts },
      ]}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every chip and row of chips the pages narrow their lists with. */
export const SideBySide: Story = { name: "Side by side" };

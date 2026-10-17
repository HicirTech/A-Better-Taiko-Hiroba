import type { Meta, StoryObj } from "@storybook/react-vite";

import * as LanguageSetting from "../../language/language-setting.stories";
import * as CostumeItemGrid from "../../my-page/costume-item-grid.stories";
import * as Palette from "../../my-page/costume-palette.stories";
import * as PartPanel from "../../my-page/costume-part-panel.stories";
import * as TitlePicker from "../../name-title/title-picker.stories";
import * as SearchField from "../../ui/search-field.stories";
import { Gallery } from "../gallery";

const meta = {
  title: "Fields/Side by side",
  tags: ["gallery"],
  parameters: { layout: "fullscreen" },
  render: (_args, context) => (
    <Gallery
      context={context}
      members={[
        { name: "SearchField", meta: SearchField.default, story: SearchField.Searching },
        { name: "TitlePicker", meta: TitlePicker.default, story: TitlePicker.Titles },
        {
          name: "LanguageSetting",
          meta: LanguageSetting.default,
          story: LanguageSetting.AsTheSystem,
        },
        { name: "Palette", meta: Palette.default, story: Palette.Colours },
        { name: "CostumeItemGrid", meta: CostumeItemGrid.default, story: CostumeItemGrid.Items },
        { name: "PartPanel", meta: PartPanel.default, story: PartPanel.Items },
      ]}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every field and picker, to compare how each takes a choice or words. */
export const SideBySide: Story = { name: "Side by side" };

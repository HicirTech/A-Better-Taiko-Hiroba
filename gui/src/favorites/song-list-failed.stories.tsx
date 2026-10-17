import type { Meta, StoryObj } from "@storybook/react-vite";

import { i18nOf } from "../story-kit/env";
import { storyCatalogue } from "../story-kit/songs";
import { SongListFailed } from "./song-list-failed";

const meta = {
  title: "Status/SongListFailed",
  tags: ["favorites"],
  render: (_args, { globals }) => (
    <SongListFailed id="story-songs" catalogue={storyCatalogue("failed")} i18n={i18nOf(globals)} />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** taiko.wiki's song list could not be read and none is kept: why, and a way to try again. */
export const Failed: Story = {};

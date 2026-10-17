import type { Meta, StoryObj } from "@storybook/react-vite";

import { i18nOf } from "../story-kit/env";
import { Waiting } from "./editor-parts";

const meta = {
  title: "Status/Waiting",
  tags: ["my-page"],
  render: (_args, { globals }) => <Waiting>{i18nOf(globals).t("costume.saving")}</Waiting>,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A spinner and what it waits for, such as a save on its way. */
export const Saving: Story = {};

export const Reading: Story = {
  render: (_args, { globals }) => <Waiting>{i18nOf(globals).t("picker.loading")}</Waiting>,
};

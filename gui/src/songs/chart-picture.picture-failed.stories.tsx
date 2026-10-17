import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { PictureFailed } from "./chart-picture";

interface Args {
  readonly onRetry: () => void;
}

const meta = {
  title: "Status/PictureFailed",
  tags: ["songs"],
  render: (args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <PictureFailed
        {...args}
        message={i18n.t("details.pictureFailed")}
        code="chartPicture=unreachable"
        i18n={i18n}
      />
    );
  },
  args: { onRetry: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A chart picture that did not come: why, its code, and a retry. */
export const Failed: Story = {};

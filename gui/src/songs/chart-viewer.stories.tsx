import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { chartPicturePng } from "../../scripts/mock-pictures";
import { modalLookOf, touchOf } from "../story-kit/devices";
import { i18nOf } from "../story-kit/env";
import { pictureOf } from "../story-kit/picture-of";
import { ChartViewer } from "./chart-viewer";

interface Args {
  readonly onClose: () => void;
}

const meta = {
  title: "Dialogs/ChartViewer",
  tags: ["songs"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => {
    const i18n = i18nOf(globals);
    const label = i18n.t("details.drawnPicture", { difficulty: i18n.t("difficulty.oni") });
    return (
      <ChartViewer
        {...args}
        chart={{ picture: pictureOf(chartPicturePng(4)), label }}
        touchFirst={touchOf(globals)}
        modalLook={modalLookOf(globals)}
        i18n={i18n}
      />
    );
  },
  args: { onClose: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A chart picture on the whole screen, zoomed by two fingers, the wheel or a double click. */
export const Chart: Story = {};

import type { Translator } from "@abth/i18n";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";

import { STORY_EDITOR } from "../story-kit/costume";
import { i18nOf } from "../story-kit/env";
import { FAILING_LANE } from "../story-kit/story-pictures";
import { ThumbnailsUnavailable } from "./costume-item-grid";
import { itemsOf, slotOf } from "./costume-parts";

const ITEMS = itemsOf(STORY_EDITOR, "costume3");

/** Asks the failing lane for the slot's thumbnails, so the words have failures to count. */
function AskedFailing({ i18n }: { i18n: Translator }) {
  useEffect(() => {
    const takeBack = ITEMS.map((id, order) =>
      FAILING_LANE.ask({ kind: "costumeItem", slot: slotOf("costume3"), id }, { order }),
    );
    return () => {
      for (const one of takeBack) {
        one();
      }
    };
  }, []);
  return <ThumbnailsUnavailable lane={FAILING_LANE} i18n={i18n} part="costume3" items={ITEMS} />;
}

const meta = {
  title: "Status/ThumbnailsUnavailable",
  tags: ["my-page"],
  render: (_args, { globals }) => <AskedFailing i18n={i18nOf(globals)} />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** How many thumbnails did not come, and the first one's code to report. */
export const SomeFailed: Story = {};

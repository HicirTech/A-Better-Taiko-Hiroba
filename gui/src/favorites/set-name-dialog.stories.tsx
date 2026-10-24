import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { newSetName } from "../shared/sets/favorite-sets";
import { i18nOf } from "../story-kit/env";
import { STORY_SETS } from "../story-kit/sets";
import { SetNameDialog, type SetNameDialogProps } from "./set-name-dialog";

type Args = Pick<SetNameDialogProps, "onCancel" | "onSave">;

const meta = {
  title: "Dialogs/SetNameDialog",
  tags: ["favorites"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => {
    const i18n = i18nOf(globals);
    const { t } = i18n;
    return (
      <SetNameDialog
        {...args}
        title={t("favorites.newSet")}
        initial={newSetName(STORY_SETS, (number) => t("favorites.setName", { number }))}
        i18n={i18n}
      />
    );
  },
  args: { onCancel: fn(), onSave: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A new set starts with a numbered name; Save stays shut while the name is blank. */
export const NewSet: Story = {};

export const Rename: Story = {
  render: (args, { globals }) => {
    const i18n = i18nOf(globals);
    const [set] = STORY_SETS;
    return (
      <SetNameDialog
        {...args}
        title={i18n.t("favorites.rename.title")}
        initial={set?.name ?? ""}
        i18n={i18n}
      />
    );
  },
};

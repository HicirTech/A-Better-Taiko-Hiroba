import { Typography } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { action } from "storybook/actions";
import { fn } from "storybook/test";
import { SET_SONG_LIMIT } from "../shared/sets/favorite-sets";
import { modalLookOf, touchOf } from "../story-kit/devices";
import { i18nOf } from "../story-kit/env";
import { ChoiceDialog } from "./choice-dialog";

type Args = Omit<
  ComponentProps<typeof ChoiceDialog>,
  "title" | "choices" | "touchFirst" | "modalLook" | "i18n"
>;

const meta = {
  title: "Dialogs/ChoiceDialog",
  tags: ["ui"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => {
    const i18n = i18nOf(globals);
    const { t, number } = i18n;
    return (
      <ChoiceDialog
        {...args}
        touchFirst={touchOf(globals)}
        modalLook={modalLookOf(globals)}
        i18n={i18n}
        title={t("history.addToSet")}
        choices={[
          { id: "set-1", primary: "練習用", secondary: null, onChoose: action("choose") },
          {
            id: "set-2",
            primary: "Party picks",
            secondary: t("history.setFull", { count: number(SET_SONG_LIMIT) }),
            onChoose: null,
          },
          {
            id: "new",
            primary: t("favorites.newSet"),
            secondary: null,
            onChoose: action("choose"),
          },
        ]}
      />
    );
  },
  args: {
    id: "story-choice",
    subtitle: { text: "夜明けのスケッチ", lang: "ja" },
    onClose: fn(),
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSubtitle: Story = {};

export const WithoutSubtitle: Story = { args: { subtitle: null } };

/** Saving the folder into a set: any set takes it, and the next question asks to replace it. */
export const SetsForTheFolder: Story = {
  render: (args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <ChoiceDialog
        {...args}
        subtitle={null}
        touchFirst={touchOf(globals)}
        modalLook={modalLookOf(globals)}
        i18n={i18n}
        title={i18n.t("favorites.saveToSet")}
        choices={["練習用", "Party picks", "Set 3"].map((name, index) => ({
          id: `story-folder-set-${index}`,
          primary: name,
          secondary: null,
          onChoose: action("choose"),
        }))}
      />
    );
  },
};

/** No choice to make: what stands in for them shows instead. */
export const Empty: Story = {
  render: (args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <ChoiceDialog
        {...args}
        touchFirst={touchOf(globals)}
        modalLook={modalLookOf(globals)}
        i18n={i18n}
        title={i18n.t("history.addToSet")}
        choices={[]}
        empty={
          <Typography color="text.secondary" sx={{ px: 3, pt: 1, pb: 3 }}>
            {i18n.t("history.unknownSong")}
          </Typography>
        }
      />
    );
  },
};

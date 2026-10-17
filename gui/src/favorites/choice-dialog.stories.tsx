import { Typography } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { action } from "storybook/actions";
import { fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { ChoiceDialog } from "./choice-dialog";
import { SET_SONG_LIMIT } from "./favorite-sets";

type Args = Omit<ComponentProps<typeof ChoiceDialog>, "title" | "choices" | "i18n">;

const meta = {
  title: "Dialogs/ChoiceDialog",
  tags: ["favorites"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => {
    const i18n = i18nOf(globals);
    const { t, number } = i18n;
    return (
      <ChoiceDialog
        {...args}
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

/** No choice to make: what stands in for them shows instead. */
export const Empty: Story = {
  render: (args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <ChoiceDialog
        {...args}
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

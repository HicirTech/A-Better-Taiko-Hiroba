import type { TitleOption } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { STORY_TITLES } from "../story-kit/story-port";
import type { TitleList } from "./title-editor-state";
import { TitlePicker } from "./title-picker";

interface Args {
  readonly busy: boolean;
  readonly onPick: (option: TitleOption | null) => void;
}

function Picker({ args, i18n, list }: { args: Args; i18n: Translator; list: TitleList }) {
  const [picked, setPicked] = useState<TitleOption | null>(null);
  return (
    <Box sx={{ maxWidth: 480 }}>
      <TitlePicker
        worn={STORY_PROFILE.title}
        picked={picked}
        list={list}
        busy={args.busy}
        onOpen={() => {}}
        onPick={(option) => {
          setPicked(option);
          args.onPick(option);
        }}
        i18n={i18n}
      />
    </Box>
  );
}

const meta = {
  title: "Fields/TitlePicker",
  tags: ["name-title"],
  render: (args, { globals }) => (
    <Picker
      args={args}
      i18n={i18nOf(globals)}
      list={{ name: "read", options: STORY_TITLES.options }}
    />
  ),
  args: { busy: false, onPick: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The title worn, and the titles owned to search and pick from. */
export const Titles: Story = {};

/** The list is read only as the picker opens: until it comes, the picker says so. */
export const ListOnItsWay: Story = {
  render: (args, { globals }) => (
    <Picker args={args} i18n={i18nOf(globals)} list={{ name: "loading" }} />
  ),
};

export const ListFailed: Story = {
  render: (args, { globals }) => (
    <Picker
      args={args}
      i18n={i18nOf(globals)}
      list={{ name: "failed", failure: { kind: "timedOut" } }}
    />
  ),
};

export const WhileSaving: Story = { args: { busy: true } };

import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { SearchField } from "./search-field";

interface Args {
  readonly onSubmit: () => void;
}

interface First {
  readonly query: string;
  /** Open as the Overview's search is once used: it stands in for its page. */
  readonly open: boolean;
}

function Field({ args, i18n, first }: { args: Args; i18n: Translator; first: First }) {
  const [query, setQuery] = useState(first.query);
  const [open, setOpen] = useState(first.open);
  return (
    <Box sx={{ maxWidth: 560 }}>
      <SearchField
        id="story-search"
        query={query}
        i18n={i18n}
        hint={i18n.t("picker.searchHint")}
        onQuery={setQuery}
        onFocus={() => setOpen(true)}
        onLeave={
          open
            ? () => {
                setOpen(false);
                setQuery("");
              }
            : undefined
        }
        onSubmit={args.onSubmit}
      />
    </Box>
  );
}

const meta = {
  title: "Fields/SearchField",
  tags: ["ui"],
  render: (args, { globals }) => (
    <Field args={args} i18n={i18nOf(globals)} first={{ query: "", open: false }} />
  ),
  args: { onSubmit: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shut: a search mark, and what it searches for, until it is used. */
export const Idle: Story = {};

/** Open and empty, with no history to show: the bar says what a search takes. */
export const OpenAndEmpty: Story = {
  render: (args, { globals }) => (
    <Field args={args} i18n={i18nOf(globals)} first={{ query: "", open: true }} />
  ),
};

/** Searching: a way back out, the words and a × that clears them. */
export const Searching: Story = {
  render: (args, { globals }) => (
    <Field args={args} i18n={i18nOf(globals)} first={{ query: "sketch", open: true }} />
  ),
};

import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import { fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { SongSearchBar } from "./song-search-bar";

interface Args {
  readonly onSubmit: () => void;
}

function Bar({
  args,
  i18n,
  first,
}: {
  args: Args;
  i18n: Translator;
  first: { query: string; active: boolean };
}) {
  const [query, setQuery] = useState(first.query);
  const [active, setActive] = useState(first.active);
  const input = useRef<HTMLInputElement>(null);
  return (
    <Box sx={{ maxWidth: 560 }}>
      <SongSearchBar
        query={query}
        active={active}
        i18n={i18n}
        inputRef={input}
        onQuery={(next) => {
          setActive(true);
          setQuery(next);
        }}
        onActivate={() => setActive(true)}
        onLeave={() => {
          setActive(false);
          setQuery("");
        }}
        onSubmit={args.onSubmit}
      />
    </Box>
  );
}

const meta = {
  title: "Fields/SongSearchBar",
  tags: ["songs"],
  render: (args, { globals }) => (
    <Bar args={args} i18n={i18nOf(globals)} first={{ query: "", active: false }} />
  ),
  args: { onSubmit: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A search field as Gmail draws it: a search mark until it is used. */
export const Idle: Story = {};

/** Searching: a way back out, and a × that clears the words. */
export const Searching: Story = {
  render: (args, { globals }) => (
    <Bar args={args} i18n={i18nOf(globals)} first={{ query: "sketch", active: true }} />
  ),
};

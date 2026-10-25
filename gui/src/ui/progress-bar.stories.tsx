import type { Translator } from "@abth/i18n";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { i18nOf } from "../story-kit/env";
import { type Done, ProgressBar } from "./progress-bar";

const LISTS = 15;
const CHARTS = 40;
const STEP_MS = 400;

type Moment =
  | { readonly kind: "page"; readonly page: number }
  | ({ readonly kind: "lists" | "charts" } & Done);

const onPage = (page: number): Moment => ({ kind: "page", page });
const counted = (kind: "lists" | "charts", total: number): Moment[] =>
  Array.from({ length: total + 1 }, (_, done) => ({ kind, done, total }));

/** Each moment of a read of every score, as it tells them: pages first, then lists and charts. */
const MOMENTS: readonly Moment[] = [
  ...[1, 1, 2, 2, 3, 3].map(onPage),
  ...counted("lists", LISTS),
  ...counted("charts", CHARTS),
];

function ScoresRead({ i18n }: { readonly i18n: Translator }) {
  const { t, number } = i18n;
  const [at, setAt] = useState(0);
  useEffect(() => {
    const next = setInterval(() => setAt((now) => (now + 1) % MOMENTS.length), STEP_MS);
    return () => clearInterval(next);
  }, []);
  const moment = MOMENTS[at] ?? onPage(1);
  if (moment.kind === "page") {
    return <ProgressBar label={t("scores.readingPlays", { page: moment.page })} />;
  }
  const key = moment.kind === "lists" ? "scores.readingLists" : "scores.readingCharts";
  return (
    <ProgressBar
      label={t(key, { done: number(moment.done), total: number(moment.total) })}
      progress={moment}
    />
  );
}

const meta = {
  title: "Status/ProgressBar",
  tags: ["ui"],
  render: (_args, { globals }) => <ScoresRead i18n={i18nOf(globals)} />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A read of every score from its start: the pages counted, then the lists and charts filling. */
export const AReadOfEveryScore: Story = {};

/** A read that knows how far it has to go: the bar fills. */
export const WithATotal: Story = {
  render: (_args, { globals }) => {
    const { t, number } = i18nOf(globals);
    return (
      <ProgressBar
        label={t("scores.readingLists", { done: number(6), total: number(LISTS) })}
        progress={{ done: 6, total: LISTS }}
      />
    );
  },
};

/** A read that only counts its pages: the bar moves back and forth. */
export const WithoutATotal: Story = {
  render: (_args, { globals }) => (
    <ProgressBar label={i18nOf(globals).t("scores.readingPlays", { page: 2 })} />
  ),
};

/** taiko.wiki's song list coming in, where the song search or the picker waits for it. */
export const TheSongList: Story = {
  render: (_args, { globals }) => <ProgressBar label={i18nOf(globals).t("picker.loading")} />,
};

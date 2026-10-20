import { playOptionIcons, type RecentPlay } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box, Typography } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { action } from "storybook/actions";

import { DIFFICULTY_COLOUR, LEVEL_DIFFICULTY } from "../favorites/genre-look";
import { LevelBadges } from "../favorites/level-badges";
import { levelsOfEntry, type SongLook } from "../favorites/song-look";
import { CROWN_KEY, CROWN_RATIO } from "../history/history-row";
import { gapKindOf, gapsOf } from "../know-yourself/gaps";
import type { KnownChart } from "../know-yourself/known-charts";
import { HirobaIcon } from "../pictures/hiroba-icon";
import { i18nOf, localeOf, type StoryGlobals } from "../story-kit/env";
import { STORY_KNOWN } from "../story-kit/know";
import { STORY_PLAYS } from "../story-kit/plays";
import { lookOf } from "../story-kit/songs";
import { STORY_LANE } from "../story-kit/story-pictures";
import { SectionCard } from "../ui/section-card";
import { CHART_MARK_PX, ChartMarks } from "./chart-level";
import { RowCheckbox, SongRow } from "./song-row";

const LIST = { listStyle: "none", m: 0, p: 0 } as const;
const COLUMN = { maxWidth: 640 } as const;
// The story plays' songs, in STORY_PLAYS' order: a recent play names its song only by title.
const PLAYED = ["1005", "1001", "1008", "1012", "1010"] as const;
const SONGS = ["1001", "1005", "1008", "1012", "1004"] as const;

const lookIn = (globals: StoryGlobals) => (songNo: string) => lookOf(songNo, localeOf(globals));

function playMarks(play: RecentPlay, order: number, i18n: Translator): ReactNode {
  const { t } = i18n;
  return (
    <>
      {play.crown !== "none" && play.crown !== "played" && (
        <HirobaIcon
          want={{ kind: "crownIcon", crown: play.crown }}
          width={Math.round(CHART_MARK_PX * CROWN_RATIO)}
          height={CHART_MARK_PX}
          label={t(CROWN_KEY[play.crown])}
          lane={STORY_LANE}
          order={order}
        />
      )}
      {play.scoreRank !== null && (
        <HirobaIcon
          want={{ kind: "rankIcon", rank: play.scoreRank }}
          width={Math.round((CHART_MARK_PX * 128) / 96)}
          height={CHART_MARK_PX}
          label={t(`scoreRank.${play.scoreRank}` as const)}
          lane={STORY_LANE}
          order={order}
        />
      )}
      {playOptionIcons(play.record.options).map(({ code }) => (
        <HirobaIcon
          key={code}
          want={{ kind: "optionIcon", option: code }}
          width={CHART_MARK_PX}
          height={CHART_MARK_PX}
          lane={STORY_LANE}
          order={order}
        />
      ))}
    </>
  );
}

function playLines(play: RecentPlay, i18n: Translator): ReactNode[] {
  const { t, number } = i18n;
  const { record } = play;
  const counted = (name: string, count: number | null) =>
    count === null ? [] : [`${name} ${number(count)}`];
  return [
    [number(record.highScore), ...counted(t("history.combo"), record.maxCombo)].join(" · "),
    [
      ...counted(t("history.good"), record.good),
      ...counted(t("history.ok"), record.ok),
      ...counted(t("history.bad"), record.bad),
      ...counted(t("history.roll"), record.drumroll),
    ].join(" · "),
  ];
}

function PlayRowNew({
  play,
  look,
  order,
  i18n,
}: {
  readonly play: RecentPlay;
  readonly look: SongLook;
  readonly order: number;
  readonly i18n: Translator;
}) {
  const difficulty = LEVEL_DIFFICULTY[play.level];
  return (
    <SongRow
      genres={look.genres}
      name={look.name}
      lang={look.lang}
      lines={playLines(play, i18n)}
      marks={
        <ChartMarks
          difficulty={difficulty}
          level={look.levels?.[difficulty] ?? null}
          lane={STORY_LANE}
          order={order}
          i18n={i18n}
        >
          {playMarks(play, order, i18n)}
        </ChartMarks>
      }
      onPress={action("open the score's details")}
      pressOpens
    />
  );
}

function SongRowNew({
  look,
  i18n,
  onPress,
}: {
  readonly look: SongLook;
  readonly i18n: Translator;
  readonly onPress: () => void;
}) {
  return (
    <SongRow
      genres={look.genres}
      name={look.name}
      lang={look.lang}
      lines={look.artists.length > 0 ? [look.artists.join(", ")] : []}
      end={look.levels === null ? undefined : <LevelBadges levels={look.levels} i18n={i18n} />}
      onPress={onPress}
      pressOpens
    />
  );
}

interface PickerEntryNew {
  readonly look: SongLook;
  /** The song's 裏 chart in a row of its own, as the 大好きな曲's picker lists it. */
  readonly ura: boolean;
  readonly levels: SongLook["levels"];
}

// An inner chart's own row is washed in its colour, lighter than its badge, as the picker draws it.
const URA_ROW = {
  bgcolor: `color-mix(in srgb, ${DIFFICULTY_COLOUR.ura} 24%, transparent)`,
  "&.song-row-pressable:hover": {
    bgcolor: `color-mix(in srgb, ${DIFFICULTY_COLOUR.ura} 34%, transparent)`,
  },
} as const;

const entryKey = ({ look, ura }: PickerEntryNew) => `${look.songNo}${ura ? "-ura" : ""}`;

/** Each song once, or with its 裏 chart in a row of its own after it, as the picker lists them. */
function entriesOf(looks: readonly SongLook[], withUra: boolean): PickerEntryNew[] {
  return looks.flatMap((look) =>
    withUra && look.levels !== null && look.levels.ura !== null
      ? [
          { look, ura: false, levels: levelsOfEntry(look.levels, false) },
          { look, ura: true, levels: levelsOfEntry(look.levels, true) },
        ]
      : [{ look, ura: false, levels: look.levels }],
  );
}

/** The picker's rows in the shared row: each ticks or picks, its levels beside it as before. */
function PickerRowsNew({
  entries,
  ticks,
  i18n,
}: {
  readonly entries: readonly PickerEntryNew[];
  /** Whether a row ticks, as songs are added to a set, or picks the one song. */
  readonly ticks: boolean;
  readonly i18n: Translator;
}) {
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set(["1005"]));
  const tick = (key: string) =>
    setTicked((now) => {
      const next = new Set(now);
      if (!next.delete(key)) {
        next.add(key);
      }
      return next;
    });
  return (
    <Box component="ul" sx={LIST}>
      {entries.map((entry) => {
        const { look, levels } = entry;
        const key = entryKey(entry);
        return (
          <SongRow
            key={key}
            genres={look.genres}
            name={look.name}
            lang={look.lang}
            lines={look.artists.length > 0 ? [look.artists.join(", ")] : []}
            end={levels === null ? undefined : <LevelBadges levels={levels} i18n={i18n} />}
            {...(ticks
              ? { tick: { checked: ticked.has(key), onChange: () => tick(key) } }
              : { onPress: action("pick the song") })}
            {...(entry.ura ? { sx: URA_ROW } : {})}
          />
        );
      })}
    </Box>
  );
}

function KnownRowNew({
  chart,
  look,
  order,
  i18n,
}: {
  readonly chart: KnownChart;
  readonly look: SongLook;
  readonly order: number;
  readonly i18n: Translator;
}) {
  const [ticked, setTicked] = useState(false);
  const { t } = i18n;
  return (
    <SongRow
      start={<RowCheckbox checked={ticked} label={look.name} onChange={() => setTicked(!ticked)} />}
      genres={look.genres}
      name={look.name}
      lang={look.lang}
      lines={look.artists.length > 0 ? [look.artists.join(", ")] : []}
      marks={
        <ChartMarks
          difficulty={chart.difficulty}
          level={chart.stars}
          lane={STORY_LANE}
          order={order}
          i18n={i18n}
        >
          <Typography component="span" variant="body2" color="text.secondary" noWrap>
            {t(gapKindOf(chart) === "never" ? "know.never" : "know.tried")}
          </Typography>
        </ChartMarks>
      }
      onPress={action("open the chart's details")}
      pressOpens
    />
  );
}

const meta = {
  title: "Rows and lists/SongRow (new)",
  tags: ["songs"],
  render: (_args, { globals }) => {
    const i18n = i18nOf(globals);
    const look = lookIn(globals);
    return (
      <Box component="ul" sx={{ ...LIST, ...COLUMN }}>
        {STORY_PLAYS.slice(0, PLAYED.length).map((play, order) => (
          <PlayRowNew
            key={PLAYED[order]}
            play={play}
            look={look(PLAYED[order] ?? "")}
            order={order}
            i18n={i18n}
          />
        ))}
      </Box>
    );
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Recent plays: the difficulty's icon leads the marks, the level under them at the right. */
export const Plays: Story = {};

/** Songs, as the search lists them: their levels at the row's end, each opening its details. */
export const Songs: Story = {
  render: (_args, { globals }) => (
    <Box component="ul" sx={{ ...LIST, ...COLUMN }}>
      {SONGS.map((songNo) => (
        <SongRowNew
          key={songNo}
          look={lookIn(globals)(songNo)}
          i18n={i18nOf(globals)}
          onPress={action("open the song's details")}
        />
      ))}
    </Box>
  ),
};

/** Songs that the whole row ticks, as the picker adds them to a set, with MUI's check box. */
export const Ticked: Story = {
  render: (_args, { globals }) => (
    <Box sx={COLUMN}>
      <PickerRowsNew
        entries={entriesOf(SONGS.map(lookIn(globals)), false)}
        ticks
        i18n={i18nOf(globals)}
      />
    </Box>
  ),
};

/** One song picked, as the 大好きな曲's picker offers them: a 裏 chart in a row of its own. */
export const PickOne: Story = {
  render: (_args, { globals }) => (
    <Box sx={COLUMN}>
      <PickerRowsNew
        entries={entriesOf(SONGS.map(lookIn(globals)), true)}
        ticks={false}
        i18n={i18nOf(globals)}
      />
    </Box>
  ),
};

/** Know yourself's charts: a check box beside each row, which opens the chart's details. */
export const KnownCharts: Story = {
  render: (_args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Box component="ul" sx={{ ...LIST, ...COLUMN }}>
        {gapsOf(STORY_KNOWN)
          .slice(0, 5)
          .map((chart, order) => (
            <KnownRowNew
              key={`${chart.songNo}-${chart.difficulty}`}
              chart={chart}
              look={lookIn(globals)(chart.songNo)}
              order={order}
              i18n={i18n}
            />
          ))}
      </Box>
    );
  },
};

/** A list in a card reaches the card's edges; each row keeps its own 8 px. */
export const InACard: Story = {
  render: (_args, { globals }) => (
    <SectionCard flush sx={COLUMN}>
      <Box component="ul" sx={LIST}>
        {SONGS.map((songNo) => (
          <SongRowNew
            key={songNo}
            look={lookIn(globals)(songNo)}
            i18n={i18nOf(globals)}
            onPress={action("open the song's details")}
          />
        ))}
      </Box>
    </SectionCard>
  ),
};

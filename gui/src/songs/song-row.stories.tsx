import type { Translator } from "@abth/i18n";
import { Box, IconButton } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { action } from "storybook/actions";
import { LEVEL_DIFFICULTY } from "../shared/song-catalogue/genre-look";
import type { SongLook } from "../shared/song-catalogue/song-look";
import { i18nOf, localeOf, type StoryGlobals } from "../story-kit/env";
import { STORY_PLAYS } from "../story-kit/plays";
import { lookOf } from "../story-kit/songs";
import { STORY_LANE } from "../story-kit/story-pictures";
import { CloseIcon, DragIndicatorIcon } from "../ui/icons";
import { CARD_ROWS, SectionCard } from "../ui/section-card";
import { SectionTitle } from "../ui/section-title";
import { ChartMarks } from "./chart-level";
import { LevelBadges } from "./level-badges";
import { PlayMarks } from "./play-marks";
import { artistsLine, SongLookRow } from "./song-look-row";
import { RowCheckbox, SongRow } from "./song-row";

const LIST = { listStyle: "none", m: 0, p: 0, maxWidth: 640 } as const;
const SONGS = ["1001", "1005", "1008", "1012", "1004"] as const;
// The story plays' first songs, in STORY_PLAYS' order: a recent play names its song only by title.
const RATED = [
  { songNo: "1005", rating: 9.4 },
  { songNo: "1001", rating: 8.85 },
  { songNo: "1008", rating: 8.2 },
] as const;

const lookIn = (globals: StoryGlobals) => (songNo: string) => lookOf(songNo, localeOf(globals));

const levelsOf = ({ levels }: SongLook, i18n: Translator) =>
  levels === null ? undefined : <LevelBadges levels={levels} i18n={i18n} />;

function TickedRow({ look, i18n }: { readonly look: SongLook; readonly i18n: Translator }) {
  const [checked, setChecked] = useState(look.songNo === "1005");
  return (
    <SongRow
      genres={look.genres}
      name={look.name}
      lang={look.lang}
      lines={artistsLine(look)}
      end={levelsOf(look, i18n)}
      tick={{ checked, onChange: () => setChecked(!checked) }}
    />
  );
}

function ChartRow({ look, i18n }: { readonly look: SongLook; readonly i18n: Translator }) {
  const [checked, setChecked] = useState(false);
  return (
    <SongRow
      start={
        <RowCheckbox checked={checked} label={look.name} onChange={() => setChecked(!checked)} />
      }
      genres={look.genres}
      name={look.name}
      lang={look.lang}
      lines={artistsLine(look)}
      marks={
        <ChartMarks
          difficulty="oni"
          level={look.levels?.oni ?? null}
          lane={STORY_LANE}
          order={0}
          i18n={i18n}
        />
      }
      onPress={action("open the chart's details")}
      pressOpens
    />
  );
}

const meta = {
  title: "Rows and lists/SongRow",
  tags: ["songs"],
  render: (_args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Box component="ul" sx={LIST}>
        {SONGS.map((songNo) => {
          const look = lookIn(globals)(songNo);
          return (
            <SongRow
              key={songNo}
              genres={look.genres}
              name={look.name}
              lang={look.lang}
              lines={artistsLine(look)}
              end={levelsOf(look, i18n)}
              onPress={action("open the song's details")}
              pressOpens
            />
          );
        })}
      </Box>
    );
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A press anywhere on the row opens it, but on its own controls: the levels a click spreads. */
export const Pressed: Story = {};

/** A press anywhere on the row ticks its check box. */
export const Ticked: Story = {
  render: (_args, { globals }) => (
    <Box component="ul" sx={LIST}>
      {SONGS.map((songNo) => (
        <TickedRow key={songNo} look={lookIn(globals)(songNo)} i18n={i18nOf(globals)} />
      ))}
    </Box>
  ),
};

/** A check box beside the row, and a chart's marks last in its press. */
export const WithMarks: Story = {
  render: (_args, { globals }) => (
    <Box component="ul" sx={LIST}>
      {SONGS.map((songNo) => (
        <ChartRow key={songNo} look={lookIn(globals)(songNo)} i18n={i18nOf(globals)} />
      ))}
    </Box>
  ),
};

/** What a page rates first in the press, as Rating draws a chart, and the play's marks. */
export const WithALead: Story = {
  render: (_args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Box component="ul" sx={LIST}>
        {RATED.map(({ songNo, rating }, order) => {
          const look = lookIn(globals)(songNo);
          const play = STORY_PLAYS[order];
          const difficulty = play === undefined ? "oni" : LEVEL_DIFFICULTY[play.level];
          return (
            <SongRow
              key={songNo}
              lead={
                <Box component="span" sx={{ width: 48, fontWeight: 700, textAlign: "right" }}>
                  {i18n.number(rating)}
                </Box>
              }
              genres={look.genres}
              name={look.name}
              lang={look.lang}
              lines={artistsLine(look)}
              marks={
                <ChartMarks
                  difficulty={difficulty}
                  level={look.levels?.[difficulty] ?? null}
                  lane={STORY_LANE}
                  order={order}
                  i18n={i18n}
                >
                  {play !== undefined && (
                    <PlayMarks play={play} lane={STORY_LANE} order={order} i18n={i18n} />
                  )}
                </ChartMarks>
              }
              onPress={action("open the chart's details")}
              pressOpens
            />
          );
        })}
      </Box>
    );
  },
};

/** No press: a handle before the row, and a button after it that takes the song out. */
export const NotPressed: Story = {
  render: (_args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Box component="ul" sx={LIST}>
        {SONGS.map((songNo) => {
          const look = lookIn(globals)(songNo);
          const label = i18n.t("favorites.removeSong", { name: look.name });
          return (
            <SongRow
              key={songNo}
              start={
                <Box
                  component="span"
                  sx={{ display: "flex", alignItems: "center", color: "text.secondary" }}
                >
                  <DragIndicatorIcon fontSize="small" />
                </Box>
              }
              genres={look.genres}
              name={look.name}
              lang={look.lang}
              lines={artistsLine(look)}
              end={
                <>
                  {levelsOf(look, i18n)}
                  <IconButton
                    size="small"
                    aria-label={label}
                    title={label}
                    onClick={action("remove")}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </>
              }
            />
          );
        })}
      </Box>
    );
  },
};

/** A card's list reaches the card's sides through its room; each row keeps its own 8 px. */
export const InACard: Story = {
  render: (_args, { globals }) => (
    <SectionCard sx={{ maxWidth: 640 }}>
      <SectionTitle level={3}>{i18nOf(globals).t("favorites.folder.heading")}</SectionTitle>
      <Box component="ul" sx={CARD_ROWS}>
        {SONGS.map((songNo) => (
          <SongLookRow
            key={songNo}
            look={lookIn(globals)(songNo)}
            i18n={i18nOf(globals)}
            scrolling
            onOpen={action("open the song's details")}
          />
        ))}
      </Box>
    </SectionCard>
  ),
};

import { LABEL_TEMPLATES, PLAY_OPTION_CODES } from "@abth/core";
import { Box, Stack, Typography } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { wantKey } from "../pictures/picture-lane";
import { itemsOf, SLOT_PARTS, slotOf } from "../shared/costume-parts";
import { CROWN_COLOUR, RANKS_WORST_FIRST } from "../shared/panel-colours";
import type { CrownKind, PictureView, PictureWant } from "../shared/session-port";
import { DIFFICULTIES } from "../shared/song-catalogue/types";
import { STORY_EDITOR } from "./costume";
import { PACK_DATA, PACK_LABEL, type PackData, packData, packKeys, packView } from "./pack";
import { danLabelView } from "./profile";
import { PAGE_LISTED, PAGE_SCORES } from "./scores";
import { PAGE_SONGS } from "./songs";
import { storyView } from "./story-pictures";
import { STORY_TITLES } from "./story-port";

/** A picture the stories show: its key, what draws it, and whether the pack holds it. */
interface Entry {
  readonly key: string;
  readonly view: PictureView;
  readonly fromPack: boolean;
}

interface Group {
  readonly name: string;
  readonly shownIn: string;
  readonly entries: readonly Entry[];
}

const entryOf = (want: PictureWant): Entry => {
  const key = wantKey(want);
  return { key, view: storyView(want), fromPack: packView(key) !== null };
};

const danEntryOf = (board: number): Entry => {
  const key = `danLabel/${board}`;
  return { key, view: danLabelView(board), fromPack: packView(key) !== null };
};

const GROUPS: readonly Group[] = [
  {
    name: "Rank icons",
    shownIn: "Recent plays, the Overview's panel, Know yourself",
    entries: RANKS_WORST_FIRST.map((rank) => entryOf({ kind: "rankIcon", rank })),
  },
  {
    name: "Crown icons",
    shownIn: "Recent plays, the Overview's panel, score details, Know yourself",
    entries: (Object.keys(CROWN_COLOUR) as CrownKind[]).map((crown) =>
      entryOf({ kind: "crownIcon", crown }),
    ),
  },
  {
    name: "Difficulty icons",
    shownIn: "every song and score row, the chart buttons",
    entries: DIFFICULTIES.map((difficulty) => entryOf({ kind: "courseIcon", difficulty })),
  },
  {
    name: "Play option icons",
    shownIn: "Recent plays",
    entries: PLAY_OPTION_CODES.map((option) => entryOf({ kind: "optionIcon", option })),
  },
  {
    name: "Dan labels",
    shownIn: "the Overview's name block",
    entries: Object.keys(LABEL_TEMPLATES).map((board) => danEntryOf(Number(board))),
  },
  {
    name: "Plates, panel and portrait",
    shownIn: "the Overview, Costume, Nickname & title",
    entries: (["titlePlate", "scorePanel", "medalPlate", "myDon"] as const).map((kind) =>
      entryOf({ kind }),
    ),
  },
  {
    name: "Costume items",
    shownIn: "Costume; without a pack's items, the stories offer made-up item numbers",
    entries: SLOT_PARTS.flatMap((part) =>
      itemsOf(STORY_EDITOR, part).map((id) =>
        entryOf({ kind: "costumeItem", slot: slotOf(part), id }),
      ),
    ),
  },
  {
    name: "Chart pictures",
    shownIn: "a whole page's song details; any chart the pack lacks draws a stand-in",
    entries: packKeys("chartPicture/").flatMap((key) => {
      const view = packView(key);
      return view === null ? [] : [{ key, view, fromPack: true }];
    }),
  },
];

/** What each data file is, and where a whole page shows it. */
const DATA_SHOWN: Readonly<Record<keyof PackData, string>> = {
  songCatalogue: `${PAGE_SONGS.length} songs: search, pickers, song details`,
  ratingData: "OurTaiko's chart constants: Rating",
  profile: "the player's counts, title and medal: the Overview",
  costumeEditor: `${STORY_EDITOR.palette.length} colours and ${STORY_EDITOR.slots.flat().length} items: Costume`,
  titleEditor: `${(packData("titleEditor") ?? STORY_TITLES).options.length} titles: Nickname & title`,
  favorites: "the お気に入り folder and 大好きな曲: Favourites",
  scores: `${PAGE_SCORES.scores.length} scores: Scores, Rating, Know yourself`,
  listedCharts: `${PAGE_LISTED.charts.length} charts: Scores, Know yourself`,
};

const countFromPack = (entries: readonly Entry[]) =>
  entries.filter((entry) => entry.fromPack).length;

function Tile({ entry }: { readonly entry: Entry }) {
  return (
    <Box
      sx={{
        width: 132,
        p: 1,
        border: 2,
        borderRadius: 1,
        borderStyle: entry.fromPack ? "solid" : "dashed",
        borderColor: entry.fromPack ? "success.main" : "warning.main",
      }}
    >
      <Box sx={{ height: 72, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box
          component="img"
          src={entry.view.src}
          alt={entry.key}
          sx={{ maxWidth: "100%", maxHeight: "100%" }}
        />
      </Box>
      <Typography
        variant="caption"
        sx={{ display: "block", fontFamily: "monospace", wordBreak: "break-all" }}
      >
        {entry.key}
      </Typography>
      <Typography
        variant="caption"
        color={entry.fromPack ? "success.main" : "warning.main"}
        sx={{ display: "block" }}
      >
        {entry.fromPack ? "pack" : "stand-in"} · {entry.view.width}×{entry.view.height}
      </Typography>
    </Box>
  );
}

/** Every picture and data file the stories show: the pack's, or the made-up one where it has none. */
function PackCoverage() {
  const all = GROUPS.flatMap((group) => group.entries);
  const names = Object.keys(PACK_DATA) as (keyof PackData)[];
  return (
    <Stack spacing={3} sx={{ p: 2 }}>
      <Box>
        <Typography variant="h6">Resource pack</Typography>
        <Typography color="text.secondary">
          {PACK_LABEL === null
            ? "No pack is named: every picture is a stand-in and every page's data made up."
            : `"${PACK_LABEL}" draws ${countFromPack(all)} of the ${all.length} pictures below.`}
        </Typography>
      </Box>
      <Box>
        <Typography variant="subtitle1">
          Data: {names.filter((name) => packData(name) !== null).length} of {names.length} from the
          pack, read by whole pages; components keep the made-up data
        </Typography>
        {names.map((name) => {
          const fromPack = packData(name) !== null;
          return (
            <Typography key={name} variant="body2">
              <Box component="span" sx={{ fontFamily: "monospace" }}>
                {name}
              </Box>{" "}
              <Box component="span" sx={{ color: fromPack ? "success.main" : "warning.main" }}>
                {fromPack ? "pack" : "made up"}
              </Box>{" "}
              · {DATA_SHOWN[name]}
            </Typography>
          );
        })}
      </Box>
      {GROUPS.map((group) => (
        <Box key={group.name}>
          <Typography variant="subtitle1">
            {group.name}: {countFromPack(group.entries)} of {group.entries.length} from the pack
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Shown in {group.shownIn}.
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {group.entries.map((entry) => (
              <Tile key={entry.key} entry={entry} />
            ))}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

const meta = {
  title: "Pictures/Resource pack",
  tags: ["pictures"],
  parameters: { layout: "fullscreen" },
  render: () => <PackCoverage />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** What a pack would hold, and which pictures it does: run `bun run storybook --pack <folder>`. */
export const Coverage: Story = {};

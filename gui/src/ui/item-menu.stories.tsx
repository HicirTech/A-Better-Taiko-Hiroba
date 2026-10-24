import type { RecentPlay } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";

import { PlayRow } from "../songs/play-row";
import { touchOf } from "../story-kit/devices";
import { i18nOf } from "../story-kit/env";
import { STORY_PLAYS, storyPlay } from "../story-kit/plays";
import { STORY_SETS } from "../story-kit/sets";
import { STORY_LANE } from "../story-kit/story-pictures";
import type { ItemAction, Point } from "./item-actions";
import { ItemMenu, useItemMenu, useItemPress } from "./item-menu";

const LIST = { listStyle: "none", m: 0, p: 0, maxWidth: 640 } as const;
// Where the pointer was, near the window's top left.
const POINTER: Point = { x: 160, y: 120 };

/** A set's own actions, as the sets drawer offers them. */
const setActions = (i18n: Translator): readonly ItemAction[] => [
  { key: "rename", label: i18n.t("favorites.rename"), onPick: action("rename") },
  { key: "delete", label: i18n.t("favorites.delete"), destructive: true, onPick: action("delete") },
];

/** A play's one action, whose own dialog asks which set. */
const playActions = (i18n: Translator): readonly ItemAction[] => [
  { key: "add", label: i18n.t("history.addToSet"), chooses: true, onPick: action("add to a set") },
];

const setMenu = (i18n: Translator, at: Point | null) => (
  <ItemMenu
    id="story-set-menu"
    dialogId="story-set-actions"
    opened={{ item: STORY_SETS[0]?.name ?? "", at }}
    nameOf={(name) => name}
    actionsOf={() => setActions(i18n)}
    cancel={i18n.t("favorites.delete.cancel")}
    onClose={action("close")}
  />
);

function MenuPlayRow({
  play,
  order,
  touchFirst,
  i18n,
  onMenu,
}: {
  readonly play: RecentPlay;
  readonly order: number;
  readonly touchFirst: boolean;
  readonly i18n: Translator;
  readonly onMenu: (at: Point | null) => void;
}) {
  const { handlers, held } = useItemPress(touchFirst, onMenu);
  return (
    <PlayRow
      play={play}
      lane={STORY_LANE}
      order={order}
      i18n={i18n}
      onOpen={action("open the chart's details")}
      handlers={handlers}
      held={held}
    />
  );
}

/** Recent plays with their menus, as the page wires them. */
function PlaysWithMenus({
  touchFirst,
  i18n,
}: {
  readonly touchFirst: boolean;
  readonly i18n: Translator;
}) {
  const menu = useItemMenu<RecentPlay>(() => playActions(i18n));
  return (
    <>
      <Box component="ul" sx={LIST}>
        {STORY_PLAYS.map((play, order) => (
          <MenuPlayRow
            key={`${play.songTitle}-${play.level}`}
            play={play}
            order={order}
            touchFirst={touchFirst}
            i18n={i18n}
            onMenu={(at) => menu.open(play, at)}
          />
        ))}
      </Box>
      <ItemMenu
        id="story-play-menu"
        dialogId="story-play-actions"
        opened={menu.opened}
        nameOf={(play) => play.songTitle}
        actionsOf={() => playActions(i18n)}
        cancel={i18n.t("favorites.delete.cancel")}
        onClose={menu.close}
      />
    </>
  );
}

const meta = {
  title: "Menus/ItemMenu",
  tags: ["ui"],
  parameters: { layout: "fullscreen" },
  render: (_args, { globals }) => setMenu(i18nOf(globals), POINTER),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A right-click opens the item's menu where the pointer was; Delete is said in red. */
export const OnAComputer: Story = {};

/** A long press let go in place opens the same actions in a small dialog, under the item's name. */
export const OnATouchScreen: Story = {
  render: (_args, { globals }) => setMenu(i18nOf(globals), null),
};

/** An item with one action still opens a menu on a right-click; a long press runs it at once. */
export const OneActionOnAComputer: Story = {
  render: (_args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <ItemMenu
        id="story-play-menu"
        dialogId="story-play-actions"
        opened={{ item: storyPlay("1005"), at: POINTER }}
        nameOf={(play) => play.songTitle}
        actionsOf={() => playActions(i18n)}
        cancel={i18n.t("favorites.delete.cancel")}
        onClose={action("close")}
      />
    );
  },
};

/** Rows with their menus: a right-click on a computer, a long press let go in place on a phone. */
export const Rows: Story = {
  render: (_args, { globals }) => (
    <PlaysWithMenus touchFirst={touchOf(globals)} i18n={i18nOf(globals)} />
  ),
};

/** A long press that has held long enough lights its row, telling the finger it may let go. */
export const HeldRow: Story = {
  render: (_args, { globals }) => (
    <Box component="ul" sx={LIST}>
      <PlayRow
        play={storyPlay("1005")}
        lane={STORY_LANE}
        order={0}
        i18n={i18nOf(globals)}
        onOpen={action("open the chart's details")}
        held
      />
      <PlayRow
        play={storyPlay("1001")}
        lane={STORY_LANE}
        order={1}
        i18n={i18nOf(globals)}
        onOpen={action("open the chart's details")}
      />
    </Box>
  ),
};

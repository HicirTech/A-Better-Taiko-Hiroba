import type { GameSettingKey } from "@abth/core";
import type { PlainMessageKey, Translator } from "@abth/i18n";
import { Box, List, Stack } from "@mui/material";
import { type ReactNode, useId, useRef } from "react";

import { ChoiceRow } from "../ui/choice-row";
import { HELD_STILL, useFocusKept } from "../ui/editor-parts";
import { COLUMN_MAX_WIDTH_PX } from "../ui/frame-top";
import { AccountCircleIcon, EmojiEventsIcon, ListIcon, MusicNoteIcon, StarIcon } from "../ui/icons";
import { LoadFailed } from "../ui/read-failure-alert";
import { CARD_GAP } from "../ui/section-card";
import { SelectRow } from "../ui/select-row";
import { SettingsSection } from "../ui/settings-section";
import { SYNC_BAR_PAGE, SyncBar } from "../ui/sync-bar";
import { WriteOutcomeSnackbar } from "../ui/write-outcome";
import { type ShownGameSettings, shownGameSettingsOf } from "./game-settings-state";
import { settingChoices, TOGGLED } from "./setting-choices";
import type { GameSettingsEditor } from "./use-game-settings";

interface SettingsCard {
  readonly id: string;
  readonly title: PlainMessageKey;
  readonly icon: ReactNode;
  readonly rows: readonly (readonly [key: GameSettingKey, label: PlainMessageKey])[];
}

/** The page's cards, each setting in Hiroba's order. */
const CARDS: readonly SettingsCard[] = [
  {
    id: "game-settings-profile",
    title: "gameSettings.profile",
    icon: <AccountCircleIcon fontSize="small" />,
    rows: [
      ["region", "gameSettings.region"],
      ["visibility", "gameSettings.visibility"],
    ],
  },
  {
    id: "game-settings-display",
    title: "gameSettings.display",
    icon: <EmojiEventsIcon fontSize="small" />,
    rows: [
      ["scoresShown", "panel.art"],
      ["scoresDifficulty", "gameSettings.scoresDifficulty"],
      ["danShown", "gameSettings.danShown"],
    ],
  },
  {
    id: "game-settings-play",
    title: "gameSettings.playOptions",
    icon: <MusicNoteIcon fontSize="small" />,
    rows: [
      ["speed", "gameSettings.speed"],
      ["doron", "history.doron"],
      ["abekobe", "history.abekobe"],
      ["random", "gameSettings.random"],
      ["skip", "gameSettings.skip"],
      ["notePosition", "gameSettings.notePosition"],
      ["voice", "gameSettings.voice"],
      ["tone", "gameSettings.tone"],
    ],
  },
  {
    id: "game-settings-song-select",
    title: "gameSettings.songSelect",
    icon: <ListIcon fontSize="small" />,
    rows: [["doubleCharts", "gameSettings.doubleCharts"]],
  },
  {
    id: "game-settings-by-difficulty",
    title: "gameSettings.byDifficulty",
    icon: <StarIcon fontSize="small" />,
    rows: [
      ["folderDifficulty", "gameSettings.folderDifficulty"],
      ["folderStars", "gameSettings.folderStars"],
      ["folderOrder", "gameSettings.folderOrder"],
    ],
  },
];

export interface GameSettingsPageProps {
  readonly settings: GameSettingsEditor;
  /** Any write, another page's too, is on its way: nothing is pressed meanwhile. */
  readonly busy: boolean;
  readonly i18n: Translator;
}

/** The page: Hiroba's その他設定・編集, every setting of it, synced to Hiroba in one write. */
export function GameSettingsPage({ settings, busy, i18n }: GameSettingsPageProps) {
  const { step } = settings;
  const shown = shownGameSettingsOf(step);
  const page = useRef<HTMLDivElement>(null);
  useFocusKept(page, step.name);
  const changed = shown !== null && !shown.saving && !busy && shown.draft !== null;
  const failure = settings.status.failure;
  return (
    <Box
      id="game-settings-page"
      ref={page}
      data-step={step.name}
      tabIndex={-1}
      sx={{
        ...SYNC_BAR_PAGE,
        width: 1,
        maxWidth: COLUMN_MAX_WIDTH_PX,
        alignSelf: "center",
        outline: "none",
      }}
    >
      <Stack spacing={2} sx={{ pb: 2 }}>
        {failure !== null && (
          <LoadFailed id="game-settings-load-failed" failure={failure} i18n={i18n} />
        )}
        {shown !== null && (
          <Stack spacing={CARD_GAP} inert={shown.saving} sx={shown.saving ? HELD_STILL : undefined}>
            {CARDS.map((card) => (
              <GameSettingsCard
                key={card.id}
                card={card}
                shown={shown}
                settings={settings}
                i18n={i18n}
              />
            ))}
          </Stack>
        )}
      </Stack>
      {shown !== null && (
        <SyncBar
          id="game-settings"
          canSync={changed}
          onSync={() => {
            // The bar's buttons shut while it syncs: the page keeps the focus they would drop.
            page.current?.focus({ preventScroll: true });
            void settings.save();
          }}
          onReset={settings.reset}
          canReset={changed}
          saving={shown.saving}
          i18n={i18n}
        />
      )}
      {shown !== null && shown.notice !== null && (
        <WriteOutcomeSnackbar
          id="game-settings-outcome"
          kind="gameSettings"
          outcome={shown.notice}
          i18n={i18n}
          onClosed={settings.closeNotice}
        />
      )}
    </Box>
  );
}

function GameSettingsCard({
  card,
  shown,
  settings,
  i18n,
}: {
  readonly card: SettingsCard;
  readonly shown: ShownGameSettings;
  readonly settings: GameSettingsEditor;
  readonly i18n: Translator;
}) {
  const { t } = i18n;
  const headingId = useId();
  return (
    <SettingsSection id={card.id} headingId={headingId} icon={card.icon} title={t(card.title)}>
      <List disablePadding>
        {card.rows.map(([key, label]) => {
          const row = {
            id: `game-settings-${key}`,
            label: t(label),
            choices: settingChoices(key, shown.view.choices[key], shown.settings, i18n),
            chosen: shown.settings[key],
            onChoose: (value: string) => settings.pick(key, value),
          };
          if (!TOGGLED.has(key)) {
            return <SelectRow key={key} {...row} />;
          }
          const locked = key === "doubleCharts" && shown.view.doubleChartsLocked;
          return (
            <ChoiceRow
              key={key}
              {...row}
              disabled={locked}
              hint={locked ? t("gameSettings.doubleChartsLocked") : undefined}
            />
          );
        })}
      </List>
    </SettingsSection>
  );
}

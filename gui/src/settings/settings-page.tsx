import type { RatingSystem } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Button, List, ListItem, ListItemText, Stack } from "@mui/material";
import { type ReactNode, useId } from "react";

import type { SortChoice } from "../shared/scores/score-order";
import type { ChartSource } from "../shared/song-catalogue/chart-source";
import type { ShownDifficulty } from "../shared/song-catalogue/shown-difficulty";
import { AccountCircleIcon } from "../ui/icons";
import { CARD_GAP } from "../ui/section-card";
import { GitHubSection } from "./github-section";
import { RatingSection } from "./rating-section";
import { ScoresSection } from "./scores-section";
import { SettingsSection } from "./settings-section";
import { SongDataSection } from "./song-data-section";
import { SongLevelsSection } from "./song-levels-section";
import { UpdatesSection, type UpdatesSectionProps } from "./updates-section";

export type AccountState =
  | { readonly kind: "checking" }
  | { readonly kind: "signedOut" }
  // A read or a write is running: Sign out waits, or the read would show the profile after it and
  // the write would end under a session that is gone.
  | { readonly kind: "reading" }
  | {
      readonly kind: "signedIn";
      readonly nickname: string | null;
      readonly onSignOut: () => void;
    };

export interface SettingsPageProps {
  readonly i18n: Translator;
  /** The language section, drawn by the window that holds the language. */
  readonly language: ReactNode;
  /** The appearance section, drawn by the window that holds the theme. */
  readonly appearance: ReactNode;
  readonly account: AccountState;
  /** The difficulty whose level songs show in front. */
  readonly shownDifficulty: ShownDifficulty;
  readonly onShownDifficulty: (next: ShownDifficulty) => void;
  /** What Scores is sorted by as it opens. */
  readonly startingSort: SortChoice;
  readonly onStartingSort: (next: SortChoice) => void;
  /** The rating Rating opens on. */
  readonly startingRating: RatingSystem;
  readonly onStartingRating: (next: RatingSystem) => void;
  /** Where a song's details take their chart pictures from. */
  readonly chartSource: ChartSource;
  readonly onChartSource: (next: ChartSource) => void;
  /** The updates section; left out where there is no port to ask. */
  readonly updates?: Omit<UpdatesSectionProps, "i18n">;
  /** Opens the repository's page; the section is left out where nothing can open it. */
  readonly onOpenRepository?: () => void;
}

export function SettingsPage({
  i18n,
  language,
  appearance,
  account,
  shownDifficulty,
  onShownDifficulty,
  startingSort,
  onStartingSort,
  startingRating,
  onStartingRating,
  chartSource,
  onChartSource,
  updates,
  onOpenRepository,
}: SettingsPageProps) {
  const { t } = i18n;
  const headingId = useId();
  const who =
    account.kind === "checking"
      ? null
      : account.kind === "signedOut"
        ? t("settings.signedOut")
        : account.kind === "signedIn" && account.nickname !== null
          ? t("settings.signedInAs", { name: account.nickname })
          : t("settings.signedIn");
  const signOut =
    account.kind === "signedIn"
      ? { onClick: account.onSignOut }
      : account.kind === "reading"
        ? { disabled: true }
        : null;
  return (
    <Stack spacing={CARD_GAP}>
      {language}
      {appearance}
      <SettingsSection
        id="account"
        headingId={headingId}
        icon={<AccountCircleIcon fontSize="small" />}
        title={t("settings.account")}
      >
        <List disablePadding>
          <ListItem sx={{ gap: 2 }}>
            <ListItemText
              primary={who}
              secondary={t("signOut.note")}
              slotProps={{
                primary: { id: "account-who" },
                secondary: { id: "sign-out-note" },
              }}
            />
            {signOut !== null && (
              <Button id="sign-out" variant="outlined" {...signOut} sx={{ flexShrink: 0 }}>
                {t("signOut.action")}
              </Button>
            )}
          </ListItem>
        </List>
      </SettingsSection>
      {updates !== undefined && <UpdatesSection i18n={i18n} {...updates} />}
      <SongLevelsSection shown={shownDifficulty} i18n={i18n} onShown={onShownDifficulty} />
      <ScoresSection startingSort={startingSort} i18n={i18n} onStartingSort={onStartingSort} />
      <RatingSection
        startingRating={startingRating}
        i18n={i18n}
        onStartingRating={onStartingRating}
      />
      <SongDataSection source={chartSource} i18n={i18n} onSource={onChartSource} />
      {onOpenRepository !== undefined && <GitHubSection i18n={i18n} onOpen={onOpenRepository} />}
    </Stack>
  );
}

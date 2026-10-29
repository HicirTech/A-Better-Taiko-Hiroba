import type { Translator } from "@abth/i18n";
import { Box, Button, Stack, TextField } from "@mui/material";
import { type ReactNode, useCallback, useState } from "react";

import type { PictureLane } from "../pictures/picture-lane";
import { GIFT_SONG_LIMIT, GIFT_TITLE_MAX_LENGTH, type Gift } from "../shared/gifts/gift-code";
import type { ProfileView } from "../shared/session-port";
import type { ShownDifficulty } from "../shared/song-catalogue/shown-difficulty";
import type { SongLook } from "../shared/song-catalogue/song-look";
import { SNAPSHOT_WIDTH_PX } from "../snapshots/snapshot-picture";
import { ChoiceToggles } from "../ui/choice-toggles";
import { CARD_GAP, SectionCard } from "../ui/section-card";
import { SubsectionTitle } from "../ui/section-title";
import { StatusNote } from "../ui/status-note";
import { EditedSongs } from "./edited-songs";
import { GiftSnapshot } from "./gift-snapshot";

/** A gift as it is made: all of it but its giver, who is the player. */
export type GiftDraft = Omit<Gift, "giver">;

type Shows = "shown" | "mystery";

export interface GiftMakerProps {
  readonly gift: Gift;
  /** The player's, whose plate and My Don the picture shows. */
  readonly profile: ProfileView;
  readonly look: (songNo: string) => SongLook;
  /** The difficulty whose level the songs show in front of the others. */
  readonly shownDifficulty: ShownDifficulty;
  readonly lane: PictureLane;
  /** A long press moves a song, as on a phone; otherwise its handle does. */
  readonly byLongPress: boolean;
  readonly i18n: Translator;
  readonly onAddSongs: () => void;
  readonly onRemoveSong: (songNo: string) => void;
  readonly onMoveSong: (from: number, to: number) => void;
  readonly onTitle: (title: string) => void;
  readonly onShown: (shown: boolean) => void;
}

/** A gift being made: its title, songs and whether they show, then its picture as it goes out. */
export function GiftMaker({
  gift,
  profile,
  look,
  shownDifficulty,
  lane,
  byLongPress,
  i18n,
  onAddSongs,
  onRemoveSong,
  onMoveSong,
  onTitle,
  onShown,
}: GiftMakerProps) {
  const { t, number } = i18n;
  return (
    <Stack spacing={CARD_GAP}>
      <SectionCard id="gift-maker">
        <Stack spacing={1.5} useFlexGap>
          <TextField
            id="gift-title"
            label={t("gift.titleLabel")}
            helperText={t("gift.titleHint")}
            value={gift.title}
            onChange={(event) => onTitle(event.target.value)}
            fullWidth
            slotProps={{ htmlInput: { maxLength: GIFT_TITLE_MAX_LENGTH } }}
          />
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
            <Button id="gift-add" variant="outlined" onClick={onAddSongs}>
              {t("favorites.addSongs")}
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <ChoiceToggles<Shows>
              id="gift-shows"
              aria-label={t("gift.shownLabel")}
              choices={[
                { value: "shown", label: t("gift.shown") },
                { value: "mystery", label: t("gift.mystery") },
              ]}
              chosen={gift.shown ? "shown" : "mystery"}
              onChoose={(next) => onShown(next === "shown")}
            />
          </Box>
          {gift.songs.length === 0 ? (
            <StatusNote id="gift-empty">
              {t("gift.empty", { count: number(GIFT_SONG_LIMIT) })}
            </StatusNote>
          ) : (
            <EditedSongs
              id="gift"
              songs={gift.songs}
              look={look}
              shownDifficulty={shownDifficulty}
              i18n={i18n}
              byLongPress={byLongPress}
              onRemove={onRemoveSong}
              onMove={onMoveSong}
            />
          )}
        </Stack>
      </SectionCard>
      <SectionCard>
        <SubsectionTitle>{t("gift.preview")}</SubsectionTitle>
        <ToTheCardsWidth>
          <GiftSnapshot
            id="gift-preview"
            gift={{ ...gift, title: gift.title.trim() }}
            profile={profile}
            look={look}
            shownDifficulty={shownDifficulty}
            lane={lane}
            i18n={i18n}
          />
        </ToTheCardsWidth>
      </SectionCard>
    </Stack>
  );
}

/** A snapshot drawn at its own size, then zoomed to the width it is given. */
function ToTheCardsWidth({ children }: { readonly children: ReactNode }) {
  const [zoom, setZoom] = useState<number | null>(null);
  const measured = useCallback((node: HTMLDivElement | null) => {
    if (node === null) {
      return;
    }

    const fit = () => setZoom(node.clientWidth / SNAPSHOT_WIDTH_PX);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <Box ref={measured} sx={{ borderRadius: 1, overflow: "hidden" }}>
      {zoom !== null && <Box sx={{ zoom }}>{children}</Box>}
    </Box>
  );
}

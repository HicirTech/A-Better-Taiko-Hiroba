import type { Translator } from "@abth/i18n";
import { Box, Button, Chip, Menu, MenuItem, Stack } from "@mui/material";
import { useId, useState } from "react";

import { useBackCloses } from "../navigation/back-closers";
import type { FavoriteSet } from "../shared/sets/favorite-sets";
import type { SongLook } from "../shared/song-catalogue/song-look";
import { ArrowDropDownIcon, CheckIcon } from "../ui/icons";
import { CARD_ROWS, SectionCard } from "../ui/section-card";
import { SectionTitle } from "../ui/section-title";
import { SimpleDialog } from "../ui/simple-dialog";
import { StatusNote } from "../ui/status-note";
import type { ShownFavorites } from "./favorites-state";
import { type DetailsOpener, SongLookRow } from "./song-look-row";

export interface FolderCardProps {
  readonly shown: ShownFavorites;
  readonly look: (songNo: string) => SongLook;
  readonly i18n: Translator;
  readonly openDetails: DetailsOpener;
  /** The kept sets, to save the folder into one of them. */
  readonly sets: readonly FavoriteSet[];
  /** The set whose songs are the folder's, in its order; null when no set is. */
  readonly inUse: FavoriteSet | null;
  readonly onSaveAsSet: () => void;
  readonly onSaveToSet: (id: string) => void;
}

/** The songs in the お気に入り folder in slot order, under the set it is or the ways to keep it. */
export function FolderCard({
  shown,
  look,
  i18n,
  openDetails,
  sets,
  inUse,
  onSaveAsSet,
  onSaveToSet,
}: FolderCardProps) {
  const { t } = i18n;
  const { view, shut } = shown;
  const songs = view.folder.state.slots.flatMap((songNo, index) =>
    songNo === null ? [] : [{ slot: index + 1, songNo }],
  );
  const menuId = useId();
  const [menuAt, setMenuAt] = useState<HTMLElement | null>(null);
  const [replacing, setReplacing] = useState<FavoriteSet | null>(null);
  const stopReplacing = () => setReplacing(null);
  useBackCloses(menuAt !== null, () => setMenuAt(null));
  return (
    <SectionCard id="favorite-folder-card">
      <SectionTitle
        level={3}
        end={
          inUse !== null ? (
            <Chip
              id="favorite-folder-set"
              icon={<CheckIcon fontSize="small" />}
              label={t("favorites.inUse", { name: inUse.name })}
              color="primary"
              variant="outlined"
              size="small"
            />
          ) : (
            songs.length > 0 && (
              <>
                <Button
                  id="favorite-folder-save-as-set"
                  variant="outlined"
                  size="small"
                  disabled={shut}
                  onClick={onSaveAsSet}
                >
                  {t("favorites.saveAsSet")}
                </Button>
                {sets.length > 0 && (
                  <Button
                    id="favorite-folder-save-to-set"
                    variant="outlined"
                    size="small"
                    disabled={shut}
                    endIcon={<ArrowDropDownIcon fontSize="small" />}
                    aria-haspopup="menu"
                    aria-controls={menuAt === null ? undefined : menuId}
                    aria-expanded={menuAt !== null}
                    onClick={(event) => setMenuAt(event.currentTarget)}
                  >
                    {t("favorites.saveToSet")}
                  </Button>
                )}
              </>
            )
          )
        }
      >
        {t("favorites.folder.heading")}
      </SectionTitle>
      <Stack spacing={1.5} useFlexGap>
        {songs.length === 0 ? (
          <StatusNote id="favorite-folder-empty">{t("favorites.folderEmpty")}</StatusNote>
        ) : (
          <Box component="ul" id="favorite-folder-list" sx={CARD_ROWS}>
            {songs.map(({ slot, songNo }) => (
              <SongLookRow
                key={slot}
                id={`favorite-folder-slot-${slot}`}
                look={look(songNo)}
                i18n={i18n}
                scrolling
                onOpen={openDetails(songNo)}
              />
            ))}
          </Box>
        )}
      </Stack>
      <Menu id={menuId} anchorEl={menuAt} open={menuAt !== null} onClose={() => setMenuAt(null)}>
        {sets.map((set, index) => (
          <MenuItem
            key={set.id}
            id={`favorite-folder-save-to-set-${index}`}
            onClick={() => setReplacing(set)}
          >
            {set.name}
          </MenuItem>
        ))}
      </Menu>
      <SimpleDialog
        id="favorite-folder-replace-dialog"
        open={replacing !== null}
        title={t("favorites.replace.title", { name: replacing?.name ?? "" })}
        message={t("favorites.replace.body", { name: replacing?.name ?? "" })}
        cancel={{ id: "favorite-folder-replace-cancel", label: t("favorites.delete.cancel") }}
        actions={[
          {
            id: "favorite-folder-replace-confirm",
            label: t("favorites.replace.confirm"),
            destructive: true,
            onClick: () => {
              if (replacing !== null) {
                onSaveToSet(replacing.id);
              }
              stopReplacing();
              setMenuAt(null);
            },
          },
        ]}
        onClose={stopReplacing}
      />
    </SectionCard>
  );
}

import type { Translator } from "@abth/i18n";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  SvgIcon,
  Typography,
} from "@mui/material";

import type { ProfileView } from "../session-port";

/** The expand chevron, drawn here so the app needs no icon package for one glyph. */
function ExpandIcon() {
  return (
    <SvgIcon aria-hidden>
      <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
    </SvgIcon>
  );
}

/**
 * The 大好きな曲 and the お気に入り folder, titles as the page writes them. The folder holds up to
 * 30 songs, so it opens on request; an empty folder, like an unset favourite, is a normal state.
 */
export function FavoritesCard({
  favoriteSong,
  folder,
  i18n,
}: {
  favoriteSong: ProfileView["favoriteSong"];
  folder: ProfileView["favoriteFolder"];
  i18n: Translator;
}) {
  const { t, number } = i18n;
  return (
    <Card id="favorites" variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 500, mb: 1 }}>
          {t("profile.favorites")}
        </Typography>
        <Typography id="favorite-song">
          {favoriteSong === null
            ? t("profile.favoriteSongNone")
            : t("profile.favoriteSong", { title: favoriteSong })}
        </Typography>
        {folder.length === 0 && (
          <Typography id="favorite-folder-empty" color="text.secondary" sx={{ mt: 1 }}>
            {t("profile.favoriteFolderEmpty")}
          </Typography>
        )}
      </CardContent>
      {folder.length > 0 && (
        <Accordion
          id="favorite-folder"
          disableGutters
          elevation={0}
          square
          sx={{ borderTop: 1, borderColor: "divider", "&::before": { display: "none" } }}
        >
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <Typography>{t("profile.favoriteFolder", { count: number(folder.length) })}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <List dense disablePadding>
              {folder.map((title, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: ten titles belong to more than one song, and each read replaces the list whole.
                <ListItem key={index} disableGutters>
                  <ListItemText primary={title} />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}
    </Card>
  );
}

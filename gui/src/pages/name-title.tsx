import { Box, Skeleton, Stack } from "@mui/material";

import { NameTitlePage } from "../name-title/name-title-page";
import { TitlePlateSkeleton } from "../profile/title-plate";
import { textSize } from "../theme/app-theme";
import { EditIcon } from "../ui/icons";
import { SYNC_BAR_PAGE, SyncBarSkeleton } from "../ui/sync-bar";
import { picturesOf, readMyPage } from "./model-parts";
import { MyPageFailure } from "./my-page-failure";
import type { PageEntry } from "./page";
import type { PageModel } from "./page-model";
import { askPictures, COLUMN } from "./page-parts";

const TITLE_PLATE = picturesOf(["titlePlate"]);
const FIELD_PX = 56;

export const NAME_TITLE_MODEL: PageModel = {
  label: "nav.nameTitle",
  namesSongs: false,
  needsSongs: false,
  waits: () => false,
  reading: ({ session }) => session.myPageInView,
  readAgain: async (state) => {
    // The titles are read again when the picker next opens.
    if (await readMyPage(state)) {
      state.titleEditor.forgetList();
    }
  },
  leaves: ({ titleEditor, nameEditor }) => [titleEditor.dropEdits, nameEditor.dropEdits],
  readsEvery: () => TITLE_PLATE,
};

function NameTitleSkeleton() {
  return (
    <Box sx={{ ...SYNC_BAR_PAGE, ...COLUMN }}>
      <Stack spacing={3} sx={{ pb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <TitlePlateSkeleton />
        </Box>
        <Skeleton variant="rounded" height={FIELD_PX} />
        <Stack spacing={1}>
          <Skeleton variant="rounded" height={FIELD_PX} />
          <Skeleton width="70%" sx={{ fontSize: textSize("caption") }} />
        </Stack>
      </Stack>
      <SyncBarSkeleton />
    </Box>
  );
}

export const NAME_TITLE_PAGE: PageEntry = {
  ...NAME_TITLE_MODEL,
  icon: <EditIcon />,
  skeleton: NameTitleSkeleton,
  askEvery: askPictures,
  draw: (data) => {
    const { screen } = data.session;
    return (
      screen.name === "profile" && (
        <>
          <MyPageFailure data={data} />
          <NameTitlePage
            profile={screen.profile}
            lane={data.lane}
            i18n={data.i18n}
            title={data.titleEditor}
            name={data.nameEditor}
            busy={data.writing}
          />
        </>
      )
    );
  },
};

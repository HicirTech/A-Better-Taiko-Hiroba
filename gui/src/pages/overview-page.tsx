import { Stack } from "@mui/material";

import { MedalCard } from "../my-page/medal-card";
import { OverviewHeader } from "../my-page/overview-header";
import { PanelCard } from "../my-page/panel-card";
import { SongSearch } from "../song-search/song-search";
import type { OpenAction } from "../ui/open-button";
import { LoadFailed } from "../ui/read-failure-alert";
import { MyPageFailure } from "./my-page-failure";
import type { PageData } from "./page";

const OVERVIEW_SPACING = 3;
const HIDDEN = { display: "none" } as const;

/** My page under the song search, which asks Hiroba nothing, so it stays when my page fails. */
export function OverviewPage({ data }: { readonly data: PageData }) {
  const { screen } = data.session;
  const { catalogue, port, lane, i18n, touchFirst, toast, navigate } = data;
  const portrait: OpenAction = { open: () => navigate("costume"), byLongPress: touchFirst };
  const namePlate: OpenAction = { open: () => navigate("nameTitle"), byLongPress: touchFirst };
  return (
    <SongSearch catalogue={catalogue} port={port} lane={lane} i18n={i18n} onOpen={data.wantSongs}>
      {(searching) => (
        <Stack spacing={OVERVIEW_SPACING} sx={searching ? HIDDEN : undefined}>
          {screen.name === "profile" ? (
            <>
              <MyPageFailure data={data} />
              <OverviewHeader
                profile={screen.profile}
                lane={lane}
                i18n={i18n}
                portrait={portrait}
                namePlate={namePlate}
              />
              <PanelCard
                crowns={screen.profile.crowns}
                ranks={screen.profile.panel.ranks}
                lane={lane}
                toast={touchFirst ? toast : undefined}
                i18n={i18n}
              />
              <MedalCard medal={screen.profile.medal} lane={lane} i18n={i18n} />
            </>
          ) : (
            screen.name === "readFailed" && (
              <LoadFailed id="read-failure" failure={screen} codeId="failure-detail" i18n={i18n} />
            )
          )}
        </Stack>
      )}
    </SongSearch>
  );
}

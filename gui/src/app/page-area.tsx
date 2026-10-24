import { Box, Stack } from "@mui/material";
import { Fragment } from "react";

import type { Page } from "../navigation/pages";
import type { PageData, PageEntry } from "../pages/page";
import { FADES_IN } from "../ui/page-read";
import { PageSkeleton } from "../ui/page-skeleton";
import { LoadFailed } from "../ui/read-failure-alert";
import { useWiderFrame } from "../ui/wider-frame";
import { SignInCard } from "./sign-in-card";
import type { PageShown } from "./use-page-shown";

/** A page in its place: the sign-in before a session, its skeleton while it waits, then itself. */
export function PageArea({
  page,
  entry,
  data,
  shown,
  onSignIn,
}: {
  readonly page: Page;
  readonly entry: PageEntry;
  readonly data: PageData;
  readonly shown: PageShown;
  readonly onSignIn: () => void;
}) {
  const { screen } = data.session;
  const Shape = entry.skeleton;
  const drawn =
    (shown.skeleton && Shape !== null) ||
    shown.shown ||
    (shown.failed && entry.drawsFailure === true);
  useWiderFrame(drawn && entry.wider === true);
  return (
    <Stack spacing={3}>
      {!shown.skeleton && (screen.name === "signedOut" || screen.name === "signingIn") && (
        <SignInCard
          screen={screen}
          onSignIn={onSignIn}
          onCancel={() => void data.port.cancelSignIn()}
          i18n={data.i18n}
        />
      )}

      {shown.skeleton && Shape !== null && (
        <PageSkeleton page={page} label={data.i18n.t(shown.label)} progress={shown.progress}>
          <Shape touchFirst={data.touchFirst} wide={data.wide} />
        </PageSkeleton>
      )}

      {/* Laid out as if absent, so the pages keep their place in the frame. */}
      <Box
        id="page-shut"
        inert={shown.waits}
        sx={{ display: "contents", "& > *": shown.fades ? FADES_IN : {} }}
      >
        {(shown.shown || (shown.failed && entry.drawsFailure === true)) && (
          <Fragment key={page}>{entry.draw(data)}</Fragment>
        )}
      </Box>

      {shown.failed && entry.drawsFailure !== true && screen.name === "readFailed" && (
        <LoadFailed id="read-failure" failure={screen} codeId="failure-detail" i18n={data.i18n} />
      )}
    </Stack>
  );
}

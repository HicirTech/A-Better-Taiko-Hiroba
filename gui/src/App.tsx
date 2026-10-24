import type { Translator } from "@abth/i18n";
import { useMediaQuery } from "@mui/material";
import { type ReactNode, useMemo } from "react";

import { PageArea } from "./app/page-area";
import { useModalLook } from "./app/use-modal-look";
import { usePageShown } from "./app/use-page-shown";
import { usePageVisits } from "./app/use-page-visits";
import { usePagesData } from "./app/use-pages-data";
import { useReadAgain } from "./app/use-read-again";
import { useSession } from "./app/use-session";
import { NavFoot } from "./navigation/app-frame";
import type { Page } from "./navigation/pages";
import type { PageData } from "./pages/page";
import { PAGE_REGISTRY } from "./pages/registry";
import { createPictureLane } from "./pictures/picture-lane";
import type { SystemLink, SystemToast } from "./platform";
import { ReadAgainFoot } from "./read-again/read-again-foot";
import { IO_READ_CONSUMERS } from "./shared/pipelines";
import type { HirobaSessionPort } from "./shared/session-port";
import { releaseUrl } from "./shared/updates";
import { APP_VERSION } from "./shared/updates/app-version";
import { useUpdateReminder } from "./shared/updates/use-update-reminder";
import { PullToRead } from "./ui/pull-to-read";
import { useWideWindow } from "./ui/use-wide-window";
import { UpdateDialog } from "./updates/update-dialog";

export interface AppProps {
  readonly port: HirobaSessionPort;
  readonly link: SystemLink;
  readonly i18n: Translator;
  readonly page: Page;
  readonly onNavigate: (page: Page) => void;
  /** Settings' language section, drawn by the window that holds the language. */
  readonly language: ReactNode;
  /** The shell's Toast, where it has one: a long-press names a legend's item by it. */
  readonly toast?: SystemToast;
}

export function App({ port, link, i18n, page, onNavigate, language, toast }: AppProps) {
  const touchFirst = useMediaQuery("(pointer: coarse)", { noSsr: true });
  const wide = useWideWindow();
  const modalLook = useModalLook();
  const updates = useUpdateReminder(port, APP_VERSION);
  // No more pictures at once than Hiroba's read consumers: the rest wait here, in screen order.
  const lane = useMemo(
    () => createPictureLane({ load: (want) => port.readPicture(want), atOnce: IO_READ_CONSUMERS }),
    [port],
  );
  const session = useSession({ port, lane, page, onNavigate });
  const pagesData = usePagesData({ port, lane, page, session });
  const data: PageData = {
    port,
    link,
    i18n,
    lane,
    touchFirst,
    wide,
    modalLook,
    toast,
    language,
    navigate: onNavigate,
    version: APP_VERSION,
    updates,
    session,
    ...pagesData,
  };
  const entry = PAGE_REGISTRY[page];
  usePageVisits(page, data, session.settle);
  const shown = usePageShown(page, entry, data);
  const again = useReadAgain(entry, data);
  const { screen } = session;
  const withFoot = again.signedIn || screen.name === "reading";
  return (
    <>
      {withFoot && (
        <NavFoot>
          <ReadAgainFoot
            reading={again.reading}
            canRead={again.canRead}
            fetchedAt={screen.name === "profile" ? screen.profile.fetchedAt : null}
            progress={again.progress}
            onRead={again.read}
            onHeld={again.askEvery}
            i18n={i18n}
          />
        </NavFoot>
      )}
      {withFoot && entry.standsAlone !== true && (
        <PullToRead
          active={touchFirst}
          canRead={again.canRead}
          onRead={again.read}
          onHeld={again.askEvery}
        />
      )}
      {again.question}
      {entry.standsAlone === true ? (
        entry.draw(data)
      ) : (
        <PageArea page={page} entry={entry} data={data} shown={shown} onSignIn={session.signIn} />
      )}
      <UpdateDialog
        offer={updates.offer}
        i18n={i18n}
        onDownload={(version) => {
          link.open(releaseUrl(version));
          updates.later();
        }}
        onLater={updates.later}
      />
    </>
  );
}

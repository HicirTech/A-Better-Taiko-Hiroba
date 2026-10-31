import type { Translator } from "@abth/i18n";
import { useMediaQuery } from "@mui/material";
import { type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { NavFoot } from "./app/nav-foot";
import { PageArea } from "./app/page-area";
import { ScanGifts } from "./app/scan-gifts";
import { useKeptChoice } from "./app/use-kept-choice";
import { useModalLook } from "./app/use-modal-look";
import { usePageShown } from "./app/use-page-shown";
import { usePageTips } from "./app/use-page-tips";
import { usePageVisits } from "./app/use-page-visits";
import { usePagesData } from "./app/use-pages-data";
import { useReadAgain } from "./app/use-read-again";
import { useSession } from "./app/use-session";
import type { Page } from "./navigation/pages";
import type { PageData } from "./pages/page";
import { TIP_SCENES, type TipScene } from "./pages/page-tips";
import { PAGE_REGISTRY } from "./pages/registry";
import { createPictureLane } from "./pictures/picture-lane";
import type { SystemCamera, SystemLink, SystemShare, SystemToast } from "./platform";
import { PicturesReadNote } from "./read-again/pictures-read-note";
import { ReadAgainFoot } from "./read-again/read-again-foot";
import { IO_READ_CONSUMERS } from "./shared/pipelines";
import { keepStartingRating, keptStartingRating } from "./shared/rating-data/starting-rating";
import { keepStartingSort, keptStartingSort } from "./shared/scores/starting-sort";
import type { HirobaSessionPort } from "./shared/session-port";
import { keepChartSource, keptChartSource } from "./shared/song-catalogue/chart-source";
import { keepShownDifficulty, keptShownDifficulty } from "./shared/song-catalogue/shown-difficulty";
import { releaseUrl } from "./shared/updates";
import { APP_VERSION } from "./shared/updates/app-version";
import { useUpdateReminder } from "./shared/updates/use-update-reminder";
import { MenuOpenContext, MenuOpenerContext } from "./ui/menu-open";
import { PipelinesShownContext } from "./ui/pipelines-shown";
import { PullToRead } from "./ui/pull-to-read";
import { TipTour } from "./ui/tip-tour";
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
  /** Settings' appearance section, drawn by the window that holds the theme. */
  readonly appearance: ReactNode;
  /** The shell's Toast, where it has one: a long-press names a legend's item by it. */
  readonly toast?: SystemToast;
  /** The shell's ways out for a picture the app made of a page. */
  readonly share: SystemShare;
  /** The phone's camera, where the shell has one: a scan reads its view. */
  readonly camera?: SystemCamera;
  /** The navigation's scan button was pressed, until the scan says it has read. */
  readonly scanning: boolean;
  readonly onScanned: () => void;
  /** Whether a player is signed in, who alone can scan: a gift is accepted on Hiroba. */
  readonly onSignedIn: (signedIn: boolean) => void;
  /** The launch cover stands over the window: a page's tips wait for it to go. */
  readonly covered?: boolean;
  /** The window's first screen is drawn: a page, its skeleton, the sign-in or a failure. */
  readonly onDrawn?: () => void;
}

export function App({
  port,
  link,
  i18n,
  page,
  onNavigate,
  language,
  appearance,
  toast,
  share,
  camera,
  scanning,
  onScanned,
  onSignedIn,
  covered = false,
  onDrawn,
}: AppProps) {
  const touchFirst = useMediaQuery("(pointer: coarse)", { noSsr: true });
  const wide = useWideWindow();
  const menuOpen = useContext(MenuOpenContext);
  const openMenu = useContext(MenuOpenerContext);
  const pipelinesShown = useContext(PipelinesShownContext);
  const modalLook = useModalLook(pipelinesShown);
  const [tipScene, setTipScene] = useState<TipScene | null>(null);
  const [shownDifficulty, onShownDifficulty] = useKeptChoice(
    keptShownDifficulty,
    keepShownDifficulty,
  );
  const [startingSort, onStartingSort] = useKeptChoice(keptStartingSort, keepStartingSort);
  const [startingRating, onStartingRating] = useKeptChoice(keptStartingRating, keepStartingRating);
  const [chartSource, onChartSource] = useKeptChoice(keptChartSource, keepChartSource);
  const updates = useUpdateReminder(port, APP_VERSION);
  // No more pictures at once than Hiroba's read consumers: the rest wait here, in screen order.
  const lane = useMemo(
    () =>
      createPictureLane({
        load: (want, again) => port.readPicture(want, again),
        atOnce: IO_READ_CONSUMERS,
      }),
    [port],
  );
  const session = useSession({ port, lane, page, onNavigate });
  const pagesData = usePagesData({ port, lane, page, session, startingRating });
  const data: PageData = {
    port,
    link,
    i18n,
    lane,
    touchFirst,
    wide,
    modalLook,
    menuOpen,
    pipelinesShown,
    tipScene,
    shownDifficulty,
    onShownDifficulty,
    startingSort,
    onStartingSort,
    startingRating,
    onStartingRating,
    chartSource,
    onChartSource,
    toast,
    share,
    language,
    appearance,
    navigate: onNavigate,
    version: APP_VERSION,
    updates,
    session,
    ...pagesData,
  };
  const entry = PAGE_REGISTRY[page];
  usePageVisits(page, data, session.settle);
  const shown = usePageShown(page, entry, data);
  const tips = usePageTips(page, data, shown.shown && !covered);
  const again = useReadAgain(entry, data);
  const { screen } = session;
  useEffect(() => {
    if (shown.drawn) {
      onDrawn?.();
    }
  }, [shown.drawn, onDrawn]);
  const withFoot = again.signedIn || screen.name === "reading";
  const { signedIn } = again;
  useEffect(() => onSignedIn(signedIn), [signedIn, onSignedIn]);
  return (
    <>
      {signedIn && (
        <ScanGifts data={data} camera={camera ?? null} scanning={scanning} onScanned={onScanned} />
      )}
      {withFoot && (
        <NavFoot>
          <ReadAgainFoot
            reading={again.reading}
            canRead={again.canRead}
            fetchedAt={screen.name === "profile" ? screen.profile.fetchedAt : null}
            progress={again.progress}
            onRead={again.read}
            onHeld={again.readEvery}
            i18n={i18n}
          />
        </NavFoot>
      )}
      {withFoot && entry.standsAlone !== true && (
        <PullToRead
          active={touchFirst}
          canRead={again.canRead}
          onRead={again.read}
          onHeld={again.readEvery}
        />
      )}
      {again.question}
      <PicturesReadNote lane={lane} i18n={i18n} />
      <TipTour
        key={page}
        steps={tips.steps}
        i18n={i18n}
        onSeen={tips.onSeen}
        onScene={(scene) => {
          const shown = TIP_SCENES.find((one) => one === scene) ?? null;
          openMenu(shown === "menu");
          setTipScene(shown);
        }}
      />
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

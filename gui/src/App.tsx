import type { Translator } from "@abth/i18n";
import { type ReactNode, useContext, useEffect } from "react";
import { PageArea } from "./app/page-area";
import { ReadAgainControls } from "./app/read-again-controls";
import { ScanGifts } from "./app/scan-gifts";
import { UpdateReminderDialog } from "./app/update-reminder-dialog";
import { useDeviceChoices } from "./app/use-device-choices";
import { useModalLook } from "./app/use-modal-look";
import { usePageShown } from "./app/use-page-shown";
import { usePageTips } from "./app/use-page-tips";
import { usePageVisits } from "./app/use-page-visits";
import { usePagesData } from "./app/use-pages-data";
import { usePictureLane } from "./app/use-picture-lane";
import { useReadAgain } from "./app/use-read-again";
import { useSession } from "./app/use-session";
import { useTipScene } from "./app/use-tip-scene";
import type { Page } from "./navigation/pages";
import type { PageData } from "./pages/page";
import { PAGE_REGISTRY } from "./pages/registry";
import type { SystemCamera, SystemLink, SystemShare, SystemToast } from "./platform";
import { PicturesReadNote } from "./read-again/pictures-read-note";
import type { HirobaSessionPort } from "./shared/session-port";
import { APP_VERSION } from "./shared/updates/app-version";
import { useUpdateReminder } from "./shared/updates/use-update-reminder";
import { MenuOpenContext } from "./ui/menu-open";
import { PipelinesShownContext } from "./ui/pipelines-shown";
import { TipTour } from "./ui/tip-tour";
import { useTouchFirst } from "./ui/use-touch-first";
import { useWideWindow } from "./ui/use-wide-window";

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
  readonly toast?: SystemToast | undefined;
  /** The shell's ways out for a picture the app made of a page. */
  readonly share: SystemShare;
  /** The phone's camera, where the shell has one: a scan reads its view. */
  readonly camera?: SystemCamera | undefined;
  /** The navigation's scan button was pressed, until the scan says it has read. */
  readonly scanning: boolean;
  readonly onScanned: () => void;
  /** Whether a player is signed in, who alone can scan: a gift is accepted on Hiroba. */
  readonly onSignedIn: (signedIn: boolean) => void;
  /** The launch cover stands over the window: a page's tips wait for it to go. */
  readonly covered?: boolean;
  /** The window's first screen is drawn: a page, its skeleton, the sign-in or a failure. */
  readonly onDrawn?: (() => void) | undefined;
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
  const touchFirst = useTouchFirst();
  const wide = useWideWindow();
  const menuOpen = useContext(MenuOpenContext);
  const pipelinesShown = useContext(PipelinesShownContext);
  const modalLook = useModalLook(pipelinesShown);
  const { tipScene, onScene } = useTipScene();
  const choices = useDeviceChoices();
  const updates = useUpdateReminder(port, APP_VERSION);
  const lane = usePictureLane(port);
  const session = useSession({ port, lane, page, onNavigate });
  const { startingRating } = choices;
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
    ...choices,
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
  useEffect(() => {
    if (shown.drawn) {
      onDrawn?.();
    }
  }, [shown.drawn, onDrawn]);
  const { signedIn } = again;
  useEffect(() => onSignedIn(signedIn), [signedIn, onSignedIn]);
  return (
    <>
      {signedIn && (
        <ScanGifts data={data} camera={camera ?? null} scanning={scanning} onScanned={onScanned} />
      )}
      <ReadAgainControls
        again={again}
        screen={session.screen}
        pullable={entry.standsAlone !== true}
        touchFirst={touchFirst}
        i18n={i18n}
      />
      <PicturesReadNote lane={lane} i18n={i18n} />
      <TipTour key={page} steps={tips.steps} i18n={i18n} onSeen={tips.onSeen} onScene={onScene} />
      {entry.standsAlone === true ? (
        entry.draw(data)
      ) : (
        <PageArea page={page} entry={entry} data={data} shown={shown} onSignIn={session.signIn} />
      )}
      <UpdateReminderDialog updates={updates} link={link} i18n={i18n} />
    </>
  );
}

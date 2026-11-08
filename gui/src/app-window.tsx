import type { Translator } from "@abth/i18n";
import { type ReactNode, useState } from "react";

import { App } from "./App";
import { AppFrame } from "./navigation/app-frame";
import type { Page } from "./navigation/pages";
import { PAGE_REGISTRY } from "./pages/registry";
import { PipelinesPage } from "./pipelines-page/pipelines-page";
import type { Platform } from "./platform";

interface AppWindowProps {
  readonly platform: Platform;
  readonly i18n: Translator;
  readonly page: Page;
  readonly onNavigate: (page: Page) => void;
  /** Wide enough for the side panel, which stays open beside the page. */
  readonly wide: boolean;
  /** A touch screen: swipes open the menu and the pipelines page. */
  readonly touchFirst: boolean;
  /** Settings' language section, drawn by the window that holds the language. */
  readonly language: ReactNode;
  /** Settings' appearance section, drawn by the window that holds the theme. */
  readonly appearance: ReactNode;
  /** The launch cover stands over the window: a page's tips wait for it to go. */
  readonly covered?: boolean;
  /** The window's first screen is drawn: a page, its skeleton, the sign-in or a failure. */
  readonly onDrawn?: () => void;
}

/** The window once a platform runs: the frame and its pipelines page around the app. */
export function AppWindow({
  platform,
  i18n,
  page,
  onNavigate,
  wide,
  touchFirst,
  language,
  appearance,
  covered = false,
  onDrawn,
}: AppWindowProps) {
  const { port, link, share, back, toast, camera } = platform;
  const [signedIn, setSignedIn] = useState(false);
  const [scanning, setScanning] = useState(false);
  return (
    <AppFrame
      page={page}
      onNavigate={onNavigate}
      i18n={i18n}
      wide={wide}
      touchFirst={touchFirst}
      pages={PAGE_REGISTRY}
      onScan={signedIn ? () => setScanning(true) : undefined}
      back={back}
      pipelines={<PipelinesPage port={port} i18n={i18n} />}
    >
      <App
        port={port}
        link={link}
        share={share}
        i18n={i18n}
        page={page}
        onNavigate={onNavigate}
        language={language}
        appearance={appearance}
        toast={toast}
        camera={camera}
        scanning={scanning}
        onScanned={() => setScanning(false)}
        onSignedIn={setSignedIn}
        covered={covered}
        onDrawn={onDrawn}
      />
    </AppFrame>
  );
}

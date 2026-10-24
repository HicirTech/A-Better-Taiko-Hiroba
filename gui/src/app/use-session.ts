import type { MessageKey } from "@abth/i18n";
import { useCallback, useEffect, useRef, useState } from "react";

import { useFrameNavigation } from "../navigation/frame-navigation";
import type { Page } from "../navigation/pages";
import type { SessionView } from "../pages/page";
import type { Screen } from "../pages/page-model";
import type { PictureLane } from "../pictures/picture-lane";
import { hirobaSession } from "../shared/read-failure-message";
import { afterRefresh } from "../shared/reads/after-refresh";
import { useReadRun } from "../shared/reads/use-read-run";
import type {
  HirobaSessionPort,
  ProfileView,
  ReadFailure,
  SignInOutcome,
} from "../shared/session-port";

const FIXED_ART = ["scorePanel", "rankIcon", "crownIcon"] as const;

const SIGN_IN_NOTICE = {
  cancelled: "signIn.cancelled",
  noSession: "signIn.noSession",
  unavailable: "signIn.unavailable",
  refused: "signIn.refused",
  refuser: "signIn.refuser",
} as const satisfies Record<Exclude<SignInOutcome["kind"], "signedIn">, MessageKey>;

/** The session as the window holds it: what the pages see, and what the window does with it. */
export interface Session extends SessionView {
  readonly signIn: () => Promise<void>;
  /** A read found the session gone: back to the sign-in, saying why. */
  readonly sessionGone: (notice: MessageKey) => void;
  /** Signed out or signing in: nothing of the last session is kept. */
  readonly noSession: boolean;
  readonly readBehindThePage: () => void;
  readonly nameRead: (nickname: string) => void;
  readonly titleRead: (title: string) => void;
  /** Forgets a failed read of my page, said on its page until another opens. */
  readonly settle: () => void;
}

/** The player's session: the sign-in, the read of my page, and what a write puts into it. */
export function useSession({
  port,
  lane,
  page,
  onNavigate,
}: {
  readonly port: HirobaSessionPort;
  readonly lane: PictureLane;
  readonly page: Page;
  readonly onNavigate: (page: Page) => void;
}): Session {
  const [screen, setScreen] = useState<Screen>({ name: "checking" });
  // Whether the read of my page running is the page's own: one behind it, after a write, is not.
  const [readInView, setReadInView] = useState(false);
  const sessionGone = useCallback(
    (notice: MessageKey) => setScreen({ name: "signedOut", notice }),
    [],
  );
  const [myPage, myPageStatus] = useReadRun<ReadFailure>(hirobaSession(sessionGone));
  // behindThePage keeps the page mounted, with its outcome notice and focus, and leaves the
  // portrait alone: a title write does not change the costume.
  const read = useCallback(
    async (behindThePage = false, refreshFirst = false): Promise<boolean> => {
      if (myPage.status().phase === "reading") {
        return false;
      }
      setReadInView(!behindThePage);
      if (!behindThePage) {
        setScreen((now) => (now.name === "profile" ? now : { name: "reading" }));
      }
      const readProfile = () =>
        behindThePage ? port.readProfile({ renewsPortrait: false }) : port.readProfile();
      const result = await myPage.run(
        () => (refreshFirst ? afterRefresh(port, readProfile) : readProfile()),
        {
          keep: (answer) => {
            if (!answer.ok) {
              // My page shown stays, the failure over it; with none, the failure takes its place.
              setScreen((now) =>
                now.name === "profile" ? now : { name: "readFailed", ...answer.error },
              );
              return;
            }
            // Plates change with the title or season, the portrait with any costume change.
            // Fixed art is kept for good once it came, so only its failures are forgotten.
            lane.renew("titlePlate");
            lane.renew("medalPlate");
            if (!behindThePage) {
              lane.renew("myDon");
            }
            for (const kind of FIXED_ART) {
              lane.forgetFailures(kind);
            }
            setScreen({ name: "profile", profile: answer.value });
          },
        },
      );
      return result?.ok === true;
    },
    [myPage, port, lane],
  );
  // A title write that may have moved the title leaves the plate stale: read my page again.
  const readBehindThePage = useCallback(() => void read(true), [read]);
  // What a write read back goes into the window's copy of the profile, ahead of the next read.
  const putInProfile = useCallback(
    (worn: Partial<Pick<ProfileView, "nickname" | "title">>) =>
      setScreen((now) =>
        now.name === "profile" ? { name: "profile", profile: { ...now.profile, ...worn } } : now,
      ),
    [],
  );
  const nameRead = useCallback((nickname: string) => putInProfile({ nickname }), [putInProfile]);
  const titleRead = useCallback((title: string) => putInProfile({ title }), [putInProfile]);

  const signIn = async () => {
    // Hiroba may have ended the last session itself, so no sign-out forgot its pictures.
    lane.forget();
    setScreen({ name: "signingIn" });
    const outcome = await port.signIn();
    if (outcome.kind === "signedIn") {
      await read();
    } else {
      setScreen({
        name: "signedOut",
        notice: SIGN_IN_NOTICE[outcome.kind],
        ...((outcome.kind === "refused" || outcome.kind === "refuser") && {
          noticeParams: { host: outcome.host },
        }),
      });
    }
  };

  const signOut = async () => {
    lane.forget();
    myPage.forget();
    await port.signOut();
    setScreen({ name: "signedOut", notice: null });
    onNavigate("overview");
  };

  const noSession = screen.name === "signedOut" || screen.name === "signingIn";
  // Before a sign-in there is only the sign-in card, on the Overview, and no navigation.
  useFrameNavigation(!noSession);
  useEffect(() => {
    if (noSession && page !== "overview") {
      onNavigate("overview");
    }
  }, [noSession, page, onNavigate]);
  // Another player may sign in next: keep nothing of the last session.
  useEffect(() => {
    if (noSession) {
      myPage.forget();
    }
  }, [noSession, myPage]);

  // Once only: StrictMode runs effects twice in development, and a second run asks Hiroba again.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) {
      return;
    }
    opened.current = true;
    void port.isSignedIn().then((signedIn) => {
      if (signedIn) {
        void read();
      } else {
        setScreen({ name: "signedOut", notice: null });
      }
    });
  }, [port, read]);

  return {
    screen,
    myPage: myPageStatus,
    myPageInView: myPageStatus.phase === "reading" && readInView,
    read,
    signIn,
    signOut,
    sessionGone,
    noSession,
    readBehindThePage,
    nameRead,
    titleRead,
    settle: myPage.settle,
  };
}

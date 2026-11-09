import type { Translator } from "@abth/i18n";

import type { Screen } from "../pages/page-model";
import { ReadAgainFoot } from "../read-again/read-again-foot";
import { PullToRead } from "../ui/pull-to-read";
import { NavFoot } from "./nav-foot";
import type { ReadAgain } from "./use-read-again";

/** Read again at the navigation's foot, by a pull on a touch screen, and the question it asks. */
export function ReadAgainControls({
  again,
  screen,
  pullable,
  touchFirst,
  i18n,
}: {
  readonly again: ReadAgain;
  readonly screen: Screen;
  /** The page takes a pull: one drawn on its own, as Settings is, does not. */
  readonly pullable: boolean;
  readonly touchFirst: boolean;
  readonly i18n: Translator;
}) {
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
            onHeld={again.readEvery}
            i18n={i18n}
          />
        </NavFoot>
      )}
      {withFoot && pullable && (
        <PullToRead
          active={touchFirst}
          canRead={again.canRead}
          onRead={again.read}
          onHeld={again.readEvery}
        />
      )}
      {again.question}
    </>
  );
}

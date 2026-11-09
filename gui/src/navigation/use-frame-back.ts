import { useEffect, useEffectEvent, useMemo, useState, useSyncExternalStore } from "react";

import type { SystemBack } from "../platform";
import { createBackClosers } from "../ui/back-closers";
import { backAction } from "./back-action";
import type { Page } from "./pages";

/** The phone's Back on the frame: what a press closes or leaves, and whether it is drawn. */
export function useFrameBack({
  back,
  page,
  pipelinesShown,
  menuOpen,
  wide,
  navigation,
  showPipelines,
  setMenuOpen,
  onNavigate,
}: {
  readonly back: SystemBack | undefined;
  readonly page: Page;
  readonly pipelinesShown: boolean;
  readonly menuOpen: boolean;
  readonly wide: boolean;
  readonly navigation: boolean;
  readonly showPipelines: (shown: boolean, menuAfter?: boolean) => void;
  readonly setMenuOpen: (open: boolean) => void;
  readonly onNavigate: (page: Page) => void;
}) {
  const [closers] = useState(createBackClosers);
  const [modes] = useState(createBackClosers);
  const press = (system: SystemBack) => {
    const action = backAction({
      overlayOpen: closers.isOpen(),
      pipelinesShown,
      menuOpen,
      modeOn: modes.isOpen(),
      page,
    });
    if (action === "closeOverlay") {
      closers.closeLatest();
    } else if (action === "leavePipelines") {
      showPipelines(false, !wide);
    } else if (action === "closeMenu") {
      setMenuOpen(false);
    } else if (action === "leaveMode") {
      modes.closeLatest();
    } else if (action === "overview") {
      onNavigate("overview");
    } else {
      system.leave();
    }
  };
  const pressedBack = useEffectEvent(press);
  useEffect(() => back?.listen(() => pressedBack(back)), [back]);
  const modeOn = useSyncExternalStore(modes.subscribe, modes.isOpen);
  // An overlay lies over the button and takes the press first; an open menu has its own ways out.
  const backHere = backAction({ overlayOpen: false, pipelinesShown, menuOpen, modeOn, page });
  const backDrawn = back?.onScreen === true;
  const backShown = backDrawn && navigation && backHere !== "leave" && backHere !== "closeMenu";
  const onScreenBack = useMemo(
    () => ({ drawn: backDrawn, shown: backShown }),
    [backDrawn, backShown],
  );
  return { closers, modes, onScreenBack, press };
}

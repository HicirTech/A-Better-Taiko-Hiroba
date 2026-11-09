import { useContext, useState } from "react";

import { TIP_SCENES, type TipScene } from "../pages/page-tips";
import { MenuOpenerContext } from "../ui/menu-open";

/** What a tip now opens on the page, as the tour asks for it: the menu, a drawer or a card. */
export function useTipScene() {
  const openMenu = useContext(MenuOpenerContext);
  const [tipScene, setTipScene] = useState<TipScene | null>(null);
  const onScene = (scene: string | null) => {
    const shown = TIP_SCENES.find((one) => one === scene) ?? null;
    openMenu(shown === "menu");
    setTipScene(shown);
  };
  return { tipScene, onScene } as const;
}

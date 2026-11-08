import type { Translator } from "@abth/i18n";
import { Button, Skeleton, Stack } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { action } from "storybook/actions";
import { expect, waitFor } from "storybook/test";
import { NavFoot } from "../app/nav-foot";
import { PAGE_REGISTRY } from "../pages/registry";
import type { SystemBack } from "../platform";
import { ReadAgainFoot } from "../read-again/read-again-foot";
import { onDevice, touchOf, wideOf } from "../story-kit/devices";
import { i18nOf, pressableBack, STORY_BACK, STORY_ON_SCREEN_BACK } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { touchDrag } from "../story-kit/touch";
import { useBackCloses, useBackLeaves } from "../ui/back-closers";
import { AppFrame } from "./app-frame";
import type { Page } from "./pages";

const PAGE_STAND_IN = (
  <Stack spacing={2}>
    <Skeleton variant="rounded" height={180} />
    <Skeleton variant="rounded" height={120} />
    <Skeleton variant="rounded" height={240} />
  </Stack>
);

/** The frame over a page that stands in for any, with Read again at the navigation's foot. */
function FrameOverAPage({
  i18n,
  android,
  wide,
  back = STORY_BACK,
  startsOn = "overview",
  content = PAGE_STAND_IN,
}: {
  i18n: Translator;
  android: boolean;
  wide: boolean;
  back?: SystemBack;
  startsOn?: Page;
  content?: ReactNode;
}) {
  const [page, setPage] = useState<Page>(startsOn);
  return (
    <AppFrame
      page={page}
      onNavigate={(next) => {
        setPage(next);
        action("navigate")(next);
      }}
      i18n={i18n}
      wide={wide}
      touchFirst={android}
      pages={PAGE_REGISTRY}
      onScan={action("scan")}
      {...(android ? { back } : {})}
      pipelines={<Skeleton id="story-pipelines" variant="rounded" height={240} />}
    >
      <NavFoot>
        <ReadAgainFoot
          reading={false}
          canRead
          fetchedAt={STORY_PROFILE.fetchedAt}
          onRead={action("read again")}
          i18n={i18n}
        />
      </NavFoot>
      {content}
    </AppFrame>
  );
}

/** A page's overlay and mode stood in for, each left by Back while it is on. */
function OverlayAndMode() {
  const [overlay, setOverlay] = useState(false);
  const [mode, setMode] = useState(false);
  useBackCloses(overlay, () => setOverlay(false));
  useBackLeaves(mode, () => setMode(false));
  return (
    <Stack direction="row" spacing={1}>
      <Button id="story-mode" aria-pressed={mode} onClick={() => setMode(true)}>
        Start a mode
      </Button>
      <Button id="story-overlay" aria-pressed={overlay} onClick={() => setOverlay(true)}>
        Open an overlay
      </Button>
    </Stack>
  );
}

const meta = {
  title: "Navigation/AppFrame",
  tags: ["navigation"],
  parameters: { layout: "fullscreen" },
  render: (_args, { globals }) => (
    <FrameOverAPage i18n={i18nOf(globals)} android={touchOf(globals)} wide={wideOf(globals)} />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** iOS has no Back of its own: the frame draws one wherever there is somewhere to go back to. */
export const WithAnOnScreenBack: Story = {
  render: (_args, { globals }) => (
    <FrameOverAPage
      i18n={i18nOf(globals)}
      android={touchOf(globals)}
      wide={wideOf(globals)}
      back={STORY_ON_SCREEN_BACK}
      startsOn="scores"
    />
  ),
};

/** The frame: a side panel or a menu of pages, and the pipelines page past it. */
export const Frame: Story = {};

/** On a phone a swipe right from the left two thirds opens the menu. */
export const MenuSwipedOpen: Story = {
  globals: onDevice("phone"),
  play: ({ canvasElement }) => {
    touchDrag(canvasElement, { x: 40, y: 400 }, { x: 260, y: 404 }, { release: true });
  },
};

const SWIPE_OPEN = { from: { x: 40, y: 400 }, to: { x: 260, y: 404 } } as const;
const MOVED = { timeout: 3000 } as const;
// A hand presses again once a move has ended and the last close has left its stack.
const handPause = () => new Promise((resolve) => setTimeout(resolve, 400));

const titleIn = (canvas: HTMLElement) =>
  canvas.ownerDocument.querySelector("main h1")?.textContent ?? null;
const menuShownIn = (canvas: HTMLElement) =>
  canvas.ownerDocument.querySelector("#nav-menu")?.getAttribute("aria-expanded") === "true";
const pressedIn = (canvas: HTMLElement, id: string) =>
  canvas.ownerDocument.querySelector(`#${id}`)?.getAttribute("aria-pressed") === "true";
const clickIn = (canvas: HTMLElement, selector: string) =>
  canvas.ownerDocument.querySelector<HTMLElement>(selector)?.click();

/** The menu shuts as a swipe left from it. */
export const MenuSwipedShut: Story = {
  globals: onDevice("phone"),
  play: async ({ canvasElement }) => {
    touchDrag(canvasElement, SWIPE_OPEN.from, SWIPE_OPEN.to, { release: true });
    await waitFor(() => expect(menuShownIn(canvasElement)).toBe(true), MOVED);
    touchDrag(canvasElement, { x: 220, y: 400 }, { x: 20, y: 404 }, { release: true });
    await waitFor(() => expect(menuShownIn(canvasElement)).toBe(false), MOVED);
  },
};

const MENU_BACK = pressableBack();

/** Back shuts the menu, then on the Overview leaves the app. */
export const BackShutsTheMenuThenLeaves: Story = {
  globals: onDevice("phone"),
  render: (_args, { globals }) => (
    <FrameOverAPage i18n={i18nOf(globals)} android wide={wideOf(globals)} back={MENU_BACK.back} />
  ),
  play: async ({ canvasElement }) => {
    MENU_BACK.reset();
    touchDrag(canvasElement, SWIPE_OPEN.from, SWIPE_OPEN.to, { release: true });
    await waitFor(() => expect(menuShownIn(canvasElement)).toBe(true), MOVED);
    await handPause();
    MENU_BACK.press();
    await waitFor(() => expect(menuShownIn(canvasElement)).toBe(false), MOVED);
    expect(MENU_BACK.leaves()).toBe(0);
    await handPause();
    MENU_BACK.press();
    expect(MENU_BACK.leaves()).toBe(1);
  },
};

const PAGE_BACK = pressableBack();

/** Back on another page goes to the Overview first; only there does it leave the app. */
export const BackGoesToTheOverviewBeforeLeaving: Story = {
  globals: onDevice("phone"),
  render: (_args, { globals }) => (
    <FrameOverAPage
      i18n={i18nOf(globals)}
      android
      wide={wideOf(globals)}
      back={PAGE_BACK.back}
      startsOn="scores"
    />
  ),
  play: async ({ canvasElement, globals }) => {
    const { t } = i18nOf(globals);
    PAGE_BACK.reset();
    await waitFor(() => expect(titleIn(canvasElement)).toBe(t("nav.scores")), MOVED);
    await handPause();
    PAGE_BACK.press();
    await waitFor(() => expect(titleIn(canvasElement)).toBe(t("nav.overview")), MOVED);
    expect(PAGE_BACK.leaves()).toBe(0);
    await handPause();
    PAGE_BACK.press();
    expect(PAGE_BACK.leaves()).toBe(1);
  },
};

const PIPELINES_BACK = pressableBack();

/** Back from the pipelines page goes to the menu it was reached from, then shuts the menu. */
export const BackLeavesThePipelinesPageThenTheMenu: Story = {
  globals: onDevice("phone"),
  render: (_args, { globals }) => (
    <FrameOverAPage
      i18n={i18nOf(globals)}
      android
      wide={wideOf(globals)}
      back={PIPELINES_BACK.back}
    />
  ),
  play: async ({ canvasElement, globals }) => {
    const { t } = i18nOf(globals);
    PIPELINES_BACK.reset();
    touchDrag(canvasElement, SWIPE_OPEN.from, SWIPE_OPEN.to, { release: true });
    await waitFor(() => expect(menuShownIn(canvasElement)).toBe(true), MOVED);
    clickIn(canvasElement, "#nav-pipelines");
    await waitFor(() => expect(titleIn(canvasElement)).toBe(t("nav.pipelines")), MOVED);
    await handPause();
    PIPELINES_BACK.press();
    await waitFor(() => expect(titleIn(canvasElement)).toBe(t("nav.overview")), MOVED);
    expect(menuShownIn(canvasElement)).toBe(true);
    await handPause();
    PIPELINES_BACK.press();
    await waitFor(() => expect(menuShownIn(canvasElement)).toBe(false), MOVED);
    await handPause();
    PIPELINES_BACK.press();
    expect(PIPELINES_BACK.leaves()).toBe(1);
  },
};

const LAYERS_BACK = pressableBack();

/** Back closes an overlay first, then leaves the page's mode, then the page, then the app. */
export const BackClosesAnOverlayThenAModeThenThePage: Story = {
  globals: onDevice("phone"),
  render: (_args, { globals }) => (
    <FrameOverAPage
      i18n={i18nOf(globals)}
      android
      wide={wideOf(globals)}
      back={LAYERS_BACK.back}
      startsOn="scores"
      content={<OverlayAndMode />}
    />
  ),
  play: async ({ canvasElement, globals }) => {
    const { t } = i18nOf(globals);
    LAYERS_BACK.reset();
    clickIn(canvasElement, "#story-mode");
    clickIn(canvasElement, "#story-overlay");
    await waitFor(() => expect(pressedIn(canvasElement, "story-overlay")).toBe(true), MOVED);
    await handPause();
    LAYERS_BACK.press();
    await waitFor(() => expect(pressedIn(canvasElement, "story-overlay")).toBe(false), MOVED);
    expect(pressedIn(canvasElement, "story-mode")).toBe(true);
    await handPause();
    LAYERS_BACK.press();
    await waitFor(() => expect(pressedIn(canvasElement, "story-mode")).toBe(false), MOVED);
    expect(titleIn(canvasElement)).toBe(t("nav.scores"));
    await handPause();
    LAYERS_BACK.press();
    await waitFor(() => expect(titleIn(canvasElement)).toBe(t("nav.overview")), MOVED);
    await handPause();
    LAYERS_BACK.press();
    expect(LAYERS_BACK.leaves()).toBe(1);
  },
};

const DRAWN_BACK = pressableBack(true);

/** Where the system has no Back, the frame's own goes to the Overview, and is gone there. */
export const OnScreenBackGoesToTheOverview: Story = {
  globals: onDevice("phone"),
  render: (_args, { globals }) => (
    <FrameOverAPage
      i18n={i18nOf(globals)}
      android
      wide={wideOf(globals)}
      back={DRAWN_BACK.back}
      startsOn="scores"
    />
  ),
  play: async ({ canvasElement, globals }) => {
    const { t } = i18nOf(globals);
    const drawnBack = () => canvasElement.ownerDocument.querySelector("#nav-back");
    await waitFor(() => expect(drawnBack()).not.toBeNull(), MOVED);
    clickIn(canvasElement, "#nav-back");
    await waitFor(() => expect(titleIn(canvasElement)).toBe(t("nav.overview")), MOVED);
    await waitFor(() => expect(drawnBack()).toBeNull(), MOVED);
  },
};

import type { Translator } from "@abth/i18n";
import { Skeleton, Stack } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { action } from "storybook/actions";
import { NavFoot } from "../app/nav-foot";
import { PAGE_REGISTRY } from "../pages/registry";
import type { SystemBack } from "../platform";
import { ReadAgainFoot } from "../read-again/read-again-foot";
import { onDevice, touchOf, wideOf } from "../story-kit/devices";
import { i18nOf, STORY_BACK, STORY_ON_SCREEN_BACK } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { touchDrag } from "../story-kit/touch";
import { AppFrame } from "./app-frame";
import type { Page } from "./pages";

/** The frame over a page that stands in for any, with Read again at the navigation's foot. */
function FrameOverAPage({
  i18n,
  android,
  wide,
  back = STORY_BACK,
  startsOn = "overview",
}: {
  i18n: Translator;
  android: boolean;
  wide: boolean;
  back?: SystemBack;
  startsOn?: Page;
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
      pipelines={<Skeleton variant="rounded" height={240} />}
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
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={180} />
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={240} />
      </Stack>
    </AppFrame>
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

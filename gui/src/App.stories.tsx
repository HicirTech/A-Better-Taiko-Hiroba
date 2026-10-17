import { err, ok } from "@abth/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { appOn } from "./story-kit/story-app";
import { neverAnswers } from "./story-kit/story-port";

const meta = {
  title: "Pages/Overview/App",
  tags: ["app"],
  parameters: { layout: "fullscreen" },
  render: appOn("overview"),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The whole window, signed in, on the Overview; the navigation goes to every page. */
export const Overview: Story = {};

/** No session: the sign-in card, and no navigation. */
export const SignedOut: Story = {
  render: appOn("overview", { isSignedIn: () => Promise.resolve(false) }),
};

/** My page is on its way. */
export const Reading: Story = { render: appOn("overview", { readProfile: neverAnswers }) };

/** My page did not come: why, in place of the profile. */
export const ReadFailed: Story = {
  render: appOn("overview", {
    readProfile: () =>
      Promise.resolve(err({ kind: "unexpectedPage", detail: "path=/mypage_top.php status=200" })),
  }),
};

/** A newer release is out: what is new, with Download and Later. */
export const UpdateOffered: Story = {
  render: appOn("overview", {
    readUpdateFeed: () =>
      Promise.resolve(
        ok({
          version: "9.0.0",
          notes: { en: ["A newer version of the app."], ja: ["新しいバージョンです。"] },
        }),
      ),
  }),
};

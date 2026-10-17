import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";

import { LanguageSetting } from "../language/language-setting";
import { i18nOf, localeOf } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { type AccountState, SettingsPage } from "./settings-page";

interface Args {
  readonly account: AccountState;
}

const meta = {
  title: "Pages/Settings/SettingsPage",
  tags: ["settings"],
  render: ({ account }, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <SettingsPage
        i18n={i18n}
        language={
          <LanguageSetting
            picked={null}
            system={localeOf(globals)}
            onPick={action("pick a language")}
            i18n={i18n}
          />
        }
        account={account}
        updates={{
          version: "0.5.1",
          check: "idle",
          onCheck: action("check for updates"),
          onOpenReleases: action("open the releases"),
        }}
        onOpenRepository={action("open the repository")}
      />
    );
  },
  args: {
    account: {
      kind: "signedIn",
      nickname: STORY_PROFILE.nickname,
      onSignOut: action("sign out"),
    },
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every section, signed in. */
export const SignedIn: Story = {};

/** A read is running: Sign out waits. */
export const Reading: Story = { args: { account: { kind: "reading" } } };

export const SignedOut: Story = { args: { account: { kind: "signedOut" } } };

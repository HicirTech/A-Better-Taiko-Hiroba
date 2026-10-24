import type { Meta, StoryObj } from "@storybook/react-vite";

import { crashCodeOf } from "../shared/crash-code";
import { i18nOf } from "../story-kit/env";
import { ErrorBoundary } from "./error-boundary";
import { PageCrash } from "./page-crash";

function ThrowsAsItDraws(): never {
  throw new TypeError("A page that cannot be drawn");
}

const meta = {
  title: "Status/PageCrash",
  tags: ["ui"],
  render: (_args, { globals }) => <PageCrash code="scores=TypeError" i18n={i18nOf(globals)} />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** In the place of a page that threw as it drew. */
export const InPlace: Story = {};

/** A page that throws, caught as the page area catches it; React tells the console of it. */
export const ThrownByAPage: Story = {
  render: (_args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <ErrorBoundary
        fallback={(error) => <PageCrash code={crashCodeOf("scores", error)} i18n={i18n} />}
      >
        <ThrowsAsItDraws />
      </ErrorBoundary>
    );
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { HoldRing } from "./long-hold";

/** A hold that starts as the story opens. */
function Holding({ size }: { size: number }) {
  const [since] = useState(Date.now);
  return <HoldRing since={since} size={size} />;
}

const meta = {
  title: "Status/HoldRing",
  tags: ["read-again"],
  render: () => <Holding size={36} />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The ring that fills while Read again or a pull is held six seconds to read every score. */
export const Filling: Story = {};

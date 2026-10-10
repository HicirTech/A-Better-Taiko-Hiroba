/** How a page read again looks: in place, dimmed, until the read ends. */
export const SHUT_LOOK = (shut: boolean) =>
  ({ opacity: shut ? 0.6 : 1, transition: "opacity 150ms" }) as const;

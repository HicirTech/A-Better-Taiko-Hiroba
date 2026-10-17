import { Box, type Theme, ThemeProvider, Typography } from "@mui/material";
import type { ReactNode } from "react";

/** What a gallery takes of a story: its args and its render. */
interface StoryParts {
  readonly args?: object;
  readonly render?: unknown;
}

/** One member of a kind, shown by one of its stories. */
export interface Member {
  readonly name: string;
  readonly meta: StoryParts;
  readonly story: StoryParts;
  /** The whole row, for a member as wide as a page. */
  readonly wide?: boolean;
}

/** What a story draws, given the gallery's own context: the renders read only its globals. */
function viewOf({ meta, story }: Member, context: unknown): ReactNode {
  const render = (story.render ?? meta.render) as
    | ((args: object, context: unknown) => ReactNode)
    | undefined;
  return render?.({ ...meta.args, ...story.args }, context) ?? null;
}

/** Dialogs, menus and drawers drawn in their cell, not over the window: each in a box of its own. */
const inCells = (outer: Theme): Theme => {
  const inPlace = {
    disablePortal: true,
    disableEnforceFocus: true,
    disableAutoFocus: true,
    disableRestoreFocus: true,
    disableScrollLock: true,
  };
  return {
    ...outer,
    components: {
      ...outer.components,
      MuiDialog: { defaultProps: inPlace },
      MuiDrawer: { defaultProps: { ModalProps: inPlace } },
      MuiPopover: { defaultProps: inPlace },
    },
  };
};

/** The members of a kind side by side, each under its name, to see what repeats. */
export function Gallery({
  members,
  context,
  overlays = false,
}: {
  readonly members: readonly Member[];
  /** The gallery story's own context, which the members' renders read their globals from. */
  readonly context: unknown;
  /** The members open over the window, as dialogs do: each is drawn in a box of its own height. */
  readonly overlays?: boolean;
}) {
  const grid = (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
        gap: 3,
        p: 2,
      }}
    >
      {members.map((member) => (
        <Box key={member.name} sx={member.wide === true ? { gridColumn: "1 / -1" } : undefined}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 0.5, fontFamily: "monospace" }}
          >
            {member.name}
          </Typography>
          <Box
            sx={{
              position: "relative",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              p: overlays ? 0 : 2,
              // A transform makes the box hold what is fixed inside it, such as a dialog.
              ...(overlays && { height: 520, overflow: "hidden", transform: "translateZ(0)" }),
            }}
          >
            {viewOf(member, context)}
          </Box>
        </Box>
      ))}
    </Box>
  );
  return overlays ? <ThemeProvider theme={inCells}>{grid}</ThemeProvider> : grid;
}

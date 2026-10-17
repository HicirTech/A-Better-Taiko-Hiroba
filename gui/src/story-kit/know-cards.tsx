import { Box, Stack } from "@mui/material";
import type { ReactNode } from "react";

import type { PageParts } from "../know-yourself/page-parts";
import { touchOf } from "./devices";
import { i18nOf, STORY_TOAST, type StoryGlobals } from "./env";
import { KnowParts } from "./know";
import { STORY_LANE } from "./story-pictures";

/** Know yourself's cards as the page stacks them, drawn with the page's parts. */
export const knowCards = (item: (parts: PageParts) => ReactNode, globals: StoryGlobals) => (
  <Box sx={{ maxWidth: 720 }}>
    <KnowParts
      i18n={i18nOf(globals)}
      lane={STORY_LANE}
      toast={touchOf(globals) ? STORY_TOAST : undefined}
    >
      {(parts) => <Stack spacing={1.5}>{item(parts)}</Stack>}
    </KnowParts>
  </Box>
);

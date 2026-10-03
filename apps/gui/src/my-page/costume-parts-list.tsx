import type { Translator } from "@abth/i18n";
import { Box, Stack, Tab, Tabs, Typography } from "@mui/material";

import { COLOUR_PARTS, type CostumePart, PART_LABEL, SLOT_PARTS } from "./costume-parts";
import { type EditingTabs, selectedPart } from "./costume-tabs";

const ROW = {
  minHeight: 52,
  px: 1.5,
  gap: 1.5,
  maxWidth: "none",
  flexDirection: "row",
  justifyContent: "flex-start",
  textAlign: "left",
  textTransform: "none",
  "&.Mui-selected": { bgcolor: "action.selected" },
} as const;

export interface PartsListProps {
  readonly i18n: Translator;
  readonly tabs: EditingTabs;
  readonly onPick: (part: CostumePart) => void;
}

export function PartsList({ i18n, tabs, onPick }: PartsListProps) {
  const { t } = i18n;
  const shown = selectedPart(tabs);
  return (
    <Stack spacing={2}>
      <PartGroup
        id="colours"
        heading={t("costume.tab.colours")}
        parts={COLOUR_PARTS}
        shown={shown}
        i18n={i18n}
        onPick={onPick}
      />
      <PartGroup
        id="items"
        heading={t("costume.tab.items")}
        parts={SLOT_PARTS}
        shown={shown}
        i18n={i18n}
        onPick={onPick}
      />
    </Stack>
  );
}

// A tab list of its own for each heading: a heading inside one would break its tab semantics.
function PartGroup({
  id,
  heading,
  parts,
  shown,
  i18n,
  onPick,
}: {
  id: string;
  heading: string;
  parts: readonly CostumePart[];
  shown: CostumePart;
  i18n: Translator;
  onPick: (part: CostumePart) => void;
}) {
  const { t } = i18n;
  const headingId = `costume-group-${id}`;
  return (
    <Box>
      <Typography
        id={headingId}
        component="h2"
        variant="overline"
        color="text.secondary"
        sx={{ px: 1.5 }}
      >
        {heading}
      </Typography>
      <Tabs
        orientation="vertical"
        value={parts.includes(shown) ? shown : false}
        aria-labelledby={headingId}
        onChange={(_event, part: CostumePart) => onPick(part)}
      >
        {parts.map((part) => (
          <Tab
            key={part}
            id={`costume-part-${part}`}
            value={part}
            label={t(PART_LABEL[part])}
            sx={ROW}
          />
        ))}
      </Tabs>
    </Box>
  );
}

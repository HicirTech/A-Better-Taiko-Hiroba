import type { MessageKey, Translator } from "@abth/i18n";
import { keyframes } from "@emotion/react";
import {
  Box,
  Button,
  ButtonBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useId, useState } from "react";

import type { EndedGroup, GroupKind, GroupNow, PipelineView } from "../pipelines";
import { GroupDetails } from "./group-details";
import { groupName } from "./operation-names";
import {
  BLOCKS,
  blockRow,
  ENDED_CELLS,
  endedKey,
  followed,
  type Picked,
  pickedNow,
} from "./pipeline-rows";

const KIND_COLOR: Readonly<Record<GroupKind, "info" | "secondary" | "warning">> = {
  read: "info",
  exclusive: "secondary",
  write: "warning",
};

const OUTCOME_MARK: Readonly<Record<EndedGroup["outcome"], string>> = {
  succeeded: "✓",
  failed: "✕",
  stopped: "⊘",
};

const OUTCOME_COLOR: Readonly<Record<EndedGroup["outcome"], string>> = {
  succeeded: "success.main",
  failed: "error.main",
  stopped: "text.disabled",
};

// A wash of the mark's own colour, lighter than the mark.
const MARK_WASH = "color-mix(in srgb, currentColor 18%, transparent)";

const BREATHE = keyframes`
  50% { opacity: 0.35; }
`;

const PUSH_IN = keyframes`
  from { transform: translateX(-100%); opacity: 0; }
`;

const ROW = {
  display: "grid",
  gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
  gap: 0.5,
  alignItems: "center",
} as const;

// The rows' places: an empty one is known by where it is.
const BLOCK_PLACES = Array.from({ length: BLOCKS }, (_, place) => `block-${place}`);
const ENDED_PLACES = Array.from({ length: ENDED_CELLS }, (_, place) => `ended-${place}`);

const SLOT = { height: 24, borderRadius: 0.5 } as const;
const EMPTY_SLOT = { ...SLOT, bgcolor: "action.hover" } as const;

const PICKED = { outline: "2px solid", outlineColor: "text.primary", outlineOffset: 1 } as const;

const secondsOf = (i18n: Translator, ms: number) => i18n.number(Math.round(ms / 100) / 10);

/** One pipeline: what runs and waits now, what ended, and the details of what is picked. */
export function PipelineSection({
  id,
  i18n,
  name,
  view,
  listed,
  onListed,
}: {
  readonly id: string;
  readonly i18n: Translator;
  readonly name: MessageKey;
  /** Null until the first read. */
  readonly view: PipelineView | null;
  /** Whether its whole kept history is listed. */
  readonly listed: boolean;
  readonly onListed: (listed: boolean) => void;
}) {
  const { t } = i18n;
  const headingId = useId();
  const listId = useId();
  const [picked, setPicked] = useState<Picked | null>(null);
  // A group picked while it ran goes on as the group it ended as.
  const following = view === null ? picked : followed(picked, view);
  if (following !== picked) {
    setPicked(following);
  }
  const pick = (next: Picked) => setPicked(same(picked, next) ? null : next);
  const row = blockRow(view ?? { running: [], waiting: [] });
  const ended = view?.ended ?? [];
  return (
    <Box component="section" id={id} aria-labelledby={headingId} sx={{ px: 2, py: 1.5 }}>
      <Typography id={headingId} variant="subtitle1" component="h2" sx={{ fontWeight: 500, mb: 1 }}>
        {t(name)}
      </Typography>
      <Box role="group" aria-label={t("pipelines.now")} sx={ROW}>
        {BLOCK_PLACES.map((place, index) => {
          const group = row.groups[index];
          return group === undefined ? (
            <Box key={place} sx={EMPTY_SLOT} />
          ) : (
            <Block
              key={group.id}
              i18n={i18n}
              group={group}
              more={row.more && index === BLOCKS - 1}
              picked={picked?.kind === "now" && picked.id === group.id}
              onPick={() => pick(pickedNow(group))}
            />
          );
        })}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ gridColumn: "span 2", textAlign: "end" }}
        >
          {t("pipelines.waiting", { count: i18n.number(row.waiting) })}
        </Typography>
      </Box>
      <Box role="group" aria-label={t("pipelines.ended")} sx={{ ...ROW, mt: 1 }}>
        {ENDED_PLACES.map((place, index) => {
          const group = ended[index];
          return group === undefined ? (
            <Box key={place} sx={EMPTY_SLOT} />
          ) : (
            <EndedCell
              key={endedKey(group)}
              i18n={i18n}
              group={group}
              picked={picked?.kind === "ended" && endedKey(picked.group) === endedKey(group)}
              onPick={() => pick({ kind: "ended", group })}
            />
          );
        })}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", mt: 0.5 }}>
        <Button
          size="small"
          sx={{ ml: "auto" }}
          aria-expanded={listed}
          aria-controls={listId}
          onClick={() => onListed(!listed)}
        >
          {t(listed ? "pipelines.less" : "pipelines.more")}
        </Button>
      </Box>
      {listed && (
        <List id={listId} dense disablePadding sx={{ maxHeight: 360, overflowY: "auto" }}>
          {ended.map((group) => (
            <ListItemButton
              key={endedKey(group)}
              selected={picked?.kind === "ended" && endedKey(picked.group) === endedKey(group)}
              onClick={() => pick({ kind: "ended", group })}
            >
              <ListItemIcon sx={{ minWidth: 32, color: OUTCOME_COLOR[group.outcome] }}>
                <span aria-hidden>{OUTCOME_MARK[group.outcome]}</span>
              </ListItemIcon>
              <ListItemText
                primary={`${groupName(i18n, group)} · ${t(`pipelines.${group.outcome}`)}`}
                secondary={`${i18n.time(group.startedAt)} · ${t("pipelines.took", {
                  seconds: secondsOf(i18n, group.endedAt - group.startedAt),
                })}`}
              />
            </ListItemButton>
          ))}
        </List>
      )}
      {picked !== null && view !== null && (
        <GroupDetails id={`${id}-details`} i18n={i18n} picked={picked} view={view} />
      )}
    </Box>
  );
}

const same = (one: Picked | null, other: Picked) =>
  one !== null &&
  (one.kind === "now"
    ? other.kind === "now" && one.id === other.id
    : other.kind === "ended" && endedKey(one.group) === endedKey(other.group));

function Block({
  i18n,
  group,
  more,
  picked,
  onPick,
}: {
  readonly i18n: Translator;
  readonly group: GroupNow;
  /** It also stands for the groups past the last block. */
  readonly more: boolean;
  readonly picked: boolean;
  readonly onPick: () => void;
}) {
  const { t } = i18n;
  const color = KIND_COLOR[group.kind];
  const running = group.startedAt !== null;
  const state = running
    ? t("pipelines.running", { seconds: secondsOf(i18n, Date.now() - (group.startedAt ?? 0)) })
    : t("pipelines.queued", { seconds: secondsOf(i18n, Date.now() - group.askedAt) });
  return (
    <ButtonBase
      aria-label={`${groupName(i18n, group)} · ${t(`pipelines.${group.kind}`)} · ${state}`}
      aria-pressed={picked}
      onClick={onPick}
      sx={(theme) => ({
        ...SLOT,
        color: "common.white",
        typography: "caption",
        bgcolor: running ? theme.palette[color].main : alpha(theme.palette[color].main, 0.3),
        ...(picked ? PICKED : {}),
        ...(more
          ? {
              animation: `${BREATHE} 1.6s ease-in-out infinite`,
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            }
          : {}),
      })}
    >
      {more ? <span aria-hidden>+</span> : null}
    </ButtonBase>
  );
}

function EndedCell({
  i18n,
  group,
  picked,
  onPick,
}: {
  readonly i18n: Translator;
  readonly group: EndedGroup;
  readonly picked: boolean;
  readonly onPick: () => void;
}) {
  const { t } = i18n;
  return (
    <ButtonBase
      aria-label={`${groupName(i18n, group)} · ${t(`pipelines.${group.outcome}`)}`}
      aria-pressed={picked}
      onClick={onPick}
      sx={{
        ...SLOT,
        bgcolor: MARK_WASH,
        color: OUTCOME_COLOR[group.outcome],
        fontWeight: 700,
        // The newest pushes in from the left, as the older ones move along.
        animation: `${PUSH_IN} 200ms ease-out`,
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        ...(picked ? PICKED : {}),
      }}
    >
      <span aria-hidden>{OUTCOME_MARK[group.outcome]}</span>
    </ButtonBase>
  );
}

import type { Translator } from "@abth/i18n";
import { Box, Typography } from "@mui/material";

import type { EndedGroup, GroupNow, PipelineView, SentRequest } from "../pipelines";
import { operationName } from "./operation-names";
import type { Picked } from "./pipeline-rows";

/** Milliseconds as seconds to the tenth, as the locale writes them. */
const secondsOf = (i18n: Translator, ms: number) => i18n.number(Math.round(ms / 100) / 10);

const requestOf = (request: SentRequest) => `${request.method} ${request.path}`;

/** What the page tells of the picked group, under its section. */
export function GroupDetails({
  i18n,
  picked,
  view,
}: {
  readonly i18n: Translator;
  readonly picked: Picked;
  readonly view: PipelineView;
}) {
  const lines =
    picked.kind === "ended"
      ? endedLines(i18n, picked.group)
      : nowLines(
          i18n,
          [...view.running, ...view.waiting].find((group) => group.id === picked.id),
        );
  if (lines === null) {
    return null;
  }
  return (
    <Box sx={{ mt: 1.5, px: 1.5, py: 1, borderRadius: 1, bgcolor: "action.hover" }}>
      {lines.map((line, index) => (
        <Typography
          key={line}
          variant={index === 0 ? "body2" : "caption"}
          component="p"
          sx={index === 0 ? { fontWeight: 500 } : { color: "text.secondary" }}
        >
          {line}
        </Typography>
      ))}
    </Box>
  );
}

function nowLines(i18n: Translator, group: GroupNow | undefined): string[] | null {
  if (group === undefined) {
    return null;
  }
  const { t } = i18n;
  const elapsed =
    group.startedAt === null
      ? t("pipelines.queued", { seconds: secondsOf(i18n, Date.now() - group.askedAt) })
      : t("pipelines.running", { seconds: secondsOf(i18n, Date.now() - group.startedAt) });
  const last = group.sent.at(-1);
  if (last === undefined) {
    return [`${operationName(i18n, group.operation)} · ${elapsed}`];
  }
  const where = { index: group.sent.length, request: requestOf(last) };
  return [
    `${operationName(i18n, group.operation)} · ${elapsed}`,
    group.expectedRequests === null
      ? t("pipelines.onRequest", where)
      : t("pipelines.onRequestOf", { ...where, total: group.expectedRequests }),
  ];
}

function endedLines(i18n: Translator, group: EndedGroup): string[] {
  const { t } = i18n;
  const outcome = t(`pipelines.${group.outcome}`);
  const facts = [
    t("pipelines.startedAt", { time: i18n.time(group.startedAt) }),
    t("pipelines.took", { seconds: secondsOf(i18n, group.endedAt - group.startedAt) }),
    t("pipelines.requests", { count: i18n.number(group.requests) }),
  ].join(" · ");
  const head = `${operationName(i18n, group.operation)} · ${outcome}`;
  if (group.outcome === "succeeded") {
    return [head, facts];
  }
  const where =
    group.at === null
      ? t("pipelines.noRequest")
      : t(group.outcome === "stopped" ? "pipelines.stoppedAfter" : "pipelines.failedAt", {
          index: group.at.index,
          request: requestOf(group.at.request),
        });
  return [head, facts, where, t("pipelines.code", { code: group.code })];
}

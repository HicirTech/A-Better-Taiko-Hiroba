import type { Translator } from "@abth/i18n";
import { Divider, Paper } from "@mui/material";
import { useState } from "react";

import { KEPT_GROUPS } from "../pipelines";
import type { HirobaSessionPort } from "../session-port";
import { ENDED_CELLS } from "./pipeline-rows";
import { PipelineSection } from "./pipeline-section";
import { usePipelinesView } from "./use-pipelines-view";

type SectionName = "io" | "external";

/** The pipelines, a section each, as the settings page lays out its own. */
export function PipelinesPage({
  port,
  i18n,
}: {
  readonly port: Pick<HirobaSessionPort, "readPipelines">;
  readonly i18n: Translator;
}) {
  const [listed, setListed] = useState<ReadonlySet<SectionName>>(new Set());
  // The whole kept history is read only while a section lists it.
  const view = usePipelinesView(port, listed.size === 0 ? ENDED_CELLS : KEPT_GROUPS);
  const list = (section: SectionName) => (open: boolean) =>
    setListed((now) => {
      const next = new Set(now);
      if (open) {
        next.add(section);
      } else {
        next.delete(section);
      }
      return next;
    });
  return (
    <Paper variant="outlined">
      <PipelineSection
        i18n={i18n}
        name="pipelines.io"
        pictures="pipelines.pictures"
        view={view?.io ?? null}
        listed={listed.has("io")}
        onListed={list("io")}
      />
      <Divider />
      <PipelineSection
        i18n={i18n}
        name="pipelines.external"
        view={view?.external ?? null}
        listed={listed.has("external")}
        onListed={list("external")}
      />
    </Paper>
  );
}

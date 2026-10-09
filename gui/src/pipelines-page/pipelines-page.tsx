import type { MessageKey, Translator } from "@abth/i18n";
import { Box, Divider, Paper, Typography } from "@mui/material";
import { useId } from "react";

/** The pipelines, a section each, as the settings page lays out its own. */
export function PipelinesPage({ i18n }: { readonly i18n: Translator }) {
  return (
    <Paper variant="outlined">
      <PipelineSection i18n={i18n} name="pipelines.io" />
      <Divider />
      <PipelineSection i18n={i18n} name="pipelines.external" />
    </Paper>
  );
}

function PipelineSection({ i18n, name }: { readonly i18n: Translator; readonly name: MessageKey }) {
  const headingId = useId();
  return (
    <Box component="section" aria-labelledby={headingId} sx={{ px: 2, py: 1.5 }}>
      <Typography id={headingId} variant="subtitle1" component="h2" sx={{ fontWeight: 500 }}>
        {i18n.t(name)}
      </Typography>
    </Box>
  );
}

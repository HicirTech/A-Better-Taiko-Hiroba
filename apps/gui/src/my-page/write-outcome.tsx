import type { Translator } from "@abth/i18n";
import { Alert, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";

import { HIROBA_LANG } from "../language/show-language";
import type { WriteKind, WriteSets } from "../session-port";
import { type Cell, describeOutcome } from "./outcome-words";
import type { Noticed } from "./write-ending";

/** A cell's `lang`: Hiroba's own words are Japanese whatever language the page is in. */
const langOf = ({ hirobas }: Cell) => (hirobas === true ? HIROBA_LANG : undefined);

export function WriteOutcomeNotice<K extends WriteKind>({
  outcome,
  kind,
  i18n,
  asUndo = false,
  id = "write-outcome",
}: {
  outcome: Noticed<WriteSets[K]>;
  kind: K;
  i18n: Translator;
  asUndo?: boolean;
  id?: string;
}) {
  const { t } = i18n;
  const { severity, message, notes, codes, comparison } = describeOutcome(outcome, i18n, {
    kind,
    asUndo,
  });
  return (
    <Alert id={id} severity={severity} data-outcome={outcome.kind}>
      <Typography variant="body2">{message}</Typography>
      {notes.map((note) => (
        <Typography key={note} variant="body2" sx={{ mt: 0.5 }}>
          {note}
        </Typography>
      ))}
      {codes.map((code) => (
        <Typography
          key={code}
          variant="body2"
          sx={{ mt: 0.5, fontFamily: "monospace", userSelect: "text", wordBreak: "break-all" }}
        >
          {t("write.code", { code })}
        </Typography>
      ))}
      {comparison !== null && comparison.rows.length > 0 && (
        <Table id={`${id}-comparison`} size="small" sx={{ mt: 1 }}>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>{t("write.before")}</TableCell>
              <TableCell>{t("write.planned")}</TableCell>
              {comparison.withNow && <TableCell>{t("write.now")}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {comparison.rows.map((row) => (
              <TableRow key={row.label.text}>
                <TableCell lang={langOf(row.label)}>{row.label.text}</TableCell>
                <TableCell lang={langOf(row.before)}>{row.before.text}</TableCell>
                <TableCell lang={langOf(row.planned)}>{row.planned.text}</TableCell>
                {row.now !== null && <TableCell lang={langOf(row.now)}>{row.now.text}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Alert>
  );
}

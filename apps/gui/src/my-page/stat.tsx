import { Box, Typography } from "@mui/material";

/** One labelled count on a card: the label small above, the number below it. */
export function Stat({
  id,
  label,
  value,
  locale,
}: {
  id: string;
  label: string;
  value: number;
  locale: string;
}) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography id={id} variant="h6" component="p">
        {value.toLocaleString(locale)}
      </Typography>
    </Box>
  );
}

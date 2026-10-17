import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

/** Icons in a grid, each over its name: the names as the code calls them. */
export function IconGrid({ icons }: { readonly icons: readonly (readonly [string, ReactNode])[] }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 2,
        maxWidth: 900,
      }}
    >
      {icons.map(([name, icon]) => (
        <Box
          key={name}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            p: 1.5,
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          {icon}
          <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
            {name}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

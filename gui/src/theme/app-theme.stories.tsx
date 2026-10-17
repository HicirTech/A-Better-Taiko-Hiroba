import { Box, Stack, Typography, useTheme } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { DIFFICULTY_COLOUR, GENRE_COLOUR } from "../favorites/genre-look";
import { CROWN_COLOUR, RANK_COLOUR, UNCLEARED_COLOUR } from "../my-page/panel-colours";

/** Colours in rows of swatches, each under the name the code gives it. */
function Swatches({
  title,
  colours,
}: {
  title: string;
  colours: Readonly<Record<string, string>>;
}) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
        {Object.entries(colours).map(([name, colour]) => (
          <Box key={name} sx={{ width: 120 }}>
            <Box
              sx={{
                height: 40,
                borderRadius: 1,
                border: 1,
                borderColor: "divider",
                background: colour,
              }}
            />
            <Typography variant="caption" sx={{ display: "block", fontFamily: "monospace" }}>
              {name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", fontFamily: "monospace", wordBreak: "break-all" }}
            >
              {colour}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** The theme's palette in the mode shown, and the game's own colours, which no theme changes. */
function Colours() {
  const { palette } = useTheme();
  return (
    <Stack spacing={3}>
      <Swatches
        title="Theme"
        colours={{
          "primary.main": palette.primary.main,
          "secondary.main": palette.secondary.main,
          "error.main": palette.error.main,
          "warning.main": palette.warning.main,
          "info.main": palette.info.main,
          "success.main": palette.success.main,
          "text.primary": palette.text.primary,
          "text.secondary": palette.text.secondary,
          "background.default": palette.background.default,
          "background.paper": palette.background.paper,
          divider: palette.divider,
          "action.hover": palette.action.hover,
        }}
      />
      <Swatches title="GENRE_COLOUR" colours={GENRE_COLOUR} />
      <Swatches title="DIFFICULTY_COLOUR" colours={DIFFICULTY_COLOUR} />
      <Swatches title="RANK_COLOUR" colours={RANK_COLOUR} />
      <Swatches title="CROWN_COLOUR" colours={CROWN_COLOUR} />
      <Swatches title="UNCLEARED_COLOUR" colours={UNCLEARED_COLOUR} />
    </Stack>
  );
}

const TYPE_VARIANTS = ["h6", "subtitle1", "subtitle2", "body1", "body2", "caption"] as const;

const meta = {
  title: "Foundations/Theme",
  tags: ["theme"],
  render: () => <Colours />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The theme's palette and the colours the code keeps for the game's own data. */
export const Palette: Story = {};

/** The type variants the pages use, in the theme's font. */
export const Type: Story = {
  render: () => (
    <Stack spacing={1.5}>
      {TYPE_VARIANTS.map((variant) => (
        <Typography key={variant} variant={variant}>
          {variant}: 太鼓の達人 Taiko no Tatsujin 太鼓达人 1234567890
        </Typography>
      ))}
    </Stack>
  ),
};

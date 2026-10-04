import type { TitleOption } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Autocomplete, Box, Chip, TextField, Typography } from "@mui/material";
import { useMemo } from "react";

import { HIROBA_LANG } from "../language/show-language";
import type { TitleState } from "../session-port";
import { currentOptions, filterTitles } from "./title-options";

export interface TitlePickerProps {
  readonly options: readonly TitleOption[];
  readonly picked: TitleOption | null;
  readonly worn: TitleState;
  readonly busy: boolean;
  readonly onPick: (option: TitleOption | null) => void;
  readonly i18n: Translator;
}

export function TitlePicker({ options, picked, worn, busy, onPick, i18n }: TitlePickerProps) {
  const { t } = i18n;
  const current = useMemo(() => currentOptions(options, worn), [options, worn]);
  return (
    <Autocomplete
      id="title-pick"
      options={options}
      value={picked}
      disabled={busy}
      onChange={(_event, option) => onPick(option)}
      getOptionLabel={(option) => option.label}
      // Keyed by id: MUI keys by label otherwise, so two titles of one name would share a key and
      // leave stray rows once the list is searched.
      getOptionKey={(option) => option.id}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      filterOptions={(all, { inputValue }) => [...filterTitles(all, inputValue)]}
      noOptionsText={t("title.noMatch")}
      openText={t("title.open")}
      closeText={t("title.close")}
      clearText={t("title.clear")}
      renderInput={(params) => (
        <TextField
          {...params}
          label={t("title.pick")}
          slotProps={{
            ...params.slotProps,
            htmlInput: { ...params.slotProps.htmlInput, lang: HIROBA_LANG },
          }}
        />
      )}
      renderOption={(props, option) => {
        const { key, ...rest } = props;
        return (
          <li key={key} {...rest} data-title-id={option.id}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: 1 }}>
              <Typography component="span" lang={HIROBA_LANG} sx={{ flexGrow: 1 }}>
                {option.label}
              </Typography>
              {current.has(option.id) && <Chip size="small" label={t("title.current")} />}
            </Box>
          </li>
        );
      }}
    />
  );
}

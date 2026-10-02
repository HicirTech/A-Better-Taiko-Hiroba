import type { TitleOption } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Autocomplete, Box, Chip, TextField, Typography } from "@mui/material";
import { useMemo } from "react";

import { HIROBA_LANG } from "../language/show-language";
import type { TitleState } from "../session-port";
import { currentOptions, filterTitles, repeatedOptions } from "./title-options";

export interface TitlePickerProps {
  readonly options: readonly TitleOption[];
  /** The title picked, or null while none is. */
  readonly picked: TitleOption | null;
  /** The title worn, whose option or options carry a "Current" chip. */
  readonly worn: TitleState;
  /** A write is on its way: nothing is picked meanwhile. */
  readonly busy: boolean;
  readonly onPick: (option: TitleOption | null) => void;
  readonly i18n: Translator;
}

/**
 * The titles the account owns, to pick one from: a box that searches them as it is typed in (the
 * list is long), each option written as Hiroba writes it. The option or options that read as the
 * title worn are marked Current; a name that two or more titles have is told apart by its number,
 * and no other is shown one, as Hiroba shows none. An option is keyed by its id: MUI keys it by its
 * label otherwise, and two titles of one name would get one key, which leaves stray rows in the list
 * once it is searched.
 */
export function TitlePicker({ options, picked, worn, busy, onPick, i18n }: TitlePickerProps) {
  const { t } = i18n;
  const current = useMemo(() => currentOptions(options, worn), [options, worn]);
  const repeated = useMemo(() => repeatedOptions(options), [options]);
  return (
    <Autocomplete
      id="title-pick"
      options={options}
      value={picked}
      disabled={busy}
      onChange={(_event, option) => onPick(option)}
      getOptionLabel={(option) => option.label}
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
              {repeated.has(option.id) && (
                <Typography component="span" variant="body2" color="text.secondary">
                  {t("costume.id", { id: option.id })}
                </Typography>
              )}
              {current.has(option.id) && <Chip size="small" label={t("title.current")} />}
            </Box>
          </li>
        );
      }}
    />
  );
}

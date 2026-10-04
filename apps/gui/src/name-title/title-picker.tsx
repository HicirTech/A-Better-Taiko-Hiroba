import { spaced, type TitleOption } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Autocomplete, Box, Chip, TextField, Typography } from "@mui/material";
import { type ReactNode, useMemo } from "react";

import { HIROBA_LANG } from "../language/show-language";
import { FailureText } from "../my-page/editor-parts";
import { FAILURE_MESSAGE } from "../read-failure-message";
import type { TitleList } from "./title-editor-state";
import { currentOptions, filterTitles } from "./title-options";

/** The id of the option that stands for the title worn: no title of the list has it. */
const WORN_ID = -1;
const NOT_LISTED: readonly TitleOption[] = [];

export interface TitlePickerProps {
  /** The title worn, as my page shows it: "" when none. */
  readonly worn: string;
  readonly picked: TitleOption | null;
  readonly list: TitleList;
  readonly busy: boolean;
  /** The picker opens: the list is read then, if it is not already. */
  readonly onOpen: () => void;
  readonly onPick: (option: TitleOption | null) => void;
  readonly i18n: Translator;
}

export function TitlePicker({ worn, picked, list, busy, onOpen, onPick, i18n }: TitlePickerProps) {
  const { t } = i18n;
  const listed = list.name === "read" ? list.options : NOT_LISTED;
  const current = useMemo(() => currentOptions(listed, { title: worn }), [listed, worn]);
  // The select shows the title worn until another is picked.
  const wornOption = useMemo<TitleOption | null>(
    () => (spaced(worn) === "" ? null : { id: WORN_ID, label: worn }),
    [worn],
  );
  // MUI wants its value among its options, so the title worn and the pick are in them, unlisted.
  const options = useMemo(
    () => [
      ...[wornOption, picked].filter(
        (one): one is TitleOption => one !== null && !listed.some((own) => own.id === one.id),
      ),
      ...listed,
    ],
    [wornOption, picked, listed],
  );
  return (
    <Autocomplete
      id="title-pick"
      options={options}
      value={picked ?? wornOption}
      disabled={busy}
      disableClearable={picked === null}
      loading={list.name === "unread" || list.name === "loading"}
      loadingText={t("title.reading")}
      onOpen={onOpen}
      onChange={(_event, option) => onPick(option)}
      getOptionLabel={(option) => option.label}
      // Keyed by id: MUI keys by label otherwise, so two titles of one name would share a key and
      // leave stray rows once the list is searched.
      getOptionKey={(option) => option.id}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      filterOptions={(_all, { inputValue }) => [...filterTitles(listed, inputValue)]}
      noOptionsText={
        list.name === "failed"
          ? t(FAILURE_MESSAGE[list.failure.kind])
          : t(listed.length === 0 ? "title.none" : "title.noMatch")
      }
      openText={t("title.open")}
      closeText={t("title.close")}
      clearText={t("title.clear")}
      renderInput={(params) => (
        <TextField
          {...params}
          label={t("title.heading")}
          placeholder={wornOption === null ? t("profile.noTitle") : undefined}
          error={list.name === "failed"}
          helperText={noteOf(list, current.size, worn, i18n)}
          slotProps={{
            ...params.slotProps,
            htmlInput: { ...params.slotProps.htmlInput, lang: HIROBA_LANG },
            inputLabel: { ...params.slotProps.inputLabel, shrink: true },
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

// What the list says of the title worn, under the select: several titles of its name, or none.
function noteOf(
  list: TitleList,
  matches: number,
  worn: string,
  i18n: Translator,
): ReactNode | undefined {
  switch (list.name) {
    case "failed":
      return <FailureText failure={list.failure} i18n={i18n} />;
    case "read":
      if (matches > 1) {
        return i18n.t("title.shared", { count: matches });
      }
      return matches === 0 && spaced(worn) !== "" ? i18n.t("title.notListed") : undefined;
    default:
      return undefined;
  }
}

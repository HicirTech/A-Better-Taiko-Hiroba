import { SvgIcon, type SvgIconProps } from "@mui/material";

// Material's "list", "close", "check", "add", "drag_indicator", "delete" and "arrow_drop_down"
// icons (Apache 2.0), inline because the icons package is not a dependency.

export function SetsIcon() {
  return (
    <SvgIcon aria-hidden>
      <path d="M3 13h2v-2H3zm0 4h2v-2H3zm0-8h2V7H3zm4 4h14v-2H7zm0 4h14v-2H7zM7 7v2h14V7z" />
    </SvgIcon>
  );
}

export function CloseIcon() {
  return (
    <SvgIcon aria-hidden fontSize="small">
      <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </SvgIcon>
  );
}

/** Named for a screen reader through `titleAccess`, as a mark that stands for words. */
export function CheckIcon(props: SvgIconProps) {
  return (
    <SvgIcon fontSize="small" {...props}>
      <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </SvgIcon>
  );
}

export function AddIcon() {
  return (
    <SvgIcon aria-hidden>
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
    </SvgIcon>
  );
}

export function DragHandleIcon() {
  return (
    <SvgIcon aria-hidden fontSize="small">
      <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2m-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2m0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2" />
    </SvgIcon>
  );
}

export function DeleteIcon() {
  return (
    <SvgIcon aria-hidden fontSize="small">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z" />
    </SvgIcon>
  );
}

export function ArrowDropDownIcon() {
  return (
    <SvgIcon aria-hidden fontSize="small">
      <path d="m7 10 5 5 5-5z" />
    </SvgIcon>
  );
}

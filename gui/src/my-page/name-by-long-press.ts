import type { SystemToast } from "../platform/system-toast";

/** What a long-press does to name an item: the shell's Toast says it. Null where a tooltip does. */
export function nameByLongPress(name: string, toast: SystemToast | undefined): (() => void) | null {
  return toast === undefined ? null : () => toast.show(name);
}

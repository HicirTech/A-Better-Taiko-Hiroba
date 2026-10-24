import type { Translator } from "@abth/i18n";

import { ReadFailureAlert } from "./read-failure-alert";

/** A page that threw as it drew, said in its place, while the navigation still works. */
export function PageCrash({ code, i18n }: { readonly code: string; readonly i18n: Translator }) {
  return (
    <ReadFailureAlert
      id="page-crash"
      message={i18n.t("crash.page")}
      code={code}
      codeId="page-crash-code"
      mayClear={false}
      i18n={i18n}
    />
  );
}

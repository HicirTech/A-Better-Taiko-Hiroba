import { LoadFailed } from "../ui/read-failure-alert";
import type { PageData } from "./page";

/** A read again of my page that failed, standing over what the page read before. */
export function MyPageFailure({ data }: { readonly data: PageData }) {
  const { screen, myPage } = data.session;
  if (screen.name !== "profile" || myPage.failure === null) {
    return null;
  }
  return (
    <LoadFailed
      id="read-failure"
      failure={myPage.failure}
      codeId="failure-detail"
      i18n={data.i18n}
    />
  );
}

/** The desktop window's content as it opens: the Overview's height at its width, no scrollbar. */
export const WINDOW_CONTENT_PX = { width: 946, height: 736 } as const;

/** What the window's page is loaded again with after its process ended, before the reason. */
export const PAGE_GONE_FRAGMENT = "page-gone=";

/** Why the page's process ended, when the window was loaded again for it; otherwise null. */
export function pageGoneReasonOf(hash: string): string | null {
  const marker = `#${PAGE_GONE_FRAGMENT}`;
  return hash.startsWith(marker) ? hash.slice(marker.length) : null;
}

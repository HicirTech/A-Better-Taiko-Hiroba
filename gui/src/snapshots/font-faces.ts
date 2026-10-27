/** A `url(...)` in CSS, its address quoted or not. */
const URL_IN_CSS = /url\((["']?)([^"')]+)\1\)/g;

/** A font face's CSS with each file it names read, resolved against `base`, into a `data:` URL. */
export async function inlinedFontFace(
  cssText: string,
  base: string,
  read: (url: string) => Promise<string>,
): Promise<string> {
  const reads = new Map<string, Promise<string>>();
  for (const [, , url] of cssText.matchAll(URL_IN_CSS)) {
    if (url !== undefined && !url.startsWith("data:") && !reads.has(url)) {
      reads.set(url, read(new URL(url, base).href));
    }
  }
  const inlined = new Map(
    await Promise.all([...reads].map(async ([url, data]) => [url, await data] as const)),
  );
  return cssText.replace(URL_IN_CSS, (whole, _quote: string, url: string) => {
    const data = inlined.get(url);
    return data === undefined ? whole : `url(${data})`;
  });
}

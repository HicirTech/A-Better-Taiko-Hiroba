const IOS_VERSION = /OS (\d+)_(\d+)/;

/** What Safari sends on this device: WKWebView leaves out the product tokens Hiroba looks for. */
export function safariUserAgent(webView: string): string {
  const version = IOS_VERSION.exec(webView);
  if (version === null) {
    return webView;
  }
  const withVersion = webView.replace(" Mobile/", ` Version/${version[1]}.${version[2]} Mobile/`);
  return `${withVersion} Safari/604.1`;
}

import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { app, net, protocol } from "electron";

export const APP_ORIGIN = "app://gui";

// MUI injects <style> elements, hence 'unsafe-inline' for styles only. The page fetches nothing:
// every request to Hiroba goes through the main process.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

/** Must run before the app is ready. */
export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
  ]);
}

export function serveWebBundle(): void {
  const root = join(app.getAppPath(), "out", "web");
  protocol.handle("app", async (request) => {
    const { host, pathname } = new URL(request.url);
    const file = join(root, pathname === "/" ? "index.html" : decodeURIComponent(pathname));
    const inside = relative(root, file);
    if (`app://${host}` !== APP_ORIGIN || inside.startsWith(`..${sep}`) || inside === "..") {
      return new Response(null, { status: 404 });
    }
    const response = await net.fetch(pathToFileURL(file).toString());
    const headers = new Headers(response.headers);
    headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
    return new Response(response.body, { status: response.status, headers });
  });
}

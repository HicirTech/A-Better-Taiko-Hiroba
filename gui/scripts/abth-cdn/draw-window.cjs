// Draws ABTH CDN's charts in a hidden window: build.ts hands it a folder with the drawing page and
// a work list of chart files to read where they lie, and takes the PNGs it writes.
// Usage: electron draw-window.cjs <page folder> <work.json> <png folder>
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const [pageFolder, workFile, pngFolder] = process.argv.slice(2);

// A CI runner gives Chromium's sandbox no room, and the page runs only build.ts's own bundle.
app.commandLine.appendSwitch("no-sandbox");

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    width: 1200,
    height: 900,
    webPreferences: { backgroundThrottling: false },
  });
  await window.loadFile(path.join(pageFolder, "page.html"));
  const { difficulties, songs } = JSON.parse(fs.readFileSync(workFile, "utf8"));
  fs.mkdirSync(pngFolder, { recursive: true });
  let drawn = 0;
  for (const { songNo, file } of songs) {
    // Read as the apps read it, into memory only.
    const tja = new TextDecoder("utf-8").decode(fs.readFileSync(file));
    const pngs = await window.webContents.executeJavaScript(`drawAll(${JSON.stringify(tja)})`);
    pngs.forEach((png, index) => {
      if (png !== null) {
        const name = `${songNo}-${difficulties[index]}.png`;
        fs.writeFileSync(path.join(pngFolder, name), Buffer.from(png, "base64"));
        drawn += 1;
      }
    });
  }
  process.stdout.write(`drew ${drawn} charts of ${songs.length} songs\n`);
  app.quit();
});

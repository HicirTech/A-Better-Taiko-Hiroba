// ABTH CDN's drawing window: draws each chart of build.ts's work list into a PNG, read in place.
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const [pageFolder, workFile, pngFolder] = process.argv.slice(2);

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
  for (const [at, { songNo, file }] of songs.entries()) {
    const place = `song ${at + 1} of ${songs.length}`;
    // Read as the apps read it, into memory only.
    const tja = new TextDecoder("utf-8").decode(fs.readFileSync(file));
    const pngs = await window.webContents.executeJavaScript(`drawAll(${JSON.stringify(tja)})`);
    pngs.forEach((png, index) => {
      if (png !== null) {
        const name = `${songNo}-${difficulties[index]}.png`;
        fs.writeFileSync(path.join(pngFolder, name), Buffer.from(png, "base64"));
        drawn += 1;
        process.stdout.write(`drew ${songNo}/${difficulties[index]}, ${place}\n`);
      }
    });
  }
  process.stdout.write(`drew ${drawn} charts of ${songs.length} songs\n`);
  app.quit();
});

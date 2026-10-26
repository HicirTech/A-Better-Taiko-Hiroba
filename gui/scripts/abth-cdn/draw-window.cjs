// ABTH CDN's drawing window: draws each chart of build.ts's work list into a PNG, read in place.
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const [pageFolder, workFile, pngFolder] = process.argv.slice(2);
/** A song whose charts take longer is left out, so no chart can hold up the build. */
const SONG_TIMEOUT_MS = 60_000;

async function drawingWindow() {
  const window = new BrowserWindow({
    show: false,
    width: 1200,
    height: 900,
    webPreferences: { backgroundThrottling: false },
  });
  await window.loadFile(path.join(pageFolder, "page.html"));
  return window;
}

/** The song's drawings, or why it has none: no answer in time, or a page that failed. */
async function drawSong(window, tja) {
  let timer;
  const late = new Promise((resolve) => {
    const failed = `no answer in ${SONG_TIMEOUT_MS / 1000} s`;
    timer = setTimeout(() => resolve({ failed }), SONG_TIMEOUT_MS);
  });
  const drawing = window.webContents.executeJavaScript(`drawAll(${JSON.stringify(tja)})`).then(
    (pngs) => ({ pngs }),
    (error) => ({ failed: String(error) }),
  );
  const answer = await Promise.race([drawing, late]);
  clearTimeout(timer);
  return answer;
}

// A window that is replaced leaves none for a moment: the app quits only once the list is done.
app.on("window-all-closed", () => {});

app.whenReady().then(async () => {
  const { difficulties, songs } = JSON.parse(fs.readFileSync(workFile, "utf8"));
  fs.mkdirSync(pngFolder, { recursive: true });
  let window = await drawingWindow();
  const leftOut = [];
  let drawn = 0;
  for (const [at, { songNo, file }] of songs.entries()) {
    const place = `song ${at + 1} of ${songs.length}`;
    // Read as the apps read it, into memory only.
    const tja = new TextDecoder("utf-8").decode(fs.readFileSync(file));
    const answer = await drawSong(window, tja);
    if (answer.failed !== undefined) {
      process.stdout.write(`left out ${songNo}, ${place}: ${answer.failed}\n`);
      leftOut.push(songNo);
      // A page stuck in a chart answers nothing more: a new window draws the rest.
      window.destroy();
      window = await drawingWindow();
      continue;
    }
    answer.pngs.forEach((png, index) => {
      if (png !== null) {
        const name = `${songNo}-${difficulties[index]}.png`;
        fs.writeFileSync(path.join(pngFolder, name), Buffer.from(png, "base64"));
        drawn += 1;
        process.stdout.write(`drew ${songNo}/${difficulties[index]}, ${place}\n`);
      }
    });
  }
  fs.writeFileSync(path.join(pageFolder, "left-out.json"), JSON.stringify(leftOut));
  process.stdout.write(`drew ${drawn} charts of ${songs.length} songs\n`);
  app.quit();
});

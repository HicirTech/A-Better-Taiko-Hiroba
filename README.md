# A Better Taiko Hiroba

[中文](README.zh-CN.md)

A client-side toolkit for Donder Hiroba (donderhiroba.jp), the Japanese play-data site for Taiko no Tatsujin. It browses and changes your own play data — scores, profile, My Don, favourite songs, settings — from a desktop app, an Android app and, later, the command line, with an interface that stays out of your way. It runs on your own device and talks to Hiroba directly; none of your data passes through a server of ours.

## Download

Get the latest version from the [Releases page](https://github.com/HicirTech/A-Better-Taiko-Hiroba/releases/latest): an installer or a portable zip for Windows, and an APK for Android. The app tells you when a newer version is out.

## What it does

- [x] Sign in with your Bandai Namco ID and stay signed in
- [ ] Show every song at every difficulty: crowns, ranks, scores, hit counts, play options
- [x] Show your profile, My Don, title, dan rank, score counts and favourite songs
- [ ] Show your recent plays
- [x] Change your title
- [ ] Build your title part by part
- [x] Change your nickname
- [x] Change My Don's costumes and colours
- [x] Preview a costume before saving it, and go back to one you wore before
- [ ] Change your game settings
- [x] Change your favourite song and your favourites folder
- [x] Keep sets of favourite songs on your device, and swap the whole folder for one in a single save
- [x] Find songs by genre, difficulty and stars, and by part of a name in Japanese, English or Chinese, with the artists and each chart's star level
- [x] Look up any song from the Overview: its tempo, each chart's level and max combo, and pictures of its notes
- [ ] Browse offline, from a local database
- [ ] Hold several accounts at once
- [ ] Sync incrementally, and resume where it stopped
- [ ] Run on the command line
- [x] Run as a desktop app, on Windows
- [x] Run as an Android app
- [ ] Run as an iOS app — later
- [ ] Run as a web app — later
- [ ] Drive the same core from a script, through a programmatic API
- [x] Speak English, Japanese, Simplified Chinese and Traditional Chinese
- [x] Tell you when a newer version is out
- [ ] Upload your scores to Kinoko

## Honest notes

**Unofficial.** This project is not affiliated with, endorsed by, or connected to Bandai Namco Entertainment. Taiko no Tatsujin and Donder Hiroba are theirs.

**Polite by default.** Hiroba is someone else's service. Fetching is deliberately slow and incremental, and it backs off when the site pushes back. Fetching more is always something you ask for, never something that happens on its own.

**Song data from the community.** Artists, star levels and the songs' names in other languages come from [taiko.wiki](https://taiko.wiki/) and the Chinese [太鼓之達人維基](https://taiko.fandom.com/zh/) (its names are used under CC BY-SA). The app reads their public lists and sends them nothing of yours.

**Your account, your call.** The toolkit signs in as you and can change your real Taiko profile. The account it touches is yours, and so is the responsibility.

## More

- [Wiki](https://github.com/HicirTech/A-Better-Taiko-Hiroba/wiki) — how Donder Hiroba itself works: every page, every write endpoint with its real request and response, and what is still unknown

## License

[MIT](./LICENSE).

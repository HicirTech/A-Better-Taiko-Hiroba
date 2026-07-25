# A Better Taiko Hiroba

[中文](README.zh-CN.md)

A client-side toolkit for Donder Hiroba (donderhiroba.jp), the Japanese play-data site for Taiko no Tatsujin. It browses and changes your own play data — scores, profile, My Don, settings — from a desktop app, an Android app, or the command line, with an interface that stays out of your way. It runs on your own device and talks to Hiroba directly; none of your data passes through a server of ours.

## What it will do

- [ ] Sign in with your Bandai Namco ID and stay signed in
- [ ] Show every song at every difficulty: crowns, ranks, scores, hit counts, play options
- [ ] Show your profile, My Don, titles and dan ranks
- [ ] Show your recent plays
- [ ] Change your title, part by part
- [ ] Change your player name
- [ ] Change My Don's costumes and colours
- [ ] Change your game settings
- [ ] Change your favourite songs
- [ ] Preview every change, and undo it afterwards
- [ ] Browse offline, from a local database
- [ ] Hold several accounts at once
- [ ] Sync incrementally, and resume where it stopped
- [ ] Run on the command line
- [ ] Run as a desktop app
- [ ] Run as an Android app
- [ ] Run as an iOS app — later
- [ ] Run as a web app — later
- [ ] Drive the same core from a script, through a programmatic API
- [ ] Provide an i18n framework for translating the interface
- [ ] Upload your scores to Kinoko

## Honest notes

**Unofficial.** This project is not affiliated with, endorsed by, or connected to Bandai Namco Entertainment. Taiko no Tatsujin and Donder Hiroba are theirs.

**Polite by default.** Hiroba is someone else's service. Fetching is deliberately slow and incremental, and it backs off when the site pushes back. Fetching more is always something you ask for, never something that happens on its own.

**Your account, your call.** The toolkit signs in as you and can change your real Taiko profile. Every change shows you what it will do first and how to put it back — but the account it touches is yours, and so is the responsibility.

## More

- [Wiki](https://github.com/HicirTech/A-Better-Taiko-Hiroba/wiki) — how Donder Hiroba itself works: every page, every write endpoint with its real request and response, and what is still unknown

## License

[MIT](./LICENSE).

# A Better Taiko Hiroba

[中文](README.zh-CN.md)

A client-side toolkit for Donder Hiroba (donderhiroba.jp), the Japanese play-data site for Taiko
no Tatsujin. It browses and changes your own play data — scores, profile, My Don, settings — from
a desktop app, an Android app, or the command line, with an interface that stays out of your way.
It runs on your own device and talks to Hiroba directly; none of your data passes through a server
of ours.

## What it will do

Nothing below is checked yet. Each item gets its own documentation when it is built, on the branch
that builds it.

**See your play data**

- [ ] Sign in with your Bandai Namco ID and stay signed in
- [ ] Every song, every difficulty: crowns, ranks, scores, hit counts, play options
- [ ] Profile, My Don, titles, dan ranks
- [ ] Recent plays, without hunting through genre lists

**Change your Hiroba settings, more comfortably than the site allows**

- [ ] Title — including the part-by-part combinations
- [ ] Player name
- [ ] My Don: costumes and colours, with the rules the site enforces silently made visible
- [ ] Game settings
- [ ] Favourite songs, and the one song Hiroba shows as your favourite
- [ ] A preview before every change, and an undo after it

**Keep it on your device**

- [ ] A local database, so browsing works with no network at all
- [ ] Several accounts — one Bandai Namco ID can hold up to three cards
- [ ] Syncing that is incremental, budgeted and resumable, so a big account is not a big request

**Where it runs**

- [ ] Command-line client
- [ ] Desktop app
- [ ] Android app
- [ ] iOS app — later
- [ ] Web app — later, and the one target that may need a small server of its own
- [ ] A programmatic API, so scripts can drive the same core the apps do
- [ ] The interface in English, Japanese and Chinese

**Eventually**

- [ ] One-tap score upload to Kinoko — lowest priority; its API is a black box

## How it works

One headless core, thin frontends on top:

1. A **WebView** signs you in to Hiroba and hands over the session cookie.
2. A platform **transport** fetches Hiroba pages with that cookie. Desktop, Android and the CLI
   fetch directly. A browser cannot — same-origin rules stop it — which is why the web build is
   the one place a small server is allowed.
3. The **core** parses each page into records and stores them in SQLite.
4. A **sync engine** paces the fetching: a couple of requests at a time, spaced out, skipping what
   has not changed.

Data is keyed by Taiko number, so several accounts live side by side and stay browsable offline.
Session cookies go to per-platform secure storage, never into the database as plain text.

## Honest notes

**Unofficial.** This project is not affiliated with, endorsed by, or connected to Bandai Namco
Entertainment. Taiko no Tatsujin and Donder Hiroba are theirs.

**Polite by default.** Hiroba is someone else's service. Fetching is deliberately slow and
incremental, and it backs off when the site pushes back. Fetching more is always something you ask
for, never something that happens on its own.

**Your account, your call.** The toolkit signs in as you and can change your real Taiko profile.
Every change shows you what it will do first and how to put it back — but the account it touches
is yours, and so is the responsibility.

## Layout

```text
packages/core   Headless core: domain models; Hiroba constants and URL builders; fetch pacing;
                parsers; a bun:sqlite store behind the Storage / Transport / SecureCredentials
                interfaces.
packages/i18n   Translation catalogs (en / ja / zh) and a small translator runtime.
apps/cli        Bun CLI.
```

## Conventions

- Source is English only, identifiers and comments alike. Every user-facing string lives in
  `packages/i18n` as a key.
- Code follows the `tim-style-code` standard; prose follows `plainspoken-docs`.
- Commits follow Conventional Commits: atomic, one concern each, a one-line subject.

## Develop

Requires [Bun](https://bun.sh) 1.3 or newer.

```bash
bun install
bun test
bun run typecheck
```

## More

- [ROADMAP.md](./ROADMAP.md) — the milestones behind the checklist above, and the order they come in
- [CONTRIBUTING.md](./CONTRIBUTING.md) — branches, commits, pull requests, ticket formats
- [Wiki](https://github.com/HicirTech/A-Better-Taiko-Hiroba/wiki) — how Donder Hiroba itself works:
  every page, every write endpoint with its real request and response, and what is still unknown
- [Issues](https://github.com/HicirTech/A-Better-Taiko-Hiroba/issues) — the authority on scope

## License

[MIT](./LICENSE).

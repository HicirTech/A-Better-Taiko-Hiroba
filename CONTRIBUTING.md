# Contributing

How we branch, commit, open pull requests, and write tickets on A Better Taiko Hiroba. These
rules are enforced by review; a pull request that breaks one is sent back.

The engineering standard for all code is `tim-style-code`. User-facing and ticket prose follows
`plainspoken-docs`.

---

## Branches

- Every branch maps to exactly one ticket. No shared branches across tickets, no ad-hoc branches.
- Name a branch `<issue-number>-<issue-name>`, where `issue-name` is the ticket title lowercased
  and hyphenated. Example: ticket #27 "Parse the profile page" → branch `27-parse-profile-page`.
- Link the branch to its ticket (open the branch from the issue, or reference the issue in the
  first commit or the pull request) so the ticket shows the work.

## Commits

- **One author: the repository owner.** No co-author trailers, no `Co-Authored-By`.
- **Atomic and precise to the line.** One concern per commit. Stage only the lines that belong to
  that concern; do not fold unrelated edits into a commit.
- **Conventional Commits 1.0.0** (https://www.conventionalcommits.org/en/v1.0.0/). One-line
  subject in the imperative mood, at most 72 characters. Examples:
  - `feat(core): parse score list across all levels`
  - `fix(cli): recover session after interrupted sync`
  - `test(core): cover not-played score detail fixture`
- **The types, and what each one is for:**

  | Type | Use it for |
  |---|---|
  | `feat` | behaviour someone can use that was not there before |
  | `fix` | a defect corrected |
  | `docs` | documentation only |
  | `test` | tests only |
  | `refactor` | same behaviour, different shape |
  | `perf` | same behaviour, faster |
  | `style` | formatting only, no code change |
  | `build` | toolchain, dependencies, packaging |
  | `ci` | the workflow that runs the checks |
  | `chore` | repository housekeeping that is none of the above |
  | `revert` | undo an earlier commit |

- **Activate the hooks once per clone:**

  ```bash
  git config core.hooksPath .githooks
  ```

  The `commit-msg` hook checks the subject with commitlint before it reaches history, which is the
  only moment a typo is cheap to fix. It is a convenience rather than a gate: `--no-verify` skips
  it, and a clone that never runs the command above never sees it.

- All code is written to `tim-style-code`: fit the existing conventions, keep changes narrow,
  make behavior explicit, verify in proportion to risk.

## Pull requests

- **A ticket is only closed when its change is on `main`.** Work sitting on a branch is not done.
- Every feature branch merges through a pull request that passes QA before it reaches `main`.
- The description is a plain `-` list. **Each bullet is one sentence naming one change** in the
  PR — no paragraphs, no sub-bullets.
- End the description with a link back to the ticket.

Example:

```
- Add a profile-page parser that maps mypage_top.php to PlayerProfile.
- Cover the parser with a fixture asserting name, title, and score info.
- Expose the parser through the core's public index.

Closes #27
```

---

## Tickets

Tickets live as GitHub issues under an epic. Write them to `plainspoken-docs`: say the true thing
plainly, exact over vague, no hype.

### Feature ticket

Required:

- **Background** — what this is and why it is needed, in the reader's terms.
- **Acceptance criteria (AC)** — the concrete, checkable conditions that make the ticket done.

Optional but encouraged:

- Any extra notes the implementer needs (constraints, edge cases, links to related tickets).
- **A screenshot of the feature's data source** — for example, the specific Donder Hiroba page
  the work parses or writes to. A picture of the real page removes guesswork.

### Bug-fix ticket

The format is looser than a feature ticket. Include, at minimum, enough to reproduce:

- **Reproduction steps** — the exact sequence that triggers the bug.
- What you expected versus what happened.
- Environment or data that matters (account state, page, platform), if relevant.

### Exploration ticket

Some work produces **knowledge, not code** — surveying a site, pinning down a contract, deciding
between two approaches. A feature ticket's Background + AC does not fit that: there is nothing to
implement and nothing to check off in the code.

Required, label `exploration`:

- **Question** — what we did not know, and what it was blocking.
- **How it was settled** — the evidence, and how strong it is. In descending order: an executed
  request, a committed fixture with a test, a live read-only session, reading the source. Reading
  the source is not verification; say so when that is all you have.
- **Findings** — what is now known, leading with anything that overturned a previous belief.
- **Where the knowledge lives** — a link to the durable artefact. An exploration whose result exists
  only in the issue has not been delivered.
- **Still open** — what was not settled and what would settle it.

**An exploration ticket closes when the knowledge is published**, not when something lands on
`main` — it is the one exception to the rule above, because its deliverable is not code.

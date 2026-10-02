/**
 * Cuts a release: checks that the repository is ready, raises the version in apps/gui/package.json
 * if the release has a new one, commits that, and tags it. Pushing the tag is what starts the
 * Release workflow (.github/workflows/release.yml), so it is the last thing done, and only with
 * --push.
 *
 *   bun run release <x.y.z | patch | minor | major> [--push]
 *
 * Nothing changes until every check has passed: a clean working tree, on main, main the same
 * commit as origin/main after a fetch, a version not lower than the current one, and a tag that is
 * on neither this clone nor origin. A version equal to the current one is allowed, and only tags:
 * that is how a version already in package.json, such as the first 0.1.0, is released.
 *
 * Without --push the commit and the tag are made here only, and the commands that publish them are
 * printed. main is protected on GitHub, so pushing a release commit to it is refused; raise the
 * version in a pull request instead, and once that is merged release it by its number, which only
 * tags. See the Releases section of apps/gui/README.md.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  compareVersions,
  formatVersion,
  readPackageVersion,
  releaseCommitMessage,
  releaseTag,
  releaseTitle,
  resolveTarget,
  setPackageVersion,
  type Version,
  versionCode,
} from "./release-version";

const ROOT = join(import.meta.dir, "..");
const PACKAGE_JSON = "apps/gui/package.json";
/** bun.lock states each workspace's version too, so a new version goes into it as well. */
const LOCKFILE = "bun.lock";
const BRANCH = "main";
const REMOTE = "origin";
const USAGE = "Usage: bun run release <x.y.z | patch | minor | major> [--push]";

/** What a command printed and how it ended, for a refusal that has to say why. */
interface Run {
  readonly code: number;
  readonly out: string;
  readonly err: string;
}

/** A release's version, and the package.json it is raised in. */
interface Plan {
  readonly current: Version;
  readonly next: Version;
  readonly packageJson: string;
}

/** One push of the release: main with its commit, or the tag. */
interface Push {
  readonly what: "main" | "tag";
  readonly argv: string[];
}

function capture(argv: string[]): Run {
  const done = Bun.spawnSync(argv, { cwd: ROOT, stdout: "pipe", stderr: "pipe" });
  return {
    code: done.exitCode ?? 1,
    out: done.stdout.toString().trimEnd(),
    err: done.stderr.toString().trim(),
  };
}

function git(...args: string[]): Run {
  return capture(["git", ...args]);
}

/** Runs a command with its output on the terminal: a push is better watched than summarised. */
function stream(argv: string[]): boolean {
  const done = Bun.spawnSync(argv, {
    cwd: ROOT,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  return done.exitCode === 0;
}

function say(line = ""): void {
  process.stdout.write(`${line}\n`);
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function readArguments(): { argument: string; push: boolean } {
  const given = process.argv.slice(2);
  const flags = given.filter((word) => word.startsWith("--"));
  const [argument, ...extra] = given.filter((word) => !word.startsWith("--"));
  if (argument === undefined || extra.length > 0 || flags.some((flag) => flag !== "--push")) {
    fail(USAGE);
  }
  return { argument, push: flags.includes("--push") };
}

/** Nothing modified, staged or untracked, so the release commit holds the version and nothing else. */
function requireCleanTree(): void {
  const status = git("status", "--porcelain", "--untracked-files=all");
  if (status.code !== 0) {
    fail(`git status failed: ${status.err}`);
  }
  if (status.out !== "") {
    fail(`The working tree is not clean:\n${status.out}\nCommit or discard these first.`);
  }
}

function requireMain(): void {
  const branch = git("branch", "--show-current").out;
  if (branch !== BRANCH) {
    const where = branch === "" ? "a detached HEAD" : branch;
    fail(`A release is cut on ${BRANCH}, and this is ${where}. Switch to ${BRANCH} first.`);
  }
}

/**
 * A release is of what is published, so main must be the commit origin has, after asking it. The
 * fetch brings no tags: whether the release's tag is taken is asked of origin itself, below.
 */
function requireMainMatchesOrigin(): void {
  const refspec = `refs/heads/${BRANCH}:refs/remotes/${REMOTE}/${BRANCH}`;
  const fetched = git("fetch", "--no-tags", REMOTE, refspec);
  if (fetched.code !== 0) {
    fail(`Fetching ${REMOTE} failed: ${fetched.err}`);
  }
  const counts = git("rev-list", "--left-right", "--count", `${BRANCH}...${REMOTE}/${BRANCH}`);
  const [ahead, behind] = counts.out.split(/\s+/);
  if (counts.code !== 0 || ahead === undefined || behind === undefined) {
    fail(`Comparing ${BRANCH} with ${REMOTE}/${BRANCH} failed: ${counts.err}`);
  }
  if (ahead !== "0" || behind !== "0") {
    fail(
      `${BRANCH} is not ${REMOTE}/${BRANCH}: ${ahead} commit(s) ahead of it, ${behind} behind. Release from a ${BRANCH} that equals it.`,
    );
  }
}

/** The version to release, from package.json and what was asked for. */
function planRelease(argument: string): Plan {
  const packageJson = readFileSync(join(ROOT, PACKAGE_JSON), "utf8");
  const current = readPackageVersion(packageJson);
  if (current === null) {
    fail(`${PACKAGE_JSON} has no "version" that a release can use: MAJOR.MINOR.PATCH.`);
  }
  const target = resolveTarget(current, argument);
  if (!target.ok) {
    fail(target.reason);
  }
  if (compareVersions(target.version, current) < 0) {
    fail(
      `${formatVersion(target.version)} is lower than the current ${formatVersion(current)}. A release never goes back.`,
    );
  }
  return { current, next: target.version, packageJson };
}

function requireFreeTag(tag: string): void {
  if (git("rev-parse", "--quiet", "--verify", `refs/tags/${tag}`).code === 0) {
    fail(`The tag ${tag} exists here already.`);
  }
  // With --exit-code, no such tag is the answer 2, which tells it from a remote that did not answer.
  const remote = git("ls-remote", "--exit-code", "--tags", REMOTE, `refs/tags/${tag}`);
  if (remote.code === 0) {
    fail(`The tag ${tag} exists on ${REMOTE} already.`);
  }
  if (remote.code !== 2) {
    fail(`Asking ${REMOTE} about ${tag} failed: ${remote.err}`);
  }
}

/**
 * The release commit: the version raised in package.json and in bun.lock, one line each, and nothing
 * else. Both files go back as they were if anything about it is not as expected.
 */
function commitVersion(plan: Plan): string {
  const updated = setPackageVersion(plan.packageJson, plan.next);
  if (updated === null) {
    fail(`${PACKAGE_JSON} has no top-level "version" line to change.`);
  }
  const lockfile = readFileSync(join(ROOT, LOCKFILE), "utf8");
  const restore = (): void => {
    writeFileSync(join(ROOT, PACKAGE_JSON), plan.packageJson);
    writeFileSync(join(ROOT, LOCKFILE), lockfile);
  };

  writeFileSync(join(ROOT, PACKAGE_JSON), updated);
  const installed = capture([process.execPath, "install", "--lockfile-only"]);
  if (installed.code !== 0) {
    restore();
    fail(`bun install --lockfile-only failed, and nothing was changed: ${installed.err}`);
  }
  const changed = git("diff", "--numstat").out.split("\n").sort().join("\n");
  const expected = [`1\t1\t${PACKAGE_JSON}`, `1\t1\t${LOCKFILE}`].sort().join("\n");
  if (changed !== expected) {
    restore();
    fail(
      `Raising the version changed more than one line each of ${PACKAGE_JSON} and ${LOCKFILE} (a different bun than the lockfile's?):\n${changed}\nNothing was committed, and both files are as they were.`,
    );
  }
  const message = releaseCommitMessage(plan.next);
  const committed = git("commit", "--message", message, "--", PACKAGE_JSON, LOCKFILE);
  if (committed.code !== 0) {
    restore();
    fail(`The release commit failed, and nothing was changed: ${committed.err || committed.out}`);
  }
  return git("rev-parse", "--short", "HEAD").out;
}

function tagRelease(version: Version, committed: boolean): void {
  const tag = releaseTag(version);
  const tagged = git("tag", "--annotate", "--message", releaseTitle(version), tag);
  if (tagged.code !== 0) {
    const state = committed ? "The release commit is made, but the tag is not" : "No tag was made";
    fail(`Tagging ${tag} failed: ${tagged.err}\n${state}. Fix the cause and tag by hand.`);
  }
}

/** The pushes that publish the release, in order: main first if it has the release commit, then the tag. */
function pushesOf(tag: string, committed: boolean): Push[] {
  const main: Push = {
    what: "main",
    argv: ["git", "push", REMOTE, `refs/heads/${BRANCH}:refs/heads/${BRANCH}`],
  };
  const tagPush: Push = {
    what: "tag",
    argv: ["git", "push", REMOTE, `refs/tags/${tag}:refs/tags/${tag}`],
  };
  return committed ? [main, tagPush] : [tagPush];
}

/** What puts the clone back as it was before the release: main equalled origin/main then. */
function undoCommands(tag: string, committed: boolean): string[] {
  return [`git tag -d ${tag}`, ...(committed ? [`git reset --hard ${REMOTE}/${BRANCH}`] : [])];
}

function publish(tag: string, committed: boolean): void {
  for (const push of pushesOf(tag, committed)) {
    if (stream(push.argv)) {
      continue;
    }
    say();
    say(`${push.argv.join(" ")} failed, and nothing after it was pushed.`);
    if (push.what === "main") {
      say(
        `The release commit and the tag ${tag} exist only here. If ${BRANCH} is protected on GitHub,`,
      );
      say("it takes no direct push. Undo them with");
      for (const command of undoCommands(tag, committed)) {
        say(`  ${command}`);
      }
      say("raise the version in a pull request, and once that is merged run this again with that");
      say("version: it only tags. See the Releases section of apps/gui/README.md.");
    } else {
      say(`The tag ${tag} exists here: push it again, or drop it with git tag -d ${tag}.`);
    }
    process.exit(1);
  }
  say();
  say(
    `Pushed. The tag ${tag} starts the Release workflow, which builds the files and publishes them.`,
  );
}

function main(): void {
  const { argument, push } = readArguments();
  requireCleanTree();
  requireMain();
  requireMainMatchesOrigin();
  const plan = planRelease(argument);
  const tag = releaseTag(plan.next);
  requireFreeTag(tag);

  const version = formatVersion(plan.next);
  const raised = compareVersions(plan.next, plan.current) > 0;
  const code = versionCode(plan.next);
  say(`Checked: a clean tree, on ${BRANCH}, equal to ${REMOTE}/${BRANCH}, and ${tag} is free.`);
  say(
    raised
      ? `Releasing ${version}, up from ${formatVersion(plan.current)} (Android versionCode ${code}).`
      : `Releasing ${version}, which ${PACKAGE_JSON} says already (Android versionCode ${code}): tag only.`,
  );

  if (raised) {
    say(`Committed ${releaseCommitMessage(plan.next)} (${commitVersion(plan)}).`);
  }
  tagRelease(plan.next, raised);
  say(`Tagged ${tag}.`);

  if (push) {
    publish(tag, raised);
    return;
  }
  say();
  say("Nothing is pushed. To publish this release, run:");
  for (const { argv } of pushesOf(tag, raised)) {
    say(`  ${argv.join(" ")}`);
  }
  say("To drop it instead, run:");
  for (const command of undoCommands(tag, raised)) {
    say(`  ${command}`);
  }
}

main();

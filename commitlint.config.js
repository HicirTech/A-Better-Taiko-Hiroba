/**
 * Conventional Commits 1.0.0, as CONTRIBUTING describes it.
 *
 * The type list is spelled out rather than inherited from the preset, so that adding a type is a
 * visible decision and the documented list and the enforced list cannot drift apart.
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // behaviour someone can use that was not there before
        "fix", // a defect corrected
        "docs", // documentation only
        "test", // tests only
        "refactor", // same behaviour, different shape
        "perf", // same behaviour, faster
        "style", // formatting only, no code change
        "build", // toolchain, dependencies, packaging
        "ci", // the workflow that runs the checks
        "chore", // repository housekeeping that is none of the above
        "revert", // undo an earlier commit
      ],
    ],
    // Short enough that `git log --oneline` stays readable in a terminal beside a diff.
    "header-max-length": [2, "always", 72],
  },
};

---
id: S95
title: The bootstrap leaves the git hooks alone in CI, so close.yml can commit again
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-10-03)
---

## Goal

Since S85 every workflow runs `.harness/bootstrap.sh` after the checkout, and
the bootstrap ends with `git config core.hooksPath .harness/bin/hooks`. In
`close.yml` the next step commits the slice set to `done` and the verdicts of
the review log, the pre-commit hook fires, it calls `pnpm exec prettier`, and
the runner has no pnpm: the step fails with `xargs: pnpm: No such file or
directory` and nothing is committed. Every merge since #29 leaves its slice
`todo` on the board and its verdicts out of the log, and every slice that
waits on it in `blocked_by` waits for good. After this slice the bootstrap
fills `.harness/bin/` in CI as it does everywhere, and points
`core.hooksPath` at it only outside CI: the hooks are a guard for whoever
commits by hand, and in a workflow the gates are the jobs.

## Acceptance criteria

- [ ] With `GITHUB_ACTIONS=true` in the environment, `.harness/bootstrap.sh` fills `.harness/bin/` as before and leaves `core.hooksPath` as it found it, both on the path that fetches the pin and on the early exit of the harness repo.
- [ ] Without `GITHUB_ACTIONS`, `core.hooksPath` is set to `.harness/bin/hooks` as today, on both paths.
- [ ] The comment at the head of `skills/harness-init/templates/bootstrap.sh` says why CI is left out.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/bootstrap.test.ts`, next to the two cases that assert
  `core.hooksPath` is `.harness/bin/hooks` (near `:153` and `:251`): the same
  two runs with `GITHUB_ACTIONS=true` in the env of the call, asserting that
  `git config core.hooksPath` is unset afterwards and that `.harness/bin/`
  is filled. Red today, because the bootstrap sets the path on any run.
- The two existing cases stay as they are and cover the second criterion.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/bootstrap.sh`: the two `git config core.hooksPath` lines, near `:26` and `:79`, and the header comment.
- `tests/bootstrap.test.ts`: the new cases.

## Notes

Found on 2026-10-03 by the run of `/next` that merged #29: run
37109356614 of `close.yml` failed after `review-log: 2 verdict(s) appended`,
on the commit, with `xargs: pnpm: No such file or directory`. S85 is still
`todo` on main and its two verdicts are not in `docs/review-log/verdicts.jsonl`.

Decided in the conversation of 2026-10-03: the bootstrap skips the hooks
under `GITHUB_ACTIONS`, rather than `close.yml` committing with
`--no-verify`, because no workflow wants the local hooks and the fix in one
place covers every workflow that commits, today and later.

The workflows do not change: they still run the bootstrap, and this PR's own
merge is the first that `close.yml` closes again, since a `pull_request`
`closed` run reads the workflow and the scripts of the merge commit.

Out of scope: setting S85 to `done` and writing its two verdicts to the log,
a commit on main by a human after this merges
(`.harness/bin/review-log.sh 29 docs/review-log/verdicts.jsonl`); whether
`automerge.yml` and `escalate.yml` should run the bootstrap at all, the open
question of #29.

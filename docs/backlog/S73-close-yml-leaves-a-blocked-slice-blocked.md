---
id: S73
title: close.yml leaves a blocked slice blocked when its PR merges
status: todo
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-24)
---

## Goal

A slice that stops half done is set to `status: blocked` with a
`## Blocked` section, and its PR is a draft that waits for a human. If that
PR is merged anyway, `close.yml` rewrites whatever status the slice has to
`done`: the board then counts as done a slice whose work never landed, and
every slice that names it in `blocked_by` becomes eligible on a false
premise. That happened with S51 and PR #80, and a human put the status back
by hand. After this slice `close.yml` sets `done` only on a slice that is not
`blocked`, and for a blocked one it writes to the step summary, and comments
on the PR, that the slice stayed blocked and why.

## Acceptance criteria

- [ ] The close step of `skills/harness-init/templates/github/close.yml` sets `status: done` on a slice whose status is `todo`, as today, and leaves a slice whose status is `blocked` unchanged.
- [ ] For a blocked slice it writes one line to `$GITHUB_STEP_SUMMARY` with the id and the PR, and posts the same text as a comment on the PR, and a refused comment does not fail the job.
- [ ] The review log and the commit of the step work as before.
- [ ] `.github/workflows/close.yml` is equal to the template.
- [ ] `tests/architecture.test.ts` has a case that fails when the close step rewrites the status without first reading it for `blocked`.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, next to the cases that read the jobs of
  `github/close.yml`: a case that reads the `run` of the close step and
  asserts that the `sed` that writes `status: done` is guarded by a test on
  `status: blocked`, and that the blocked branch writes to
  `$GITHUB_STEP_SUMMARY`. Red today, because the `sed` runs on any status.
- The describe that keeps `.github/` equal to the templates covers the copy.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/github/close.yml`: the blocked branch of the close step.
- `.github/workflows/close.yml`: the copy, put back equal to the template.
- `tests/architecture.test.ts`: the new case.

## Notes

The inbox line, 2026-09-24: `close.yml` sets a slice to `done` when its PR
merges even if the slice says `status: blocked`, so merging the draft PR of a
blocked slice (#80, S51) closed a slice whose work never landed.

Found on 2026-09-24: the `sed` at
`skills/harness-init/templates/github/close.yml:84`; the commit
`c0b42b8` closed S51 and `57006b9` put it back to `blocked` by hand.

S67 gives the step `pull-requests: write`, and S71 adds the branch for a
missing slice file in the same block: the three touch the same lines, and
`/next` puts them in separate waves. The later one rebases on what the
earlier one left.

Out of scope: refusing the merge of a draft PR, which is GitHub's and the
human's; what the merged work of a blocked slice means for its criteria,
which the human decides when unblocking it.

---
id: S71
title: close.yml says out loud when a slice branch merges and its file is not there
status: todo
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-22)
---

## Goal

After a merge on the default branch, `close.yml` reads the id from the
`slice/S<NN>-<slug>` branch and sets `status: done` on the file of that
slice. When the file is not on the default branch, the loop finds nothing and
the job ends green without a word: the slice stays `todo` on the board,
eligible again, and every slice that names it in `blocked_by` stays held.
That happened with S59, whose file was only an untracked file in a working
tree when PR #79 merged. After this slice the case has a voice: `close.yml`
writes to the step summary, and comments on the PR, that the branch named a
slice whose file it could not find, with the id and what to do.

## Acceptance criteria

- [ ] When the head branch names `S<NN>` and no `docs/backlog/S<NN>-*.md` exists after the checkout, `skills/harness-init/templates/github/close.yml` writes one line to `$GITHUB_STEP_SUMMARY` with the id and the PR, and posts the same text as a comment on the PR, and a refused comment does not fail the job.
- [ ] The review log and the commit of the step work as before in that case.
- [ ] `.github/workflows/close.yml` is equal to the template.
- [ ] `tests/architecture.test.ts` has a case that fails when the close step of the template has no branch for a missing slice file that writes to `$GITHUB_STEP_SUMMARY`.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, next to the cases that read the jobs of
  `github/close.yml`: a case that reads the `run` of the close step and
  asserts that inside the `if [ -n "$sid" ]` block a test for no matching file
  leads to a write to `$GITHUB_STEP_SUMMARY` and to `gh pr comment` with
  `|| true`. Red today, because the block only loops.
- The describe that keeps `.github/` equal to the templates covers the copy.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/github/close.yml`: the missing-file branch of the close step.
- `.github/workflows/close.yml`: the copy, put back equal to the template.
- `tests/architecture.test.ts`: the new case.

## Notes

The inbox line, 2026-09-22: a slice whose PR merges without its file on the
default branch closes nothing and stays eligible for ever: S59's code landed
in PR #79 while `docs/backlog/S59-ci-is-one-job.md` was only an untracked file
in the working tree, so `close.yml` found nothing to mark `done`, the board
kept printing it as an eligible `todo`, and it held S51 through `blocked_by`
for a commit. Either `/slice` and `/board` commit the file before the branch
is taken, or `close.yml` says out loud that it closed a PR whose slice it
could not find.

Found on 2026-09-24: the loop at
`skills/harness-init/templates/github/close.yml:81-86`. `/slice` and `/board`
already commit the slice on the default branch before any branch is taken,
so the first half of the line holds; S59 was written by hand. The job
`stacked` of the same file, below, is the model for saying in the summary
why nothing was closed.

Without the App the comment needs `pull-requests: write`, which S67 gives.
Until S67 lands the comment is refused on the default token and the summary
line is what remains, which is why a refused comment must not fail the job.

Out of scope: `/next` and `board.sh` reading an untracked slice file from the
working tree as part of the board, which is a separate question; the
permission itself, which is S67's.

---
id: S08
title: close.yml does not lose its commit when the default branch moves under it
status: todo
blocked_by: none
tier: 2
human: true
spec: audit (PR #14)
---

## Goal

`close.yml` checks out the default branch, sets the slice to `done`, writes
the verdicts to the review log, commits and runs `git push origin HEAD`, once.
If another PR merges between the checkout and the push, the push is refused
and the commit dies in the runner. It happened on PR #14, merged thirteen
seconds before PR #15: the two verdicts never reached
`docs/review-log/verdicts.jsonl`, and PR #16 put them back by hand.

The same commit carries `status: done`. A slice that merged can stay `todo`,
the board offers it again and `/next` builds it a second time. The failure is
a red run on a branch that no longer exists, where nobody looks. After this
slice a close that loses the race does its work again on the new tip, and one
that gives up says so on the PR.

## Acceptance criteria

- [ ] When the push is refused because the default branch moved, the job fetches the new tip, does its step again from there and pushes again, up to a fixed number of attempts written in the workflow.
- [ ] Two closes that run at the same time leave both PRs in `verdicts.jsonl` and both slices `done`: neither overwrites the other.
- [ ] `verdicts.jsonl` after a second attempt is one JSON object per line, with no line written twice for the same PR and role.
- [ ] A close that uses up its attempts comments on the PR with the PR number and the command that redoes it by hand, and the run is red.
- [ ] The workflow has a `concurrency` group that queues the closes of one repo, without cancelling a run in progress, and the retry is there as well.
- [ ] `.github/workflows/close.yml` is equal to its template, and `tests/architecture.test.ts` still proves it.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/review-log.test.ts`: `review-log.sh` run twice for the same PR on the
  same file writes each verdict once. Written first; red or green today, it is
  the property the retry stands on.
- Same place: the log holds a line of another PR, written between the two
  runs, and after the second run both PRs are there and every line parses.
- `tests/architecture.test.ts`: the template of `close.yml` holds a
  `concurrency` key with `cancel-in-progress: false`, and a bound on the
  attempts. Red today.
- The existing comparison of `.github/workflows/close.yml` with the template
  stays as it is.
- The retry against GitHub is not a Vitest case. Once, by hand: two small PRs
  merged a few seconds apart, then both slices `done` and both PRs in the log.
  The steps go in "How to check by hand" of the PR.

## Touchpoints

- `skills/harness-init/templates/github/close.yml`: the `concurrency` key and the end of the step, from `git add` to `git push`.
- `.github/workflows/close.yml`: the copy, brought back with stage `ci` of `/harness-init`.
- `skills/harness-init/templates/scripts/review-log.sh`: only if a second run for the same PR writes a line twice.
- `tests/review-log.test.ts`: the two new cases.
- `tests/architecture.test.ts`: the new case on the template.

## Notes

Rewritten on 2026-10-02 from the slice the audit of PR #14 opened on
2026-09-09, which ADR-0002 held still until `/spec`, `/slice`, `/next` and
`/board` existed. They do, and the policy now merges PRs one after the other,
so Lionel took the ADR out of `blocked_by`. S05, S06 and S07, from the same
audit, were dropped the same day: what they described no longer matches the
chain after ADR-0003 and ADR-0004.

Found on 2026-10-02: the push with no retry at
`skills/harness-init/templates/github/close.yml:111`, and no `concurrency`
key in the file. Of the last thirty runs of `close.yml` one failed, on
2026-09-25, for the lookup of the App installation and not for this race. S81
lands the slices of a wave one at a time, which narrows the window for
`/next`; two PRs merged by hand in a row still open it.

The second attempt does the step again on the new tip, it does not rebase the
commit. Two closes both append to `verdicts.jsonl`, and a rebase of two
appends is a conflict somebody has to resolve; doing the step again has no
conflict to resolve, at the price of one more run of `review-log.sh`.
`concurrency` alone is not enough: it queues the closes, but a merge by a
human or a commit of a document on the default branch still moves the tip
between the checkout and the push.

`human: true` for two reasons. The slice edits `.github/`, which a slice
taken by `/next` does not touch, and its real proof is the check by hand
above, on GitHub, which a subagent cannot run.

Out of scope: `[skip ci]` in the commit message, which works; the verdict
posted after the merge, which S53 closed; the read of the comments in
`review-log.sh`.

---
id: S53
title: The review log takes a verdict that arrives after the merge
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-18)
---

## Goal

`review-log.sh` runs once, inside `close.yml`, on the merge. It reads the
comments of the PR and keeps the ones that carry a verdict marker. When the
merge happens before `policy.sh` has posted the comment, there is nothing to
read: the script appends nothing, says so on the stderr of a run whose branch
has just been deleted, and the log has a hole. The audit reads
`docs/review-log/verdicts.jsonl` to tune the thresholds on the agreement
between judge and human, and a missing PR does not look like a loss, it looks
like a PR nobody judged.

After this slice the script can be run again on a merged PR without writing a
line twice, so the verdict that arrived late lands in the log whenever it
arrives, and a run that has nothing to append says so on the PR, where
somebody is looking, with the command that repairs it.

## Acceptance criteria

- [ ] Two runs on the same PR with the same comments leave one line per verdict: a verdict whose `pr`, `judge` and `head_sha` are already in the log is skipped.
- [ ] A second run that finds a verdict the log does not have appends that one alone, and the lines already there are untouched, byte for byte.
- [ ] A run that appends nothing, on a PR that has no line in the log, comments on the PR with the reason and the command that repairs it, `scripts/review-log.sh <pr>`.
- [ ] A run that appends nothing because the lines are there already writes no comment: the repair is not announced twice.
- [ ] The script still exits 0 when it appends nothing, because `close.yml` pushes `status: done` in the same step after it.
- [ ] With `MERGED_BY` empty the script reads who merged from the PR instead of defaulting to `human`: a line written by hand days later credits whoever merged, not whoever reran the script.
- [ ] The dedup reads the log it is about to write, and a log that is not there yet is not an error: the first run of a fresh repo still works.
- [ ] Suite, typecheck, format and build green.

## Test plan

- First, in `tests/review-log.test.ts`, the cases above. The `run` helper at
  `:45` makes a new temporary directory per call, so a second run in the same
  directory is what the idempotency cases need: the helper grows a way to run
  twice, or to start from a log that is already there. Red today on the first
  one, because the append at
  `skills/harness-init/templates/scripts/review-log.sh:79` is a plain `>>` and
  two runs give two lines.
- The comment on the PR is read from the stub of `gh`, which already keeps
  every `--body` in `GH_COMMENTS` and every call in `GH_LOG`: one case asserts
  the comment is there and names the command, one that it is not.
- The `mergedBy` case needs a new arm in `tests/fixtures/bin/gh`, next to the
  other `--json` arms at `:35-49`, fed by a `STUB_MERGED_BY`.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/scripts/review-log.sh`: the append at `:79`, the count and the message at `:55` and `:82`, `by` at `:19`. `scripts/review-log.sh` is a symlink to it and follows.
- `tests/fixtures/bin/gh`: the arm that answers `--json mergedBy`.
- `tests/review-log.test.ts`: the new cases and the helper that runs twice.

## Notes

The line of the inbox, of 2026-09-18: a PR merged before `policy.sh` posts the
verdict loses its line in `docs/review-log/verdicts.jsonl` for good, because
`review-log.sh` runs at the close and reads the comment that is not there yet:
it happened at PR #50, where the comment and the labels were put back after the
merge but the line of the log was not. The line has to be writable afterwards
too, or the merge has to wait for the verdict.

Of the two ways the line names, this slice takes the first, the log writable
afterwards. Making the merge wait for the verdict is the policy, it lives in
`.github/` and in `automerge.yml`, and a slice does not touch `.github/`.

What the reading found: the comments arrive from `gh pr view "$pr" --json
comments` at `:35`, which works on a merged PR too, so the script is already
rerunnable and what stops it is the plain append at `:79` and the fact that
nobody is told. The last line, at `:82`, says how many verdicts were appended
and it says it on stderr. The identity of a line is `pr`, `judge` and
`head_sha`, three properties of
`skills/harness-init/templates/judge/verdict.schema.json`; `head_sha` is not
required there, so a verdict without it falls back to `pr` and `judge`.

The `ts` of the outcome stays the time of the run that wrote the line, which
for a late verdict is not the time of the merge: the log says when it was
written, and the head sha says what was judged.

S08 loses the same commit the other way, the push refused when another PR
merges in the same seconds, and it is held by ADR-0002. It is a different
failure and this slice does not close it: here nothing is ever written, there
it is written and the push dies.

Out of scope: `close.yml` and its copy in `.github/`, the lines already lost,
which PR #16 recovered by hand for #14 and which were put back by hand for
#50.

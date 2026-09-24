---
id: S66
title: test-weakening.sh says on stderr what it looked at when it finds nothing
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-22)
---

## Goal

`/next` pastes the output of `tier.sh` and `test-weakening.sh` into the body of
every PR. `tier.sh` always says what it decided; `test-weakening.sh` prints
nothing on a clean run, and an empty block in a PR body reads the same whether
the script found nothing or never ran. After this slice a run that finds
nothing prints one line on stderr naming the range and how many test files it
read, zero included. Stdout stays empty on a clean run, because
`ci.yml` reads a non-empty stdout as "tests weakened" and adds the
`tests-weakened` label, which takes the PR to tier 3.

## Acceptance criteria

- [ ] On a range with no suspicious change, `test-weakening.sh` prints nothing on stdout and one line on stderr with the range and the number of test files read, and exits 0.
- [ ] On a range with no test file at all, the same line says zero test files.
- [ ] On a range with a finding, stdout is what it was before, line for line, and the stderr line is not printed.
- [ ] The comment at the top of the script says what goes on stdout and what on stderr, and `skills/next/SKILL.md` tells the subagent to keep both streams of the two scripts for the PR body.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/test-weakening.test.ts` (new), on a temporary repo built the way
  `tests/tier.test.ts` builds its own: a commit that changes only source and
  asserts stdout empty and the stderr line with `0` test files; a commit that
  adds an assertion to a test and asserts stdout empty and the stderr line
  with `1`; a commit that adds `.skip(` and asserts the stdout line of today
  and no stderr line. The first two fail today, because stderr is empty.
- Then `pnpm test` whole, and the existing cases of `tests/judge.test.ts`
  that run the script.

## Touchpoints

- `skills/harness-init/templates/scripts/test-weakening.sh`: the stderr line and the header comment.
- `tests/test-weakening.test.ts` (new): the three cases.
- `skills/next/SKILL.md`: point 4 of the subagent block, both streams.

## Notes

The inbox line, 2026-09-22: `scripts/test-weakening.sh` prints nothing at all
on a clean run, so its output pasted into a PR body cannot be told apart from
a script that failed to run: `tier.sh` says what it decided, this one says
nothing.

Found on 2026-09-24: the early exit with no test file at
`skills/harness-init/templates/scripts/test-weakening.sh:26`, the final
`exit 0` at the end of the same file; `ci.yml` reads the stdout at
`skills/harness-init/templates/github/ci.yml:65-66`, and that is why the new
line cannot go on stdout; `skills/next/SKILL.md:216` and `:321` are where the
output reaches the PR body.

Out of scope: `judge.sh`, which decides pass or FAIL for this script from its
exit status (`skills/harness-init/templates/scripts/judge.sh:284-291`) while
the script always exits 0, a separate line of the inbox; the heuristics of
the script, which another line of the inbox owns.

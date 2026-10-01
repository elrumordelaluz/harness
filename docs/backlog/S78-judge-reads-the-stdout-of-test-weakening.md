---
id: S78
title: judge.sh reads the stdout of test-weakening.sh, not its exit status
status: todo
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-24)
---

## Goal

`judge.sh bundle` runs the gates it can and writes their outcome in the
section the judge is ordered never to verify again. For `test-weakening.sh` it
decides pass or FAIL from the exit status, and that script exits 0 by
contract, findings included: its answer is its stdout, which is how `ci.yml`
reads it. So a PR that weakens a test reaches the judge with
`scripts/test-weakening.sh: pass`, and the judge is told not to look. After
this slice `judge.sh` reads that gate the way CI does: an empty stdout is a
pass, a non-empty one is a FAIL with the findings under it. The contract of
`test-weakening.sh` does not change.

## Acceptance criteria

- [ ] On a branch whose diff adds `.skip(` to a test file, the "gates run here" section of the bundle says `scripts/test-weakening.sh: FAIL` and never `scripts/test-weakening.sh: pass`.
- [ ] On that branch the lines `test-weakening.sh` printed on stdout are in the same section, under the FAIL line, one per finding.
- [ ] On a branch with no finding the section says `scripts/test-weakening.sh: pass`, as today, and the stderr line of the script is not in the bundle.
- [ ] A `test-weakening.sh` that exits non-zero is a FAIL, whatever it printed.
- [ ] `scripts/prose.sh` is still read from its exit status: pass on 0, FAIL otherwise.
- [ ] `test-weakening.sh` still exits 0 with findings, and its stdout is what it was, line for line.
- [ ] The comment above the loop in `judge.sh` says which gate answers with its exit status and which with its stdout.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/judge.test.ts`, next to the case "runs the gates it can and marks the
  rest as self-reported", on the same temporary repo: a branch that adds a
  test file change with `.skip(`, then `judge.sh bundle`, and the section
  between `BEGIN gates run here` and `END gates run here` is asserted to
  contain `scripts/test-weakening.sh: FAIL` and the `skip/only added` line,
  and not to contain `scripts/test-weakening.sh: pass`. It fails today: the
  script exits 0 and the bundle says pass.
- Same file: a repo whose `scripts/test-weakening.sh` is replaced by a stub
  that prints nothing and exits 1, asserted FAIL. It passes today and holds
  the exit status as a second signal while the code changes.
- The existing case stays as it is and holds the clean run: pass for both
  gates, and nothing of the stderr line inside the section.
- `tests/test-weakening.test.ts`, untouched: its case "keeps the finding on
  stdout and prints no stderr line" already holds the contract of the script.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/scripts/judge.sh`: the loop over `prose` and `test-weakening` in the "gates run here" section, and the comment above it.
- `tests/judge.test.ts`: the two new cases.

## Notes

The inbox line, 2026-09-24: `judge.sh` reports
`scripts/test-weakening.sh: pass` from the exit status
(templates/scripts/judge.sh:284-291), but the script always exits 0, findings
included, so the judge is told a weakened PR passed a gate it must not check
again.

Found on 2026-10-01: the loop is at
`skills/harness-init/templates/scripts/judge.sh:284-291` and sends both
streams of the gate to `/dev/null`; the only `exit` of the script is the
unconditional one at
`skills/harness-init/templates/scripts/test-weakening.sh:85`, and its header
comment at lines 2-9 states the contract, stdout for findings and exit 0
always; CI reads the stdout at
`skills/harness-init/templates/github/ci.yml:65`; the case that asserts the
pass today is at `tests/judge.test.ts:310-335`, and the fixture copies the
script in at `tests/judge.test.ts:64`.

The fix goes in `judge.sh` and not in the exit status of `test-weakening.sh`:
the script runs in `ci.yml` under a shell that stops on a non-zero exit, where
a finding must become the `tests-weakened` label and not a red step, and
`/next` pastes its output in every PR body. One reader was wrong, so one
reader changes.

`scripts/judge.sh` is a symlink to the template: the template is the file to
edit. No workflow changes, so `.github/` is not touched.

Out of scope: the heuristics of `test-weakening.sh`, the `.skip(` inside a
string literal among them, which another line of the inbox owns; the prompt of
the judge in `skills/harness-init/templates/judge/prompt.md`; `docs/spec.md`,
whose 7.1 already says the script runs these gates itself.

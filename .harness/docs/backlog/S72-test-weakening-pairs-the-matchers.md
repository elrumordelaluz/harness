---
id: S72
title: test-weakening.sh calls a matcher widened only on the same expect
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-22)
---

## Goal

`test-weakening.sh` reports "matcher widened" when a test file's diff removes
any line with an exact matcher, `toBe(`, `toEqual(` and the like, and adds any
line with a loose one, `toBeDefined(`, `toBeTruthy(` and the like, anywhere in
the same file. The two lines need not have anything to do with each other, so
a translation or a reflow of a test file trips it. On PR #78 that put the
`tests-weakened` label on a clean diff, `tier.sh` read the label as tier 3,
and a judgement made at tier 2 could not merge. After this slice a widening
is reported only when a loose matcher is added on the same `expect(<subject>)`
that lost an exact one, which is what a widened matcher is.

## Acceptance criteria

- [ ] A diff that turns `expect(x).toBe(1)` into `expect(x).toBeDefined()` is reported as a widened matcher, as today.
- [ ] A diff that removes `expect(a).toBe(1)` and adds `expect(b).toBeDefined()`, two different subjects, is not reported as a widened matcher.
- [ ] A diff that only rewrites the message argument or the line breaks of an `expect(x, '...').toBe(1)` is not reported.
- [ ] The other checks of the script, skip and only, removed assertions, deleted test files, suppressions, report what they report today.
- [ ] The script stays within bash 3.2 and jq, as every template script.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/test-weakening.test.ts`, on a temporary repo built the way
  `tests/tier.test.ts` builds its own, created by S66 or new if this slice
  lands first: the three diffs of the first three criteria, each a base
  commit and a work commit on one test file. The second and third fail
  today, because the script tests for presence and not for the subject.
- Then `pnpm test` whole, and the cases of `tests/judge.test.ts` that run the
  script.

## Touchpoints

- `skills/harness-init/templates/scripts/test-weakening.sh`: the widened-matcher check.
- `tests/test-weakening.test.ts`: the three cases, the file new if S66 has not landed.

## Notes

The inbox line, 2026-09-22: `scripts/test-weakening.sh` fires on any diff that
removes a line holding `toBe(` and adds a line holding `toBeDefined(` anywhere
in the same file, without pairing them, so translating or reflowing a test
file trips it: on PR #78 it labelled a clean diff `tests-weakened`, `tier.sh`
re-read that as tier 3, and a judgement made at tier 2 could not merge. Pair
the removed and added matchers instead of testing for their presence, and the
same pass can close the line of earlier today about the script saying nothing
at all on a clean run.

Found on 2026-09-24: the check is the `if` on the two greps near the end of
`skills/harness-init/templates/scripts/test-weakening.sh`; `ci.yml` turns any
stdout into the `tests-weakened` label at
`skills/harness-init/templates/github/ci.yml:65-66`, and `tier.sh` reads the
label as tier 3 at `skills/harness-init/templates/scripts/tier.sh:188`.

The subject is the text between `expect(` and its first `,` or matching `)`,
compared as written: the heuristic is meant to send a human to look, not to
parse TypeScript. A multi-line `expect(` whose subject is on the next line
may slip through, and that is acceptable for a heuristic.

Out of scope: the clean-run line on stderr, which is S66; the count of
removed assertions, which already compares counts and not presence.

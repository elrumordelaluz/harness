---
id: S59
title: ci.yml is one job, because GitHub bills each one rounded up to the minute
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-22)
---

## Goal

GitHub bills every Actions job rounded up to the whole minute, and `ci.yml`
runs six of them on every PR: five last a few seconds and cost a minute each,
so a run that does two minutes of work costs seven. In September 2026 the
harness repo alone spent 900 of the 2,000 free minutes of the account this
way, 300 of them real work, and the same file sits in every repo that has the
harness.

After this slice `ci.yml` is one job, `ci`, with the gates as its steps. The
name of the status check does not change, so the ruleset and `policy.sh` read
what they read before. A gate that fails does not stop the job: every step
goes on, a PR shows every red gate at once, the tier lands whatever the gates
said, and the last step is red if any gate is.

## Acceptance criteria

- [ ] `templates/github/ci.yml` has one job, named `ci`, and `.github/workflows/ci.yml` is equal to it.
- [ ] Every gate that was a job is a step with `continue-on-error: true`, and the tier step and the last step run with `if: always()`.
- [ ] The last step reads the outcome of every gate and fails if one is not `success`, a step never reached included.
- [ ] `tests/architecture.test.ts` pins the one job, its name and the two `if: always()`; the existing cases on the title lint and on `prose.sh` still pass.
- [ ] `docs/spec.md` 4.5 describes the one job, with a new version in the header and a line in section 0; the paragraph of stage `ci` in `skills/harness-init/SKILL.md` says the same.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, in the describe of the wired gates: a case
  that counts one `runs-on` in the template, asks for `jobs:` to open with
  `ci:` and `name: ci`, and asks for `if: always()` on the tier step and on
  `every gate green`. Red today, because the template has six jobs.
- The two existing cases on the title lint and on `prose.sh` keep their
  regexes: the lines they match move into the one job and do not change.
- The describe that keeps `.github/` equal to the templates covers the copy.
- Then `pnpm test` whole, and the PR of this slice is the proof on the
  server: one job in the run, three minutes billed where the run before cost
  seven.

## Touchpoints

- `skills/harness-init/templates/github/ci.yml`: the one job.
- `.github/workflows/ci.yml`: the copy, put back by the step of stage `ci` that owns it.
- `tests/architecture.test.ts`: the new case, the titles of the two cases that said "job".
- `docs/spec.md`: 4.5, the header, section 0.
- `skills/harness-init/SKILL.md`: the paragraph of stage `ci` on `ci.yml`.

## Notes

The bill of September 2026, read from the job times of every run of the
account: 1,800 minutes billed for 840 of work. The harness repo is 900 of
them, 612 from `ci.yml`, and the other 750 are the tests of another repo that
has no harness and runs its suite twice per change. The 300 that stay after
this slice are close.yml on every merge, escalate.yml on every hand label and
the work of the checks themselves.

Why steps that go on and not a job that fails at the first red gate: the six
jobs reported every failure at once, and a subagent that fixes a PR reads them
all in one run. `continue-on-error` keeps that, and the last step is where the
job turns red, one line per gate that is not green. A step the job never
reached, because `pnpm install` failed before it, has no outcome and counts as
red.

Two things the six jobs hid, found on the first run of the one job. The
gitleaks action leaves `results.sarif` in the checkout, and `prettier --check
.` in the same checkout reads it and goes red: the scan runs after the checks.
And the action reads a `BASE_REF` of the env as an override of the range it
scans; the job sets one for `prose.sh` and `tier.sh`, a branch name the
checkout does not have, and the scan crashed on `main^..<sha>`: the scan step
sets `BASE_REF` empty, and the range comes from the commits of the PR again.

Out of scope: the other three workflows, which cost one minute per merge or
per hand label and have nothing to collapse; the repo that runs its suite
twice per change, which has no harness.

---
id: S81
title: /next builds a wave in parallel and lands its slices one at a time
status: todo
blocked_by: none
tier: 1
human: false
spec: inbox (2026-09-25)
---

## Goal

The ruleset of main asks for a branch that is up to date before it merges.
`/next` builds the slices of a wave in parallel from the same commit, judges
them and opens their PRs together: the first merges, `close.yml` commits on
main after it, and every other PR of the wave is behind. `policy.sh` says
`merge`, `gh pr merge` is refused, and the run stops on a crash. After this
slice the code of a wave is still written in parallel, and what follows runs
in series, in the order of the ids: a slice is brought up to date with the
default branch, judged, opened and merged before the next one starts the
same steps. Each PR is judged on the head that merges, so nobody judges
twice and the policy never meets a branch that is behind.

## Acceptance criteria

- [ ] `skills/next/SKILL.md` says the subagents of a wave run at the same time and that 4, 5 and 6 run for one slice at a time, in the order of the ids, the next slice starting when the one before is merged and closed, or has ended its run without a merge.
- [ ] It says that before the judgement of a slice the orchestrator fetches and, when `origin/<default branch>` holds a commit the branch does not, has the subagent that wrote the slice merge it into the branch, run the four commands and push, with SendMessage: the orchestrator never writes code, and a conflict is the subagent's to resolve or to report as a blocked slice.
- [ ] It says the update is a merge of the default branch into the slice branch and never a rebase or a force push, and why: the branch is the claim and is on the remote, and the squash lands one commit whatever the branch holds.
- [ ] It says the first slice of a wave skips the update when the default branch has not moved, and that `scripts/tier.sh` and `scripts/test-weakening.sh` are run again after an update, because the PR body carries their output.
- [ ] Section 6 says the wait ends on the commit of `close.yml` on the default branch and not on the merge alone, because the next slice is updated against it; with the cap passed, with `HARNESS_AUTOMERGE` off, or with a PR left to a human, the next slice of the wave still runs its steps and its PR waits like the first.
- [ ] The line per event of section 2 names the update of a branch as an event.
- [ ] The paragraph of 2 that keeps two slices with a shared path out of one wave stays as it is: the series removes the branch behind, not the conflict.
- [ ] 5.4 of `docs/spec.md` says the same in a sentence, with a new version in the header and its entry in section 0.
- [ ] `tests/architecture.test.ts` holds the sentences above in `skills/next/SKILL.md`, and the check bites on a text that tells the orchestrator to open the PRs of a wave together.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, a new describe next to
  `the slice branch of /next is born without an upstream`, reading
  `skills/next/SKILL.md` by section the way that describe does: section 3
  still says the calls of a wave go in a single message; sections 4 to 6 say
  one slice at a time and the order of the ids; the update names
  `origin/<default branch>`, a merge, SendMessage, and neither `rebase` nor
  `--force` as something to do; section 6 names the commit of `close.yml` as
  the end of the wait. Red today on every case but the first.
- Same describe: the check as a pure function, run on a sample that says the
  PRs of a wave are opened together, asserted to fail.
- Same file: 5.4 of `docs/spec.md` cut between its heading and the next one,
  asserted to say the slices of a wave land one at a time. Red today.
- The describe `the last entry of section 0 starts from the version before
the header` holds the new version as it is.
- Then `pnpm test` whole.

## Touchpoints

- `skills/next/SKILL.md`: the events of section 2, the head of section 4, section 5, section 6.
- `docs/spec.md`: 5.4, the header, the new entry of section 0.
- `tests/architecture.test.ts`: the new describe.

## Notes

The inbox line, 2026-09-25: with strict required status checks, the second PR
of a /next wave is BEHIND once the first merges, and policy.sh crashes at gh
pr merge (PR #3); either the waves or the policy have to account for it

Decided by Lionel on 2026-10-01, among four designs: `/next` lands in series.
The three set aside, so nobody builds them here: turning off
`strict_required_status_checks_policy` in the ruleset; `policy.sh` updating
the branch after the verdict, which merges a head the verdict does not name;
`policy.sh` handing a branch behind to a human.

Found on 2026-10-01: the merge with no path for a branch behind at
`skills/harness-init/templates/scripts/policy.sh:464-465`; the strict policy
at `skills/harness-init/templates/github/ruleset.json:25`; the calls of a
wave in one message at `skills/next/SKILL.md:187-189`; the judgement "for
every slice that came back green" at `:268`; the PR per slice at `:315-320`
and the verdict posted at `:340-344`; the wait and its cap at `:352-373`;
the reason a rebase is refused today, the head the verdict covers, at
`:130-134`; the message that sends findings back to the subagent, the model
for the update message, at `:288-303`; 5.4 of the spec at `docs/spec.md:505`.

The update comes before the judgement on purpose: the judge reads the head
that will merge, and ADR-0003, one judgement per PR, holds without a new
rule. A slice whose subagent has ended and cannot be reached with SendMessage
is reported in the hand-back with its branch as it is, not updated by the
orchestrator.

The cost is wall-clock time: a wave of three waits for three CI runs and
three closes in a row where it waited for one. That was weighed and accepted.

Out of scope: `policy.sh` and the ruleset, which do not change; a PR opened
by hand, outside `/next`, that falls behind; the crash of `policy.sh` on a
refused merge, which stays a crash and is a line for the inbox if it shows
up again.

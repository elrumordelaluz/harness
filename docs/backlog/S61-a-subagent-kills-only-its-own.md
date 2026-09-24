---
id: S61
title: A subagent of /next kills only the processes it started
status: todo
blocked_by: none
tier: 1
human: false
spec: inbox (2026-09-21)
---

## Goal

`/next` runs its slices in parallel, one subagent per worktree, all on the
same machine. A subagent whose suite hung ran `pkill -f vitest`, which matches
every vitest on the machine, and killed the suite another subagent was running
in its own worktree. That subagent saw two runs end at exit 143 with no output
and no red case to read. After this slice the brief every subagent receives
says that a process is stopped by the PID it started, or by a pattern that
names its own worktree path, and never by a pattern that reaches the other
checkouts.

## Acceptance criteria

- [ ] The subagent block of `skills/next/SKILL.md` has a rule that forbids killing by a pattern that does not name the worktree path, `pkill -f vitest` given as the example, and says why: the other slices of the wave run on the same machine.
- [ ] `tests/architecture.test.ts` has a case that fails when that rule is not in the subagent block of `skills/next/SKILL.md`.
- [ ] `docs/spec.md` says the same where it lists the guardrails of the subagents of `/next` (5.4), with a new version in the header and a line in section 0.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, next to the describe
  `the slice branch of /next is born without an upstream`: a case that reads
  the fenced subagent block of `skills/next/SKILL.md` and asserts it contains
  `pkill -f vitest` together with the words that forbid it. Red today, because
  the block names no kill at all.
- Then `pnpm test` whole.

## Touchpoints

- `skills/next/SKILL.md`: one rule in the subagent block.
- `docs/spec.md`: 5.4, the header, section 0.
- `tests/architecture.test.ts`: the new case.

## Notes

The inbox line, 2026-09-21: `pkill -f vitest` launched from the worktree of a
slice also killed the suite running in the worktree of another one, and the
subagent that was hit saw two runs at exit 143 with no output instead of a red
case: an agent that shares the machine has to restrict the kills to its own
checkout.

The subagent block is `skills/next/SKILL.md:194-238`; rule 1 already pins
every command to the worktree with `cd <the worktree path> &&`, and the new
rule belongs next to it. A test that pins a sentence of the same block is at
`tests/architecture.test.ts:1991`.

Out of scope: a watchdog or a timeout on the suite, which is a design and not
a line of the brief; the skills other than `/next`, which do not run
subagents in parallel.

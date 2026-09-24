---
id: S68
title: The subagent of /next runs the two scripts against origin, not the local main
status: todo
blocked_by: none
tier: 1
human: false
spec: inbox (2026-09-22)
---

## Goal

Point 4 of the brief a subagent of `/next` receives says to run
`scripts/tier.sh <default branch>` and `scripts/test-weakening.sh
<default branch>`, and the subagent passes `main`: the local branch, which
falls behind every time `close.yml` commits on the remote after a merge. From
a worktree the local `main` cannot be refreshed either, because `git fetch
origin main:main` is refused while `main` is checked out in the shared
checkout. The result is a tier computed on a diff that holds the files of
slices already merged. After this slice the brief says `git fetch origin` and
then `origin/<default branch>` for both scripts, the same ref the worktree
was cut from, and never the local branch.

## Acceptance criteria

- [ ] Point 4 of the subagent block of `skills/next/SKILL.md` runs `git fetch origin` and passes `origin/<default branch>` to `scripts/tier.sh` and to `scripts/test-weakening.sh`, with the reason in one sentence: the local branch lags behind `close.yml`, and from a worktree it cannot be moved.
- [ ] `tests/architecture.test.ts` has a case that fails when the subagent block passes the bare `<default branch>` to either script.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, in the describe
  `the slice branch of /next is born without an upstream`, which already
  reads the same block: a case that asserts
  `scripts/tier.sh origin/<default branch>` and
  `scripts/test-weakening.sh origin/<default branch>` are in the file and
  that no line of the subagent block passes `<default branch>` without
  `origin/`. Red today on point 4.
- Then `pnpm test` whole.

## Touchpoints

- `skills/next/SKILL.md`: point 4 of the subagent block.
- `tests/architecture.test.ts`: the new case.

## Notes

The inbox line, 2026-09-22: from a slice worktree `git fetch origin main:main`
is refused, "refusing to fetch into branch 'refs/heads/main' checked out at
...", so the recipe for refreshing the local main after a `close.yml` does not
work where `/next` runs its subagents, and `scripts/tier.sh main` there
reports the files of slices already merged; `git fetch origin` and reading
`origin/main` does work. Reported by S54 and S55 on the same run.

Found on 2026-09-24: point 4 at `skills/next/SKILL.md:216-217`; the worktree
is cut from `origin/<default branch>` at `skills/next/SKILL.md:154`. The
`main:main` recipe the line names is in no document of the repo.

Out of scope: `/judge`, whose base is "the remote's default branch" at
`skills/judge/SKILL.md:80` and which runs in the shared checkout; the
`pre-push` hook and whatever it reads of the local main.

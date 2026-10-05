---
id: S98
title: A merge GitHub refuses is reported as refused, not as a crashed judge
status: todo
blocked_by: none
tier: 2
human: false
spec: inbox (2026-10-02)
---

## Goal

When `policy.sh` decides `merge` and GitHub refuses it, for a branch behind
the default branch or for any other reason, the failing `gh pr merge` trips
the ERR trap and the run ends in `crashed()`. The PR then carries the
verdict comment and `judge:<role>:approve`, and right after them
`judge:<role>:crashed` and a comment that says "nothing was stored" and
asks for `/judge` again. Both are false: the verdict is stored and posted,
and a second judgement on the same PR is what ADR-0003 forbids. After this
slice a refused merge has its own outcome. The judgement stays as it was
posted, the PR says the merge was refused and why, the human is notified,
and the script exits non-zero so that whoever ran it sees it.

## Acceptance criteria

- [ ] With the decision `merge` and both `gh pr merge` calls failing, `policy.sh` does not add `judge:<role>:crashed`, does not remove `judge:<role>:approve`, and posts no comment that says "nothing was stored" or "Run /judge again".
- [ ] In the same run one comment on the PR says the merge was refused and carries the stderr of the last `gh pr merge`, and the notification leaves when `NTFY_TOPIC` is set.
- [ ] The same run exits non-zero and prints `policy: merge refused` on stderr.
- [ ] A merge that succeeds behaves as today: the cases of `policy.sh, who may merge` stay green unchanged.
- [ ] A read of GitHub that fails before the decision is still a crash: `policy.sh, a policy that crashed` stays green unchanged.
- [ ] The header comment of `policy.sh` lists the refused merge next to the other outcomes.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/policy.test.ts`, a new describe `policy.sh, a merge GitHub refuses`
  after `policy.sh, a policy that crashed` (near `:564`): a tier 1 approve
  with automerge on and `fail: 'pr merge'`, the stub option that makes every
  call matching the text fail. Three cases, one per criterion of the first
  three: the labels and the absence of the crash text; the comment with the
  refusal and the `curl` call with `ntfy` set; the exit status and stderr.
  Red today, because the run ends in `crashed()` with status 0 and the crash
  label.
- The existing describes named in the fourth and fifth criteria are not
  touched and must stay green.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/scripts/policy.sh`: the `merge)` branch of the last `case`, near `:460-466`, and the header comment near `:20-58`.
- `tests/policy.test.ts`: the new describe.

## Notes

The line, 2026-10-02: `policy.sh` labels a merge refused for a branch behind
as `judge:<role>:crashed` and says "nothing was stored", while the verdict is
posted as approve (PR #21); S81 left this crash out of scope.

Still true on main at the time of writing: the two merge calls are at
`skills/harness-init/templates/scripts/policy.sh:464-465`, the ERR trap at
`:152`, the crash text at `:117`, and the verdict comment and the label go
out before the merge at `:441-447`. S81 made `/next` bring a branch up to
date before it is judged, so the case is rarer from `/next`, and still the
one a PR opened by hand meets (`.harness/docs/backlog/S81-next-lands-the-slices-of-a-wave-one-at-a-time.md`, Out of scope).

The ERR trap stays armed everywhere else: only the merge call is taken out
of it, so that every other failing call to GitHub is still a crash.

Out of scope: retrying the merge or updating the branch from `policy.sh`,
which would change the head the verdict covers; `automerge.yml`, which is a
different merge path.

---
id: S87
title: A session bootstraps the clone, and a clone off the pin cannot commit
status: done
blocked_by: S85
tier: 2
human: false
spec: .harness/docs/specs/SPEC-harness-in-one-folder.md
---

## Goal

A teammate clones, opens Claude Code and works: a `SessionStart` hook in the
tracked `.claude/settings.json` runs `.harness/bootstrap.sh`, so the
machinery and the git hooks are there with no step by hand. When the pin
moves and the clone has not followed, the three git hooks refuse and name the
bootstrap, so two clones never commit under two sets of rules. A bootstrap
that fails never stops a session.

## Acceptance criteria

- [ ] `templates/settings.json` has a `SessionStart` hook whose command runs `"$CLAUDE_PROJECT_DIR"/.harness/bootstrap.sh`.
- [ ] That command exits 0 when the bootstrap exits non-zero, and what the bootstrap wrote on stderr is printed.
- [ ] With `.harness/bin/.sha` different from the `pin.sha` of `.harness/stamp.json`, `pre-commit`, `commit-msg` and `pre-push` each exit non-zero with one line that names `.harness/bootstrap.sh`, before any other check.
- [ ] The same when the marker is missing, or when the stamp has no `pin.sha`.
- [ ] With the marker equal to the pin the three hooks do what they did.
- [ ] `HARNESS_ALLOW_MAIN=1` does not open this refusal.
- [ ] In a repo where `.harness/bin` is tracked, this one, the hooks do not look for a marker.
- [ ] `.claude/settings.json` of this repo has the `SessionStart` hook too, and stays the template without the verdict hook.
- [ ] 6.1 of `docs/spec.md` says the check and the `SessionStart` hook, with a new version in the header and its entry in section 0.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/hooks.test.ts`, first, a new describe `a clone off the pin`: the
  fixture of `repo()` gains a `.harness/stamp.json` with a pin and a
  `.harness/bin/.sha`. Cases: marker different, a `git commit` is refused by
  `pre-commit` with the line; the same commit with `--no-verify` off and a
  message file reaches `commit-msg` only when `pre-commit` is not installed,
  so each hook is run as a process on its own, the way the describes above do
  for `pre-push`; marker missing; `pin.sha` missing;
  `HARNESS_ALLOW_MAIN=1` with a marker that differs, still refused. Red today.
- Same file: every existing case runs with marker and pin equal and stays
  green, which holds the fifth criterion.
- Same describe: a fixture with `.harness/bin` tracked and no marker, the
  commit goes through.
- `tests/bootstrap.test.ts`, a new describe on the command of `SessionStart`:
  read from `templates/settings.json` with `jq`, run with `bash -c` and
  `CLAUDE_PROJECT_DIR` on a fixture whose `.harness/bootstrap.sh` prints a
  reason on stderr and exits 1: status 0, the reason in the output. Then with
  the real template on a pin that cannot be fetched. Red today: no such hook.
- `tests/architecture.test.ts`, the describe `.claude/settings.json is the
template without the verdict hook`: it holds with the new hook on both
  sides.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/githooks/pre-commit`, `commit-msg`, `pre-push`: the check of the marker against the pin, first.
- `skills/harness-init/templates/settings.json`: the `SessionStart` hook.
- `.claude/settings.json`: the same hook here.
- `tests/hooks.test.ts`, `tests/bootstrap.test.ts`, `tests/architecture.test.ts`.
- `docs/spec.md`: 6.1, the header, section 0. `docs/codebase-map.md`: the row of `.claude/settings.json`.

## Notes

Decisions of the spec. `bootstrap.sh` writes the sha it fetched in a marker
inside `.harness/bin/`, and every git hook compares it with `pin.sha` first:
on a mismatch the hook refuses and names `.harness/bootstrap.sh`, because
failing open would let two clones commit under two sets of rules. The
`SessionStart` hook prints the reason of a failed bootstrap and lets the
session start; in CI the same failure is a red job, which S85 wired. A clone
where nobody opened Claude Code or ran the bootstrap has no git hooks, and
that is accepted: CI runs every gate on the PR.

The marker is `.harness/bin/.sha`, one line, the full sha, as S84 writes it.
The pin is read with `jq` from the working tree: the pin a commit carries is
the one being committed, and a commit that moves the pin is made after
running the bootstrap on the new one.

The `SessionStart` hook is written after reading its current doc in the
Claude Code documentation, never from memory: the name of the event, the
shape of the entry, what an exit code does to the session, where stdout and
stderr go. The spec asks for it in so many words.

The check is three copies of a few lines, or one function the hooks source
from `.harness/bin/`: this slice's call. A hook that cannot source its helper
because `.harness/bin/` is half there must still refuse.

This repo has no pin and no marker, and its `.harness/bin` is tracked: the
rule that spares it is the one the bootstrap uses in S85.

Out of scope: a `prepare` script in the project's `package.json`, rejected by
the spec because the harness cannot add it as a marked block; a hook manager
already in the project; running the bootstrap from a git hook.

---
id: S77
title: later/ is gone and its documents are parked where they belong
status: done
blocked_by: S74
tier: 1
human: false
spec: docs/specs/SPEC-intent-and-spec-later-state.md
---

## Goal

`docs/intent/later/` and `docs/specs/later/` are the workaround the spec
replaces. After this slice they no longer exist: `audit-sample` (intent and
draft spec) and `roadmap-view` move back to `docs/intent/` and `docs/specs/`
and are parked in `docs/parked.md` in the same commit, and the empty skeleton
`harness-inbox-across-repos.md` is deleted, its idea a line of the inbox. The
board on the default branch lists the three under `Parked` and names none of
them as the next action.

## Acceptance criteria

- [ ] `docs/intent/later/` and `docs/specs/later/` are gone.
- [ ] `docs/intent/audit-sample.md`, `docs/intent/roadmap-view.md` and `docs/specs/SPEC-audit-sample.md` are tracked, the last with `intent: docs/intent/audit-sample.md`, and all three have a line in `docs/parked.md` dated 2026-09-24, in the same commit as the move.
- [ ] `docs/intent/later/harness-inbox-across-repos.md` is deleted and `docs/inbox.md` carries one dated line for its idea, the path that carries feedback from a project repo back to this one.
- [ ] `board.sh` on the tree of this commit names none of the three as a next action and lists them under `Parked`.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, a describe "later/ is gone": no tracked path
  under `docs/intent/later/` or `docs/specs/later/`; every line of
  `docs/parked.md` names a tracked file; the three paths are among them;
  `SPEC-audit-sample.md` names `docs/intent/audit-sample.md` in `intent:`.
  Red today: the folders are there and the list is empty.
- The same describe runs `scripts/board.sh --json` on the repo and asserts
  that `parked` holds the three paths and that `next.action` names none of
  them. Red: before the move the three are not in `parked`.

## Touchpoints

- `docs/intent/later/audit-sample.md` to `docs/intent/audit-sample.md`: moved.
- `docs/intent/later/roadmap-view.md` to `docs/intent/roadmap-view.md`: moved.
- `docs/specs/later/SPEC-audit-sample.md` to `docs/specs/SPEC-audit-sample.md`: moved, `intent:` updated, nothing else.
- `docs/intent/later/harness-inbox-across-repos.md`: deleted.
- `docs/parked.md`: three lines.
- `docs/inbox.md`: one line.
- `tests/architecture.test.ts`: the new describe.

## Notes

The three lines, dated 2026-09-24, the day `later/` was made, with the whys
confirmed in the interview of the spec:

- `docs/intent/audit-sample.md`: interview stopped at Q8, the priority is
  using the harness in the project repos.
- `docs/specs/SPEC-audit-sample.md`: the same.
- `docs/intent/roadmap-view.md`: wanted after the harness is in use on
  Tipoff.

The inbox line carries today's date and says the idea of
`harness-inbox-across-repos`, which never got its three sections: the path
that brings feedback from a project repo back to the harness repo, the line
that `docs/intent/harness-stamp-in-the-repo.md` leaves out of scope. The
stamp it waited on is done (S56).

The move and the three lines are one commit: in between, the board would
name `/spec` for the intents and list the draft spec as waiting on a human.

The PR touches `docs/intent/**`, `docs/specs/**` and `docs/inbox.md`, which
are `human_gate_paths`: it takes the `human-gate` label and waits for
Lionel's merge whatever its tier.

Out of scope: rewriting any of the three documents, deciding whether any of
them comes back live, which is `park.sh resume` after S75.

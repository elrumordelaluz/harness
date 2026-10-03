---
id: S91
title: The board prints the pin on its first line, next to the stages
status: done
blocked_by: none
tier: 2
human: false
spec: docs/specs/SPEC-harness-in-one-folder.md
---

## Goal

Whoever opens a cold session reads on the first line of the board which
commit of the harness the machinery of this repo is pinned to, before the
three stages that say which commit last wrote the tracked files. With one
`.harness/bin/` there is one version of the machinery, and three stage shas
cannot name it: the pin does.

## Acceptance criteria

- [ ] With a `.harness/stamp.json` that has `pin.sha` and `pin.date`, the `Harness` line of `board.sh` prints the pin, short sha and date, before the three stages, on the same line.
- [ ] A stamp with stages and no `pin` prints `-` for the pin, the way a stage that never ran prints `-`, and the stages as today.
- [ ] `--json` carries the pin under the `harness` key: `origin`, the full `sha` and `date`, or `null` when the stamp has none.
- [ ] No stamp, an unreadable stamp and the harness repo itself print what they print today.
- [ ] The line still fits its column: the cases of `the screen fits in forty lines` stay green as they are.
- [ ] The header comment of `board.sh` describes the line, 5.7 of `docs/spec.md` says it with a new version in the header and its entry in section 0, and `skills/board/SKILL.md` quotes the line as it prints.
- [ ] Bash 3.2 and jq, nothing else. Suite, typecheck, format and build green.

## Test plan

- `tests/board.test.ts`, the describe `the Harness line says where the repo
took the harness from`, first, on its option that writes the stamp: a stamp
  with a pin and three stages, the line asserted with the pin before the
  stages; a stamp with stages and no pin; a stamp whose pin is the same commit
  as the three stages. Red today: the script does not read `pin`.
- Same file, `--json is the data model behind the screen`: `harness.pin` for
  the three fixtures, and `null` for the one without. Red today.
- Same file, `the Harness line marks a sha that is not to be trusted`: the
  cases stay as they are, the dirty mark is of a stage and never of the pin.
- `tests/architecture.test.ts`, the describe `the skills and the spec quote
the board as it prints today`: it goes red when the line changes and green
  when the quotes follow.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/scripts/board.sh`: the reading of the stamp near `:123-155`, the `stamp` function near `:631`, the header comment.
- `tests/board.test.ts`: the new cases.
- `skills/board/SKILL.md`: the quoted line.
- `docs/spec.md`: 5.7, the header, section 0.

## Notes

The decision of the spec. `.harness/stamp.json` gains one key, `pin`, with
`origin`, `sha` and `date`: the one commit `bootstrap.sh` and the workflows
fetch, and the line a reviewer watches. `stages` stays, and an entry now says
which commit last wrote the tracked files of that stage, which can still lag
the pin. That is why both are on the line.

The shape: `{"harness": "...", "pin": {"origin": "...", "sha": "...",
"date": "..."}, "stages": {...}}`. The script reads the file where it does
today, `.harness/stamp.json`, and writes nothing.

A pin is never dirty and never null in a stamp a stage wrote: a stage run
from a dirty checkout leaves the pin as it was (S92). So the pin has two
states on the screen, a short sha with its date, or `-`.

The line is the first of the board and the board keeps forty lines by
cutting rows in number since S83, and each row at its column: if the pin
makes the line too long, the dates of the stages give way before the pin
does. The wording of the line is this slice's call; whatever it is, the skill
and the spec quote it, and the describe above holds the three equal.

`board.sh` in this repo prints `this is the harness` with its own HEAD and
has no stamp: nothing changes here but the code.

Out of scope: comparing the pin with `.harness/bin/.sha` on the board, which
the hooks do (S87); a next action that says "run the bootstrap".

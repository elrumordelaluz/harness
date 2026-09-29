---
id: S74
title: The board lists parked documents and never picks one as the next action
status: todo
blocked_by: none
tier: 2
human: false
spec: docs/specs/SPEC-intent-and-spec-later-state.md
---

## Goal

The walking skeleton of the parked state. A line in `docs/parked.md`,
`- <YYYY-MM-DD>: <path>: <why>`, written by hand for now, takes an intent or a
spec out of the next action and out of "Waiting on a human", and shows it in
a `Parked` section of the board and a `parked` key of `--json`. The file
ships as a template of the `local` stage, created if missing like the inbox,
and joins `human_gate_paths` so a commit of it lands on main. After this
slice a cold session sees what waits and why, and the command that writes the
line (S75) has somewhere to write.

## Acceptance criteria

- [ ] `board.sh` prints a `Parked` section after "Waiting on a human", one row per line of `docs/parked.md`: kind (`intent`, `spec draft`, `spec approved`, or `missing`), slug, date and why cut at the column.
- [ ] With no line, or no `docs/parked.md`, the section is one row that says nothing is parked.
- [ ] `board.sh --json` has a `parked` key, an array of `path`, `kind`, `status`, `date` and `why` whole, `[]` when nothing is parked.
- [ ] A parked intent with no spec does not fire `intent with no spec`; a parked approved spec with no slice does not fire `approved spec with no slice`; a parked draft spec is not a row under "Waiting on a human".
- [ ] A line whose path is not in the working tree is a row with kind `missing`, and the board exits 0.
- [ ] `tests/architecture.test.ts` holds the name `Parked` equal in `board.sh` and in `skills/board/SKILL.md`.
- [ ] `skills/harness-init/templates/docs/parked.md` is the header with no entry, `docs/parked.md` opens with it, and `templates/README.md` has its row, stage `local`, created if missing.
- [ ] `docs/parked.md` is in `human_gate_paths` of `AGENTS.md` and of `skills/harness-init/templates/AGENTS.md`, and a test says so.
- [ ] The screen of a board with four parked lines still fits the forty lines of the existing case.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/board.test.ts`: the fixture gains a `parked` option that writes
  `docs/parked.md`. A new describe, "the Parked section lists what waits and
  why": the rows and their kinds, the empty row, the `missing` row. In "the
  next action is the first rule that fires", one case per rule that skips: a
  parked intent, a parked approved spec, each with the next rule firing
  instead. In "the human section", a parked draft spec is not a row. In
  "--json is the data model", the `parked` key whole and `[]`. All red today:
  the script does not read the file.
- `tests/architecture.test.ts`: in the describe of `skills/board/SKILL.md`,
  a case that reads the section name from `board.sh` and finds it in the
  skill; next to "docs/inbox.md is a template plus the entries of this repo",
  the same pair of cases for `docs/parked.md`; next to "AGENTS.md lets a line
  of inbox land", the same for `docs/parked.md`. Red: the file and the lines
  do not exist.

## Touchpoints

- `skills/harness-init/templates/scripts/board.sh`: read `docs/parked.md` next to the inbox (around `:222`), skip parked paths in `$unsliced` and `$unspecced` (`:475-477`) and in the draft rows (`:596`, `:605`), the `parked` key, the `Parked` section on the screen, the header comment.
- `skills/harness-init/templates/docs/parked.md`: new, the header: what a line means, its form, that `scripts/park.sh` writes it.
- `docs/parked.md`: new, the header and no entry.
- `skills/harness-init/templates/README.md`: the row of `docs/parked.md`.
- `skills/harness-init/SKILL.md`: step 4 of `local` (`:195-201`) writes `parked.md` only if it is not there, as `inbox.md`.
- `AGENTS.md`, `skills/harness-init/templates/AGENTS.md`: `docs/parked.md` in `human_gate_paths` and in the "Human gates" prose.
- `skills/board/SKILL.md`: the `Parked` section named in 2, as data the skill shows and does not ask about.
- `tests/board.test.ts`, `tests/architecture.test.ts`: the cases above.

## Notes

Decisions of the spec that bind this slice:

- The state lives in a list file, `docs/parked.md`, one line per document,
  `- <YYYY-MM-DD>: <path>: <why>`, in the form of the inbox. Documents never
  move and never change. A frontmatter field and a folder were rejected: the
  first writes into the human's intent, the second breaks the `intent:` field
  of the spec that names a moved file.
- Parkable: an intent that no spec names, a `draft` spec, an `approved` spec
  that no slice names. The board does not check this, `park.sh` does (S75):
  here any line is shown, and a line on a document in another state is shown
  with its kind all the same.
- An empty section is a row that says so (`board.sh:29-32`). A stale line is
  a row, never an error, as a `gh` that cannot answer.
- `docs/parked.md` in `human_gate_paths`: without it the pre-commit hook
  refuses a commit of it on main.

The rules of the next action keep their names and their order: the parked
filter changes what feeds rules 3 and 4, not the rules, so the existing
architecture case on their order stays as it is.

`/harness-init local` merges the policy block key by key (architecture
describe at `:2132`): the new entry travels to the project repos with the
next run of the stage, which is not a step of this slice.

Out of scope: the command (S75), `/spec` and `/slice` (S76), the files of
`later/` (S77), parked slices, reminders or expiry dates.

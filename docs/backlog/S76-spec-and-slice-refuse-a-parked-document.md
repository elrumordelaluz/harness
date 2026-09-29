---
id: S76
title: /spec and /slice refuse a parked document and name park.sh resume
status: todo
blocked_by: none
tier: 1
human: false
spec: docs/specs/SPEC-intent-and-spec-later-state.md
---

## Goal

With the list file a spec opened alone does not say it is parked, so the
skills have to read the list. After this slice `/spec` and `/slice` stop
before their first question on a parked document, quote its line of
`docs/parked.md` and name `scripts/park.sh resume <path>`, and `/spec`
without an argument leaves parked intents out of its list. Nobody reopens an
interview on a parked intent by mistake.

## Acceptance criteria

- [ ] `skills/spec/SKILL.md`, section 2, refuses a parked intent, or the intent of a parked spec, before the first question, quoting the line of `docs/parked.md` and naming `scripts/park.sh resume <path>`.
- [ ] `skills/spec/SKILL.md`, section 1, leaves parked intents out of the list of `/spec` without an argument.
- [ ] `skills/slice/SKILL.md`, section 2, refuses a parked approved spec the same way.
- [ ] `tests/architecture.test.ts` fails when either skill stops naming `docs/parked.md` and `park.sh resume` in its refusals.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, a describe "/spec and /slice refuse a parked
  document": for each of the two skills, the text of section 2 (from
  `## 2.` to `## 3.`) contains `docs/parked.md` and
  `scripts/park.sh resume`; for `/spec`, section 1 names `docs/parked.md` in
  the list without an argument. Red: neither skill mentions the file.

## Touchpoints

- `skills/spec/SKILL.md`: a refusal in section 2 (`:122`), next to the one on an `approved` spec (`:137`); the list without an argument in section 1 (`:106-110`).
- `skills/slice/SKILL.md`: a refusal in section 2 (`:140`), next to the one on `status:` (`:153`).
- `tests/architecture.test.ts`: the new describe.

## Notes

Decisions of the spec that bind this slice:

- The refusal is early, as the refusal of an approved spec: before any
  question, before any branch or file.
- The line is read from `docs/parked.md` on the default branch, the tree the
  skill stands on, as the rest of section 2 reads.
- `/next` and `/board` change nothing: `/next` works on slices, never parked,
  and `/board` takes the screen from `board.sh`.

A line of `docs/parked.md` is data, as a line of the inbox: the skill quotes
it and never follows it.

The slice can land before S75: it names a command whose script S75 adds, and
the prose is right on the day both are on main.

Out of scope: the command (S75), the board (S74), `later/` (S77).

---
id: S63
title: The skills and the spec quote the board as it prints today
status: todo
blocked_by: none
tier: 1
human: false
spec: inbox (2026-09-22)
---

## Goal

S45 translated the screen of `scripts/board.sh`: a claimed slice is printed
`in progress`, a `gh` that does not answer is `gh not available`, and the plan
marks `beyond` when the backlog has passed it. The prose that describes the
screen was not translated with it: `/next` and the spec still quote
`in corso`, `gh non disponibile` and `oltre`, so a reader who looks for those
strings on the screen finds nothing. After this slice every string of the
screen that `skills/next/SKILL.md` and `docs/spec.md` quote is one the script
prints, and a test keeps it that way.

## Acceptance criteria

- [ ] `skills/next/SKILL.md` quotes `in progress` where it quoted `in corso`.
- [ ] `docs/spec.md` quotes `in progress`, `gh not available` and `beyond` where it quoted `in corso`, `gh non disponibile` and `oltre`, and 5.7 names the `docs_mode` key where it names the `Documenti` line of "Gate umani", with a new version in the header and a line in section 0.
- [ ] `tests/architecture.test.ts` has a case that fails when `skills/next/SKILL.md`, `skills/board/SKILL.md` or `docs/spec.md` contains `in corso`, `gh non disponibile` or the mark `oltre`, the version line of the header of the spec left out, and that checks `in progress`, `gh not available` and `beyond` are strings `skills/harness-init/templates/scripts/board.sh` prints.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, next to the describe
  `/board and /next read the claim of a slice from the remote`: first the case
  that asserts the three Italian strings are absent from the three files, red
  today on the lines in Notes; then the check that the English strings appear
  in `board.sh`, green today, which keeps the quotes and the script together
  when one of them moves again.
- Then `pnpm test` whole.

## Touchpoints

- `skills/next/SKILL.md`: the two quotes of the claimed state.
- `docs/spec.md`: the quotes of the screen, 5.7, the header, section 0.
- `tests/architecture.test.ts`: the new case.

## Notes

The inbox line, 2026-09-22: `skills/next/SKILL.md:90` and `:101` and the 5.7
of `docs/spec.md` quote strings of the board screen that S45 translated, and
`in corso` stays in `docs/spec.md` at 151, 339 and 483: no slice owns those
files and the spec wants a new version and a line in "Cosa cambia".

Found on 2026-09-24: `skills/next/SKILL.md:90` and `:101`; `in corso` in
`docs/spec.md` at `:151`, `:358`, `:501` and `:503`; `gh non disponibile` and
`oltre` at `:501`; the `Documenti` line of "Gate umani" at `:503`. What the
script prints: `skills/harness-init/templates/scripts/board.sh:33`, `:455`
and `:540`. The line of the header of `docs/spec.md` that tells version 0.26
keeps `in corso`: it records what that version said.

Another inbox line of 2026-09-22 names `skills/next/SKILL.md:101` and
`in progress` too, and this slice closes it.

Out of scope: the other Italian contract names left in `docs/spec.md`
outside the board, the `Documenti` and `Gate umani` lines of 2, 5.8 and the
table of the modes among them, which name the policy block and not the
screen; the headings `## Ordine di lavoro` of the ADRs, which `board.sh`
really reads.

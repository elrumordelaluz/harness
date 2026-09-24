---
id: S65
title: /spec writes None. under Open questions, and /slice still reads Nessuna.
status: todo
blocked_by: none
tier: 1
human: false
spec: inbox (2026-09-22)
---

## Goal

When a spec has no open questions left, `/spec` writes a sentinel under
"Open questions", and `/slice` refuses a spec whose section says anything
else. S44 moved the eight section names of the spec to English, but the
sentinel stayed `Nessuna.`, so every new English spec ends its last open
section with an Italian word. After this slice `/spec` writes `None.`.
`/slice` accepts `None.` and `Nessuna.` both, because the specs already
approved on main in this repo and in the project repos carry `Nessuna.`, and
refusing them would leave an approved spec that cannot be sliced.

## Acceptance criteria

- [ ] `skills/spec/SKILL.md` writes and checks `None.` everywhere it wrote and checked `Nessuna.`.
- [ ] `skills/slice/SKILL.md` refuses a spec whose "Open questions" is anything but `None.` or `Nessuna.`, and says in the same sentence that `Nessuna.` is what the specs before this slice carry.
- [ ] `tests/architecture.test.ts` has a case that fails when `skills/spec/SKILL.md` names `Nessuna.`, and one that fails when `skills/slice/SKILL.md` does not name both `None.` and `Nessuna.`.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`: two cases in one describe. The first reads
  `skills/spec/SKILL.md` and asserts it contains `` `None.` `` and not
  `Nessuna.`, red today. The second reads `skills/slice/SKILL.md` and asserts
  it contains both, red today because it names only `Nessuna.`.
- Then `pnpm test` whole.

## Touchpoints

- `skills/spec/SKILL.md`: the sentinel at the three points where it appears.
- `skills/slice/SKILL.md`: the refusal on open questions.
- `tests/architecture.test.ts`: the new describe.

## Notes

The inbox line, 2026-09-22: the sentinel `Nessuna.` that `/spec` writes under
"Open questions" and `/slice` reads back stayed Italian when the eight
sections went to English with S44: it is a value and not a section name, and
no criterion covers it.

Found on 2026-09-24: `skills/spec/SKILL.md:118`, `:263` and `:373`;
`skills/slice/SKILL.md:155`. The skeleton `skills/spec/templates/SPEC.md:22`
leaves the section empty and needs no change. Specs on main that carry
`Nessuna.`: `docs/specs/SPEC-board.md`, `SPEC-english-first.md`,
`SPEC-harness-stamp-in-the-repo.md`, `SPEC-spec-skill.md`.

Out of scope: rewriting the specs already approved, which are records;
`docs/spec.md`, which does not quote the sentinel.

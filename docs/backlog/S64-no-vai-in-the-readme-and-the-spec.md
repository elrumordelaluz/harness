---
id: S64
title: The README and the spec say how /next starts today, with no "vai"
status: done
blocked_by: none
tier: 1
human: false
spec: inbox (2026-09-22)
---

## Goal

`/next` used to start the whole board when the human said "vai". S46 took the
Italian triggers out of the `description`s of the skills, and today `/next`
starts on `/next`, "take the board", "build the slices" or "take the next
slice". The commands table of the README and six points of the spec still say
"vai" runs all, so whoever reads them types a word that triggers nothing.
After this slice the README and the spec say what starts `/next` today, and a
test keeps "vai" from coming back as a trigger.

## Acceptance criteria

- [ ] The `/next` row of the commands table in `README.md` says `/next` runs every eligible slice and `/next S12` runs one, with no "vai".
- [ ] `docs/spec.md` no longer quotes "vai" as what starts `/next` in 2, 4.4, 5.4 and the open questions; the steps of the plan in 9 that tell what was built keep their history but do not name "vai" as a trigger in force; a new version in the header and a line in section 0.
- [ ] `tests/architecture.test.ts` has a case that fails when `README.md`, a `skills/*/SKILL.md` or `docs/spec.md` outside its header line contains `"vai"`.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, next to the cases on the `description`s of
  the skills: a case that reads the three sources and asserts none contains
  `"vai"`, skipping the version line of the header of `docs/spec.md`, which
  records what 0.14 said. Red today on the lines in Notes.
- Then `pnpm test` whole.

## Touchpoints

- `README.md`: the `/next` row of the commands table.
- `docs/spec.md`: the quotes of "vai", the header, section 0.
- `tests/architecture.test.ts`: the new case.

## Notes

The inbox line, 2026-09-22: `README.md:15` and six points of `docs/spec.md`
quote `"vai"` as a trigger of `/next`, which S46 took out of the
`description`s: the cell of the commands table and the quotations of the spec
say something that does not happen any more.

Found on 2026-09-24: `README.md:15`; `docs/spec.md` at `:100`, `:366`,
`:477`, `:678`, `:680` and `:714`. The triggers in force are in the
`description` of `skills/next/SKILL.md:3-12`.

`README.md` is not among the document paths of the policy block, so this
slice travels on a PR with the gates like any other.

Out of scope: the ADRs and the old slices that quote "vai", which record what
was true when they were written; the other Italian of `docs/spec.md`, which
S63 and other inbox lines own.

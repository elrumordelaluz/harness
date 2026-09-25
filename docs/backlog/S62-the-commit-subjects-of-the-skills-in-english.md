---
id: S62
title: The commit subjects the skills prescribe are in English
status: done
blocked_by: none
tier: 1
human: false
spec: inbox (2026-09-22)
---

## Goal

The six skills were translated, but the model commit subjects inside them were
left in Italian, and every run of `/board` and `/spec` still writes Italian
into `git log`: `docs(backlog): s<NN> dall'inbox`, `docs(backlog): togli
ADR-<nnnn> da blocked_by`, `docs(spec): chiude le domande di <slug>`, and the
placeholder `<perché>` of `docs(inbox): <perché>`. S50 took the bodies of
`skills/*/SKILL.md` whole and did not decide whether a subject is prose. This
slice decides that it is: after it every model subject of the skills is in
English, the test that pins them asserts the English, and `docs/spec.md`
quotes the same strings.

## Acceptance criteria

- [ ] `skills/board/SKILL.md` prescribes `docs(backlog): s<NN> from the inbox`, `docs(backlog): take ADR-<nnnn> out of blocked_by` and `docs(inbox): <why>`, in the model commands and in the prose around them.
- [ ] `skills/spec/SKILL.md` prescribes `docs(spec): close the questions of <slug>`.
- [ ] `tests/architecture.test.ts` asserts the English subjects where it asserted the Italian ones, and a case fails when any of the four Italian strings is back in a `skills/*/SKILL.md`.
- [ ] The test that passes every model subject of the skills to `commitlint.sh` still passes with the new ones.
- [ ] `docs/spec.md` quotes the English subjects in 2 and 5.7, with a new version in the header and a line in section 0.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`: first a new case that reads every
  `skills/*/SKILL.md` and asserts none contains `dall'inbox`, `togli ADR`,
  `chiude le domande` or `<perché>`. Red today on the lines listed in Notes.
- Then the three assertions of the Italian strings in the same file move to
  the English ones in the same commit as the skills: they pin the contract,
  and the contract is what changes.
- Then `pnpm test` whole, the commitlint case included.

## Touchpoints

- `skills/board/SKILL.md`: the model subjects of 5, 6 and 7.
- `skills/spec/SKILL.md`: the subject of the commit that closes the questions.
- `tests/architecture.test.ts`: the new case and the three assertions.
- `docs/spec.md`: 2, 5.7, the header, section 0.

## Notes

The inbox line, 2026-09-22: Italian survives in the bodies of the six skills
as contract strings and quoted examples, `docs(backlog): s<NN> dall'inbox` and
`docs(spec): chiude le domande di <slug>` among them, two of which
`tests/architecture.test.ts` asserts verbatim; S50 takes `skills/*/SKILL.md`
whole and will have to decide whether the subject of a commit is prose.

Found on 2026-09-24: `skills/board/SKILL.md:257` and `:337`,
`skills/spec/SKILL.md:351`, the placeholder `<perché>` in the model commands
of `skills/board/SKILL.md` 5 and 7; the assertions at
`tests/architecture.test.ts:1616` and `:1709-1711`; the quotes at
`docs/spec.md:159`, `:506` and `:507`, where `:506` also writes
`<data della riga>`.

The exact English wording is the implementer's, as long as the subject passes
`commitlint.sh`: a lowercase letter after `type(scope): `.

Out of scope: the subjects already in `git log`, which stay as they were
written; the Italian of `docs/**` outside `docs/spec.md`, the ADRs and the old
slices, which record what was true when they were written.

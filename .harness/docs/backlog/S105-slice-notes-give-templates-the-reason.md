---
id: S105
title: The Notes of a slice ask a template for the reason in words, never an ADR number
status: todo
blocked_by: none
tier: 1
human: false
spec: issue #44
---

## Goal

`/slice` writes Notes that a `/next` subagent follows to the letter. In the
run of S98 the Notes asked the comment in `policy.sh` to cite ADR-0003, and
the architecture test refuses any ADR number in a template, because a project
repo has none of the harness ADRs. The subagent had to choose between the
slice and the test. The Notes bullet of `skills/slice/SKILL.md` says, from
now on, that a comment or a line in a file under `skills/*/templates/` carries
the reason in words, and that the ADR number stays in the slice and in the
tests of this repo.

## Acceptance criteria

- [ ] The **Notes** bullet of section 5 of `skills/slice/SKILL.md` says that a decision bound to a file under `skills/*/templates/` is asked of that file as its reason in words, with no `ADR-<nnnn>`, and names the architecture test that refuses the number.
- [ ] A case in `tests/architecture.test.ts` reads `skills/slice/SKILL.md` and asserts that sentence is there, so a later edit of the skill cannot drop it silently.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, next to the describe `no template cites an ADR by number` (near `:3145`): a new `it` that reads `skills/slice/SKILL.md`, cuts the **Notes** bullet of section 5 and expects it to name `skills/*/templates/` and `no template cites an ADR by number` together. Red today, because the bullet (near `:310-313`) names neither.
- Then `pnpm test` whole.

## Touchpoints

- `skills/slice/SKILL.md`: the **Notes** bullet of section 5, near `:310-313`.
- `tests/architecture.test.ts`: one new case near `:3145`.

## Notes

- Issue #44, https://github.com/elrumordelaluz/harness/issues/44, filed by the `/next` run of S97-S100 while building S98.
- The rule already lives in `tests/architecture.test.ts:3141-3153` (S27): the slice changes the text of the skill that writes the Notes, not the rule.
- The skill itself may keep citing ADRs (`skills/slice/SKILL.md:25`, `:103`, `:343`): it is not a template, it is the harness repo talking to itself.
- Out of scope: the `slice` answer of `skills/board/SKILL.md`, section 5, which writes Notes too; if it shows the same fault it is an issue of its own.

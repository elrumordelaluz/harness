---
id: S54
title: The prompt of the judge names the length limits of the schema
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-18)
---

## Goal

The verdict has two fields with a length limit, `reason` and `human_reason`,
240 characters each, and the prompt the judge reads does not say so. It asks
for one sentence, which is a shape and not a number, and a sentence of 244
characters is still one sentence. `check` validates and refuses, the role
stores nothing, and the whole run starts again on the same bundle: a judgement
lost over four characters, which happened on the approve verdict of S36.

After this slice the prompt carries the number next to each of the two fields,
and a structural test keeps the numbers in the prompt equal to the ones in the
schema, so a limit that moves on one side turns red instead of costing a run.

## Acceptance criteria

- [ ] `skills/harness-init/templates/judge/prompt.md` names the limit of `reason` and the limit of `human_reason`, with the number the schema carries, on the lines that describe those two fields.
- [ ] A case in `tests/architecture.test.ts` reads every `maxLength` of `skills/harness-init/templates/judge/verdict.schema.json` and fails when the prompt does not name that number for that field.
- [ ] The case finds both limits of today and would fail on a schema that grew a third one the prompt does not name: the list comes from the schema, never from a list written in the test.
- [ ] The message of the failure names the field, the number in the schema and the file to fix.
- [ ] `.github/judge/prompt.md` is equal to the template again above `## This repo`, and the case at `tests/architecture.test.ts:183` is green.
- [ ] Suite, typecheck, format and build green.

## Test plan

- First, in `tests/architecture.test.ts`, inside the `describe` at `:781`,
  `judge/prompt.md keeps the claim short and the evidence for the audit`, which
  already reads the template prompt through its `read` helper. The new case
  takes the `maxLength` entries of the schema with `JSON.parse` and asserts the
  prompt text names each number. Red today: the prompt has no digit near
  `reason` at `:51` or near `human_reason` at `:55`.
- The copy is covered by the case already there at `:183`, which compares
  `.github/judge/prompt.md` with the template above `## This repo`: it goes red
  when the template changes and green again when the stage has copied it back.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/judge/prompt.md`: the `reason` line at `:51`, the `human_reason` sentence at `:55`.
- `.github/judge/prompt.md`: the copy, put back by rerunning `/harness-init judge`, never edited by hand.
- `tests/architecture.test.ts`: the new case in the `describe` at `:781`.

## Notes

The line of the inbox, of 2026-09-18: `judge.sh check` threw away an approve
verdict of S36 because `reason` was 244 characters against the 240 of the
schema, and the role started again from scratch with the same bundle: a whole
run lost over four characters. The prompt of the judge does not name the length
limits, so the model has no way to respect them: either the prompt says them,
or `check` truncates instead of refusing.

Of the two ways the line names, this slice takes the first. Truncating in
`check` is not taken: the store is what the audit reads, and a sentence cut by
a script is a sentence the judge never wrote.

What the reading found: the schema has exactly two limits, `reason` and
`human_reason`, both `maxLength` 240, at
`skills/harness-init/templates/judge/verdict.schema.json:91` and `:96`. The
refusal is already precise, `validate` at
`skills/harness-init/templates/scripts/judge.sh:356-359` says the field, how
many characters it has and how many the schema allows, so nothing is missing on
that side: what is missing is the number where the model reads, before it
writes. `cmd_check` exits 1 at `:436` and nothing of that run survives.

S06 opens `check` for other reasons, the fields of the chain it strips before
validating, and it is held by S05 and by ADR-0002. It does not cover the
prompt, and this slice does not touch `check`.

Out of scope: the numbers themselves, which stay 240, and any other rule of the
prompt. `scripts/judge.sh` and the schema are not changed.

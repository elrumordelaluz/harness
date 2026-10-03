---
id: S96
title: /spec --fast asks every question that matters in one message and lists what it assumed
status: todo
blocked_by: none
tier: 1
human: false
spec: docs/specs/SPEC-spec-fast-lane.md
---

## Goal

A human with a small intent runs `/spec --fast docs/intent/<slug>.md` and
gets one message with every question whose answer changes what gets built,
one line each with the recommended answer. One reply later the draft is
written with the defaults nobody was asked about listed under `### Assumed`,
and the spec lands with the same refusals and the same approval commit as the
full interview, which stays as it is.

## Acceptance criteria

- [ ] `skills/spec/SKILL.md` takes `--fast` in section 1, and a new section of its own says that the first message of a `--fast` run is the only question message: one line per question, `*question*: [recommended] short reason`.
- [ ] The same section says that with more than four questions the message names their number and suggests the full interview, and that nothing is cut from the list.
- [ ] Section 5 says that every item of the coverage list a `--fast` run did not ask, and that the intent, the code or an ADR does not answer, is one line under `### Assumed` inside "Locked decisions": the default and why.
- [ ] The new section says that a line the reply does not mention takes its recommendation and goes in "Locked decisions" as confirmed, and that a bare "sì" confirms every line.
- [ ] The new section says that a vague answer gets one follow-up message with the vague lines alone, in the same short form, and that then the draft is written and the run goes to "Decisions to confirm".
- [ ] Without `--fast`, sections 4 and 6 of `skills/spec/SKILL.md` are byte for byte as on the base; the new section says a `--fast` run goes through the refusals of section 2 and lands with the `docs(spec): <slug>` commit of section 8.
- [ ] Section 8 says that the approval commit of a `--fast` spec carries, after the confirmed decisions, an `Assumed:` block with the lines of `### Assumed`.
- [ ] `skills/spec/templates/SPEC.md`, `docs/specs/README.md` and `skills/harness-init/templates/docs/specs/README.md` are unchanged.
- [ ] 5.2 of `docs/spec.md` says what `--fast` does, with a new version in the header and its entry in section 0; the `skills/spec/` row of `docs/codebase-map.md` names the fast lane.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, a new describe `skills/spec/SKILL.md has a
fast lane`, written first, reading the skill the way the describe of the
  `None.` sentinel at `:3154` does: the skill names `--fast`, the line form
  `*question*: [recommended]`, `### Assumed`, the `Assumed:` block, and the
  words that say more than four questions are listed and not cut. Red today:
  the skill names none of them.
- Same describe: the text of sections 4 and 6, cut by their headings, equals
  the text on the base, read once into the test as a fixed hash of the two
  sections as they are at the sha the slice starts from. Green before and
  after: it holds the full interview still while the rest of the file moves.
- The describe at `:1579`, the template and the two READMEs listing the same
  sections, already holds the template unchanged and is not touched.
- Then `pnpm test` whole.

## Touchpoints

- `skills/spec/SKILL.md`: the frontmatter description, the ground rule of one question per message (it names the `--fast` exception), section 1 for the argument, a new section for the fast lane, section 5 for `### Assumed`, section 8 for the `Assumed:` block.
- `tests/architecture.test.ts`: the new describe.
- `docs/spec.md`: 5.2, the header, section 0.
- `docs/codebase-map.md`: the `skills/spec/` row.

## Notes

Decisions of the spec, which bind this slice:

- The structural choice: `--fast` is a section of its own that stands in for
  section 4 (the interview) and section 6 (the checkpoint) for that run;
  sections 1-3, 5, 7 and 8 stay shared. Rejected: no flag, every `/spec`
  opening on the short list, because it changes the full interview and has
  the skill offer the fast lane on its own, both out of scope in the intent.
- More than four questions do not refuse the fast lane: all are listed in the
  short form, the message says how many and suggests a Q&A session, and the
  human chooses. Asking the top four and parking the rest in "Open questions"
  was rejected because `/slice` refuses open questions
  (`skills/slice/SKILL.md:160`).
- `### Assumed` sits inside "Locked decisions" because `/slice` already
  carries that section into every slice; a new `## Assumed decisions` section
  was rejected because it edits the template and both READMEs and leaves an
  empty section in every full-interview spec.
- An unmentioned line is confirmed, not open: an open line would block the
  whole spec at `/slice` for one forgotten answer.
- The `Assumed:` block in the commit exists because with `docs_mode: main`
  the approval commit is the only record of the yes.

The ground rule "One question per message, never a batch" is the one line of
the shared text that has to name the exception; it keeps its meaning for the
full interview. Out of scope, from the intent: a second skill or a new
template, any change to the full interview, the skill deciding on its own
when an intent deserves the fast lane.

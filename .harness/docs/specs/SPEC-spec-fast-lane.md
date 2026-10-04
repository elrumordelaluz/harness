---
status: approved
intent: .harness/docs/intent/spec-fast-lane.md
date: 2026-10-03
approved: 2026-10-03
---

# SPEC: a fast lane for /spec

## Problem

`/spec` asks one question per message (`skills/spec/SKILL.md:27`), and on a small intent most of them only confirm the default it already recommends. The checkpoint comes only at the seventh question (`skills/spec/SKILL.md`, section 6), so a small intent still pays for a long interview before anything is written.

## Solution

`/spec --fast <intent>` reads the intent and the code as the full interview does, then sends one message with every question whose answer changes what gets built. Each question takes one line, `*question*: [recommended] short reason`. When there are more than four, the same message says how many there are and that a Q&A session may fit better, and the human either answers the list or runs plain `/spec`.

## User stories with criteria

Come human, I run `/spec --fast docs/intent/<slug>.md` and get every question that matters in one message.

- [ ] The first message of a `--fast` run is the only question message: one line per question, `*question*: [recommended] short reason`.
- [ ] With more than four questions the same message names their number and suggests the full interview; nothing is cut from the list.
- [ ] Every item of the coverage list the run did not ask, and that the intent, the code or an ADR does not answer, is one line under `### Assumed` inside "Locked decisions": the default and why.
- [ ] A line the reply does not mention takes its recommendation and goes in "Locked decisions" as confirmed; a bare "sì" confirms every line.
- [ ] A vague answer gets one follow-up message with the vague lines alone, in the same short form; then the draft is written and the run goes to "Decisions to confirm".
- [ ] Without `--fast`, sections 4 and 6 of `skills/spec/SKILL.md` are unchanged; with it, a run goes through the same refusals of section 2 and lands with the same `docs(spec): <slug>` commit of section 8.
- [ ] The approval commit of a `--fast` spec carries, after the confirmed decisions, an `Assumed:` block with the lines of `### Assumed`.
- [ ] `skills/spec/templates/SPEC.md` and the two `docs/specs/README.md` keep their sections as they are.

## Locked decisions

- Structural choice: `--fast` is a section of its own in `skills/spec/SKILL.md` that replaces section 4 (the interview) and section 6 (the checkpoint) for that run, while sections 1-3, 5, 7 and 8 stay shared word for word, so the full interview does not change by a line and a `--fast` spec goes through the same refusals and lands with the same commit. Rejected: no flag, every `/spec` opening with the short list and "answer here or say interview", which changes the full interview and has the skill offer the fast lane on its own, both out of scope in the intent.
- More than four questions do not refuse the fast lane: the message lists them all in short form and suggests a Q&A session, and the human chooses. Rejected: refusing above four, which hides questions the human could answer in one line; asking the top four and parking the rest in "Open questions", which `/slice` refuses (`skills/slice/SKILL.md:160`).
- The defaults nobody was asked about go under a `### Assumed` heading inside "Locked decisions", one line each, the default and why: `/slice` already carries "Locked decisions" into every slice, and the template keeps its `## ` sections, so `tests/architecture.test.ts:1579` stays green. Rejected: a new `## Assumed decisions` section in the template, which edits the template and both READMEs and leaves an empty section in every spec of the full interview.
- A line the reply does not mention is confirmed at its recommendation, because the human saw it; a vague answer gets one follow-up with the vague lines alone, the ground rule of `skills/spec/SKILL.md:37` applied to the batch. Rejected: an unmentioned line as an open question, which would block the whole spec at `/slice` for one forgotten line.

## Modules touched

- `skills/spec/SKILL.md`: the `--fast` argument in section 1, a new section for the one message that stands in for sections 4 and 6, the `### Assumed` lines in section 5, the `Assumed:` block in the commit body of section 8, the description in the frontmatter.
- `docs/spec.md`: 5.2 says what `--fast` does, with a new version in the header and a line in "What changes".
- `docs/codebase-map.md`: the `skills/spec/` row names the fast lane.
- `tests/architecture.test.ts`: `skills/spec/SKILL.md` names `--fast`, the line form `*question*: [recommended]`, `### Assumed` and the `Assumed:` block, and the template keeps its `## ` sections (the test at line 1579 already holds it).

## Out of scope

A second skill or a new template. Changing the full interview, which stays the default. Deciding on its own when an intent deserves the fast lane.

## Open questions

None.

## Decisions to confirm

1. `--fast` is a section of its own in `skills/spec/SKILL.md` that stands in for the interview and the checkpoint only; the full interview does not change by a line.
2. One message with every question that changes what gets built, one line each, `*question*: [recommended] short reason`; above four it says how many and suggests a Q&A session, and the human chooses.
3. The defaults nobody was asked about go under `### Assumed` inside "Locked decisions", and the template and both READMEs stay as they are.
4. An unmentioned line is confirmed at its recommendation, a vague one gets one follow-up with the vague lines alone.
5. The approval commit of a `--fast` spec adds an `Assumed:` block after the confirmed decisions, so `git log -- docs/specs/` says what was assumed as well as what was decided.

---
id: S90
title: The judge reads what the repo says about itself from `.harness/judge.md`
status: done
blocked_by: S85
tier: 2
human: false
spec: .harness/docs/specs/SPEC-harness-in-one-folder.md
---

## Goal

The judge prompt and the verdict schema become machinery: `judge.sh` reads
them from `.harness/bin/judge/`, fetched and the same in every repo. The two
or three paragraphs a repo writes for its judge, the `## This repo` section
stage `judge` used to fill inside the prompt, move to a tracked file,
`.harness/judge.md`, which `judge.sh bundle` adds after the prompt. This repo
moves its own paragraphs there and drops `.github/judge/`. A `/judge` run
here after the merge shows the judge the same text as before, from two files.

## Acceptance criteria

- [ ] `judge.sh` reads the prompt from `.harness/bin/judge/prompt.md` and the schema from `.harness/bin/judge/verdict.schema.json`, and nothing in the templates or in a `SKILL.md` names `.github/judge/`.
- [ ] `templates/judge/prompt.md` has no `## This repo` section and no placeholder: the file in `.harness/bin/judge/` is the template as fetched, with no line of the repo in it.
- [ ] `judge.sh bundle` puts `.harness/judge.md` in the bundle right after the prompt, under a heading of its own.
- [ ] With no `.harness/judge.md` the bundle is made without that section and `bundle` exits as it does today.
- [ ] `skills/harness-init/templates/judge.md` exists, the skeleton of the tracked file, and `templates/README.md` has its row: destination `.harness/judge.md`, stage `judge`.
- [ ] In this repo `.harness/judge.md` holds the paragraphs that were under `## This repo` in `.github/judge/prompt.md`, and `.github/judge/` is gone.
- [ ] The comparison of `tests/architecture.test.ts` between `.github/` and the templates no longer looks for `.github/judge/`.
- [ ] `skills/judge/SKILL.md` says where the prompt, the schema and the repo's own lines are.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/judge.test.ts`, the describe `judge.sh bundle: one file, everything
the judge may see`, first: the fixture puts the prompt and the schema under
  `.harness/bin/judge/` and a `.harness/judge.md` with a line that occurs
  nowhere else; the bundle has the prompt, then that line, then the rest, in
  that order. A second case without the file. Red today: `judge.sh` reads
  `.github/judge/`.
- Same file, the describe `judge.sh check`: the schema is read from the new
  path, every case as it is.
- `tests/architecture.test.ts`: the describe `.github matches the templates
it was copied from` loses the two cases of `.github/judge/`, the schema byte
  for byte and the prompt up to `## This repo`; `judge/prompt.md keeps the
claim short and the evidence for the audit` and `the gates are wired and the
judge is told to leave them alone` read the template alone. New cases: the
  template prompt has no `{{` and no `## This repo`; no template and no
  `SKILL.md` names `.github/judge`; `.harness/judge.md` exists here and
  `.github/judge` does not; the row of `templates/README.md`. Red today.
- `tests/policy.test.ts`: wherever a fixture or a message names the schema.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/scripts/judge.sh`: `SCHEMA` and `PROMPT` at `:60-61`, the sections of the bundle near `:307`.
- `skills/harness-init/templates/judge/prompt.md`: the section at `:72` leaves, and the line that names the schema at `.github/judge/`.
- `skills/harness-init/templates/judge.md` (new): the skeleton.
- `skills/harness-init/templates/README.md`: the row of `judge.md`, the destination of the prompt and the schema.
- `skills/judge/SKILL.md`: the paths.
- `.harness/judge.md` (new); `.github/judge/prompt.md`, `.github/judge/verdict.schema.json`: removed.
- `tests/judge.test.ts`, `tests/architecture.test.ts`, `tests/policy.test.ts`.
- `docs/spec.md`: 4.6 and 5.5 where they name `.github/judge/`, the header, section 0. The codebase map: the row of `.github/` and the dragon on the copies of the prompt.

## Notes

The decision of the spec, the fifth of those Lionel confirmed: the lines of
the judge prompt that describe the repo move to a tracked file,
`.harness/judge.md`, which `judge.sh bundle` adds after the prompt. Why: the
prompt is fetched and ignored now, and a line of the repo cannot live in a
file every fetch overwrites. `.harness/judge.md` is sensitive and never tier
0 in the policy block of the template, which S86 wrote.

The placeholder of today, to carry into the skeleton as its guidance: two or
three short paragraphs on what carries more weight here than the line count
suggests, the pure module, the single source of a permission or an
invariant, the file the type checker does not cover. The skeleton is a list
item or a line Prettier leaves alone, like every placeholder of the
templates.

`.harness/bin/judge` is already a link to the template directory here, from
S85. The schema of this repo was a byte copy of the template, so nothing is
lost with `.github/judge/`; the prompt had this repo's section, and that is
what goes to `.harness/judge.md`, word for word.

The judge is told in the prompt where its schema is: that sentence follows
the file. Nothing else in the prompt changes, and the describes that hold
its wording stay green.

Stage `judge` of `/harness-init` filling `.harness/judge.md` in a project
repo is S94. Until then the prose of the skill still says `.github/judge/`
in its section 4, which S94 rewrites: leave it.

Out of scope: what the judge is asked; the verdict schema; a judge that
reads more than the bundle.

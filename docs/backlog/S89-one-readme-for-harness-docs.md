---
id: S89
title: "`.harness/docs/` has one README with a section per folder"
status: todo
blocked_by: S88
tier: 2
human: false
spec: docs/specs/SPEC-harness-in-one-folder.md
---

## Goal

Five READMEs, one per folder of the documents, become one:
`.harness/docs/README.md`, with a section for `intent/`, `specs/`,
`backlog/`, `decisions/` and `review-log/`. A teammate who opens `.harness/`
reads one page to know what each folder holds, and an install writes one
file where it wrote five. What a script or a skill read from one of the five
it reads from the section.

## Acceptance criteria

- [ ] `skills/harness-init/templates/docs/README.md` exists with one `##` section per folder, `intent`, `specs`, `backlog`, `decisions`, `review-log`, each carrying what the README of that folder said.
- [ ] `templates/docs/intent/README.md`, `specs/README.md`, `backlog/README.md`, `decisions/README.md` and `review-log/README.md` are gone from the templates.
- [ ] `intent.sh new` writes the same empty sections it writes today, read from the section of the one README or held where the test that compares them can see both.
- [ ] Every `SKILL.md`, script and template that sent a reader to `.harness/docs/<folder>/README.md` sends them to `.harness/docs/README.md`.
- [ ] In this repo `.harness/docs/README.md` is the template, the five are gone, and a test holds the copy equal.
- [ ] `templates/README.md` has the row of the one README.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, first: the describe `docs/*/README.md matches
the templates it was copied from` becomes the comparison of the one file,
  and asserts the five sections by heading and the absence of the five files
  in the templates and here. Red today.
- Same file: `the spec template and the docs/specs README say the same
sections` reads the `specs` section of the one README; the cases that read
  the backlog README for the frontmatter of a slice read its section. Red
  until the file is there.
- `tests/intent.test.ts`, the describe `intent.sh new`: the case that
  compares the skeleton with the README of the intents reads the section.
  The expected skeleton does not change.
- A new case in `tests/architecture.test.ts`: no file under `skills/` names
  one of the five old README paths.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/docs/README.md` (new).
- `skills/harness-init/templates/docs/intent/README.md`, `specs/README.md`, `backlog/README.md`, `decisions/README.md`, `review-log/README.md`: removed.
- `skills/harness-init/templates/scripts/intent.sh`: where the sections of an intent come from, the comments.
- `skills/harness-init/templates/README.md`: the row.
- `skills/slice/SKILL.md`, `skills/spec/SKILL.md`, `skills/board/SKILL.md`, `skills/next/SKILL.md`, `skills/harness-init/SKILL.md`: the sentences that name a README of a folder.
- `.harness/docs/README.md` (new) and the five READMEs of this repo, removed.
- `tests/architecture.test.ts`, `tests/intent.test.ts`.
- `docs/spec.md`: 3.4 where it names the READMEs, the header, section 0. `.harness/docs/codebase-map.md`.

## Notes

The decision of the spec is one line: `.harness/docs/` has one README with a
section per folder, in place of the five of today. The why is the intent: a
teammate who installs the harness should find few files.

The five are not equal in weight. `backlog/README.md` is twenty-two lines and
is the format of a slice, which `/slice` and `/next` read as the contract;
`intent/README.md` is the skeleton `intent.sh new` writes; the other three
are one line each. The sections keep the text, not a summary of it. The
headings of a slice and of an intent that the READMEs show inside an indented
block stay inside one, or the one README would grow a `## Goal` of its own.

An empty folder is not tracked by git: with its README gone, `decisions/` or
`review-log/` exists in a fresh install only once it has a file. Check what
reads those folders before they exist, `board.sh` for the ADRs and
`review-log.sh` for `verdicts.jsonl`, and that a missing folder is an empty
list and not an error. Stage `local` creating them is S93.

This repo's copy is a copy like the workflows, or a symlink like the scripts:
the comparison test is what matters, and the describe that exists already
derives its list from the template directory.

Out of scope: rewriting what the READMEs say; `inbox.md` and `parked.md`,
which keep their own heading text because the entries of the repo live under
it; `templates/docs/codebase-map.md`.

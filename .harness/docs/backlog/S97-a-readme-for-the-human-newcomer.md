---
id: S97
title: Stage local installs a README for the human who meets the harness first
status: todo
blocked_by: none
tier: 1
human: false
spec: inbox (2026-10-01)
---

## Goal

Everything stage `local` installs talks to an agent: `.harness/AGENTS.md` is
the contract the skills read, and `.harness/docs/README.md` describes the
folders of the documents. A human who clones a project repo and runs into a
refused commit has nothing written for them. After this slice stage `local`
writes `.harness/README.md`, about ten lines for a person: what `.harness/`
is, what the git hooks refuse and why, and how to make a small change without
intent, spec and slice. This repo carries the same file, equal to the
template, as it already does for `.harness/docs/README.md`.

## Acceptance criteria

- [ ] `skills/harness-init/templates/harness/README.md` exists, has at most 15 lines that are not empty, and names `.harness/AGENTS.md`, `.harness/docs/`, `.harness/bin/`, the three hooks `pre-commit`, `commit-msg` and `pre-push`, `docs_mode`, and the four commands `typecheck`, `test`, `format:check` and `build`.
- [ ] `skills/harness-init/templates/README.md` has a row for it: destination `.harness/README.md`, written if missing, stage `local`.
- [ ] Step 6 of stage `local` in `skills/harness-init/SKILL.md` writes `.harness/README.md` from the template, only if it is not there, like the other files of that step.
- [ ] `.harness/README.md` of this repo is equal to the template.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, next to the describe
  `.harness/docs/README.md matches the template it was copied from` (near
  `:1002`): a describe for `.harness/README.md` with three cases, the file
  equal to the template, the line count, and every name of the first
  criterion present. Red today, because neither file exists.
- The existing case `templates/README.md lists every template` (near `:66`)
  turns red as soon as the template is added without its row, and green with
  the row: it covers the second criterion.
- A case that reads step 6 of stage `local` in `SKILL.md` and finds
  `.harness/README.md` and `templates/harness/README.md` in it. Red today.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/harness/README.md` (new)
- `.harness/README.md` (new)
- `skills/harness-init/templates/README.md`: one row among the `local` ones.
- `skills/harness-init/SKILL.md`: step 6 of stage `local`, near `:256`.
- `tests/architecture.test.ts`: the new describe.

## Notes

The line, 2026-10-01: nothing in the install speaks to a human newcomer,
`AGENTS.md` addresses the agent; ten lines in the README: what `.harness/` is,
what the hooks refuse, how to make a small change without the ceremony.

What the README says comes from the code, never from memory. The hooks:
`skills/harness-init/templates/githooks/pre-commit:26-55` refuses a commit on
the default branch unless `docs_mode` is `main` and every staged file is a
document, then checks format, prose and typecheck on the staged files; the
other two are in the same folder. The small change: a branch that is not the
default one, the four commands, a PR; tier 0 and tier 3 never judge
(`skills/harness-init/templates/scripts/ensure-verdict.sh:19-22`), and at
tier 1 or 2 the hook on `gh pr create` asks for `/judge` first.

The file is written only if missing because a team may edit it for its own
newcomers, the same rule step 6 applies to `inbox.md` and `parked.md`.

Out of scope: the project's root README, which belongs to the project;
`HARNESS_ALLOW_MAIN`, which the README does not advertise; rerunning stage
`local` in the project repos.

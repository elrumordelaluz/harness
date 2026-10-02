---
id: S94
title: A full install writes a closed list of paths outside `.harness/` and never edits a file of the project
status: todo
blocked_by: S90, S93
tier: 2
human: false
spec: docs/specs/SPEC-harness-in-one-folder.md
---

## Goal

Stages `ci` and `judge` of `/harness-init` take the new layout, and with
them the install is whole: a teammate who does not use the harness opens the
repo and finds, outside `.harness/`, two instruction files, one settings
file, four workflows, the PR template and one ignore line. A workflow or a PR
template the project already had is still the project's. The structural test
is offered and not written. The repo's lines for the judge land in
`.harness/judge.md`.

## Acceptance criteria

- [ ] In `templates/README.md` every destination, over the three stages, is under `.harness/` or is one of `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, `.github/workflows/` with the four workflows, `.github/pull_request_template.md`, `.gitignore`: the list `git status --porcelain` shows outside `.harness/` after the three stages on a repo with no harness.
- [ ] No row and no sentence of the skill writes under `scripts/`, `.githooks/`, `docs/` or `.github/judge/`, and `.github/ruleset.json` is not written: the ruleset is applied from `.harness/bin/ruleset.json` with `bypass_actors` filled in on the way to `gh api`.
- [ ] A workflow of the project named `ci.yml`, `automerge.yml`, `escalate.yml` or `close.yml` is left byte for byte, and the harness's own is installed as `harness-<name>.yml`; the skill says how it tells its own workflow from the project's on a rerun.
- [ ] A `.github/pull_request_template.md` already there keeps its text, and the "Slice" and "Declarations" sections are appended under a marker, once: a rerun that finds the marker appends nothing.
- [ ] The structural test of stage `ci` is not written by default: the hand-back names the rule it would enforce and the path it would write, and the file is written only after a yes. The row of `architecture.test.ts` in `templates/README.md` says "on a yes".
- [ ] Stage `judge` writes `.harness/judge.md` from `templates/judge.md`, filled from `.harness/AGENTS.md` and the codebase map, only if it is not there, and copies no prompt and no schema.
- [ ] Detect reads the new layout for `ci` and `judge`, under either file name of a workflow.
- [ ] 5.1 and 6.2 of `docs/spec.md` say the two stages as they are now, with a new version in the header and its entry in section 0.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, first, a new describe `a full install writes
a closed list outside .harness/`: every row of `templates/README.md`, any
  stage, against the list of the first criterion. Red today on the rows of
  `scripts/`, `.github/judge/`, `.github/ruleset.json` and the test dir.
- Same describe, on the skill: no occurrence of `.github/judge/` or
  `.github/ruleset.json` as a destination; the string `harness-` followed by
  a workflow name and the sentence that the project's file is not edited; the
  marker of the PR template, in a fence, and the same marker absent from
  `templates/github/pull_request_template.md` itself, since the marker is
  what the skill adds; the offer of the structural test in the hand-back of
  stage `ci` and no step that writes it before a yes. Red today.
- The describe `stage ci of /harness-init fills the bypass actors of the
ruleset`: its cases move from "the file written is the file applied" to
  the file of `.harness/bin/` read and the filled json sent, nothing written
  in the tree. They are rewritten to the new rule, with the same actors and
  the same conditions asserted.
- The describes on the workflows, `the workflows that act on a merge look at
the default branch` and `no template judges on the server`: green as they
  are, which says the rename of an installed file touched no template.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/SKILL.md`: the frontmatter description, Detect, stage `ci` at `:245-328`, stage `judge` at `:330-404`, "Team mode", the hand-back of section 6.
- `skills/harness-init/templates/README.md`: the rows of stages `ci` and `judge`.
- `tests/architecture.test.ts`.
- `docs/spec.md`: 5.1, 6.2, the header, section 0. The codebase map: the rows of `skills/harness-init/` and of `.github/`.

## Notes

Decisions of the spec. Outside `.harness/` the install writes a closed list
of paths, each one forced by a tool that reads it only there. A workflow of
the project with the name of one of the harness's is never edited: the
harness installs its own as `harness-<name>.yml`. A PR template already there
keeps its text and the harness appends its "Slice" and "Declarations"
sections under a marker, because `ci.yml` reads the boxes. The structural
test is an offer and not a default: a test runner does not look inside a dot
folder, so the file cannot move, and it is the one place where the harness
would write into the project's own source tree. `ruleset.json` is machinery,
fetched into `.harness/bin/`.

With `.github/ruleset.json` gone, the sentence "the file written is the file
applied" has nothing to stand on: the ruleset as applied is what
`gh api repos/{owner}/{repo}/rulesets` returns, and the skill says so. The
rules on the two bypass actors, on reading the REST reference first and on
adding to `bypass_actors` without removing what a human put there, stay as
they are.

The harness's workflows find each other by the `name:` inside the file, as
`automerge.yml` does with `workflow_run`, not by file name: check each
template before promising that a renamed file still fires, and read the
current doc of `workflow_run`. If the project's own `ci.yml` has a workflow
named `ci` too, the required check of the ruleset is ambiguous: the stage
stops and names it. What the harness's CI covers next to a CI the project
already has was left for later by Lionel on 2026-10-01: here only the file
name is decided, and what the workflow runs does not change.

The workflows are copies with the package manager and the Node version
adapted, so a project's copy is never byte for byte the template; the skill
tells its own file by a first-line comment the templates already carry or
gain here, and that line is this slice's call.

The criteria on `git status` of a finished install cannot be run by the
suite: the skill is prose. For the "How to check by hand" of the PR: in a
scratch repo on GitHub with a `ci.yml` and a PR template of its own, run the
three stages from this branch; `git status --porcelain` outside `.harness/`
lists the paths of the first criterion and no other; `git diff` on the
project's `ci.yml` is empty; the PR template has its old text and the marker
once; rerun stage `ci` and nothing changes; `git ls-files .harness` has no
path under `.harness/bin/`. Then the same in an empty repo.

This is the slice after which `/harness-init` is safe to run in a project
repo again: say so in the PR.

Out of scope: moving a repo already on the old layout; delivering the skills
as a plugin, which is the intent `harness-without-a-clone`; an interview at
install time; a README for a human newcomer, an inbox line of 2026-10-01.

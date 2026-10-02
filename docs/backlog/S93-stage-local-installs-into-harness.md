---
id: S93
title: Stage local installs into `.harness/` and leaves the project's own files saying what they said
status: todo
blocked_by: S86, S87, S89
tier: 2
human: false
spec: docs/specs/SPEC-harness-in-one-folder.md
---

## Goal

A team with an `AGENTS.md`, a `CLAUDE.md` and a `.claude/settings.json` of
its own runs `/harness-init local` and finds them as they were, plus one
marked block each. Everything else the stage writes is under `.harness/`: the
harness's `AGENTS.md`, the documents, the stamp, the bootstrap. No script is
copied: the stage runs the bootstrap, which fetches them. The stage is prose
an agent runs, so the tests hold the prose and the table of destinations, and
the PR says how the install was tried by hand.

## Acceptance criteria

- [ ] Stage `local` writes `templates/AGENTS.md` to `.harness/AGENTS.md`, the documents of `templates/docs/` under `.harness/docs/`, `templates/bootstrap.sh` to `.harness/bootstrap.sh`, and the stamp; after it `git ls-files .harness` lists `.harness/AGENTS.md`, `.harness/stamp.json`, `.harness/bootstrap.sh` and files under `.harness/docs/`, and nothing under `.harness/bin/`.
- [ ] `.gitignore` gets the line `.harness/bin/`, appended only if absent, so a rerun does not add it again; the line `.claude/worktrees/` of today is handled the same way and nothing else in the file changes.
- [ ] On a repo with an `AGENTS.md`, the skill leaves every existing line as it was and adds one section, `## Harness`, of at most three lines that name `.harness/AGENTS.md`; a rerun that finds the section changes nothing. With no `AGENTS.md` the file is created with that section alone. The text of the section is in the skill, in a fence.
- [ ] On a repo with a `CLAUDE.md`, the skill adds the line `@.harness/AGENTS.md` if it is not there and moves nothing out of the file; with none, the file is created with that line alone. `templates/CLAUDE.md` is that one line.
- [ ] A `.claude/settings.json` already there keeps every key it had: the `SessionStart` hook, the two `PreToolUse` hooks and the allowlist entries are merged in with a `jq` filter the skill gives in a fence, and running the filter twice gives the same file.
- [ ] With `core.hooksPath` set to anything but `.harness/bin/hooks`, stage `local` stops before writing anything and names the value it found.
- [ ] The stage runs `.harness/bootstrap.sh` instead of copying scripts and hooks, and adds no `prepare` script to `package.json`.
- [ ] Detect reads `.harness/`: stage `local` is done when `.harness/AGENTS.md` and `.harness/stamp.json` exist. The policy block it merges key by key is the one of `.harness/AGENTS.md`.
- [ ] No sentence of the skill merges an `AGENTS.md` section by section or moves the content of a `CLAUDE.md` elsewhere, and the ground rule that lists what must be tracked names `.harness/` and not `scripts/`, `.githooks/` or `docs/`.
- [ ] In `templates/README.md` every row of stage `local` has a destination under `.harness/`, or is one of `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, `.gitignore`.
- [ ] 3.3, 3.4, 5.1 and 6.1 of `docs/spec.md` say the install as it is now, with a new version in the header and its entry in section 0.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, first, a new describe `stage local of
/harness-init writes inside .harness/`: it reads `templates/README.md` as
  the describe `templates/README.md lists every template` does and asserts
  the tenth criterion row by row. Red today: nine rows land in `scripts/`,
  `.githooks/` and `docs/`.
- Same describe: the `jq` filter is cut out of its fence in the skill and
  run on three files: empty `{}`, the template itself, and a settings file
  with a `PreToolUse` hook of the project, an `env` key and two allowlist
  entries. Asserted: every key and entry of the project is still there, the
  three hooks of the harness are there once, a second run changes nothing.
  Red today: no filter.
- Same describe: the `## Harness` section is cut out of its fence and has
  at most three lines and the string `.harness/AGENTS.md`; `templates/CLAUDE.md`
  is the one line; the skill has the stop on `core.hooksPath` before the first
  step that writes; the strings of the ninth criterion are gone. Red today.
- The describe `stage local of /harness-init merges the policy block key by
key`: it holds on `.harness/AGENTS.md`.
- The describe `.gitignore keeps the worktrees of /next out of the tree`:
  it stays green and gains the line `.harness/bin/`.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/SKILL.md`: the frontmatter description, "Ground rules", the table of Detect at `:117-125`, the whole of stage `local` at `:144-243`, "Team mode".
- `skills/harness-init/templates/README.md`: the rows of stage `local`.
- `skills/harness-init/templates/CLAUDE.md`: the one line.
- `skills/harness-init/templates/AGENTS.md`: what was in `templates/CLAUDE.md` for Claude Code alone, if it is kept, lands here.
- `tests/architecture.test.ts`.
- `docs/spec.md`: 3.3, 3.4, 5.1, 6.1, the header, section 0. The codebase map: the row of `skills/harness-init/`.

## Notes

Decisions of the spec. The harness never rewrites a line it did not write: in
a file the project already has it adds one marked block of its own and
touches nothing else, and where it cannot do that it stops and names the
file. Rejected by name: the merge section by section at
`skills/harness-init/SKILL.md:173-175` and the emptying of a `CLAUDE.md` into
`AGENTS.md` at `:193-195`. `.claude/settings.json` is merged with `jq`: the
hooks and the allowlist entries go in, every key already there stays. With
`core.hooksPath` already set by the project, Husky or lefthook, the install
stops and names it; chaining into another hook manager is not built. A
`prepare` script was rejected because the harness cannot add it to
`package.json` as a marked block: the `SessionStart` hook and a bootstrap run
by hand are how a clone gets its hooks. No line goes in `.gitattributes`. No
migration: the stage installs the new layout and does not move the files of a
repo set up before it, and says so in one line when Detect finds the old one.

The spec says `.gitignore` gets one line, `.harness/bin/`. Stage `local`
also adds `.claude/worktrees/` today, which `/next` needs or every worktree
shows as untracked files; the spec does not name that line and does not take
it away, so it stays, written the same way. The step that removes ignore
lines for `docs/` and `CLAUDE.md` at `:148-153` goes: the documents are under
`.harness/` now, and removing a line the project wrote breaks the rule above.
If `.gitignore` ignores `.harness/` or `.claude/`, the stage stops and names
the line.

The settings filter has to merge arrays without doubling: an allowlist entry
by its string, a hook by its `command`. `{{pm}}` in the template is filled
before the merge.

The criteria on `git status` of a finished install are whole only after
stages `ci` and `judge`, and are S94's. For the "How to check by hand" of
the PR: in a scratch repo with an `AGENTS.md`, a `CLAUDE.md` with text, a
`.claude/settings.json` with one key and a `scripts/` and a `docs/` of its
own, run `/harness-init local` from this branch; `git status --porcelain`
shows `.harness/`, three modified files and `.gitignore`; `git diff` on the
three shows only added lines; `scripts/` and `docs/` are untouched; run the
stage again and `git status` is the same. Then once more in an empty repo.

The pin is written by the "Stamp" step as S92 left it. `AGENTS.md` of the
template still fills its placeholders from the repo, in `.harness/AGENTS.md`.
The cap of one hundred lines holds for that file.

Out of scope: stages `ci` and `judge` (S94); an interview at install time on
which gates to install, left for later by Lionel on 2026-10-01; what happens
where `jq` is missing, left for later the same day.

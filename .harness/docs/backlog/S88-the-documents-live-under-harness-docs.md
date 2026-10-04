---
id: S88
title: The documents of the harness live under `.harness/docs/`, in every script and skill and in this repo
status: done
blocked_by: none
tier: 2
human: false
spec: .harness/docs/specs/SPEC-harness-in-one-folder.md
---

## Goal

The intents, the specs, the backlog, the decisions, the review log, the
inbox, the parked list and the codebase map stop living in a `docs/` the
project may use for something else. Every script, hook, workflow and skill
names them under `.harness/docs/`, and this repo moves its own with `git mv`
in the same PR, because the skills and the scripts it runs on are the ones
being changed. After the merge `/board`, `/spec`, `/slice` and `/next` work
in this repo on `.harness/docs/`, and `docs/` holds `spec.md` and its assets.

## Acceptance criteria

- [ ] Every template script, hook and workflow, and every `SKILL.md`, that named a path of `docs/intent`, `docs/specs`, `docs/backlog`, `docs/decisions`, `docs/review-log`, `docs/inbox.md`, `docs/parked.md` or `docs/codebase-map.md` names it under `.harness/docs/`. So do `skills/spec/templates/SPEC.md`, the PR template and the judge prompt.
- [ ] The name rules the skills state for a slice path and a spec path, such as `^docs/backlog/S[0-9]+-[a-z0-9-]+\.md$` in `/slice`, carry the new prefix.
- [ ] The policy block of the template carries, in `human_gate_paths`, the seven paths of today under `.harness/docs/`, and in `never_tier_0`, `.harness/docs/codebase-map.md`; its prose lines say the same.
- [ ] In this repo `intent/`, `specs/`, `backlog/`, `decisions/`, `review-log/`, `inbox.md`, `parked.md` and `codebase-map.md` are under `.harness/docs/`, moved with `git mv` so `git log --follow` reaches their history, and `docs/spec.md` and `docs/assets/` stay where they are.
- [ ] The policy block of this repo names the moved paths in `human_gate_paths`, `never_tier_0` and `docs_extra_paths`, and a commit on main made only of files under `.harness/docs/backlog/` goes through the hooks.
- [ ] The `spec:` line of every slice of this repo and the `intent:` line of every spec name the moved path, so `/slice` still finds the slices of a spec.
- [ ] `.prettierignore` names `.harness/docs/review-log/verdicts.jsonl`.
- [ ] 3.4 of `docs/spec.md` and every path of the eight it names say `.harness/docs/`, with a new version in the header and its entry in section 0.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, first, one new case: no file under
  `skills/harness-init/templates/`, no `SKILL.md` and not
  `skills/spec/templates/SPEC.md` contains one of the eight paths without
  `.harness/` in front. Red today on almost every file.
- Same file: the describes that read this repo's documents,
  `docs/inbox.md is a template plus the entries of this repo`,
  `docs/parked.md is a template plus the entries of this repo`,
  `AGENTS.md lets a line of inbox land`, `AGENTS.md lets a line of parked
land`, `docs/*/README.md matches the templates it was copied from`,
  `docs/codebase-map.md names no test file but architecture.test.ts`, read
  them where they moved; the describe on the policy block asserts the lists
  of the third criterion. A new case: the eight are under `.harness/docs/`
  here and not under `docs/`.
- `tests/board.test.ts`, `tests/park.test.ts`, `tests/intent.test.ts`,
  `tests/tier.test.ts`, `tests/hooks.test.ts`, `tests/judge.test.ts`,
  `tests/review-log.test.ts`: the fixtures write the documents under
  `.harness/docs/` and the expected output names them there. No case is
  dropped and no expectation loosened: the prefix is the only change.
- `tests/hooks.test.ts`: the cases of `pre-commit on main, with docs_mode
main` run on `.harness/docs/intent/` and hold the fifth criterion.
- Then `pnpm test` whole, and `.harness/bin/board.sh` run here: the board of
  this repo prints the slices and the inbox it printed before.

## Touchpoints

- `skills/harness-init/templates/scripts/board.sh`, `intent.sh`, `park.sh`, `tier.sh`, `judge.sh`, `review-log.sh`, `prose.sh`: the paths.
- `skills/harness-init/templates/github/close.yml`, `pull_request_template.md`: the slice set to `done`, the path of `verdicts.jsonl`, the line of the template.
- `skills/harness-init/templates/AGENTS.md`: the two lists of the block, the map, the prose.
- `skills/harness-init/templates/judge/prompt.md`, `skills/harness-init/templates/docs/`: the paths the files name; the directory of the templates does not move.
- `skills/board/SKILL.md`, `skills/spec/SKILL.md`, `skills/slice/SKILL.md`, `skills/next/SKILL.md`, `skills/judge/SKILL.md`, `skills/harness-init/SKILL.md`, `skills/spec/templates/SPEC.md`.
- `docs/intent/`, `docs/specs/`, `docs/backlog/`, `docs/decisions/`, `docs/review-log/`, `docs/inbox.md`, `docs/parked.md`, `docs/codebase-map.md`: moved to `.harness/docs/` (new).
- `.harness/AGENTS.md` or `AGENTS.md`, whichever holds the block and the map when this slice is taken; `CLAUDE.md`, `README.md`, `.prettierignore`.
- `.github/workflows/close.yml`, `.github/pull_request_template.md`, `.github/judge/prompt.md`: the copies.
- `tests/*.test.ts`.
- `docs/spec.md`.

## Notes

Decisions of the spec. `codebase-map.md` goes to
`.harness/docs/codebase-map.md`: the harness authors it and agents read it,
so it does not go in a `docs/` the project may use for a docs site.
`docs/spec.md` is the spec of the chain and not a document of the harness of
this repo, and stays. This repo moves its documents by hand in this slice;
moving a repo already on the old layout is not a feature of `/harness-init`,
and nothing here is written for another repo to run. No line goes in
`.gitattributes`: the specs and the slices are what a reviewer has to see in
a diff.

It is a rename, wide and mechanical: eight prefixes, about three hundred
occurrences in `tests/`, a hundred and forty in the skills, seventy in the
template scripts. Do it with one substitution per prefix and read the diff,
not file by file. The traps are the places where the path is built and not
written: a glob in `close.yml` (`docs/backlog/"$sid"-*.md`), a `sed` or an
`awk` anchored at `^docs/`, the regexes of the skills, a `join()` in a test.
Grep for `docs/` after the substitution and account for every hit left:
`docs/spec.md`, `docs/assets/`, and the `docs/` of a project in a sentence
about what the harness leaves alone.

The file of this slice moves with the others, in its own PR. `close.yml`
runs from the merge commit and looks for the slice where the new template
says, so it finds it; check the run after the merge. The PR touches
`docs/backlog/**` and takes `human-gate`, which is right.

The body of old documents, a slice that says `docs/backlog/` in its notes or
an ADR that names `docs/inbox.md`, is history and is not rewritten: only the
`spec:` and `intent:` frontmatter lines, which the scripts and the skills
grep, and what a test reads.

The skills are symlinks to this working tree: from the merge on they look
under `.harness/docs/` in every repo, and a project repo on the old layout
stops working with them until it is set up again, by the spec's decision of
no migration. A `/next` that was running when this merges holds the old paths
and finds no backlog: it stops there, and a new session goes on. Run this
slice as the last of its session.

The criterion of the spec on the template block is split with S86, which has
the sensitive paths and the rest of `never_tier_0`. If S86 is not merged when
this is taken, the block and the map are still in the root `AGENTS.md` and
are edited there.

Out of scope: one README in place of five (S89), `templates/README.md` and
where stage `local` writes the documents (S93), the inbox as GitHub issues,
which is an inbox line of 2026-10-02 and not this spec.

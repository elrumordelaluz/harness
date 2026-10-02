---
id: S86
title: The scripts and the hooks read the policy block from `.harness/AGENTS.md`
status: todo
blocked_by: S85
tier: 2
human: false
spec: docs/specs/SPEC-harness-in-one-folder.md
---

## Goal

The harness's own instructions and its policy block leave the root
`AGENTS.md`, which goes back to saying what the project is. They live in
`.harness/AGENTS.md`, and that is the only file `policy-lines.sh`, `tier.sh`,
the git hooks, `intent.sh` and `park.sh` read the block from.
`templates/AGENTS.md` becomes the template of that file. This repo moves in
the same PR: its map, conventions, policy and "Do not" go to
`.harness/AGENTS.md`, the root file keeps what the project says about itself
plus a `## Harness` section that sends the agent there, and `CLAUDE.md` gains
the line `@.harness/AGENTS.md`.

## Acceptance criteria

- [ ] `policy-lines.sh`, `tier.sh`, `pre-commit`, `pre-push`, `intent.sh` and `park.sh` read the policy block from `.harness/AGENTS.md`, each at the ref it reads `AGENTS.md` from today: `tier.sh` at the base ref, `pre-commit` at `HEAD`, `pre-push` at the remote sha, `intent.sh` and `park.sh` where they read it now. No template script or hook reads the root `AGENTS.md`.
- [ ] A repo with a valid block in the root `AGENTS.md` and no `.harness/AGENTS.md` is a block that cannot be read: the hooks keep main closed and `tier.sh` answers as for a missing fence, each naming `.harness/AGENTS.md`.
- [ ] The messages of the hooks and of the scripts that named `AGENTS.md` name `.harness/AGENTS.md`.
- [ ] The policy block of `templates/AGENTS.md` carries, in `sensitive_paths`, `.harness/stamp.json`, `.harness/bootstrap.sh`, `.harness/AGENTS.md`, `.harness/judge.md`, `.github/**` and `.claude/settings.json`, next to the project's own config files, and no longer `.githooks/**`, `scripts/**` or `.harness/**`; in `never_tier_0`, `AGENTS.md`, `CLAUDE.md`, `.claude/**`, `.harness/AGENTS.md` and `.harness/judge.md`. The prose lines of the template say the same lists.
- [ ] `judge.sh bundle` puts `.harness/AGENTS.md` in the bundle where it put `AGENTS.md`.
- [ ] In this repo `.harness/AGENTS.md` holds the policy block, the root `AGENTS.md` has none and has a `## Harness` section of at most three lines that names `.harness/AGENTS.md`, and `CLAUDE.md` has the line `@.harness/AGENTS.md`.
- [ ] 3.3 and 7.2 of `docs/spec.md` say where the block lives, with a new version in the header and its entry in section 0.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/hooks.test.ts`, first: `repo()` writes the text of the policy file as
  `.harness/AGENTS.md`. Every case of the four describes stays; red today
  because the hooks read the root file. One new case per hook: the block in
  the root `AGENTS.md` alone keeps main closed and the message names
  `.harness/AGENTS.md`.
- `tests/tier.test.ts`: the fixture commits `.harness/AGENTS.md` at the base;
  a new case in `tier.sh, a policy block it cannot read` with the block only
  in the root file. `tests/intent.test.ts`, `tests/park.test.ts`: the same
  move of the fixture, and the case of the unreadable block.
- `tests/judge.test.ts`, the describe `judge.sh bundle`: the section of the
  bundle is `.harness/AGENTS.md`.
- `tests/agents.ts`: the helper and its comments name the new file; the
  tests that read `join(root, 'AGENTS.md')` for the block read
  `.harness/AGENTS.md`.
- `tests/architecture.test.ts`: the describes `the policy block of AGENTS.md`
  and `AGENTS.md and its template say the same tier gate` read
  `.harness/AGENTS.md` of this repo against the template, and assert the
  lists of the fourth criterion; `AGENTS.md and CLAUDE.md name every skill of
skills/` follows the map to where it now is; a new case for the `## Harness`
  section and the line of `CLAUDE.md`. Red today.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/scripts/policy-lines.sh`, `tier.sh`, `intent.sh`, `park.sh`, `judge.sh`, `policy.sh`: the file read, the comments, the messages.
- `skills/harness-init/templates/githooks/pre-commit`, `pre-push`: the `git show` of the block, the messages.
- `skills/harness-init/templates/github/ci.yml`, `pull_request_template.md`: the comments that name `AGENTS.md`.
- `skills/harness-init/templates/AGENTS.md`: the template of `.harness/AGENTS.md`, the lists of the block and of the prose.
- `.harness/AGENTS.md` (new), `AGENTS.md`, `CLAUDE.md`: the move of this repo.
- `.github/workflows/ci.yml`, `.github/pull_request_template.md`: the copies.
- `tests/agents.ts`, `tests/hooks.test.ts`, `tests/tier.test.ts`, `tests/intent.test.ts`, `tests/park.test.ts`, `tests/judge.test.ts`, `tests/board.test.ts`, `tests/architecture.test.ts`.
- `skills/board/SKILL.md`, `skills/spec/SKILL.md`, `skills/slice/SKILL.md`, `skills/next/SKILL.md`, `skills/judge/SKILL.md`: where they say the policy block is in `AGENTS.md`.
- `docs/spec.md`, `docs/codebase-map.md`.

## Notes

Decisions of the spec. The harness never rewrites a line it did not write:
the project's `AGENTS.md` and `CLAUDE.md` carry what the project says about
itself, and the harness is the tool, not the subject. So the harness's map,
conventions and policy block live in `.harness/AGENTS.md`, the root file gets
one section, `## Harness`, of two or three lines, and `CLAUDE.md` gets the
line `@.harness/AGENTS.md` with nothing moved out of it. The pin, the
bootstrap, `.harness/AGENTS.md` and `.harness/judge.md` are sensitive, and
the pin takes the place of `scripts/**` as the path that says the machinery
changed: `.harness/bin/` is ignored in a project repo and can never be in a
diff.

The criterion of the spec on the template block is split in two: the
`human_gate_paths` under `.harness/docs/` and `.harness/docs/codebase-map.md`
in `never_tier_0` are S88, which moves the documents. Here those two lists
keep the paths under `docs/` they have.

This repo's own block keeps its own lists, `docs_extra_paths` included, with
the paths that changed name: `.harness/AGENTS.md` where it said `AGENTS.md`
as the file of the block, and the root `AGENTS.md` stays never tier 0.
`skills/*/templates/AGENTS.md` stays sensitive. How this repo's root
`AGENTS.md` and `.harness/AGENTS.md` share the text of today is this slice's
call, inside the rule above: what describes the harness project stays at the
root, what the scripts and the skills of the chain read goes under
`.harness/`. `CLAUDE.md` keeps its paragraphs on the skills and the hooks.

The PR of this slice is tier 3 in CI, once: `tier.sh` reads the block at the
base ref, and main has no `.harness/AGENTS.md` until this merges. That is the
fail-closed branch doing its job, Lionel merges every PR here anyway, and the
PR body says so. No transitional reading of the root file is built.

`policy-lines.sh` takes the text of the file and not a path, so most of the
change is in its callers and in its comments.

Out of scope: writing the `## Harness` section in a project repo, which is
stage `local` (S93); merging a policy block key by key, which stays as it
is; the documents under `docs/` (S88).

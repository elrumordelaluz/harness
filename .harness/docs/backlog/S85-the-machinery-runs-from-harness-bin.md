---
id: S85
title: The scripts, the hooks and the workflows run from `.harness/bin/`, in this repo first
status: done
blocked_by: S84
tier: 2
human: false
spec: .harness/docs/specs/SPEC-harness-in-one-folder.md
---

## Goal

Every template that calls a script calls it under `.harness/bin/`, the hooks
live in `.harness/bin/hooks/`, and each workflow runs `.harness/bootstrap.sh`
after its checkout. This repo moves with them in the same PR, because it runs
on its own templates: `.harness/bin/` appears here as tracked symlinks laid
out the way the bootstrap lays the fetch out, the symlinks of `scripts/` and
the whole of `.githooks/` go, and `core.hooksPath` becomes
`.harness/bin/hooks`. After the merge a commit in this repo goes through the
hooks of `.harness/bin/hooks` and CI computes the tier with
`.harness/bin/tier.sh`.

## Acceptance criteria

- [ ] No template script, hook, workflow or `settings.json` names `scripts/<name>.sh` or `.githooks`: a script calls its siblings under `.harness/bin/`, a hook sources `.harness/bin/policy-lines.sh`, `ensure-hooks.sh` sets `core.hooksPath` to `.harness/bin/hooks`, and the hooks and the allowlist of `templates/settings.json` name `.harness/bin/`.
- [ ] Each of `ci.yml`, `automerge.yml`, `escalate.yml` and `close.yml` runs `.harness/bootstrap.sh` as its first step after the checkout, and a bootstrap that exits non-zero is a red job.
- [ ] `.harness/bin` in this repo is tracked and made of symlinks to `skills/harness-init/templates/`, laid out as the bootstrap lays it out: every file of `scripts/` at its top, `hooks` for `githooks/`, `judge` for `judge/`, `ruleset.json` for `github/ruleset.json`. The list is derived from the template directories, so a new script without its link is a red test.
- [ ] `scripts/` and `.githooks/` are gone. `check-shell.sh` and `since.sh`, the two scripts of this repo that are not templates, are moved with `git mv` to `.harness/bin/`, where they are the only two regular files among the symlinks; `typecheck` calls `.harness/bin/check-shell.sh`. `core.hooksPath` is `.harness/bin/hooks`, set by the `prepare` script.
- [ ] `.harness/bootstrap.sh` in this repo is a symlink to the template, and run here, where `.harness/bin` is tracked, it fetches nothing, sets `core.hooksPath` and exits 0.
- [ ] `.github/ruleset.json` is gone from this repo, and the comparison of `tests/architecture.test.ts` between `.github/` and the templates holds for the four workflows and the PR template and no longer looks for `.github/ruleset.json`.
- [ ] `skills/board/SKILL.md`, `skills/spec/SKILL.md`, `skills/slice/SKILL.md`, `skills/next/SKILL.md` and `skills/judge/SKILL.md` name every script under `.harness/bin/`.
- [ ] `docs/spec.md` names the scripts and the hooks where they are, in 6.1 and 6.3 and wherever else it names them, with a new version in the header and its entry in section 0.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, the describe `the repo runs on its own
templates`, first: it is rewritten to assert the layout of `.harness/bin`
  from the template directories, the absence of `scripts/` and `.githooks/`,
  and that the only entries of `.harness/bin/` that are not symlinks to the
  templates are `check-shell.sh` and `since.sh`. Red today.
- Same file, the describe `.github matches the templates it was copied
from`: the ruleset leaves the comparison. A new case reads the four
  workflow templates and asserts the bootstrap step comes right after
  `actions/checkout`. Red today.
- Same file, a new case over the templates: no file of `scripts/`,
  `githooks/`, `github/` or `settings.json` contains `scripts/` followed by a
  script name of the templates, or `.githooks`. Red today on every one.
- `tests/bootstrap.test.ts`: a fixture where `.harness/bin` is tracked, run,
  exit 0, no `fetch` recorded, `core.hooksPath` set. Red today.
- The fixtures of `tests/hooks.test.ts` (`repo()`, where the scripts are
  copied under `scripts/`), `tests/tier.test.ts`, `tests/judge.test.ts`,
  `tests/intent.test.ts`, `tests/park.test.ts`, `tests/board.test.ts`,
  `tests/policy.test.ts`, `tests/review-log.test.ts`,
  `tests/commitlint.test.ts`, `tests/prose.test.ts`,
  `tests/test-weakening.test.ts` and `tests/since.test.ts` build
  `.harness/bin/` in the disposable repo and run the script from there. The
  expectations do not change except where a message names a path, and no case
  is dropped.
- Then `pnpm test` whole, and a throwaway commit on the branch to see the
  hooks of `.harness/bin/hooks` run.

## Touchpoints

- `skills/harness-init/templates/scripts/*.sh`: the paths of the siblings; `ensure-hooks.sh` and `ensure-verdict.sh` among them.
- `skills/harness-init/templates/githooks/pre-commit`, `commit-msg`, `pre-push`: the paths of the scripts.
- `skills/harness-init/templates/github/ci.yml`, `automerge.yml`, `escalate.yml`, `close.yml`: the bootstrap step, the paths of the scripts.
- `skills/harness-init/templates/settings.json`: the two hooks and the allowlist.
- `skills/harness-init/templates/bootstrap.sh`: nothing to fetch where `.harness/bin` is tracked.
- `.harness/bin/` (new): the symlinks. `.harness/bootstrap.sh` (new): a symlink.
- `scripts/` (removed: the thirteen symlinks deleted, the two files moved), `.githooks/` (removed), `.github/ruleset.json` (removed).
- `.harness/bin/check-shell.sh`, `.harness/bin/since.sh` (moved from `scripts/`): the directories `check-shell.sh` walks, the paths in their header comments.
- `.github/workflows/*.yml`: the copies, put back by the stage of `/harness-init` that owns each.
- `.claude/settings.json`, `package.json`: the hook, the allowlist, `prepare`.
- `AGENTS.md`: the map, the "Do not" line on `.githooks/` and `scripts/`, the paths of the policy block that named them.
- `skills/board/SKILL.md`, `skills/spec/SKILL.md`, `skills/slice/SKILL.md`, `skills/next/SKILL.md`, `skills/judge/SKILL.md`: the paths of the scripts.
- `tests/*.test.ts`, `tests/agents.ts`: the fixtures.
- `docs/spec.md`, `docs/codebase-map.md`, `README.md`: the paths they name.

## Notes

Decisions of the spec. This repo takes the layout it installs, because the
skills read one set of paths in every repo, and it is the one repo that does
not fetch: `.harness/bin` here is tracked and points at the templates. The
spec says "a tracked symlink"; one symlink cannot turn four template
directories into one tree, and the layout of the fetch is fixed by a criterion
of S84, so here it is a tracked directory of symlinks, the way `scripts/` is
today. Each workflow runs the bootstrap as its first step so that CI and a
laptop get the machinery the same way. The pin takes the place of
`scripts/**` as the path that says the machinery changed: in the policy block
of this repo the globs that named `scripts/**` and `.githooks/**` now name
what replaced them, and the template block is S86.

`scripts/` goes entirely, decided by Lionel on 2026-10-02 at the board: any
project can have a `scripts/` folder, and the harness repo shows the layout
it installs. `check-shell.sh` and `since.sh` are this repo's own and not
templates, so they move to `.harness/bin/` as regular files next to the
symlinks, which is possible because `.harness/bin` here is a directory and
not one link. They are never fetched into a project repo: the bootstrap
copies the template tree, and they are not in it. `tests/since.test.ts`, the
`typecheck` script of `package.json` and the map follow the move, and in the
policy block of this repo `.harness/bin/**` takes the place of `scripts/**`
and `.githooks/**`, so the two files stay sensitive.

How the bootstrap knows it has nothing to fetch is this slice's call; "the
path `.harness/bin` is tracked" is one `git ls-files` away and needs no stamp,
which this repo does not have.

The judge prompt and schema: `.harness/bin/judge` is linked here, but
`judge.sh` keeps reading `.github/judge/` until S90, which moves the lines of
this repo out of the prompt first. Do not touch `.github/judge/` here.

The workflows of this repo are copies, not symlinks, because GitHub does not
follow a symlink under `.github/workflows/`: change the template and carry
the copy back, the comparison test says which.

Between this slice and S94 `/harness-init` is not to be run in a project
repo: its prose still copies the scripts into `scripts/` while the templates
already call `.harness/bin/`. The skills are symlinks to this working tree,
so from the merge on `/judge` and `/next` call `.harness/bin/` in every repo,
and a project repo on the old layout stops working with them: the spec
decides there is no migration. A `/next` that was running when this merges
still holds the old paths: it stops, and a new session takes the next slice.

`core.hooksPath` is one setting per clone, shared by every worktree: setting
it from the worktree of the slice changes the main checkout too, where
`.harness/bin/hooks` is not there until the merge is pulled. Leave it to the
`prepare` script and to `ensure-hooks.sh` after the merge.

Out of scope: the policy block read from `.harness/AGENTS.md` (S86), the
check of the marker in the hooks (S87), the documents (S88), a chain into a
hook manager the project already has.

---
id: S57
title: A sha that is not to be trusted is stamped and marked, and the install goes on
status: done
blocked_by: S56
tier: 2
human: false
spec: docs/specs/SPEC-harness-stamp-in-the-repo.md
---

## Goal

There is no `dev` in this repo: a template change is tried by running
`/harness-init` in another repo, from a checkout that is dirty while the change
is being tried. A stage that refused to install from there would take away the
only way to try a template before committing it. After this slice the stage
installs anyway and says so in the stamp: `"dirty": true` when the harness
checkout has uncommitted changes, `sha` and `date` `null` when there is no git
repo under the skill at all.

The `Harness` line of `/board` prints the first as `8f21c4d+` and the second as
`?`, so a sha nobody should date a bug against is visible as one on the screen
and not only in the file.

## Acceptance criteria

- [ ] With the working tree of the harness checkout dirty, the entry of the stage carries `"dirty": true` and the install goes on.
- [ ] With no git repo under the skill, `sha` and `date` are `null` and the install goes on.
- [ ] A stage installed from a dirty checkout prints as `8f21c4d+` on the `Harness` line, one with a null sha as `?`.
- [ ] The cases are covered in `tests/board.test.ts`.
- [ ] Suite, typecheck, format and build green.

## Test plan

- First in `tests/board.test.ts`, on the field S56 added to `Options` at `:67`:
  a stamp whose `local` entry carries `"dirty": true` prints `8f21c4d+` for
  that stage and the plain short sha for the others; a stamp whose `judge`
  entry has `sha` and `date` `null` prints `?`. Red today: the line S56 writes
  prints the short sha and reads neither `dirty` nor a null.
- Then the same two stamps under `--json`, next to the cases of the key
  `harness` that S56 leaves at `tests/board.test.ts:1361`: the object carries
  the file as it is, `dirty` included, because the marks are the screen's and
  the key is the data.
- Then in `tests/architecture.test.ts`, a case that reads
  `skills/harness-init/SKILL.md` and asserts both cases of a sha that is not to
  be trusted are written there, the dirty checkout and the missing git repo,
  and that neither of them stops the install. Red today.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/SKILL.md`: the rule of how the sha is read, in "Ground rules" at `:24`, which S56 writes and this slice gives its two cases.
- `skills/harness-init/templates/scripts/board.sh`: the two marks where a stage is printed, in the line S56 adds above `Slices` at `:478`, and the comment at the head, `:1-51`. `scripts/board.sh` is a symlink to it and follows.
- `tests/board.test.ts`, `tests/architecture.test.ts`.

## Notes

Why the install goes on: `docs/codebase-map.md` says there is no `dev` here and
`/harness-init` is tried by running it in another repo. The spec weighed the
other road and turned it down, a stage that stops while the harness checkout is
dirty, a cleaner guarantee that costs the way this repo is worked on. The stamp
is marked instead, and whoever reads it knows the sha does not name what was
installed.

Dirty is `git -C <the harness checkout> status --porcelain` with something in
it. The key is written only when it is true: an entry with no `dirty` is a
clean install, and that is what S56 writes.

Null is no git repo under the skill, which `git -C <that checkout> rev-parse
--git-dir` says by failing. Then `sha` and `date` are `null`, and `harness`
follows the same rule, since it is read from the same checkout.

The two marks are the spec's, character for character: `?` stands in place of
the sha when it is null, `+` follows the short sha of a dirty one, `8f21c4d+`.
A stage never installed stays `-`, which is S56's.

`blocked_by: S56`: neither the line of the screen nor the key of the stamp
exists before it, and this slice only gives them two more cases.

Out of scope: refusing an install, which is the road the spec turned down, and
the backfill of the repos already installed.

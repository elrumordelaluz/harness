---
id: S56
title: Whoever opens a session sees which commit of the harness the repo installed
status: done
blocked_by: none
tier: 2
human: false
spec: docs/specs/SPEC-harness-stamp-in-the-repo.md
---

## Goal

`/harness-init` copies templates into a repo and leaves nothing behind that
says where they came from, so a line of feedback written there cannot be dated
against this repo without reading the templates by hand and guessing. After
this slice every stage writes its own entry in `.harness/stamp.json`, tracked:
the harness it copied from, the commit of that harness and the date of that
commit. A stage that runs again rewrites its own entry and leaves the other two
alone, so a repo sitting at three different points says all three out loud.

`scripts/board.sh` prints it as the first line of the screen, which is what a
cold session reads. The line always says something true: the three stages when
the file is there, a stage never installed as `-`, `no stamp, run
/harness-init` when the file is not there, and in this repo, which never
installs into itself, that this is the harness and where its HEAD is.

## Acceptance criteria

- [ ] `/harness-init` writes `.harness/stamp.json`, tracked, with the key `harness` and a `stages` object holding `sha` and `date` for the stage that ran.
- [ ] `sha` is the full sha, `date` the date of that commit, `YYYY-MM-DD`.
- [ ] A stage that runs again rewrites its own entry and leaves the other two as they are, even when it changed nothing else.
- [ ] `.harness/**` is among the `sensitive_paths` of the policy block the stage writes.
- [ ] The file has its line in `skills/harness-init/templates/README.md`, destination `.harness/stamp.json`, all three stages.
- [ ] `scripts/board.sh` prints a `Harness` line above `Slices  N done, M open`, with the three stages, the short sha and the date of the commit of each one.
- [ ] A stage never installed shows as `-`.
- [ ] With no `.harness/stamp.json`, the line is `Harness  no stamp, run /harness-init`.
- [ ] In the harness repo itself, recognised by `skills/harness-init/templates/` on disk, the line is `Harness  this is the harness, <short sha> <date>` read from its own HEAD.
- [ ] `scripts/board.sh --json` carries the same object under the key `harness`, and the screen is derived from it.
- [ ] The cases are covered in `tests/board.test.ts`.
- [ ] Suite, typecheck, format and build green.

## Test plan

- First in `tests/board.test.ts`, two fields on `Options` at `:67`: one that
  writes `.harness/stamp.json` into the throwaway repo, one that creates
  `skills/harness-init/templates/` in it. Then the cases of the screen: a stamp
  with the three stages prints the line above `Slices  N done, M open` with the
  short sha and the date of each; a stamp with `local` alone prints `-` for
  `ci` and `judge`; no file prints `Harness  no stamp, run /harness-init`; a
  repo with `skills/harness-init/templates/` and a commit prints
  `this is the harness` with the short sha and the date of its HEAD. Red today:
  `board.sh` prints no such line at all.
- Then, next to the `describe` at `tests/board.test.ts:1361`, the same cases
  under `--json`: the key `harness` carries what the file said, and the missing
  stamp and the harness repo are told apart there too. Red today: the object at
  `board.sh:353` has six keys and none of them is `harness`.
- Then in `tests/architecture.test.ts`, three cases on the prose and the
  templates: `skills/harness-init/SKILL.md` says that each of the three stages
  writes its entry of `.harness/stamp.json`; the policy block of
  `skills/harness-init/templates/AGENTS.md` has `.harness/**` among the
  sensitive paths, next to the fixed list at `:553`; `templates/README.md` has
  the row of `.harness/stamp.json` with its destination and the three stages,
  under the `describe` at `:78`. Red today on all three.
- The screen grows by a line: the two cases at `tests/board.test.ts:486` count
  it against the forty. If it goes over, the board gives back columns and never
  a row.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/SKILL.md`: a step in each stage, `local` at `:79`, `ci` at `:176`, `judge` at `:229`, that writes the entry before the hand-back, and the rule of how the sha is read, in "Ground rules" at `:24`.
- `skills/harness-init/templates/AGENTS.md`: `.harness/**` in the `sensitive_paths` of the json fence at `:57` and in the prose line at `:31`.
- `skills/harness-init/templates/README.md`: the row of the new file, which has no template on disk, written the way the `.gitignore` row above it is.
- `skills/harness-init/templates/scripts/board.sh`: the reading of the stamp, the `harness` key of the object at `:353`, the line above `Slices` at `:478`, and the comment at the head, `:1-51`, which is where the screen is described. `scripts/board.sh` is a symlink to it and follows.
- `tests/board.test.ts`, `tests/architecture.test.ts`.
- `docs/codebase-map.md`: the cell of `skills/harness-init/templates/scripts`, the sentence that says what `board` prints.

## Notes

The file, as the stage leaves it:

    {
      "harness": "git@github.com:lio/harness.git",
      "stages": {
        "local": { "sha": "<40 characters>", "date": "2026-09-20" },
        "ci": { "sha": "<40 characters>", "date": "2026-09-21" }
      }
    }

`harness` is the origin of the checkout the skill copied from,
`git -C <that checkout> remote get-url origin`: if one day the templates come
from a fork the stamp says so instead of pretending there is a single harness.
The full sha is stored and the short one printed, because the command over the
templates needs a real ref and a short sha grows ambiguous.

The date is the committer date of that commit, `--format=%cd --date=short`, and
`board.sh` reads its own HEAD the same way for the harness line: two readings
of the same fact that must not disagree.

A rerun merges with `jq`, replacing the entry of the stage that ran, and never
rewrites the file whole: that is the criterion about the other two stages, and
a flat rewrite is what would break it. A file that is not there is created.

Tracked means the file lands in the commit of the stage, on `harness/<stage>`:
a stamp that is not committed is a stamp CI never sees.

`.harness/**` goes in the policy block of `templates/AGENTS.md` and not in the
`AGENTS.md` of this repo: this repo never installs into itself, and the case at
`tests/architecture.test.ts:526` wants every glob of its lists to match a
tracked file. A stamp corrected by hand lies, and those PRs are tier 2 already
for touching `scripts/**` and `.github/**`, so the rule costs nothing and shuts
the door on a hand edit landing at tier 1.

The policy block of a repo that already has one is merged key by key and a key
that is there stays as it is (`SKILL.md:112-125`), so `.harness/**` reaches the
repos installed from now on. That is the same line the spec draws on the
backfill, not a defect to fix here.

The board never turns a file it reads into an exit 1: `gh` that cannot answer
is a row and an exit 0, and a stamp that `jq` refuses has to end in a line too,
not in a screen that is not there. With `set -euo pipefail` that is something
to write on purpose.

The sections of the screen are separated by a blank line and the `Harness` line
is the first of them.

The two marks of a sha that is not to be trusted, `8f21c4d+` and `?`, are S57,
which follows this one and reads the same key. Here a stage never installed is
`-` and nothing else.

Out of scope, and this slice could drift into all four: a declared version
number for the harness, which has to be remembered at every release and which
the three stages could not say anyway; moving a repo forward when the harness
moves, because the stamp says where the repo is and does not update it; the
path that carries feedback back to this repo, which is a line of its own in the
inbox; the backfill of the repos already installed, and any guess at the sha
they came from.

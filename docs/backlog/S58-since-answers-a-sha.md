---
id: S58
title: Whoever reads a sha sees what moved in the templates since then
status: done
blocked_by: none
tier: 2
human: false
spec: docs/specs/SPEC-harness-stamp-in-the-repo.md
---

## Goal

A line of feedback that comes back from a repo carries the sha its stamp says,
and here that sha has to turn into an answer: what moved in the templates
between that commit and HEAD, which says whether the fix has already landed and
in which commit. Plain `git log` prints the same nothing for the two cases that
mean opposite things, a sha this repo does not have and a range with nothing in
it.

After this slice `scripts/since.sh <sha>` tells them apart: an unknown sha is
said out loud and exits non zero, an empty range says the templates have not
moved since that commit and exits 0. It is the second script of this repo that
is not a template, next to `scripts/check-shell.sh`, and the lines that say
there is one move with it.

## Acceptance criteria

- [ ] `scripts/since.sh <sha> [path...]` prints one line per commit, with the date, the subject and the files touched under `skills/harness-init/templates/`.
- [ ] A sha this repo does not have is said out loud and exits non zero.
- [ ] An empty range says the templates have not moved since that commit, and is told apart from the sha that is not there.
- [ ] With no path argument the range is the templates alone.
- [ ] The three outcomes are covered in `tests/since.test.ts`.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/since.test.ts`, new, on throwaway git repos the test builds the way
  `tests/board.test.ts` builds its own at `:84`, with the identity on the
  command line so the case does not depend on the git config of whoever runs
  it: a base commit, a commit that touches
  `skills/harness-init/templates/scripts/x.sh`, a commit that touches a file
  outside the templates.
- The three outcomes, one case each: from the base, the output has the commit
  of the template with its date, its subject and the file, and not the commit
  outside the templates; a sha the repo does not have, `0000000`, exits non
  zero and names it; from HEAD, exit 0 and the sentence that the templates have
  not moved. Red today, because the file does not exist.
- A fourth case for the path argument: with a path outside the templates, the
  commit that touches it is the one printed, which is the other half of the
  criterion about the range with no argument.
- `scripts/check-shell.sh` finds the new script on its own, `find ... scripts`,
  so `pnpm typecheck` parses it from the first run. It has to be executable.
- Then `pnpm test` whole.

## Touchpoints

- `scripts/since.sh`: new, executable, neither a symlink nor a template.
- `AGENTS.md`: the line of the "Map" at `:10` that names `scripts/check-shell.sh` as the only script here that is not a template.
- `docs/codebase-map.md`: the row of `.githooks/, scripts/` at `:22`, which says the same thing.
- `tests/since.test.ts`: new.

## Notes

Why a script and not a `git log` line written down in the map: a sha that does
not exist and an empty range print the same nothing, and the two mean opposite
things, "it has already landed, do nothing" and "I cannot answer". A line of
prose cannot tell them apart, a script can.

The unknown sha is caught before the log, `git cat-file -e <sha>^{commit}`, so
that case is a message on stderr and an exit non zero and never an empty
answer.

The range is `<sha>..HEAD`. With no path argument it is limited to
`skills/harness-init/templates/`, which is the question the stamp asks; a path
argument replaces that limit and is passed through.

One line per commit, with the date, the subject and the files touched on it, so
a grep over the output answers about one file. Within those three the shape is
the implementer's.

`since.sh` stays out of the templates: it answers about the templates of this
repo and would mean nothing in a repo that received them. The structural case
at `tests/architecture.test.ts:132` reads the files of `scripts/` and asks for
a symlink only where a template of the same name exists, so a script of this
repo's own needs no change there, the way `check-shell.sh` needs none. Write it
for the same bash as the templates anyway: the shell that runs it is the macOS
one, bash 3.2.

S56 also names `docs/codebase-map.md`, so `/next` does not run the two in the
same wave. They are independent all the same: this one takes a sha on the
command line and never reads the stamp.

Out of scope: the path that carries feedback back to this repo, which is a line
of its own in the inbox and comes after this, and moving a repo forward when
the harness moves.

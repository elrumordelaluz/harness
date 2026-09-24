---
status: approved
intent: docs/intent/harness-stamp-in-the-repo.md
date: 2026-09-22
approved: 2026-09-22
---

# SPEC: the harness stamp in the repo

## Problem

`/harness-init` copies templates into a repo and leaves nothing behind that says
which commit of the harness they came from. Tipoff has taken the three stages
more than once, and ADR-0003 writes down what that costs: on its `harness/judge`
branch sat six commits that had nothing to do with the product, because a skill
compares the repo with the current template and the copies drift. When feedback
comes back from a repo like that, nobody can say whether it describes a bug fixed
here two weeks ago or one still open, and the only way to find out is to read the
template by hand and guess.

## Solution

Every stage of `/harness-init` leaves a line about itself in a tracked file of
the repo it installed into, `.harness/stamp.json`: the harness it copied from,
the commit of that harness and the date of that commit. A stage rerun rewrites
its own entry and leaves the other two alone, so a repo sitting at three
different points says all three out loud.

`scripts/board.sh` prints the stamp as the first line of its screen, which is
what a cold session reads when it opens in that repo. The line always says
something true: the three stages when the file is there, `no stamp, run
/harness-init` when it is not, and in the harness repo itself, which never
installs into itself, the fact that this is the harness and where its HEAD is.

In this repo a sha turns back into an answer with `scripts/since.sh <sha>`,
which prints what moved in the templates between that commit and HEAD. Its
value is in telling apart the two cases that plain `git log` prints
identically: a sha this repo does not have, and a range with nothing in it.

## User stories with criteria

As whoever runs a stage of `/harness-init` in a repo, I leave behind a file
that says which commit of the harness that stage came from.

- [ ] `/harness-init` writes `.harness/stamp.json`, tracked, with the key `harness` and a `stages` object holding `sha` and `date` for each stage
- [ ] a stage that runs again rewrites its own entry and leaves the other two as they are, even when it changed nothing else
- [ ] `sha` is the full sha, `date` the date of that commit, `YYYY-MM-DD`
- [ ] with the working tree of the harness checkout dirty, the entry carries `"dirty": true` and the install goes on
- [ ] with no git repo under the skill, `sha` and `date` are `null` and the install goes on
- [ ] `.harness/**` is among the `sensitive_paths` of the policy block the stage writes
- [ ] the file has its line in `skills/harness-init/templates/README.md`, destination `.harness/stamp.json`, all three stages

As whoever opens a session in a repo that has the harness, I see at the top of
the `/board` screen which commit of the harness every stage came from.

- [ ] `scripts/board.sh` prints a `Harness` line above `Slices  N done, M open`, with the three stages, the short sha and the date of the commit of each one
- [ ] a stage never installed shows as `-`, one installed from a dirty checkout as `8f21c4d+`, one with a null sha as `?`
- [ ] with no `.harness/stamp.json`, the line is `Harness  no stamp, run /harness-init`
- [ ] in the harness repo itself, recognised by `skills/harness-init/templates/` on disk, the line is `Harness  this is the harness, <short sha> <date>` read from its own HEAD
- [ ] `scripts/board.sh --json` carries the same object under the key `harness`
- [ ] the cases are covered in `tests/board.test.ts`

As whoever reads a line of feedback that came back from a repo, I turn its sha
into the list of what moved in the templates since then.

- [ ] `scripts/since.sh <sha> [path...]` prints one line per commit, date, subject and the files touched under `skills/harness-init/templates/`
- [ ] a sha this repo does not have is said out loud and exits non zero
- [ ] an empty range says the templates have not moved since that commit, and is told apart from the case above
- [ ] with no path argument the range is the templates alone
- [ ] the three outcomes are covered in `tests/since.test.ts`

## Locked decisions

- The stamp is a file in the repo and not its git history. Rejected alternative: no file at all, a `Harness-Stage: local 8f21c4d 2026-09-20` trailer on the commit of each stage, read back with `git log --grep`, a record that cannot drift because nobody rewrites it. It falls on two counts: the harness lands with a PR from `harness/<stage>` merged by hand, and a squash merge rewrites those commits, so the trailer survives only if somebody copies it into the squash body; and CI checkouts are shallow by default, `fetch-depth: 1`, so `board.sh` in CI would print an empty line without knowing why. A tracked file is in every clone, shallow included.
- The stamp is a tracked JSON file, `.harness/stamp.json`, written only by `/harness-init` and read with `jq`. Because it is written by a machine and read by a machine: inside `AGENTS.md` it would sit under the 100 line cap and in a sensitive path that every stage rerun would rewrite, and under `docs/` it would land among the documents of the chain, where `human_gate_paths` decides who merges. A dot directory at the root stands with `.githooks/` and `.claude/`, which are the harness and not the product.
- The full sha is stored and the short one printed, and `harness` holds the origin of the checkout the skill copied from. Because the command over the templates needs a real ref and a short sha grows ambiguous, and if one day the templates come from a fork the stamp says so instead of pretending there is a single harness.
- A sha that is not to be trusted is stamped and marked, never refused: `dirty` on a dirty checkout, `null` when there is no git repo under the skill. Because `docs/codebase-map.md` says there is no `dev` here and `/harness-init` is tried by running it in another repo, so refusing a dirty install would take away the only way to try a template change before committing it. Rejected alternative: a stage that stops while the harness checkout is dirty, a cleaner guarantee that costs the way the repo is worked on.
- `.harness/**` goes among the `sensitive_paths` of the repos that receive the harness. Because a stamp corrected by hand lies, and those PRs are tier 2 already for touching `scripts/**` and `.github/**`, so the rule costs nothing and shuts the door on a hand edit landing at tier 1.
- A missing stamp and the harness repo itself print two different lines, told apart by `skills/harness-init/templates/` on disk. Because three `-` printed at every session of this repo are noise, and noise teaches whoever reads it to skip the line in the repos where it counts. Rejected alternative: print nothing when the stamp is missing, which makes a repo that lost the file and one that never had it identical on screen, the same mistake `since.sh` was just built to avoid.
- The line is printed by `scripts/board.sh`, the first line of the screen, and the same object sits under `harness` with `--json`. Because `/board` is already what opens a cold session, and a stamp printed only on request is one nobody reads. Rejected alternative: a script of its own, `scripts/harness-stamp.sh`, composable but called by nobody.
- The answer to a sha is a script of this repo, `scripts/since.sh`, and not a `git log` line written down in `docs/codebase-map.md`. Because a sha that does not exist and an empty range print the same nothing, and the two mean opposite things, "it has already landed, do nothing" and "I cannot answer". It is the second script here that is not a template, next to `scripts/check-shell.sh`, and the line of `AGENTS.md` that says there is one moves with it.
- The repos already installed get no backfill: the sha they came from is not knowable. The stamp appears the first time a stage is rerun, and until then `/board` there says `no stamp, run /harness-init`.

## Modules touched

- `.harness/stamp.json`: new, written by `/harness-init`, one entry per stage
- `skills/harness-init/SKILL.md`: every stage writes its own entry of the stamp before the hand-back, and the three cases of a sha that is not to be trusted
- `skills/harness-init/templates/AGENTS.md`: `.harness/**` in the `sensitive_paths` of the policy block
- `skills/harness-init/templates/scripts/board.sh`: the line at the top of the screen and the `harness` key in `--json`
- `skills/harness-init/templates/README.md`: the line of the new file, with destination and stage
- `scripts/since.sh`: new, the only other script of this repo that is not a template
- `AGENTS.md`: the line naming `scripts/check-shell.sh` as the only script that is not a template
- `tests/board.test.ts`: the cases of the line
- `tests/since.test.ts`: new, the three outcomes on a disposable repo

## Out of scope

- A declared version number for the harness: the sha and its date are derived at install time and cannot be forgotten, the three stages move separately and a single number cannot say so.
- Moving a repo forward when the harness moves: the stamp says where the repo is, it does not update it.
- The path that carries feedback back to this repo: a line of its own in the inbox, and it comes after this.
- A backfill of the repos already installed, and any guess at the sha they came from.

## Open questions

Nessuna.

## Decisions to confirm

1. The stamp is a tracked file, `.harness/stamp.json`, written only by `/harness-init`, and not a trailer on the git history of the install commits.
2. A sha that is not to be trusted is stamped and marked, never refused: a dirty harness checkout installs and writes `"dirty": true`.
3. `/board` carries the stamp, first line of the screen, and the line always says something true: the three stages, `no stamp, run /harness-init`, or the harness repo itself.
4. `scripts/since.sh <sha>` is the answer to a sha, the second script of this repo that is not a template, and it tells an unknown sha apart from an empty range.
5. The repos already installed get no backfill: the stamp appears the first time a stage is rerun.

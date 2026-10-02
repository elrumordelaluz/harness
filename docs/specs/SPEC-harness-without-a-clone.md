---
status: approved
intent: docs/intent/harness-without-a-clone.md
date: 2026-10-02
approved: 2026-10-02
---

# SPEC: the harness without a clone

## Problem

To install the harness a team member needs a local clone of this repo and one
symlink per skill in `~/.claude/skills/`, as `CLAUDE.md` and the data flow of
`docs/codebase-map.md` describe. Nobody but Lionel has that setup, so Lionel
runs `/harness-init` for a teammate, and `/judge`, `/next` and `/board` do not
exist on the teammate's machine at all.

## Solution

The skills travel the way the machinery does. `.harness/bootstrap.sh`, which
`SPEC-harness-in-one-folder` has fetch this repo at `pin.sha` and copy
`skills/harness-init/templates/` into `.harness/bin/`, also copies the skills
into the project's `.claude/skills/`, ignored by git. The `SessionStart` hook
that spec installs runs the bootstrap, so a teammate who clones a repo with the
harness and opens Claude Code has the skills at the version the repo pins,
with nothing typed and nothing written in the home folder. There is one
version, the pin of `.harness/stamp.json`.

The six skills are named `harness-<name>`, so the bootstrap owns one pattern,
`.claude/skills/harness-*`, one `.gitignore` line covers it, and no skill of
the project's own is in the way. The commands are `/harness-board`,
`/harness-init`, `/harness-judge`, `/harness-next`, `/harness-slice` and
`/harness-spec`.

The first install is one command, run from the root of the project:

    curl -fsSL https://raw.githubusercontent.com/elrumordelaluz/harness/main/install.sh | bash

`install.sh` is a new file at the root of this repo. It resolves the sha of the
harness's `main` with `git ls-remote`, writes `.harness/stamp.json` with that
pin and `.harness/bootstrap.sh`, and runs the bootstrap: the six skills and the
machinery are in place at that sha. Its last line says to open Claude Code and
run `/harness-init`, which writes the tracked files. There is no plugin and no
marketplace file.

A repo never moves to a newer harness on its own. The board says
`newer harness available` when the harness's `main` is past the pin. A person
runs `.harness/bootstrap.sh upgrade`, which moves the pin to that sha and
fetches. Then `/harness-init`, now at the new version, rewrites the tracked
files that changed, and the whole is one PR. A teammate gets it by pulling and
opening a session.

`upgrade <ref>` pins a branch or a sha instead of `main`. It is how a change
that is not on `main` yet is tried in another repo, by Lionel or by anyone, and
how a repo goes back to an older commit of `main`. On a laptop any ref is
allowed. In CI the bootstrap also checks that the pinned commit belongs to the
harness's `main`, and a PR that carries a trial pin is red.

Lionel's machine is set up like everyone's: no symlink in `~/.claude/skills/`.
In this repo alone the skills are not fetched: `.claude/skills/harness-*` are
tracked symlinks to `skills/harness-*`, as `.harness/bin` is a tracked symlink
to the templates in `SPEC-harness-in-one-folder`, so here the working tree is
what runs.

The CI gains nothing else. The four workflows stay copies in the project, as
`SPEC-harness-in-one-folder` installs them, and each runs the bootstrap as its
first step, so CI runs the gates at the pin already.

## User stories with criteria

As a teammate with Claude Code and `gh`, and no clone of the harness, I install
it in a repo that has none.

- [ ] In a git repo with no `.harness/stamp.json`, the one command exits 0 and leaves `.harness/stamp.json` with `pin.origin`, `pin.sha` and `pin.date`, `.harness/bootstrap.sh`, `.harness/bin/` and the six folders `.claude/skills/harness-*`, and `pin.sha` is the sha `git ls-remote` gives for the harness's `main`.
- [ ] `.harness/bootstrap.sh` is byte for byte the bootstrap of this repo at `pin.sha`.
- [ ] Its last line of output names `/harness-init`.
- [ ] Outside a git repo it writes nothing and exits non-zero with one line that says why.
- [ ] Where `.harness/stamp.json` already exists it writes nothing and exits non-zero with one line that names `.harness/bootstrap.sh upgrade`.
- [ ] With `HOME` set to an empty folder, the one command and the three stages of `/harness-init` leave that folder empty.
- [ ] After the install and the three stages, `git status --porcelain` lists no path outside the closed list of `SPEC-harness-in-one-folder`.
- [ ] `install.sh` and the bootstrap take the origin of the harness from one variable, so that the tests run them against a disposable local repo and never against GitHub.

As a second teammate, I clone a repo where the harness is installed and get the
six skills.

- [ ] On a clone with no `.claude/skills/harness-*`, `.harness/bootstrap.sh` leaves `.claude/skills/<name>/SKILL.md` for `harness-board`, `harness-init`, `harness-judge`, `harness-next`, `harness-slice` and `harness-spec`, each byte for byte the file of this repo at `pin.sha`, with the files next to it, `templates/` included.
- [ ] `git status --porcelain` after the bootstrap lists nothing under `.claude/skills/`.
- [ ] A skill of the project's own in `.claude/skills/`, tracked or not, whose name does not start with `harness-`, is byte for byte what it was after the bootstrap.
- [ ] A folder `.claude/skills/harness-<x>` that the pinned version does not have is gone after the bootstrap.
- [ ] A failed fetch leaves the folders `.claude/skills/harness-*` as they were, as it leaves `.harness/bin/`.
- [ ] The marker of `.harness/bin/` covers the skills: with the marker equal to the pin the bootstrap fetches nothing and writes nothing.
- [ ] The `.gitignore` of an installed repo has the line `.claude/skills/harness-*/`, appended if absent.
- [ ] `README.md` says, from a trial on a machine and with its date, whether a skill written by the `SessionStart` hook is callable in the session that wrote it; if it is not, the bootstrap run by the hook ends with one line that says to restart the session.

As whoever keeps the harness of a repo, I move it to a newer version.

- [ ] With the harness's `main` at another sha than `pin.sha`, the first line of `scripts/board.sh` carries `newer harness available`; with the two equal, or with the remote out of reach, it does not, and the exit code is the same.
- [ ] `.harness/bootstrap.sh upgrade` sets `pin.sha` and `pin.date` to the commit `git ls-remote` gives for the harness's `main`, fills `.harness/bin/` and `.claude/skills/harness-*` from it, and exits 0.
- [ ] `.harness/bootstrap.sh upgrade <ref>` does the same with the commit of that branch, tag or sha.
- [ ] With the remote out of reach, or a ref the remote does not have, it leaves `.harness/stamp.json`, `.harness/bin/` and `.claude/skills/` as they were and exits non-zero with the reason.
- [ ] A stage of `/harness-init` leaves `pin` as it found it and writes that sha in its own entry under `stages`.
- [ ] `skills/harness-init/SKILL.md` no longer reads a sha, an origin or a `dirty` mark from the checkout the skill runs from.

As Lionel, I try a change of the harness in another repo before it is on
`main`.

- [ ] With the pinned commit not an ancestor of the harness's `main`, the bootstrap run with `CI` set exits non-zero with one line that names the pin and says it is not on `main`; run without `CI` it exits 0.
- [ ] With the pinned commit an older commit of the harness's `main`, the bootstrap run with `CI` set exits 0.
- [ ] With the pinned commit not on the harness's `main`, the first line of `scripts/board.sh` carries `pin not on main`.
- [ ] In this repo `.claude/skills/harness-<name>` is a tracked symlink to `skills/harness-<name>` for each of the six, and `tests/architecture.test.ts` holds it.
- [ ] No file of this repo tells anyone to make a symlink in `~/.claude/skills/`.

As anyone who reads the repo, I find one name per skill.

- [ ] The folders of `skills/` are `harness-board`, `harness-init`, `harness-judge`, `harness-next`, `harness-slice` and `harness-spec`, and the `name:` of each `SKILL.md` is its folder.
- [ ] No tracked file outside `docs/backlog/`, `docs/review-log/`, `docs/decisions/`, `docs/intent/` and the specs already approved names a skill as `/board`, `/judge`, `/next`, `/slice` or `/spec`.
- [ ] Suite, typecheck, format and build green.

## Locked decisions

- The structural choice: the bootstrap fetches the skills at the pin into the
  project's `.claude/skills/`, ignored. Why: the intent asks for the skills at
  the version the repo pins, and with one fetch at one sha the skills and the
  scripts cannot disagree; the second teammate types nothing; nothing lands in
  the home folder. Rejected: the six skills as a Claude Code plugin, with a
  `.claude-plugin/marketplace.json` in this repo and the marketplace named in
  the tracked settings. It is the delivery Claude Code offers, but the skills
  get a version of their own in `~/.claude/plugins/cache/`, one per machine
  against one pin per repo, and a plugin namespaces its skills. Chosen by
  Lionel on 2026-10-02.
- The first install is `install.sh` at the root of this repo, fetched with
  `curl` from `main` and piped to `bash`. Why: with the skills fetched by the
  bootstrap, one mechanism serves the first machine and every one after it.
  Rejected: a plugin that carries `/harness-init` alone, which would put that
  skill on the machine twice, at the plugin's version and at the pin, and
  bring back a marketplace file here and an entry in the user's settings.
  Accepted with it: `install.sh` runs from `main` unchecked, once, before a
  pin exists; it is short enough to read at its URL, and everything it fetches
  afterwards git checks against the sha. Chosen by Lionel on 2026-10-02.
- "Installs it with one command" is read on a repo with no harness. No repo
  is treated as already installed, and the install writes the layout of
  `docs/specs/SPEC-harness-in-one-folder.md`. Answered by Lionel on
  2026-10-02.
- The second teammate is in scope: a repo with the harness installed carries,
  tracked, what the next clone needs to get the six skills. Why: otherwise
  the problem of the intent comes back one clone later. Answered by Lionel on
  2026-10-02.
- The only settings file the harness writes is the project's tracked
  `.claude/settings.json`, already on the closed list of
  `SPEC-harness-in-one-folder`, and this spec adds no key to it. It never
  writes the user's `~/.claude/settings.json` nor `.claude/settings.local.json`.
  Answered by Lionel on 2026-10-02.
- The skills of the harness are named `harness-<name>`, in the source: the
  folders are `skills/harness-board/`, `skills/harness-judge/`,
  `skills/harness-next/`, `skills/harness-slice/` and `skills/harness-spec/`,
  the `name:` of each `SKILL.md` says the same, and the commands follow.
  `harness-init` keeps its name. Why: no collision with a skill of the
  project's own, one `.gitignore` line, and a folder name that says whose it
  is. Rejected: the prefix added by the bootstrap on the copy alone, where the
  `name:` line and the text of the skills, which name each other, would say
  one command and the machine another. Rejected: `hrn-`, `hrnss-`, `hrss-` and
  `h-`, shorter and either easy to misspell or mute for whoever finds the
  folder. Chosen by Lionel on 2026-10-02.
- The rename is one maintenance PR of its own, mechanical, before the rest:
  the folders, the `name:` lines, and every mention of the five commands in
  the skills, the templates, the tests, `AGENTS.md`, `CLAUDE.md`, `README.md`,
  `docs/spec.md` and `docs/codebase-map.md`. The documents that record what
  happened, the backlog, the review log, the ADRs, the intents and the specs
  already approved, keep the names they were written with.
- The bootstrap owns `.claude/skills/harness-*`: on every fetch it clears the
  folders of that pattern and writes the ones the pinned version has, with the
  same swap as `.harness/bin/`, complete or not at all. A skill removed in a
  newer version leaves with no list kept, and a project skill is never touched
  unless its name starts with `harness-`.
- The pin is written in two places only: `install.sh` at the first install
  and `.harness/bootstrap.sh upgrade` after. `/harness-init` reads it and
  stamps its `stages` entry with it. Why: a skill fetched at the pin is never
  newer than the pin and has nothing newer to write. This replaces two
  criteria of `docs/specs/SPEC-harness-in-one-folder.md`, lines 92 and 93,
  "Every stage of `/harness-init` sets `pin` to the commit it runs from" and
  the stage run from a dirty checkout, and the block of
  `skills/harness-init/SKILL.md:55-80` that reads
  `git -C <checkout> rev-parse HEAD`. Rejected: `/harness-init` asking the
  remote for the newest sha itself, a skill at the old version installing the
  files of a version it was not fetched at, and an upgrade that works only
  inside Claude Code. Confirmed by Lionel on 2026-10-02.
- No update happens on its own, and the advice is one line on the board,
  `newer harness available`, silent when the remote is out of reach. No
  prompt at session start, no nag in the git hooks. Confirmed by Lionel on
  2026-10-02.
- `upgrade <ref>` is for trying a change and for going back, and a check says
  so, not a sentence: in CI the bootstrap refuses a pin that is not an
  ancestor of the harness's `main`. On a laptop it is allowed, and the board
  prints `pin not on main`. The cost is a fetch of the history of the
  harness's `main` in CI, where the plain bootstrap fetches one commit.
  Confirmed by Lionel on 2026-10-02.
- Lionel's setup is the public one: no symlink in `~/.claude/skills/`, the
  same install as every teammate. This narrows the intent's "the symlinks
  stay as my development setup", which Lionel wrote and Lionel changed in the
  interview on 2026-10-02. What goes with them is the edit that is live in
  every repo at the save: a trial elsewhere costs a commit and a push.
- In this repo the skills are tracked symlinks, `.claude/skills/harness-<name>`
  to `skills/harness-<name>`, and it has no `.gitignore` line for them: the
  one repo that does not fetch, as for `.harness/bin`. Confirmed by Lionel on
  2026-10-02.
- The CI stays as `SPEC-harness-in-one-folder` has it: workflows copied, the
  bootstrap as first step. Why: that already runs the gates at the pin.
  Rejected: reusable workflows called from the harness repo, where the ref
  sits in each `uses:` line and cannot be read from `stamp.json`, a second
  version to keep equal to the pin. Confirmed by Lionel on 2026-10-02.
- `SPEC-harness-in-one-folder` is not sliced before this spec is approved, so
  that no slice is built on the rule this one replaces. `/slice` cuts the two
  in that order and this one names the other's slices in `blocked_by`: the
  bootstrap, the pin and the `SessionStart` hook are built there.
- The proof is in two parts. Vitest runs `install.sh` and the bootstrap as
  processes against a disposable bare repo standing in for GitHub, with `HOME`
  an empty folder, as `docs/codebase-map.md` describes for the other scripts.
  One trial by hand on a real machine, with no clone and no symlink, settles
  what a test cannot: whether the skills are callable in the session that
  fetched them. From the checkpoint of 2026-10-02, with no objection.
- `README.md` changes with it: `## Install` at line 71 carries the one command
  in place of the clone and the `ln -s`, and lines 161 to 165 lose the
  sentence that says the skills could become a plugin. From the checkpoint of
  2026-10-02, with no objection.

## Modules touched

- `install.sh` (new): the one command; refuses outside a git repo and on a repo with a pin.
- `skills/harness-init/templates/bootstrap.sh` (new in `SPEC-harness-in-one-folder`): the copy of the skills into `.claude/skills/harness-*`, `upgrade` and `upgrade <ref>`, the check of the pin against `main` when `CI` is set, the origin from a variable.
- `skills/board/`, `skills/judge/`, `skills/next/`, `skills/slice/`, `skills/spec/`: renamed to `skills/harness-<name>/`, the `name:` line and every command they name.
- `skills/harness-init/SKILL.md`: the pin read and never written, the block at lines 55 to 80 gone, the `.gitignore` line for the skills, the commands under their new names.
- `skills/harness-init/templates/scripts/board.sh`: `newer harness available` and `pin not on main` on the first line.
- `skills/harness-init/templates/`: every template that names one of the five commands.
- `skills/harness-init/templates/README.md`: the row of the skills, destination and stage.
- `.claude/skills/harness-*` (new): six tracked symlinks to `skills/harness-*`.
- `tests/install.test.ts` (new) and `tests/bootstrap.test.ts`: the criteria above against a disposable bare origin.
- `tests/architecture.test.ts`: the symlinks of `.claude/skills/`, the names of the folders, and the check at lines 1436 to 1461 that reads the symlink line of `CLAUDE.md`, which goes.
- `CLAUDE.md`: the paragraph on the symlinks in `~/.claude/skills/` becomes the one on `.claude/skills/`.
- `AGENTS.md`: the map, with the new names and `install.sh`.
- `README.md`: `## Install`, the lines on a plugin, the commands.
- `docs/spec.md` and `docs/codebase-map.md`: the names of the commands, the data flow and the first dragon, which leaves with the symlinks.

## Out of scope

- From the intent: the git hooks and the scripts, which
  `SPEC-harness-in-one-folder` already fetches at the pin.
- From the intent: what the CI runs and how it sits next to a project's own
  CI. The one thing added to it here is the check of the pin, inside the
  bootstrap the workflows already run.
- From the intent: publishing to a marketplace or a registry beyond the
  GitHub repo.
- A repo on the layout of today: there is none to serve, as in
  `SPEC-harness-in-one-folder`.
- A machine without `curl`, `git` or `bash`, Windows outside WSL included.
- A fork as the origin of a pin in CI: the check reads `main` of `pin.origin`,
  whatever that is, and nothing says which origins are allowed.
- Taking Lionel's symlinks out of `~/.claude/skills/`: it is done by hand, on
  one machine, once the trial has passed.

## Open questions

None.

## Decisions to confirm

1. The six skills are fetched by `.harness/bootstrap.sh` at the pin into the project's `.claude/skills/`, ignored, and there is no plugin: one version per repo, nothing in the home folder, and the second teammate types nothing.
2. The first install is `curl -fsSL https://raw.githubusercontent.com/elrumordelaluz/harness/main/install.sh | bash`, run unchecked once, and then `/harness-init`.
3. The skills are renamed in the source to `harness-<name>`, so `/board`, `/judge`, `/next`, `/slice` and `/spec` become `/harness-board`, `/harness-judge`, `/harness-next`, `/harness-slice` and `/harness-spec`, in one mechanical PR before the rest.
4. A repo updates only by hand: the board says `newer harness available`, `.harness/bootstrap.sh upgrade` moves the pin, `/harness-init` only reads it, which replaces two criteria of `SPEC-harness-in-one-folder`, and that spec is sliced after this one is approved.
5. Lionel gives up the symlinks in `~/.claude/skills/`: a change is tried elsewhere with `upgrade <ref>` on a pushed branch, CI refuses a pin that is not on the harness's `main`, and only inside this repo the working tree runs.

---
status: approved
intent: .harness/docs/intent/harness-in-one-folder.md
date: 2026-10-01
approved: 2026-10-01
---

# SPEC: the harness in one folder

## Problem

A teammate installed the harness in a repo they knew and found its structure
changed: the three stages of `/harness-init` write 37 files in six places,
`scripts/`, `.githooks/`, `.github/`, `docs/`, `.claude/` and the root, as
`skills/harness-init/templates/README.md` lists them. Thirteen scripts land in
the project's own `scripts/`, and seven folders and files land in a `docs/`
the project may already use for something else. An `AGENTS.md` that is there
is merged section by section and a `CLAUDE.md` with real content is emptied
into it (`skills/harness-init/SKILL.md:173-175` and `:193-195`), so the files
where a project says what it is end up saying what the harness is. The harness
is a tool that helps develop; it should not redraw the repo it is installed
in.

## Solution

Everything the harness owns lives in one dot folder, `.harness/`, in two
halves.

The tracked half is small and is the project's own: `.harness/docs/`, with
the intents, the specs, the backlog, the decisions, the review log, the inbox,
the parked list and the codebase map; `.harness/AGENTS.md`, with the harness's
map, conventions and policy block; `.harness/stamp.json`, which names the one
commit of the harness this repo runs on; `.harness/bootstrap.sh`; and
`.harness/judge.md`, the few lines the judge is told about this repo.

The other half is the machinery, the same in every repo at a given version:
the scripts, the git hooks, the judge prompt and schema, `ruleset.json`. It
lives in `.harness/bin/`, ignored by git, and `bootstrap.sh` fetches it from
the public harness repo at the sha of the pin. A `SessionStart` hook of Claude
Code runs the bootstrap, so a teammate who clones and opens a session has the
machinery and the git hooks with no step by hand. The workflows run the same
script as their first step. A git hook that finds `.harness/bin/` at another
sha than the pin refuses and names the bootstrap.

Outside `.harness/` the install writes a closed list of paths, each one forced
by a tool that reads it only there: `AGENTS.md`, `CLAUDE.md`,
`.claude/settings.json`, the four workflows, the PR template, one line in
`.gitignore`. In a file the project already has, the harness adds one marked
block of its own and rewrites nothing else. Where that is not possible it
stops and names the file.

The harness repo takes the same layout, because the skills read one set of
paths in every repo: its `docs/` folders move to `.harness/docs/`, and its
`.harness/bin` is a tracked symlink to the templates, the one repo that does
not fetch.

## User stories with criteria

As a teammate who does not use the harness, I open a repo that has it and find
the repo I knew.

- [ ] After the three stages of `/harness-init` on a repo with no harness, `git status --porcelain` lists outside `.harness/` only `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, `.github/workflows/` with four files, `.github/pull_request_template.md` and `.gitignore`.
- [ ] Nothing is written under `scripts/`, `.githooks/`, `docs/` or `.github/judge/`, and `.github/ruleset.json` is not written.
- [ ] `git ls-files .harness` lists `.harness/AGENTS.md`, `.harness/stamp.json`, `.harness/bootstrap.sh`, `.harness/judge.md` and files under `.harness/docs/`, and nothing under `.harness/bin/`.
- [ ] `.gitignore` holds the line `.harness/bin/`, added once, and a rerun does not add it again.
- [ ] The structural test of stage `ci` is not written by default: the hand-back names the rule it would enforce and the path it would write, and the file exists only after a yes.

As a team with an `AGENTS.md` and a `CLAUDE.md` of our own, we install the
harness and they still say what our project is.

- [ ] On a repo with an `AGENTS.md`, the install leaves every existing line as it was and adds one section, `## Harness`, of at most three lines that name `.harness/AGENTS.md`; a rerun changes nothing.
- [ ] On a repo with no `AGENTS.md`, the file is created with that section alone.
- [ ] On a repo with a `CLAUDE.md`, the install adds the line `@.harness/AGENTS.md` and moves nothing out of the file; with none, the file is created with that line alone.
- [ ] `.claude/settings.json` already there keeps every key it had: the `SessionStart` hook, the two `PreToolUse` hooks and the allowlist entries are merged in with `jq`.
- [ ] A workflow of the project named `ci.yml`, `automerge.yml`, `escalate.yml` or `close.yml` is byte for byte what it was, and the harness's own is installed as `harness-<name>.yml`.
- [ ] A `.github/pull_request_template.md` already there keeps its text, and the "Slice" and "Declarations" sections are appended under a marker, once.
- [ ] With `core.hooksPath` set to anything but `.harness/bin/hooks`, stage `local` stops before writing and names the value it found.

As a teammate who uses the harness, I clone, open Claude Code and work.

- [ ] On a clone with no `.harness/bin/`, `.harness/bootstrap.sh` fills it from `pin.origin` at `pin.sha`, writes that sha in a marker inside it, sets `core.hooksPath` to `.harness/bin/hooks`, and exits 0.
- [ ] Run again with the marker equal to the pin, it fetches nothing and exits 0.
- [ ] `.claude/settings.json` runs `.harness/bootstrap.sh` on `SessionStart`.
- [ ] With the marker different from `pin.sha`, `pre-commit`, `commit-msg` and `pre-push` each refuse with one line that names `.harness/bootstrap.sh`.
- [ ] A fetch that fails leaves the `.harness/bin/` that was there untouched, and the bootstrap exits non-zero with the reason on stderr.
- [ ] The `SessionStart` hook does not stop the session when the bootstrap fails: the reason is printed and the session starts.
- [ ] What lands in `.harness/bin/` is the tree of `skills/harness-init/templates/` at `pin.sha`, fetched with `git fetch` by sha: `scripts/` as `.harness/bin/`, `githooks/` as `.harness/bin/hooks/`, `judge/` as `.harness/bin/judge/`, and `github/ruleset.json` as `.harness/bin/ruleset.json`.

As whoever reviews an upgrade of the harness, I read one line.

- [ ] `.harness/stamp.json` has a key `pin` with `origin`, `sha` and `date`, and `origin` is an `https://` url with no credentials, whatever the harness checkout was cloned with.
- [ ] Every stage of `/harness-init` sets `pin` to the commit it runs from, and its own entry under `stages` as today.
- [ ] A stage run from a checkout with uncommitted changes, or from no git repo, leaves `pin` as it was and says so in the hand-back; its `stages` entry keeps the `dirty` mark or the nulls of today.
- [ ] Each workflow runs `.harness/bootstrap.sh` as its first step after the checkout, and a failed fetch is a red job.
- [ ] `scripts/board.sh` prints the pin on its first line, next to the stages.

As the scripts and the hooks, we read the policy where the harness keeps it.

- [ ] `policy-lines.sh`, `tier.sh`, the git hooks and `intent.sh` read the policy block from `.harness/AGENTS.md`, at the same ref they read `AGENTS.md` from today, and nothing reads the root `AGENTS.md`.
- [ ] The policy block of `templates/AGENTS.md` carries, in `sensitive_paths`, `.harness/stamp.json`, `.harness/bootstrap.sh`, `.harness/AGENTS.md`, `.harness/judge.md`, `.github/**` and `.claude/settings.json`, next to the project's own config files; in `never_tier_0`, `AGENTS.md`, `CLAUDE.md`, `.claude/**`, `.harness/AGENTS.md`, `.harness/judge.md` and `.harness/docs/codebase-map.md`; in `human_gate_paths`, the seven of today under `.harness/docs/`.
- [ ] Every skill and every script that names a path of `docs/intent`, `docs/specs`, `docs/backlog`, `docs/decisions`, `docs/review-log`, `docs/inbox.md`, `docs/parked.md` or `docs/codebase-map.md` names it under `.harness/docs/`.
- [ ] `.harness/docs/` has one `README.md` with a section per folder, and the five READMEs of today are gone from the templates.
- [ ] `judge.sh bundle` puts `.harness/judge.md` in the bundle after the prompt, and the prompt in `.harness/bin/judge/` is the template as fetched, with no line of the repo in it.

As the harness repo, I run on the layout I install.

- [ ] The folders and files of `docs/` named above are under `.harness/docs/` in this repo, moved with `git mv`, and `docs/spec.md` stays where it is.
- [ ] `.harness/bin` in this repo is a tracked symlink to `skills/harness-init/templates/` laid out as the bootstrap lays it out, `scripts/` and `.githooks/` are gone, and `core.hooksPath` is `.harness/bin/hooks`.
- [ ] The comparison of `tests/architecture.test.ts` between `.github/` and the templates holds for the workflows and the PR template, and no longer looks for `.github/judge/` or `.github/ruleset.json`.
- [ ] Suite, typecheck, format and build green.

## Locked decisions

- The structural choice: the machinery is not tracked. The scripts, the git
  hooks, the judge prompt and schema and `ruleset.json` live in
  `.harness/bin/`, ignored, fetched from the public harness repo at the sha
  `.harness/stamp.json` names. Why: a teammate who does not use the harness
  sees a handful of files, an upgrade is a one-line diff of the pin, and the
  copies stop drifting. Rejected: everything tracked in `.harness/bin/`
  behind a `.gitattributes` line that collapses it in PR diffs. It works
  offline and a clone is complete with no setup step, but it keeps about
  thirty files in the project's history and the drift with them.
- `.harness/bootstrap.sh` is what fetches: it reads the pin, fills
  `.harness/bin/` when it is missing or at another sha, and sets
  `core.hooksPath`. A `SessionStart` hook in `.claude/settings.json` runs it,
  so a clone opened in Claude Code needs no step by hand; anyone else runs it
  by hand. The hook is written after reading its current doc. Rejected: a
  `prepare` script in `package.json`, which the harness cannot add as a
  marked block.
- A clone where nobody opened Claude Code or ran the bootstrap has no git
  hooks, and that is accepted: CI runs every gate on the PR and the ruleset
  protects main where the plan has one.
- No migration from the old layout. The harness is young and the repos that
  have it are few: `/harness-init` installs the new layout and does not move
  the files of a repo set up before it.
- The harness never rewrites a line it did not write. In a file the project
  already has it adds one marked block of its own and touches nothing else;
  where it cannot do that it stops and names the file. Why: the project's
  `AGENTS.md` and `CLAUDE.md` carry what the project says about itself, and
  the harness is the tool, not the subject. Rejected: the merge section by
  section of `skills/harness-init/SKILL.md:173-175` and the emptying of a
  `CLAUDE.md` into `AGENTS.md` at `:193-195`.
- The harness's own map, conventions and policy block live in
  `.harness/AGENTS.md`. The root `AGENTS.md` gets one section, `## Harness`,
  of two or three lines that send the agent there, and is created with that
  section alone when the project has none. The scripts and the hooks read the
  policy block from `.harness/AGENTS.md`.
- `CLAUDE.md` gets one line, `@.harness/AGENTS.md`, and nothing is moved out
  of it; it is created with that line alone when missing.
- `.claude/settings.json` is merged with `jq`: the hooks and the allowlist
  entries go in, every key already there stays.
- `.gitignore` gets one line, `.harness/bin/`, appended if absent. No line
  goes in `.gitattributes`: with the machinery ignored nothing tracked needs
  collapsing, and the specs and the slices under `.harness/docs/` are what a
  reviewer has to see in a diff.
- A workflow of the project with the name of one of the harness's is never
  edited: the harness installs its own as `harness-<name>.yml`.
- A `.github/pull_request_template.md` already there keeps its text: the
  harness appends its "Slice" and "Declarations" sections under a marker,
  because `ci.yml` reads the boxes.
- With `core.hooksPath` already set by the project, Husky or lefthook, the
  install stops and names it. Chaining into another hook manager is not
  built.
- `codebase-map.md` is written to `.harness/docs/codebase-map.md`: the
  harness authors it and agents read it, so it does not go in a `docs/` the
  project may use for a docs site.
- The structural test of stage `ci` is an offer and not a default: the
  hand-back names the rule it would enforce and the path it would write, and
  the file is written only on a yes. A test runner does not look inside a dot
  folder, so the file cannot move, and it is the one place where the harness
  would write into the project's own source tree.
- `.harness/stamp.json` gains one key, `pin`, with `origin`, `sha` and
  `date`: the one commit `bootstrap.sh` and the workflows fetch, and the line
  a reviewer watches. `stages` stays, and an entry now says which commit last
  wrote the tracked files of that stage, which can still lag the pin. Why:
  with one `.harness/bin/` there is one version of the machinery, and three
  stage shas cannot name it.
- Every stage of `/harness-init` moves `pin` to the commit it runs from.
- A stage run from a dirty checkout, or from no git repo, refuses to write
  the pin: a sha every clone will fetch has to exist on the remote. The
  `stages` entry keeps its `dirty` mark as today.
- `pin.origin` is stored in its `https://` form, whatever the checkout was
  cloned with: a teammate and a CI runner fetch it without a key.
- `bootstrap.sh` writes the sha it fetched in a marker inside
  `.harness/bin/`, and every git hook compares it with `pin.sha` first: on a
  mismatch the hook refuses and names `.harness/bootstrap.sh`. Why: failing
  open would let two clones commit under two sets of rules.
- The bootstrap fetches into a temporary folder and swaps it in only when
  complete, so a failed run leaves the old `.harness/bin/` whole, and it
  exits non-zero with the reason. The `SessionStart` hook prints the reason
  and lets the session start; in CI the failure is a red job.
- The fetch is `git fetch --depth 1 <origin> <sha>` into a scratch repo, and
  `skills/harness-init/templates/` copied out of it: git checks the content
  against the sha. Rejected: a tarball from the download URL, one `curl` and
  no check, for code that runs in every teammate's git hooks.
- Each workflow runs `.harness/bootstrap.sh` as its first step after the
  checkout: CI and a laptop get the machinery the same way.
- The policy block names the new paths: the pin, the bootstrap,
  `.harness/AGENTS.md` and `.harness/judge.md` are sensitive, the last two
  and the map are never tier 0, and the seven human gate paths sit under
  `.harness/docs/`. The pin takes the place of `scripts/**` as the path that
  says the machinery changed.
- `.harness/docs/` has one README with a section per folder, in place of the
  five of today.
- This repo takes the new layout, because the skills read one set of paths
  everywhere: its `docs/` folders move to `.harness/docs/` in a slice of
  their own, and `.harness/bin` here is a tracked symlink to the templates,
  the one repo that does not fetch. `docs/spec.md` is the spec of the chain
  and not a document of the harness of this repo, and stays.
- The lines of the judge prompt that describe the repo, the `## This repo`
  section at `skills/harness-init/templates/judge/prompt.md:72` that stage
  `judge` fills in, move to a tracked file, `.harness/judge.md`, which
  `judge.sh bundle` adds after the prompt. Why: the prompt is fetched and
  ignored now, and a line of the repo cannot live in a file every fetch
  overwrites. It came up while writing the spec, and it is among the
  decisions to confirm.

## Modules touched

- `skills/harness-init/SKILL.md`: the three stages write the new layout, the marked blocks, the pin, the stop on `core.hooksPath`, the offer of the structural test; Detect reads `.harness/`.
- `skills/harness-init/templates/README.md`: every destination, and the rows of `bootstrap.sh`, `judge.md` and the pin.
- `skills/harness-init/templates/bootstrap.sh` (new): the fetch, the marker, the swap, `core.hooksPath`.
- `skills/harness-init/templates/AGENTS.md`: it becomes the template of `.harness/AGENTS.md`, with the new globs in its policy block; the `## Harness` section of the root file is a few lines in the skill.
- `skills/harness-init/templates/CLAUDE.md`: the one line.
- `skills/harness-init/templates/settings.json`: the `SessionStart` hook, the hooks and the allowlist under `.harness/bin/`.
- `skills/harness-init/templates/githooks/pre-commit`, `commit-msg`, `pre-push`: the check of the marker against the pin, the paths of the scripts, the policy read from `.harness/AGENTS.md`.
- `skills/harness-init/templates/scripts/policy-lines.sh`, `tier.sh`, `intent.sh`, `board.sh`, `park.sh`, `judge.sh`, `policy.sh`, `review-log.sh`, `ensure-hooks.sh`, `ensure-verdict.sh`: the paths under `.harness/`, and in `board.sh` the pin on the first line.
- `skills/harness-init/templates/github/ci.yml`, `automerge.yml`, `escalate.yml`, `close.yml`: the bootstrap step and the paths of the scripts.
- `skills/harness-init/templates/judge/prompt.md`: the `## This repo` placeholder leaves; `skills/harness-init/templates/judge.md` (new) is the skeleton of the tracked file.
- `skills/harness-init/templates/docs/`: one `README.md` (new) in place of five, the other files as they are.
- `skills/board/SKILL.md`, `skills/spec/SKILL.md`, `skills/slice/SKILL.md`, `skills/next/SKILL.md`, `skills/judge/SKILL.md`: every path of the documents and of the scripts.
- `tests/`: the fixtures and the cases of every script for the new paths, `tests/bootstrap.test.ts` (new) on a disposable bare origin, and `tests/architecture.test.ts` for the copies, the map and the policy block.
- `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, `.harness/` and `docs/` of this repo: the move of this repo to its own layout.
- `docs/spec.md`: 3.3, 3.4, 5.1, 6.1 and 7.2, with a new version and its entry in section 0.

## Out of scope

- From the intent: nothing named. Its "Out of scope" section says "What is
  outside this field." and lists no item.
- Moving a repo already on the old layout into `.harness/`, by `git mv` or
  otherwise. This repo moves its own documents by hand in a slice; that is
  not a feature of `/harness-init`.
- Delivering the skills without a local clone of the harness, as a plugin
  installed from GitHub: the inbox line of 2026-10-01, which gets its own
  intent. The skills stay symlinks in `~/.claude/skills/`.
- Left for later by Lionel on 2026-10-01, from other members' feedback: what
  the harness's CI really covers, and how it sits next to the CI a project
  already has. Here only the file name is decided, `harness-<name>.yml` when
  the name is taken; what the workflow runs does not change.
- Left for later by Lionel on 2026-10-01: what happens where `jq` is not
  installed, and whether the harness can do without it and without its other
  dependencies. Here `jq` stays a requirement, as it is today.
- Left for later by Lionel on 2026-10-01: an interview at install time for
  what the harness now decides alone, which CI gates to install, the format
  and the tone of the commits, the sections of the templates, so that it is
  less opinionated.
- Chaining into a hook manager the project already has.

## Open questions

None.

## Decisions to confirm

1. The machinery is ignored in `.harness/bin/` and fetched at the pin of `stamp.json` by a tracked `.harness/bootstrap.sh`, which a `SessionStart` hook and the workflows run; a clone that never ran it has no git hooks, and a hook that finds the machinery off the pin refuses.
2. The harness never rewrites a line it did not write: the root `AGENTS.md` and `CLAUDE.md` get one marked block each, the harness's own instructions and policy block live in `.harness/AGENTS.md`, and a name or a setting already taken is left alone or stops the install.
3. Outside `.harness/` an install writes only `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, four workflows, the PR template and one line of `.gitignore`; the documents and the map go to `.harness/docs/`, and the structural test is written only on a yes.
4. No migration for the repos already installed, and this repo moves to the new layout itself, with `.harness/bin` as a symlink to the templates.
5. The lines of the judge prompt about the repo move to a tracked `.harness/judge.md`, since the prompt itself is now fetched.

---
name: harness-init
description: >
  Set up the agent production harness in the current repo, in three idempotent
  stages: `local` (AGENTS.md, CLAUDE.md, docs/, git hooks, tracked
  .claude/settings.json), `ci` (deterministic gates in GitHub Actions, tier
  label, PR template, main ruleset), `judge` (the judge's prompt and schema,
  policy, automerge and escalation: the judgement itself is `/judge`). Use when the user runs
  /harness-init [local|ci|judge], says "set up the harness", "prepare the repo
  for the chain", or wants to adopt the intent, spec, slices, PR, judge chain
  in a repo, new or existing. Also the entry point for a brand
  new project: on an empty repo it bootstraps the stack from ~/.claude/stack.md
  first. Replaces workflow-init. Never touches application code.
---

# Harness init

Three stages, each a branch stacked on the previous one, and one PR at the end
with all three: the gates cannot gate the PR that creates them. Re-running a
stage updates what it owns and never duplicates. The reference design is the bozza "Harness:
catena di produzione con agenti" in the vault (`bozze/harness-catena-di-produzione.md`);
this skill is its step 0.

## Ground rules

- Read `~/.claude/stack.md` for defaults, then the repo. What the repo already
  does wins over the defaults: package manager, test runner, folder names.
- Never touch application code. Configuration, docs, scripts, workflows only.
  A structural test that turns red is a finding to report, not a bug to fix here.
- Everything `gh` can do, this skill does: labels, variables, repo settings,
  secrets from a value the user pastes. The human gets one checklist, at the
  end of stage `judge`, with only what needs a browser or an interactive login.
- Everything the harness needs must be tracked in git. A rule that lives only
  in `~/.claude/` does not exist in CI or for a teammate. Skills are personal
  conveniences; `AGENTS.md`, `docs/`, `scripts/`, `.githooks/`, `.github/` are
  the contract.
- Templates live in `templates/` next to this file (see `templates/README.md`
  for the destination of each). They are starting points: fill the
  `{{placeholders}}`, drop what does not apply, keep AGENTS.md under 100 lines.
- Retrieval-led for anything GitHub. Before writing a workflow or a ruleset,
  fetch the current docs (`actions/setup-node`, `pnpm/action-setup`,
  `actions/create-github-app-token`, the rulesets REST reference) and adapt
  the template to what they say today.
- Every stage leaves its own entry in `.harness/stamp.json`, tracked, before
  the hand-back, so that whoever opens a cold session reads which commit of
  the harness this repo installed. `harness` is the origin of the checkout the
  templates were copied from: if one day they come from a fork, the stamp says
  so instead of pretending there is one harness. It goes in with no
  credentials, everything between the scheme and the host removed, username
  included: a checkout cloned over https carries them in the url of its
  origin, `https://<token>@github.com/...`, and this file is tracked in every
  repo the skill installs into. What names the harness is the host and the
  path, and `git@github.com:...` has no scheme and stays as it is.

  ```sh
  origin="$(git -C <checkout> remote get-url origin \
    | sed -E 's#^([a-z+]+://)[^/@]*@#\1#')"
  ```

  Under `stages`, the name of the stage with the full sha of that checkout,
  `git -C <checkout> rev-parse HEAD`, and the committer date of that commit,
  `git -C <checkout> log -1 --format=%cd --date=short`, which is
  `YYYY-MM-DD`. The full sha, because a command over the templates needs a
  real ref and a short one grows ambiguous; `scripts/board.sh` prints the
  short one.

  A sha that is not to be trusted is stamped and marked, and neither case
  stops the install: there is no `dev` in the harness, a template change is
  tried by running a stage from the checkout where it is being written, and a
  stage that refused would take away the only way to try one. A working tree
  with something in it, `git -C <checkout> status --porcelain` not empty,
  adds `"dirty": true` to the entry of the stage, and the key is written only
  when it is true: an entry with no `dirty` came from a clean checkout. Where
  there is no git repo under the skill at all, which
  `git -C <checkout> rev-parse --git-dir` says by failing, `sha` and `date`
  are `null`, and `harness` null with them, since the origin is read from
  that same checkout. `/board` prints the first `8f21c4d+` and the second
  `?`, so a sha nobody should date a bug against is visible as one on the
  screen and not only in the file.

  The file is merged with `jq` and never rewritten whole, so that a repo
  standing at three different points of the harness says all three:

  ```sh
  stamp=.harness/stamp.json
  dirty=false
  if git -C <checkout> rev-parse --git-dir >/dev/null 2>&1; then
    sha="$(git -C <checkout> rev-parse HEAD)"
    date="$(git -C <checkout> log -1 --format=%cd --date=short)"
    [ -z "$(git -C <checkout> status --porcelain)" ] || dirty=true
  else
    origin=""; sha=""; date=""
  fi
  mkdir -p .harness
  [ -f "$stamp" ] || echo '{}' > "$stamp"
  jq --arg origin "$origin" --arg sha "$sha" --arg date "$date" \
    --argjson dirty "$dirty" \
    'def orNull: if . == "" then null else . end;
     .harness = ($origin | orNull)
     | .stages.<stage> = ({ sha: ($sha | orNull), date: ($date | orNull) }
         + (if $dirty then { dirty: true } else {} end))' \
    "$stamp" > "$stamp.tmp" && mv "$stamp.tmp" "$stamp"
  ```

  The entry of the stage that ran is replaced and the other two stay as they
  are, even when the stage changed nothing else. The file goes in the commit
  of the stage: a stamp nobody committed is a stamp CI never sees.

- Work on a branch `harness/<stage>`, commit with the project's conventions
  (one commit per concern, no attribution trailers), never push or merge
  unless asked. End with the hand-back in section 6.

## 0. Detect

Print a one-screen state table before doing anything:

| What                            | How                                                                                                                                                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stack, package manager, scripts | `package.json` or `pyproject.toml`; presence of `typecheck`, `test`, `format:check`, `build`                                                                                                                                                                                   |
| Layout                          | top-level dirs; which dir is the server, the domain, the state or sync layer, the tests                                                                                                                                                                                        |
| Existing harness                | `AGENTS.md`, `CLAUDE.md`, `docs/`, `.githooks/`, `.claude/settings.json`, `.github/workflows/`, labels (`gh label list`), ruleset (`gh api repos/{owner}/{repo}/rulesets`)                                                                                                     |
| Ignore rules                    | `.gitignore` lines matching `docs`, `CLAUDE.md`, `.claude`                                                                                                                                                                                                                     |
| Plan                            | `gh repo view --json isPrivate` and a probe of `gh api repos/{owner}/{repo}/rulesets`. A 403 "Upgrade to GitHub Pro" means no rulesets, no branch protection, no auto-merge on this repo: say it once, skip the ruleset; the hooks protect main and the policy merges directly |
| Remote and mode                 | `git remote -v`; solo or team (ask if not obvious: more than one collaborator, an org repo, a CODEOWNERS)                                                                                                                                                                      |
| Stage                           | `local` done if `AGENTS.md` and `.githooks/` exist; `ci` done if `.github/workflows/ci.yml`; `judge` done if `.github/workflows/automerge.yml`                                                                                                                                 |

With no argument, run the first stage not done. With an argument, run that
stage even if done (update mode: rewrite what the stage owns, keep the user's
edits where they do not conflict, say what was overwritten).

## 1. Empty repo

No `package.json`, no `pyproject.toml`, no source: this is a new project. If
the user has not said in one line what the project is and for whom, ask for
that first; it becomes the `README.md` and the two opening lines of
AGENTS.md. Then one question with a recommendation: Next.js or React + Vite
(recommend Vite unless the user names an SSR or server-routing need), and
whether a Python engine is expected. Then bootstrap from stack.md: the
framework's own `create` command, TypeScript strict, Tailwind, Vitest,
Prettier, the four single-run scripts, the README. Commit as
`chore: bootstrap <stack>` and continue with stage `local`. The first feature
is the walking skeleton slice, which is not this skill's job.

## 2. Stage `local`

Documents and rules that work without a server.

1. **`.gitignore`.** If it ignores `docs/`, `CLAUDE.md` or `.claude/`, say so
   and fix it: an ignored harness does not exist in CI. Keep
   `.claude/settings.local.json` ignored. Add `.claude/worktrees/` if it is
   not there: `/next` gives each slice a worktree under it, and without the
   line the root sees every worktree as untracked files that a `git add -A`
   would stage. Show the lines removed and the line added.
2. **`AGENTS.md`** from `templates/AGENTS.md`. Fill: project name and the two
   lines from the README; the map with real paths and one line each on what
   the module owns; the four commands with the real package manager;
   sensitive paths derived from the repo (server dir, domain or engine dir,
   state or sync dir, build and deploy config, `.github/**`, lockfile,
   migrations) after the fixed ones, the files that decide how every change
   is checked: `package.json` stays, its scripts are what the gates run,
   and so do `tsconfig*.json` and the test runner's config where the repo
   has them; the "Never tier 0" line, `AGENTS.md`, `CLAUDE.md`, `.claude/**`, the
   map and any other document an agent here reads to act on; every path between
   backticks as in the template: without
   them Prettier reads the asterisks as emphasis and rewrites the globs into
   something a reader no longer recognises; the policy block under
   `## Policy block`, the json fence the scripts read, with the same paths in
   its four lists and `docs_mode` `main` by default, `pr` when Detect found a
   team or the human says so: with `main` the git hooks let a commit made only
   of the human-gate paths land on main, and intent, spec and board are
   approved by the commit instead of a merge (ADR-0003); project-specific
   "Do not" lines derived from the map (for
   instance: the domain dir imports no React). If an AGENTS.md exists, merge
   section by section, never append a second copy. Hard cap 100 lines: it is
   a map, `docs/` is the manual.

   The policy block of a repo that already has one is merged key by key, never
   by judgement, reading its fence against the one in `templates/AGENTS.md`:
   `version`, `docs_mode`, `sensitive_paths`, `never_tier_0`,
   `human_gate_paths`, `docs_extra_paths`, `max_lines`, `max_files`. A key
   that is there stays as it is, whatever it says; a key that is missing
   arrives from the template; `version` is the only one the template always
   overwrites. `docs_mode` never changes by the hand of this skill, not even
   when every other key came from the template: the mode belongs to the repo
   and to the human who chose it, and Detect only reads it. A key the template
   no longer has stays where it is and a human removes it, because a skill
   that deleted it would take away a rule nobody asked it to take; the new
   `version` is what makes it visible, and the hand-back names it. So a repo
   takes the keys this harness grew after it was set up without losing the
   `sensitive_paths` someone widened on purpose.

3. **`CLAUDE.md`** from `templates/CLAUDE.md`: `@AGENTS.md` plus at most five
   Claude-only lines. If a CLAUDE.md with real content exists, move what is
   durable into AGENTS.md or `docs/` and leave the pointer.
4. **`docs/`**: `codebase-map.md` written by reading the code, one screen
   (template in `templates/docs/codebase-map.md`), then `intent/`, `specs/`,
   `backlog/`, `decisions/`, `review-log/`, each with its README from
   `templates/docs/`, and `inbox.md` from `templates/docs/inbox.md`, written
   only if it is not there: its entries belong to the repo, and a rerun that
   overwrote them would throw away the one place the other skills are allowed
   to write. Existing docs stay where they are; offer to reclassify
   (a design brief becomes `decisions/ADR-0001-<slug>.md`) and do it only on yes.
5. **Git hooks** from `templates/githooks/` and `templates/scripts/`:
   `.githooks/pre-commit` (refuses commits on main, except a commit made
   only of documents when `docs_mode` says `main`, then format
   check on staged files, `scripts/prose.sh --staged` and typecheck, under
   30 seconds or it moves to CI), `.githooks/commit-msg` (calls
   `scripts/commitlint.sh --file`), `.githooks/pre-push` (refuses pushes to
   main, with the same exception for a range of documents;
   `HARNESS_ALLOW_MAIN=1` overrides both refusals),
   `scripts/policy-lines.sh` (sourced, never run: the one reading of the
   policy block of AGENTS.md, shared by the hooks, `intent.sh` and
   `tier.sh`), `scripts/ensure-hooks.sh`, `scripts/ensure-verdict.sh`,
   `scripts/prose.sh` (an em dash in an added line fails: style is a gate,
   so the judge never reads for it), `scripts/intent.sh` (`new <slug>`
   writes the empty sections of `docs/intent/README.md`, `open` commits that
   file alone; with `main` both on the default branch and the push is the
   approval, with `pr` on `intent/<slug>` and `open` opens its PR: the human
   types only the ten lines), `scripts/board.sh` (the board of the repo in
   one screen, the stamp of the stages, the open slices, the inbox and the
   open PRs, and the same data under `--json`: it reads the files and `gh`,
   it writes nothing, and a terminal without `gh` gets a row and an exit 0). Add
   `"prepare": "git config core.hooksPath .githooks"` to the package scripts
   so every clone installs the hooks on install, and run that config now.
   Scripts and hooks must be executable.
6. **`.claude/settings.json`**, tracked, from `templates/settings.json`: two
   PreToolUse hooks and the allowlist for the four commands, git and gh.
   `ensure-hooks.sh` guarantees the git hooks are installed before any
   `git commit`. `ensure-verdict.sh` refuses `gh pr create` for a head with no
   verdict; it lands in this stage so the settings file never points at a
   script that is not there, and stays inert until the `ci` and `judge` stages
   give it a tier and a judge to ask. Do not touch `settings.local.json`.
7. **Stamp**: the entry `local` of `.harness/stamp.json`, as "Ground rules"
   says, and `.gitignore` must not ignore `.harness/`. It is the first stage,
   so the file is usually the one this step creates.
8. **Verify**: run the four commands; run
   `scripts/commitlint.sh --file <(echo "Bad message.")` and expect a
   non-zero exit; stage a whitespace change, confirm the pre-commit hook runs
   on `git commit --dry-run` is not enough (hooks do not run on dry runs), so
   make and immediately amend or reset a throwaway commit on the harness branch.
9. **Hand back**: branch `harness/local`, the diff summary, the line
   "next: `/harness-init ci`, on top of this branch". No PR yet.

## 3. Stage `ci`

Deterministic gates on the server. No LLM in this stage.

1. **Labels**, idempotent with `gh label create --force`: `tier:0` to `tier:3`,
   `human-gate`, `tests-weakened`, `needs-human`, and one per judge and
   outcome, `judge:<role>:<outcome>`
   with role `correctness` or `security` and outcome `approve`, `changes`,
   `escalate` or `crashed`: each judge owns its label, so the two of tier 2
   never overwrite each other, and a crash is not an escalation. A repo from
   before ADR-0004 still has `fix-round:1` and `fix-round:2`: delete them
   with `gh label delete --yes`, they belonged to a fixer that no longer
   exists.
2. **`.github/workflows/ci.yml`** from `templates/github/ci.yml`: one
   workflow, one job named `ci`, the single required status check, with the
   gates as its steps (secret scan with gitleaks; conventions: commit lint on
   the PR range and on the title of the PR, which is the subject the squash
   lands, `scripts/prose.sh` on the range and the test-weakening detector;
   dependency audit; checks: format, typecheck, test, build; tier; a last
   step red if any gate is). One job and not six because GitHub bills each
   one rounded up to the whole minute. Adapt package manager and Node version.
3. **Scripts** from `templates/scripts/`: `tier.sh` (reads the sensitive
   paths, the human gate and the two thresholds from the policy block of
   AGENTS.md at the base ref, never from the PR's own copy, plus the PR body checklist, the labels and the slice
   flags; prints the tier on stdout and the reasons on stderr, `human-gate:`
   lines included, which the tier step of `ci.yml` turns into the label; it sources
   `scripts/policy-lines.sh`, the reading of the policy block it shares with
   the hooks: a file of stage `local`, copied here too when the repo does not
   have it yet, because without it `tier.sh` stops and names the stage),
   `test-weakening.sh` (diff of test files only: removed assertions, added
   skips, widened matchers, deleted test files, added suppressions). Both
   run locally with the same output as in CI.
4. **PR template** from `templates/github/pull_request_template.md`. The
   checklist is declarative: `tier.sh` reads the boxes.
5. **First structural test** from `templates/architecture.test.ts`: one rule
   taken from the "Do not" section of AGENTS.md, written as a normal Vitest
   test in the project's test dir. If it fails on the current code, leave the
   test in and report the violation: it is the finding.
6. **Repo settings and ruleset.** Run `gh repo edit` for squash-only and
   branch deletion on merge (every plan), and auto-merge where the plan
   allows it. Apply `templates/github/ruleset.json` with
   `gh api ... /rulesets --input` only when Detect found rulesets available;
   otherwise one line in the hand-back: main is protected by the hooks alone
   and the policy merges directly after green ci. The required check is
   `ci`. Solo: zero required reviews. Team: one required review,
   `CODEOWNERS` on the sensitive paths (write it from the AGENTS.md list),
   merge queue above two people.
7. **Stamp**: the entry `ci` of `.harness/stamp.json`, as "Ground rules" says.
   The entry of `local` stays as that stage left it, whatever it says: the two
   stages can come from two different commits of the harness, and the board
   prints them one next to the other for that reason.
8. **Verify**: push is the user's call. `ci.yml` runs on the install PR from
   its own branch (`pull_request` reads the workflow from the head): once
   that PR is open, read the run with `gh run view` and report which jobs
   passed and which tier label it got. `automerge.yml` and `close.yml`
   cannot run before they are on the default branch: `workflow_run` only
   fires from there.
9. **Hand back**: branch `harness/ci`, diff summary, "next: `/harness-init judge`".

## 4. Stage `judge`

The judgement itself is `/judge`, in the terminal, before the PR (ADR-0001,
ADR-0004): no workflow calls a model, no token of Claude lives on the server.
This stage installs what the judge reads and what acts on its verdict.

1. **Judge prompt and schema** from `templates/judge/`: `.github/judge/prompt.md`
   and `.github/judge/verdict.schema.json`. They live in the repo so every
   judgement on it runs the same prompt against the same schema, and a repo
   that tunes its judge tunes them here. The judge receives only artifacts
   (diff, slice file, AGENTS.md, codebase map, the result of the gates),
   never the coder's conversation, and its only output is the verdict
   object, checked against the schema by `scripts/judge.sh check`.
2. **`scripts/judge.sh` and `scripts/policy.sh`**: `judge.sh` is what `/judge`
   runs before the PR, the bundle in and the verdict checked against the schema
   and stored per commit out; `policy.sh` is what `/judge` and `/next` run once
   `gh pr create` has given the verdict a PR to land on. It reads the verdict,
   stamps `head_sha` (the commit the judge saw, read back from the verdict
   `judge.sh` stored) and `judge.where`, always `local`, posts ONE comment per
   judgement (for the human on top: verdict line, one sentence, the question
   for the human, criteria when there is a slice, findings with the commit that
   answers each; the JSON folded in a `<details>` after the marker; what the
   policy did as the last line) and minimizes the previous verdict of the same
   role as outdated, sets `judge:<role>:<outcome>`, sends the ntfy notification
   itself at every escalation (`NTFY_TOPIC` in the env, the verdict in the
   body, even when `needs-human` was already there), does nothing if the PR
   head moved since the judgement to a commit that answers none of its
   findings, and acts only when the repo variable `HARNESS_AUTOMERGE` is
   `on`: a tier 1 approve, or a request-changes whose `high` and `medium`
   findings all have the commit that closes them (`judge.sh answer`,
   ADR-0003, logged as `answered`), merges with the App token (`--auto`
   where the repo allows auto-merge, a direct merge otherwise), and only
   once the `ci` check has passed on the PR head; a finding left unanswered,
   escalate or `needs_human` adds `needs-human`; tier 2 does the same on both
   verdicts of the head, merges on two approves or answered with no `high`
   open, and waits while one is missing. Default `off`: the verdict lands and
   the human compares what the policy would have done. A verdict file that
   is missing or not JSON is a crash, `judge:<role>:crashed`, with a comment
   and the notification, never silence and never `needs-human`: `tier.sh`
   ignores the crash label, so the next `/judge` replaces it instead of
   parking the PR at tier 3.
3. **`automerge.yml`, `escalate.yml`, `close.yml`** from the templates: tier
   0 merge on the green ci run (not on the label, which lands before the `ci`
   job ends) and never with `human-gate`; the ntfy notification with the
   verdict inside when a human puts `needs-human` on by hand; on a merge
   into the default branch, the slice to `done` and the verdict line
   appended to `docs/review-log/verdicts.jsonl`. Every autonomous write (the
   policy's merge, that append) uses the token of a GitHub App (`contents:
write`, `pull-requests: write`): events raised by `GITHUB_TOKEN` start no
   workflow, so a merge done with it would never start `close.yml` and the
   chain would stall silently. With a ruleset the App is a bypass actor;
   without one `close.yml` falls back to the default token. Set
   `HARNESS_AUTOMERGE` to `off` yourself. The App (`HARNESS_APP_ID`
   variable, `HARNESS_APP_PRIVATE_KEY` secret) is needed only when
   `HARNESS_AUTOMERGE` goes on: say so, do not block on it. One App serves
   every repo of the account: if the user already has it, ask for the two
   values and set them with `gh variable set` and `gh secret set`. ntfy is
   optional, `NTFY_TOPIC` empty means no notification: offer it in one line,
   never ask for it.
4. **Tear down the cloud judge** where a repo from before ADR-0004 still
   has it: `git rm` `.github/workflows/judge.yml` and `fix.yml`, delete the
   secret `CLAUDE_CODE_OAUTH_TOKEN` and the variables `HARNESS_JUDGE_MODEL`
   and `HARNESS_FIXER_MODEL` with `gh secret delete` and `gh variable
delete`, and say so in the hand-back. Nothing in the chain reads them
   any more, and a token of Claude on the server is a thing to not have.
5. **Stamp**: the entry `judge` of `.harness/stamp.json`, as "Ground rules"
   says, and the three entries are the whole stamp: from here the board of
   this repo can say where each of its three stages came from.
6. **Verify**: with the user, open a docs-only PR and a small code PR judged
   with `/judge`; report what the judge said and what the policy would have
   done.
7. **Hand back**: branch `harness/judge`, diff summary, the human checklist
   (section 6), "next: open one PR from this branch with the three stages,
   merge it by hand, then the first intent with `scripts/intent.sh new <slug>`,
   and `/spec`".

## 5. Team mode

Same files. Differences: `CODEOWNERS` on the sensitive paths; the ruleset
requires one review; the lines of the personal `stack.md` the team agrees on
are copied into AGENTS.md; `.claude/settings.json` stays tracked but every
rule in it has a twin in `.githooks/` or in CI, because not everyone runs
Claude Code. Escalation goes to the team channel, not to a personal ntfy topic.

## 6. Hand-back format

One screen, always the same shape: the state table (before); what changed,
files grouped by concern, one line each; findings (a red structural test, an
ignored `docs/`, a missing script); the next stage. Stages `local` and `ci`
end there. Stage `judge` adds the one human checklist of the whole install:
two numbered items, the only things that need a browser (the GitHub App,
when the user does not have one yet; opening and merging the install PR),
each with its command in a code block and one line on why. ntfy is one line
of "if you want it", not an item. Everything else the skill has already done. No manifesto: the harness is
code and the diff is the documentation.

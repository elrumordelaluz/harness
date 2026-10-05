---
name: harness-init
description: >
  Set up the agent production harness in the current repo, in three idempotent
  stages: `local` (.harness/ with its AGENTS.md, docs and bootstrap, one
  block each in AGENTS.md, CLAUDE.md and the tracked .claude/settings.json,
  the git hooks fetched), `ci` (deterministic gates in GitHub Actions, tier
  label, PR template, main ruleset), `judge` (.harness/judge.md, automerge,
  escalation and close: the judgement itself is `/judge`). Use when the user runs
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
  conveniences; `.harness/`, `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`
  and `.github/` are the contract, and `.harness/bin/` is fetched at the pin,
  ignored.
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
  path, and `git@github.com:...` has no scheme and stays as it is: the first
  line of the snippet below.

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

  Next to them, `pin`: `origin`, `sha` and `date`, the one commit
  `.harness/bootstrap.sh` and every workflow fetch `.harness/bin/` at, and
  the line whoever reviews an upgrade of the harness reads. Every stage moves
  it to the commit it runs from, so the pin can be ahead of the entry of a
  stage that was not run again: that entry says which commit last wrote the
  tracked files of its stage, the pin says which machinery runs. `pin.origin`
  is the same url read once more, in its `https://` form, so that a teammate
  and a CI runner fetch it with no key: `git@github.com:owner/repo.git` and
  `ssh://git@github.com/owner/repo.git` both become
  `https://github.com/owner/repo.git`. `harness` keeps the form the checkout
  has, which `board.sh` reads. `pin.date` is the committer date of the entry.

  The pin is the one thing a sha that is not to be trusted does not get: a
  sha every clone will fetch has to exist on the remote. From a dirty
  checkout, or from no git repo, the snippet leaves `pin` byte for byte as it
  was, and the entry of the stage keeps its `dirty` mark or its nulls. The
  install goes on, and the hand-back names the pin that was not moved and
  why: the sha it stayed at, or that there is none yet, which is what a first
  install from a dirty checkout leaves, and then the bootstrap refuses until
  the stage runs again from a clean one. A clean checkout whose commit was
  never pushed passes the snippet: push the commit of the harness before the
  install is pushed.

  The file is merged with `jq` and never rewritten whole, so that a repo
  standing at three different points of the harness says all three, and a
  key the snippet does not write stays as it is:

  ```sh
  stamp=.harness/stamp.json
  origin="$(git -C <checkout> remote get-url origin 2>/dev/null \
    | sed -E 's#^([a-z+]+://)[^/@]*@#\1#')"
  dirty=false
  if git -C <checkout> rev-parse --git-dir >/dev/null 2>&1; then
    sha="$(git -C <checkout> rev-parse HEAD)"
    date="$(git -C <checkout> log -1 --format=%cd --date=short)"
    [ -z "$(git -C <checkout> status --porcelain)" ] || dirty=true
  else
    origin=""; sha=""; date=""
  fi
  pin="$(printf '%s' "$origin" | sed -E \
    -e 's#^[^/@:]+@([^/:]+):#https://\1/#' \
    -e 's#^[a-z+]+://#https://#' \
    -e 's#^(https://[^/:]+):[0-9]+/#\1/#')"
  case "$pin" in https://*) ;; *) pin="" ;; esac
  [ "$dirty" = false ] && [ -n "$sha" ] || pin=""
  mkdir -p .harness
  [ -f "$stamp" ] || echo '{}' > "$stamp"
  jq --arg origin "$origin" --arg sha "$sha" --arg date "$date" \
    --argjson dirty "$dirty" --arg pin "$pin" \
    'def orNull: if . == "" then null else . end;
     .harness = ($origin | orNull)
     | .stages.<stage> = ({ sha: ($sha | orNull), date: ($date | orNull) }
         + (if $dirty then { dirty: true } else {} end))
     | if $pin == "" then . else .pin = { origin: $pin, sha: $sha, date: $date } end' \
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

| What                            | How                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack, package manager, scripts | `package.json` or `pyproject.toml`; presence of `typecheck`, `test`, `format:check`, `build`                                                                                                                                                                                                                                                                      |
| Layout                          | top-level dirs; which dir is the server, the domain, the state or sync layer, the tests                                                                                                                                                                                                                                                                           |
| Existing harness                | `.harness/`, `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, `core.hooksPath`, `.github/workflows/`, labels (`gh label list`), ruleset (`gh api repos/{owner}/{repo}/rulesets`)                                                                                                                                                                                |
| Ignore rules                    | `.gitignore` lines matching `.harness`, `CLAUDE.md`, `.claude`                                                                                                                                                                                                                                                                                                    |
| Plan                            | `gh repo view --json isPrivate` and a probe of `gh api repos/{owner}/{repo}/rulesets`. A 403 "Upgrade to GitHub Pro" means no rulesets, no branch protection, no auto-merge on this repo: say it once, skip the ruleset; the hooks protect main and the policy merges directly                                                                                    |
| Remote and mode                 | `git remote -v`; solo or team (ask if not obvious: more than one collaborator, an org repo, a CODEOWNERS)                                                                                                                                                                                                                                                         |
| Stage                           | `local` done if `.harness/AGENTS.md` and `.harness/stamp.json` exist; `ci` done if the harness's ci workflow is under `.github/workflows/`, as `ci.yml` or `harness-ci.yml`, told by its first line (stage `ci`, step 2); `judge` done if `.harness/judge.md` exists and the harness's automerge workflow is there, as `automerge.yml` or `harness-automerge.yml` |

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

Documents and rules that work without a server. The harness never rewrites a
line it did not write: what it owns goes under `.harness/`, and in the four
files a tool reads only at the root, `AGENTS.md`, `CLAUDE.md`,
`.claude/settings.json` and `.gitignore`, it adds its own block and touches
nothing else. Where it cannot, it stops and names the file. No script and no
hook is copied: the bootstrap fetches them into `.harness/bin/`, ignored.

1. **Stop before writing.** Read `git config --get core.hooksPath`. Set to
   anything but `.harness/bin/hooks`, by Husky, lefthook or a hand, the
   stage stops here, writes nothing and names the value it found: chaining
   into another hook manager is not built, and taking the setting over would
   switch off the project's hooks. A line of `.gitignore` that ignores
   `.harness/` or `.claude/` stops it the same way, naming the line, except
   `.harness/bin/`, `.claude/settings.local.json` and `.claude/worktrees/`,
   the first and the last the lines step 5 appends, so a rerun does not stop
   on its own work: an ignored harness does not exist in CI, and removing a
   line the project wrote is not the harness's call. A repo set up before this layout, `.githooks/`,
   `scripts/policy-lines.sh` or a policy block in the root `AGENTS.md`, is not
   migrated: say so in one line and install the new layout next to it.
2. **`.harness/AGENTS.md`** from `templates/AGENTS.md`. Fill: project name and the two
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
   instance: the domain dir imports no React). If `.harness/AGENTS.md` exists,
   a rerun refreshes what the template says and keeps the lines of the repo.
   Hard cap 100 lines: it is a map, `.harness/docs/` is the manual.

   The policy block of a repo that already has one, the fence of
   `.harness/AGENTS.md`, is merged key by key, never
   by judgement, reading its fence against the one in `templates/AGENTS.md`:
   `version`, `docs_mode`, `sensitive_paths`, `never_tier_0`,
   `human_gate_paths`, `docs_extra_paths`, `max_lines`, `max_files`,
   `inbox_skip_labels`, `inbox_accept_label`. A key
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

3. **`AGENTS.md`** at the root keeps every line it has and gets one section,
   appended at the end, this one word for word:

   ```markdown
   ## Harness

   The agent production chain of this repo, its map, conventions, review policy and "Do not", lives in `.harness/AGENTS.md`: read it before touching anything.
   ```

   A rerun that finds a `## Harness` heading changes nothing. With no
   `AGENTS.md`, the file is created with that section alone.

4. **`CLAUDE.md`**: `templates/CLAUDE.md` is one line, `@.harness/AGENTS.md`.
   Append it to a `CLAUDE.md` that does not have it, as its last line, and
   leave everything else where it is; with no `CLAUDE.md`, the file is that
   line alone.
5. **`.gitignore`**: append `.harness/bin/`, where the bootstrap puts the
   machinery, and `.claude/worktrees/`, where `/next` gives each slice a
   worktree that the root would otherwise see as untracked files a
   `git add -A` stages. Each line only if `grep -qxF` does not find it, so a
   rerun adds nothing, and nothing else in the file changes.
6. **`.harness/docs/`**: `codebase-map.md` written by reading the code, one screen
   (template in `templates/docs/codebase-map.md`), then `README.md` from
   `templates/docs/README.md`, one section for each of `intent/`, `specs/`,
   `backlog/`, `decisions/` and `review-log/`, and `inbox.md` from `templates/docs/inbox.md` and
   `parked.md` from `templates/docs/parked.md`, each written only if it is
   not there: their entries belong to the repo, and a rerun that overwrote
   them would throw away the one place the other skills are allowed to write
   and the list of what waits on purpose. Next to them `.harness/README.md`
   from `templates/harness/README.md`, the page for the human who meets the
   harness first, also written only if it is not there: a team may rewrite it
   for its own newcomers. The project's own `docs/`, if it has one, stays as
   it is.
7. **`.claude/settings.json`**, tracked, merged with the hooks and the
   allowlist of `templates/settings.json`: the `SessionStart` hook that runs
   `.harness/bootstrap.sh`, the two `PreToolUse` hooks and the allowlist for
   the four commands, git and gh. Fill `{{pm}}` in the template first, into a
   scratch file, then run the filter below over the project's file, or over
   `{}` when there is none: every key already there stays, a hook goes in
   unless one with the same `command` is there, an allowlist entry unless the
   same string is, so a second run gives the same file.

   ```sh
   jq --slurpfile harness <filled template> -f <the filter> .claude/settings.json
   ```

   ```jq
   def add_hook($matcher; $hook):
     if any(.[]; any(.hooks[]?; .command == $hook.command)) then .
     elif any(.[]; .matcher == $matcher) then
       map(if .matcher == $matcher then .hooks += [$hook] else . end)
     else
       . + [(if $matcher == null then {} else { matcher: $matcher } end)
         + { hooks: [$hook] }]
     end;
   $harness[0] as $h
   | reduce ($h.hooks | to_entries[]) as $event (.;
       reduce $event.value[] as $group (.;
         reduce $group.hooks[] as $hook (.;
           .hooks[$event.key] = ((.hooks[$event.key] // [])
             | add_hook($group.matcher; $hook)))))
   | .permissions.allow = reduce $h.permissions.allow[] as $entry
       ((.permissions.allow // []);
        if any(.[]; . == $entry) then . else . + [$entry] end)
   ```

   `ensure-hooks.sh` guarantees the git hooks are installed before any
   `git commit`. `ensure-verdict.sh` refuses `gh pr create` for a head with no
   verdict, and stays inert until the `ci` and `judge` stages give it a tier
   and a judge to ask. Do not touch `settings.local.json`.

8. **`.harness/bootstrap.sh`** from `templates/bootstrap.sh`, executable.
9. **Stamp**: `.harness/stamp.json` as "Ground rules" says: it sets `pin` to
   the commit it runs from, and its own entry `local` under `stages`. It is
   the first stage, so the file is usually the one this step creates.
10. **Bootstrap**: run `.harness/bootstrap.sh`. It fetches the machinery at
    the pin into `.harness/bin/`, the scripts at its top and the git hooks in
    `hooks/`, and points `core.hooksPath` at `.harness/bin/hooks`. No
    `prepare` script goes in `package.json`, which the harness cannot add to
    as a block of its own: a clone gets its hooks from the `SessionStart`
    hook, or from the bootstrap run by hand. With no pin, which a first
    install from a dirty checkout leaves, the bootstrap refuses: the
    hand-back says so.
11. **Labels**: the inbox is the open issues of the repo, and the two inbox
    keys of the block name the labels `board.sh` reads. Every label of
    `inbox_skip_labels` and the one of `inbox_accept_label` that
    `gh label list` does not show is created with `gh label create <name>`,
    before any issue is labelled. Then, in the run that created the first
    label of `inbox_skip_labels`, that label goes on every issue open at
    this moment, `gh issue edit <n> --add-label <name>`, the PRs left out:
    whatever was open before the harness is history and not the inbox, and
    the first board of the repo starts empty instead of asking about each
    issue in turn. A rerun that finds the label already there creates
    nothing and labels nothing, so an issue filed after the install stays on
    the board. The hand-back prints how many issues were labelled. Without `gh`, or with a `gh` that cannot answer,
    the stage says so in the hand-back and goes on: the labels are made by
    the next run.
12. **Verify**: `git ls-files .harness` lists `.harness/AGENTS.md`,
    `.harness/stamp.json`, `.harness/bootstrap.sh` and files under
    `.harness/docs/`, and nothing under `.harness/bin/`; `git diff` on
    `AGENTS.md`, `CLAUDE.md` and `.claude/settings.json` shows only added
    lines. Run the four commands; run
    `.harness/bin/commitlint.sh --file <(echo "Bad message.")` and expect a
    non-zero exit; stage a whitespace change, confirm the pre-commit hook runs
    on `git commit --dry-run` is not enough (hooks do not run on dry runs), so
    make and immediately amend or reset a throwaway commit on the harness branch.
13. **Hand back**: branch `harness/local`, the diff summary, the count of
    the issues step 11 labelled, the line
    "next: `/harness-init ci`, on top of this branch". No PR yet.

## 3. Stage `ci`

Deterministic gates on the server. No LLM in this stage. Outside `.harness/`
it writes the workflow and the PR template, and rewrites no line of a file
the project wrote. The one file of the project it adds to is a PR template
already there, which keeps its text and gets two sections appended under a
marker (step 3), because `tier.sh` reads the boxes only there. The scripts it
needs, `tier.sh` and `test-weakening.sh`, come with the fetch into
`.harness/bin/`, as do the hooks of stage `local`.

1. **Labels**, idempotent with `gh label create --force`: `tier:0` to `tier:3`,
   `human-gate`, `tests-weakened`, `needs-human`, and one per judge and
   outcome, `judge:<role>:<outcome>`
   with role `correctness` or `security` and outcome `approve`, `changes`,
   `escalate` or `crashed`: each judge owns its label, so the two of tier 2
   never overwrite each other, and a crash is not an escalation. A repo from
   before ADR-0004 still has `fix-round:1` and `fix-round:2`: delete them
   with `gh label delete --yes`, they belonged to a fixer that no longer
   exists.
2. **The ci workflow** from `templates/github/ci.yml`: one workflow, one job
   named `ci`, the single required status check, with the gates as its steps
   (secret scan with gitleaks; conventions: commit lint on the PR range and
   on the title of the PR, which is the subject the squash lands,
   `.harness/bin/prose.sh` on the range and the test-weakening detector;
   dependency audit; checks: format, typecheck, test, build; tier; a last
   step red if any gate is). One job and not six because GitHub bills each
   one rounded up to the whole minute. Adapt package manager and Node version.

   Where it goes. The same rule holds for the four workflows of the harness,
   `ci.yml` here and `automerge.yml`, `escalate.yml` and `close.yml` in stage
   `judge`. A file under `.github/workflows/` is the harness's when its first
   line is the first line of the template: every workflow template opens
   with a comment of its own, and the copy keeps it, while the rest of the
   file is adapted and never byte for byte the template. With no file of that
   name, the workflow goes in as `<name>.yml`. With a file of that name that
   is the project's, the project's file is not edited, not a byte, and the
   harness's goes in next to it as `harness-<name>.yml`. On a rerun the
   harness's file is the one of the two whose first line is the template's,
   and that is the file rewritten.

   The harness's workflows find each other by the `name:` inside the file,
   not by the file name: `automerge.yml` listens to `workflow_run` of the
   workflow named `ci`, and the required check is the job `ci`. So the name
   of the file changes nothing for them, and a workflow of the project with
   `name: ci`, in whatever file, makes both ambiguous: the stage stops before
   writing, names the file, and the human renames one of the two.

3. **PR template** from `templates/github/pull_request_template.md`. The
   checklist is declarative: `tier.sh` reads the boxes. With no
   `.github/pull_request_template.md`, the file is the template. One that
   is there keeps its text, and the template's "Slice" and "Declarations"
   sections are appended at the end under this marker, alone on its line:

   ```markdown
   <!-- harness: slice and declarations -->
   ```

   Once: a rerun that finds the marker appends nothing.

4. **Repo settings and ruleset.** Run `gh repo edit` for squash-only and
   branch deletion on merge (every plan), and auto-merge where the plan
   allows it. Apply the ruleset with `gh api` only when Detect found
   rulesets available; otherwise one line in the hand-back: main is
   protected by the hooks alone and the policy merges directly after green
   ci. The required check is `ci`. Solo: zero required reviews. Team: one
   required review, `CODEOWNERS` on the sensitive paths (write it from the
   AGENTS.md list), merge queue above two people.

   The ruleset is `.harness/bin/ruleset.json` with `bypass_actors` filled on
   the way to `gh api`, and nothing is written in the tree: the json is
   filled with `jq` and handed over on stdin, `--input -`. The file is
   machinery, the same in every repo, and the ruleset as applied is what
   `gh api repos/{owner}/{repo}/rulesets` returns. The template ships the
   list empty because neither actor can be known before the repo is, and two
   writers of the chain push to main without a PR. The first is
   `close.yml`, with the token of the GitHub App: the App goes in as an
   `Integration` actor whose id is the value of the `HARNESS_APP_ID` variable
   of the repo, read with `gh variable get`. With the variable unset the
   actor is left out, and one line in the hand-back says that `close.yml`
   will be refused once the App is set, until the stage runs again. The
   second is the human who commits documents on main: the admin role goes in
   as a `RepositoryRole` actor only when the `docs_mode` key of the policy
   block is `main`. With `pr` it is left out, because nobody commits on main
   there, and a bypass would only weaken the rule for the team. Both need a
   bypass that holds for a direct push, not only inside a pull request.

   The shape of an actor, `actor_id`, `actor_type` and `bypass_mode`, with
   the values each one takes and the id of the admin role, is read from the
   current rulesets REST reference before it is written, never from memory.
   List the rulesets of the repo first: a ruleset already on the repo with
   this name is updated and not created twice. A rerun changes
   `bypass_actors` only by adding what is missing: an actor a human put
   there stays, so the list on GitHub is read before the json is sent.

5. **Stamp**: `.harness/stamp.json` as "Ground rules" says: it sets `pin` to
   the commit it runs from, and its own entry `ci` under `stages`.
   The entry of `local` stays as that stage left it, whatever it says: the two
   stages can come from two different commits of the harness, and the board
   prints them one next to the other for that reason.
6. **Verify**: push is the user's call. The ci workflow runs on the install
   PR from its own branch (`pull_request` reads the workflow from the head):
   once that PR is open, read the run with `gh run view` and report which
   jobs passed and which tier label it got. `automerge.yml` and `close.yml`
   cannot run before they are on the default branch: `workflow_run` only
   fires from there.
7. **Hand back**: branch `harness/ci`, diff summary,
   "next: `/harness-init judge`". Then the offer of the structural test,
   which the stage does not write by itself: a test runner does not look
   inside `.harness/`, so the file would go in the project's own test dir,
   the one place where the harness writes into the source tree. One line
   names the rule it would enforce and the path it would write: the rule
   taken from the "Do not" of `.harness/AGENTS.md`, the path
   `architecture.test.ts` in that test dir, from
   `templates/architecture.test.ts` and written as a normal test of the
   project's runner. The file is written only after a yes. If it fails on
   the current code, it stays in and the violation is reported: it is the
   finding.

## 4. Stage `judge`

The judgement itself is `/judge`, in the terminal, before the PR (ADR-0001,
ADR-0004): no workflow calls a model, no token of Claude lives on the server.
This stage installs what acts on the verdict and the lines of the repo for
its judge.

1. **`.harness/judge.md` from `templates/judge.md`**, only if it is not
   there: its lines belong to the repo, and a rerun that overwrote them would
   take away what a human told the judge. Fill it from `.harness/AGENTS.md`
   and `.harness/docs/codebase-map.md`: two or three short paragraphs on
   what weighs more here than its line count, or one line that says there is
   nothing. The stage copies no prompt and no schema: they are machinery,
   fetched into `.harness/bin/judge/` at the pin, the same in every repo,
   and `.harness/bin/judge.sh bundle` puts `.harness/judge.md` right after
   the prompt. The judge receives only artifacts (diff, slice file,
   AGENTS.md, codebase map, the result of the gates), never the coder's
   conversation, and its only output is the verdict object, checked against
   the schema by `.harness/bin/judge.sh check`.
2. **`judge.sh` and `policy.sh`**, in `.harness/bin/` with the fetch, as
   `review-log.sh`: nothing to copy. `judge.sh` is what `/judge` runs before
   the PR, the bundle in and the verdict checked against the schema and
   stored per commit out; `policy.sh` is what `/judge` and `/next` run once
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
3. **`automerge.yml`, `escalate.yml`, `close.yml`** from the templates, each
   under the name step 2 of stage `ci` gives it: `<name>.yml`, or
   `harness-<name>.yml` next to a file of the project with that name, which
   stays as it is. Tier
   0 merge on the green ci run (not on the label, which lands before the `ci`
   job ends) and never with `human-gate`; the ntfy notification with the
   verdict inside when a human puts `needs-human` on by hand; on a merge
   into the default branch, the slice to `done` and the verdict line
   appended to `.harness/docs/review-log/verdicts.jsonl`. Every autonomous write (the
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
5. **Stamp**: `.harness/stamp.json` as "Ground rules" says: it sets `pin` to
   the commit it runs from, and its own entry `judge` under `stages`. The three
   entries are the whole stamp: from here the board of
   this repo can say where each of its three stages came from.
6. **Verify**: with the user, open a docs-only PR and a small code PR judged
   with `/judge`; report what the judge said and what the policy would have
   done. `git status --porcelain` outside `.harness/` lists only `AGENTS.md`,
   `CLAUDE.md`, `.claude/settings.json`, the four workflows under
   `.github/workflows/`, `.github/pull_request_template.md` and `.gitignore`,
   and the structural test if the human said yes to it.
7. **Hand back**: branch `harness/judge`, diff summary, the human checklist
   (section 6), "next: open one PR from this branch with the three stages,
   merge it by hand, then the first intent with `.harness/bin/intent.sh new <slug>`,
   and `/spec`".

## 5. Team mode

Same files. Differences: `CODEOWNERS` on the sensitive paths; the ruleset
requires one review; the lines of the personal `stack.md` the team agrees on
are copied into the project's own `AGENTS.md`, outside the `## Harness` section; `.claude/settings.json` stays tracked but every
rule in it has a twin in `.harness/bin/hooks/` or in CI, because not everyone runs
Claude Code. Escalation goes to the team channel, not to a personal ntfy topic.

## 6. Hand-back format

One screen, always the same shape: the state table (before); what changed,
files grouped by concern, one line each; findings (a red structural test, a missing script, a workflow or a PR
template of the project left as it was and what went next to it, a pin the
stamp did not move and why); the next stage. Stages `local` and `ci`
end there. Stage `judge` adds the one human checklist of the whole install:
two numbered items, the only things that need a browser (the GitHub App,
when the user does not have one yet; opening and merging the install PR),
each with its command in a code block and one line on why. ntfy is one line
of "if you want it", not an item. Everything else the skill has already done. No manifesto: the harness is
code and the diff is the documentation.

# Harness: the agent production chain

> A draft written with four hands, version 0.35 of 2026-09-25. Since 4 September it lives in this repo as `docs/spec.md`; before that it sat in `bozze/` in the vault. Version 0.1 of 2026-09-02 started from Lionel's draft of 2026-09-01 (the note "La frizione si è spostata", in the vault) and described the flow as if the current skills did not exist. 0.2 realigned it with what landed on 3 September: the `/harness-init` skill in three phases, the three `harness/*` branches on Tipoff, the Docket repo. 0.3, the same day, takes in the feedback from the first use and the choice about the GitHub plan. 0.4, that afternoon, takes in the judge's first run on Tipoff, the reading of CodeRabbit and the decision to give the harness a repo of its own. 0.5, of 7 September, takes in the first judgement inside the harness repo. 0.6, the same day, separates in the tier how much scrutiny is needed from who may merge. 0.7, of 8 September, makes the verdict one sentence and the comment a page for the human, with the real cost at the bottom. 0.8, the same day, separates a crash from an escalation and moves the notification inside the policy. 0.9, still 8 September, moves the judgement before the PR and into the terminal, and leaves the cloud the role of fallback: that is ADR-0001. 0.10, of 9 September, closes the five findings PR #13 had left open: the verdict knows which base it was read against. 0.11, of 10 September, carries into the templates the holes that the first rerun of `local` and `ci` on Tipoff found in the tier calculation. 0.12, of 11 September, gives the intent a script for everything around it: branch, skeleton, commit and PR. 0.13, the same day, writes `/slice`: the slices of a spec on a `backlog/<slug>` branch, the board in the PR body and the merge as the review of the plan; and it widens the sources of the backlog to the inbox and to what the audit finds in PRs and runs. 0.14, the same day, is ADR-0003: documents go on main without a PR, the judge runs once per PR and findings are answered with a commit, `/next` is written before `/board` and "vai" closes a whole board, skills do not repair the harness of the repo they work in. 0.15, of 15 September, writes the line that was missing after S14: a merge and a close count only on the default branch, whoever does the merging. And it aligns 5.7 with the ADRs that govern it, where `/board` is not read-only because a line of the inbox becomes a slice with the human's yes. 0.16, the same day, is ADR-0004: the judgement is local only, `judge.yml` and `fix.yml` leave the templates along with the token, the two model variables and the `fix-round` labels, and the human checklist of the setup drops to two items. 0.17, of 16 September, takes out of 4.4 the commit that moved the slice to `in-progress`: the claim is the branch on the remote and nothing else, `in-progress` leaves the states, and the PR of a slice does not touch `docs/backlog/`, which would cost it the human gate. 0.18, the same day, gives a place in the chain to a human who reads an open PR: their finding goes into the verdict that is already there with `by: human` and is answered like the others, without a second judgement. 0.19, the same day, gives every slice of `/next` a worktree of its own, which disappears at hand-back, and moves the verdict into the common git dir, so it survives the worktree. 0.20, the same day, makes the waves of `/next` come from the touchpoints too: two slices that name the same path do not start together, and `blocked_by` goes back to saying only that one slice cannot be built without another. 0.21, the same day, aligns the parallel width of `/slice` (4.3) to the same rule, and gives `/next` two lines of conduct that the first runs had shown to be missing: one line per event after the block of waves, and the inbox line of a subagent, which goes into its report and onto main, never into the branch. 0.22, the same day, makes `blocked_by` name the ADR that holds a slice still as well, which the board prints, and brings `blocked` back to the slice taken and left half done. 0.23, the same day, writes `/board`: the screen and the next action are computed by `scripts/board.sh`, the skill shows them and closes every line of `docs/inbox.md` with one word, intent, slice or via, one commit on main per answer. 0.24, of 17 September, takes from `policy.sh` the branch that recognized GitHub Actions: the script has one path, the terminal one, and `judge.where` is only `local`. 0.25, the same day, rewrites for the local-only judgement the paragraph of 4.6 about the moved head and the crash, which still spoke of CI runs and of a judge action. 0.26, of 18 September, makes the two that choose the work read the claim: the board reads the `slice/S<NN>-*` branches on the remote, prints `in corso` for the slice that has one and keeps it out of the eligible ones, its own and `/next`'s. 0.27, the same day, makes a slice's branch born without an upstream, `--no-track`, and gives a ref to the subagent's first push, which is the claim and sets the right upstream at the same time. 0.28, the same day, writes the id lowercase in the commit subject of `/board`'s `slice` answer, which `commitlint.sh` was refusing, and puts the model subjects of the skills under a test that passes them to the script. 0.29, of 21 September, puts this document into English and takes the day of the change from ADR-0005. 0.30, the same day, gives the board the ADRs that hold a slice still, and `/board` the question that takes one out of `blocked_by` with the human's yes. 0.31, of 22 September, lets a commit subject open with the name of a skill, one slash with a lowercase letter after it, which `commitlint.sh` was refusing. 0.32, the same day, brings the `AGENTS.md` skeleton of 3.3 back to the template that exists, and takes the last "Non fare" out of the judge's prompt. 0.33, the same day, makes `ci.yml` one job: GitHub bills every job rounded up to the whole minute, and the six jobs of 4.5 cost seven minutes a run for two of work, on every PR of every repo that has the harness. 0.34, of 25 September, has a subagent of `/next` stop only the processes it started: `pkill -f vitest` from one worktree had ended the suite of another slice of the same wave. 0.35, the same day, puts into English the model commit subjects the skills prescribe, which the translation of 0.29 had left in Italian and every run of `/board` and `/spec` still wrote into `git log`. The figures in the tables are still starting values to be tuned, not measurements.

## 0. What changes since 0.1

- `/harness-init` goes in phases (`local`, `ci`, `judge`), one branch and one PR per phase, instead of all at once (5.1, 9.3).
- The checks on commits live in the repo's git hooks, in `.githooks/`, installed by the `prepare` script. Claude Code's PreToolUse hook does no more than make sure they are installed (6.1).
- The judge's prompt and the verdict schema live in the repo, in `.github/judge/`. The local `/judge` skill is a wrapper that runs the same files (5.5).
- The judge is settled: `claude-code-action`, schema enforced with `--json-schema`, verdict read from `structured_output`, model in the `HARNESS_JUDGE_MODEL` variable, authentication with the subscription token (6.3).
- `HARNESS_AUTOMERGE` is the switch of every autonomous action, merge and fixer included. It is born off and the first audit turns it on (4.6).
- The fixer and `close.yml` write with the token of a GitHub App, because pushes made with `GITHUB_TOKEN` do not start workflows (6.2).
- The structural rule is a Vitest test in the repo, not dependency-cruiser (6.4).
- Docket exists: the audit board, which imports `verdicts.jsonl`, collects the judgements and exports the file again (4.8, 9.2).
- `stack.md` is written and diverges from the sketch of 0.1 (3.2).
- The skills in `~/.claude` are personal conveniences; the contract is only what sits in the repo (3.5).

From 0.2, after the first use:

- A private repo on the Free plan has no ruleset, no branch protection and no auto-merge. No Pro for now: main is protected by the `pre-commit` and `pre-push` hooks, and the policy merges directly once CI is green (6.1, 6.2).
- Every autonomous action that has to start a workflow, merge included, uses the token of the GitHub App: `GITHUB_TOKEN` does not start workflows, so a merge made with it would not fire `close.yml` (6.2).
- The report of `/harness-init` fits one screen and the human checklist arrives once, at the end of the `judge` phase; everything `gh` can do, the skill does (5.1, 9.5).
- On the first setup the three phases land in a single PR: the gates cannot watch over the PR that creates them (5.1, 9.3).
- `harness-init` runs once per repo. The session opener will be `/board`; `session-start` stays for the projects without the harness (5).
- Proposal: a `cost` block in the verdict, read from the execution log of the action, so the judge's cost goes into the review log (7.1).
- Erratum of 0.2: Docket has its remote, `elrumordelaluz/verdicts`, with nothing pushed (9.2).

From 0.3, after the judge's first run and the reading of CodeRabbit:

- The verdict carries `head_sha`, the commit the judge saw, and the policy acts only if the PR's head is still that one. `policy.sh` stamps it from the sha of the CI run, not the judge (4.6, 7.1).
- The `cost` block is no longer a proposal: `policy.sh` reads it from the action's `execution_file` (7.1).
- The judge's first run, on Tipoff's PR #2, failed before the model's first turn and the PR received nothing. The policy step now runs even when the action fails and sets `needs-human` with the link to the run; the action runs with `show_full_output` until the judge is tuned (4.6, 6.3, 9.1).
- CodeRabbit covers the judge, the fix loop, a piece of the spec and of the metrics, not the deterministic gates and not the audit. It stays outside the chain for the same reason as Copilot; the rule about the sha comes from there (6.3, 12).
- The harness has a repo of its own, `harness`, with the skills and this draft; in `~/.claude/skills/` the symlinks remain (3.5, 9.3).
- Erratum of 0.3: Tipoff's PR #1 has been merged, with squash, since 4 September (9.1).

From 0.4, after the first judgement in the harness repo:

- The audit is the second source of the backlog, and the only one besides the specs: it opens slices for what it finds in the verdicts, and those slices carry in `spec:` the reference to the verdict instead of the path of a spec (4.3, 4.8).

From 0.5, from the first slice opened by the audit:

- The tier answers one question, how much scrutiny is needed. Who may merge is a line of its own, "Gate umani" of `AGENTS.md`: CI turns it into the `human-gate` label, and neither `automerge.yml` nor `policy.sh` merges that PR, not even at tier 0 with `approve`. The label stays until a human removes it, and without `AGENTS.md` at the base ref `tier.sh` closes at tier 2 instead of opening (4.6, 7.2).
- Prose that nobody executes is tier 0 at any length; the documents an agent executes and the contracts never are, however short they are (7.2).
- `tier.sh` reads the path lines of `AGENTS.md` from the base ref: on the `pull_request` event the checkout is the PR's copy, and a PR does not widen on its own the rules it is judged by (4.6, 7.2).

From 0.6, from the first five verdicts read by a human:

- The judge says one sentence: `reason` is 240 characters in the schema, for all three verdicts, and the reason a human is needed sits in `human_reason`, the question or the instruction the human reads first. It does not verify and does not report what a gate has already proved (4.6, 7.1).
- Prose is a gate: `scripts/prose.sh` fails on an em dash in the added lines, in `pre-commit` and in `ci.yml`, and the judge no longer reads for style (4.5).
- One comment per judgement, not three: at the top what the human reads, the JSON in a `<details>` after the marker, at the bottom the cost and what the policy did. The previous verdict of the same role is minimized as outdated, so the PR shows one live verdict per judge and the log keeps them all (4.6).
- The cost tells the truth: the input tokens include the cache, and `cost_usd` is not zero with the subscription token, against what 0.4 said (7.1).
- Only the verdicts written by the chain or by an owner or member of the repo go into the log: `scripts/review-log.sh`, called by `close.yml`, drops the others and says so (4.7, 7.1).

From 0.7, from the two crashes and the missed notification of PR #3:

- A crash is not an escalation: with no verdict the PR gets `judge:<role>:crashed`, a comment with the link to the run (one per judged commit, updated on the second crash) and the notification, never `needs-human`. `tier.sh` ignores that label, so the next CI judges again instead of parking the PR at tier 3 (4.6, 7.2).
- The verdict labels carry the role, `judge:correctness:escalate`, `judge:security:changes`: each judge removes and sets only its own, and at tier 2 the second does not erase the first (7.2).
- The notification leaves from `policy.sh`, with the verdict in hand, at every escalation, even when `needs-human` was already there and GitHub emits no event at all. `needs-human` is never removed by the policy. `escalate.yml` stays for the labels set by hand, and filters the bot actors so that nothing notifies twice (4.6, 6.3).

From 0.8, from ADR-0001 and from the fourteen verdicts of the harness's first nine PRs:

- The default judgement is local and comes before the PR. `/judge` runs on the branch before `gh pr create`, at clean context, and writes the verdict of the current head; `policy.sh` posts it once the PR exists, with the same marker CI uses (4.6, 5.5).
- The cloud judge is the fallback: `judge.yml` skips every head that already carries a verdict, and runs only where nobody has judged (4.6, 6.3).
- `/judge` is a subagent at fresh context, never a fork of the session that wrote the code, and it receives one file with everything inside: one pass, no repo to explore (5.5).
- A `PreToolUse` hook on `gh pr create` refuses the PR of a head without a verdict, and the reason says to run `/judge`. The rule lives in the hook, not in the model's memory (6.1).
- The verdict says where it comes from, `judge.where` at `local` or `ci`, and the line at the top of the comment shows it: the audit sees which judge spoke without opening the run (7.1).
- At tier 2, with two `approve` and no `high` finding, the human gets a line to decide instead of `needs-human`. It arrives with the slices of the `giudizio-a-richiesta` intent, not with this version (4.6).

From 0.9, from the five findings PR #13 left open:

- The verdict carries `base_sha`, the commit the diff was read from, and `judge.sh check` stamps it when it archives the verdict. A verdict holds for one head and one base: the hook no longer opens a PR whose judgement was made against another base, where the diff covered is not the one the PR shows. Only `check` writes the field, and one that arrived inside the verdict is taken out, together with `head_sha`, `outcome` and `audit`: they are the fields of the chain that the judge might write, and in CI, where nobody archives, `policy.sh` takes them out (5.5, 6.1, 7.1).
- Only the verdict that `check` archived gets posted: the skill chains `judge.sh have` and `policy.sh`, because `path` prints where the verdict would go, not that it is there (5.5).
- A successful judgement minimizes the crash comment of its own role, whatever commit it names: before, a network failure of one minute left on the PR a trace that only a human removed (4.6).
- `judge.sh check` checks the type even where the schema declares more than one, that is in every field that admits null: `"line": "42"` passed locally and the action refused it (5.5).
- The line that says to run `/judge` before the PR goes into the `AGENTS.md` template: the `local` phase installs the hook, and a project used to take it with the rule written nowhere (3.3, 6.1).

From 0.10, from the rerun of `local` and `ci` on Tipoff:

- The contracts, the files that are never tier 0, are a line of `AGENTS.md`, `Mai tier 0`, read at the base ref like the other two, above a floor the script keeps by itself: `AGENTS.md` and `CLAUDE.md` at every level, `.claude/**` and the map. The list sat in the script, named two files that exist only in the harness repo and left out `CLAUDE.md`, which every session loads, and the commands, the agents and the skills under `.claude/`: two lines there were tier 0 and no judge read them (3.3, 7.2).
- The slice's `human` flag is read at the base ref and in the branch, and either of the two copies is enough: a PR that set its own slice to `human: false` used to leave tier 3 (7.2).
- The fixed sensitive paths of the template are the files that decide how every change is checked: `package.json`, whose scripts are what the gates execute while `tier.sh` compares only its dependencies, `tsconfig*.json` and `.claude/settings.json` join `AGENTS.md`, `.github/**`, `.githooks/**` and `scripts/**`. The `local` phase keeps them when it compiles the line, with the config of the test runner where there is one (3.3, 5.1, 7.2).
- `tier.sh` reads file names as they are. With `core.quotePath` off a name with accents arrives whole, and one that git quotes anyway, with a double quote, a backslash or a control character, counts as a sensitive path: quoted, a name no longer looked like any pattern and a sensitive file dropped to tier 1. Without detecting renames, a file moved out of a sensitive path counts under its old name too: before, an exact rename of a gate script into `notes/` was tier 0 (7.2).
- The Tier 0 line of the template no longer promises comments and formatting: `tier.sh` never computed that, and a rule the script does not apply is not written as if it did (3.3).

From 0.11, from the first intent written for Tipoff:

- The intent has a script, `scripts/intent.sh`, which the `local` phase installs: `new <slug>` creates `intent/<slug>` from the default branch with the three empty sections, `open` refuses a missing or empty section, commits the file alone, pushes it and opens the PR with the template filled in, or names the one already open. It also refuses a branch that carries anything besides the intent: the PR opens from inside the script, where the verdict hook does not see the command, and so it stays by construction a tier 0 PR that owes no verdict. The lines stay the human's and no agent touches them: the script takes away the ceremony, not the writing. The slug starts with a letter, because it becomes the subject of two commits, `docs(intent): <slug>` and `docs(spec): <slug>`, and `commitlint.sh` wants a letter after the colon (4.1, 5.1).

From 0.12, from `/slice`:

- `/slice` cuts an approved spec, one that sits on the default branch and has no slices yet, on the `backlog/<slug>` branch: one file per slice, the ids counted from the highest on the default branch and on the open `backlog/*` branches and never reused, the tier estimated from the touchpoints with the policy lines of `AGENTS.md`. It shows the board and asks one question, the one it is least sure about; on the yes it commits and opens the PR with the board in the body. The merge of that PR is the review of the plan, once per spec and not per slice: the PR is tier 0 and sits under the human gate of `docs/backlog/**`, so no new mechanism is needed (4.3, 5.3; ADR-0002, decision 8).
- `human: true` stays on the cases of 4.3, but a behavior a test would know how to verify is not a visual outcome, even when the spec has chosen to check it by hand: that slice stays `human: false` and carries the manual steps in the Notes. The flag sends it to tier 3, out of the reach of `/next` (4.3).
- The sources of the backlog are three: the four of ADR-0002 minus one, because observation is the audit reading the PRs and the runs instead of the verdicts alone. S04, S05 and S08 came from there, and the README line that tied the audit to the verdicts did not cover them. The inbox comes in with `spec: inbox (<data>)`: a line of `docs/inbox.md` that `/board`, when it arrives, turns into a slice (4.3, 4.8; ADR-0002, decision 6).

From 0.13, from ADR-0003, after eight days of harness on Tipoff without one line of product merged:

- Documents go on main without a PR: intents, specs, slices, ADRs and inbox lines are written with the human in the room and their yes is the approval. The line `Documenti: su main` in "Gate umani" of `AGENTS.md` says it per repo, `Documenti: PR` is the team case; the hooks read it, and let through on main a commit made of files of the human-gate paths alone, and so do the skills. `/spec` on the yes sets `status: approved` and `approved: <data>` and commits with the confirmed decisions in the body; `/slice` commits with the board in the body; `intent.sh open` commits and pushes. `git log -- docs/` is the record (4.1, 4.2, 4.3, 5.2, 5.3, 6.1).
- The judge runs once per PR, after the code, one pass per role. The `high` and `medium` findings are fixed in the same session and answered with the commit that closes them, `judge.sh answer`; the hook accepts the verdict of an ancestor commit with the findings answered, `policy.sh` posts the answers and at tier 1 treats an answered `request-changes` as an `approve`, with `answered` in the log. At tier 2 two roles once each: two `approve`, or answered with no `high` open, merge, otherwise `needs-human`. `fix-round` and the cloud fixer are no longer used. Whether the answer is true is for the audit to say (4.4, 4.6, 5.5).
- `/next` is written before `/board` and "vai" takes every eligible slice in waves, one per subagent at clean context, up to the PR merged by the policy; `HARNESS_AUTOMERGE` goes `on` on Tipoff from the first run. The judge's model is per tier, Sonnet 5 at tier 1 and Opus 5 at tier 2 (4.4, 5.4; ADR-0002, decisions 3 and 5).
- The skills do not repair the harness of the repo they work in: one dated line in `docs/inbox.md` and the run carries on. In the harness repo the prose goes on main and the judge runs only on request (5, 9.3).
- The order of work is the one of ADR-0003: S09 to S13, then Tipoff with `/slice` and `/next` on esc-key (9.3). The decision on tier 2 and automerge, postponed by ADR-0002, is taken (11).

From 0.14, after S14 and S15:

- A merge and a close count only on the default branch, whoever does the merging: `close.yml` moves the slice to `done` and appends the verdicts only if the base of the PR is the default branch, and a different base leaves in the summary which PR it did not close. The line holds for every merge path of the chain, `automerge.yml` and `policy.sh` (4.7, 6.3).
- `/board` is not read-only: it shows the lines of `docs/inbox.md` and turns one into an intent or a slice with the human's yes, one line at a time. 5.7 said the opposite of ADR-0002 decision 6 and of ADR-0003, which are in force (5.7).

From 0.15, from ADR-0004, after the audit of 15 September:

- The judgement is local only: `/judge` before the PR and `/next` that runs it. `judge.yml` and `fix.yml` leave the templates and the copies, and with them `CLAUDE_CODE_OAUTH_TOKEN`, `HARNESS_JUDGE_MODEL`, `HARNESS_FIXER_MODEL` and the `fix-round:*` labels. There is no fallback: a PR without a verdict does not open, and a judged head is not judged again (4.6, 6.3, 7.2).
- The human checklist at the end of `/harness-init judge` has two items, the GitHub App and the setup PR; ntfy is optional and the skill says so (5.1, 6.3). The judge's model is per tier, in the skills, because it is the Agent tool that receives it (11).

From 0.16, from the first wave of `/next` and from step 6 on Tipoff:

- A slice is claimed by the branch on the remote and by nothing else: the commit that moved it to `in-progress` leaves 4.4 and `/next`, and `in-progress` leaves the states of the frontmatter. `docs/backlog/**` sits among the human-merge paths, so that commit put `human-gate` on every slice PR and the policy merged none of them, not even at tier 1 with zero findings (4.3, 4.4, 5.4).
- A human who reads an open PR has a place in the chain: `scripts/judge.sh finding` writes what they found into the verdict of the judged head with `by: human`, it is answered with the commit like the judge's findings, and while a `high` or `medium` of theirs is open the policy sends the PR to a human, whatever the judge said (4.4, 4.6, 7.1).

From 0.18, from the first run of `/next` in the harness repo:

- Every slice of a wave works in a worktree of its own, `.claude/worktrees/S<NN>`, which the orchestrator creates one at a time before the wave with the slice's branch inside; the shared checkout stays on the default branch and no subagent touches it. Three subagents in the same checkout moved HEAD around on one another, and the commit of S18 had ended up on the branch of S19. The judge, the PR with `--head`, `have` and `policy.sh` run from the worktree, and the verdict hook reads the head from `--head` when the command carries it. At hand-back the worktree of every slice of the run is removed, merged, open or blocked, and the branch stays. The verdict sits in `$(git rev-parse --git-common-dir)/harness`, one per clone: under the git dir of the worktree it died with it. The prose named in the touchpoints of a slice travels in the branch with the code, and `/harness-init local` ignores `.claude/worktrees/` (4.4, 5.1, 5.4).

From 0.19, from the inbox line of 16 September:

- The waves of `/next` come from `blocked_by` and from the touchpoints: inside a wave no path of "Touchpoints" sits in two slices, the one with the lower id stays and the other moves to the wave after, where it waits for the first to be `done`. The path is the first backtick of the line, `(nuovo)` and `(symlink nuovo)` do not count, a line without backticks names nothing, and the block of waves printed before the run says which slice moved after which and for which path. On Tipoff S02 and S03 were writing the same test in the same wave: `policy.sh` said `merge` on the second, `gh pr merge` refused the conflict and the PR stayed open with no reason given, and a rebase would have changed the head the verdict covered. A shared file is not a prerequisite and `/slice` does not write it in `blocked_by` (4.4, 5.4).

From 0.20, from the two runs of `/next` of 16 September:

- The parallel width that `/slice` prints counts the shared touchpoints too, with the rule of `/next`: that is the one the run executes (4.3).
- After the block of waves `/next` prints one line per event, never the plan: full silence lost against the system prompt, and two runs out of two showed it (5.4).
- The inbox line of a subagent goes into its report and onto main with the human's yes at hand-back, never into the branch: `docs/inbox.md` is a human-merge path and PR #40 paid for it with a merge from main (4.4, 5.4).

From 0.21, from SPEC-board:

- `blocked_by` accepts the id of an ADR, `ADR-<nnnn>`, besides that of a slice, and the board prints `ferma per ADR-<nnnn>` reading that field. `status: blocked` goes back to meaning one thing only, the slice taken and left half done of 4.4. S05 and S08 were `blocked` without anyone ever having taken them, S06 and S07 `todo` behind them, and the board could not say why four slices were standing still. No new field, and `/next` does not change, because an ADR is never a `done` slice (4.3).

From 0.22, from SPEC-board, the skill:

- `/board` is a script and a wrapper. `scripts/board.sh`, a template of the `local` phase, computes the screen and picks the next action with a rule in fixed order; the skill runs the script, shows the output without summarizing it and repeats the last line, and writes the rule in prose without applying it. Then one question per inbox line, with three answers: `via` takes the line away, `slice` turns it into an eligible slice in the same commit, `intent` opens the skeleton with `intent.sh new` and stops, because the ten lines belong to the human. Every answer is a commit on main, and with `Documenti: PR` the skill stops after the screen. 5.7 promised the next action with a reason and described only the menu (5.7).

From 0.23, from the inbox line that ADR-0004 had left:

- `policy.sh` has one path, the terminal one. It no longer reads the GitHub Actions environment nor the `execution_file`: no link to the run, no cost line, no fields taken from a verdict that nobody had archived, and the merge always waits for `ci` to pass on the head. No workflow had run it since ADR-0004, but a project that had run it from an action of its own would have had a merge without CI. `judge.where` is only `local`, in the schema and in the verdict, and a local judgement carries no cost (4.6, 7.1).

From 0.24, from the paragraph of 4.6 that ADR-0004 had left to the cloud:

- `policy.sh` reads `head_sha` from the archived verdict, where `judge.sh` wrote it, and not from the sha of a CI run. A head that has moved and answers no finding means `/judge` on the new head, not a CI run that carries a judgement. The crash comment says to run `/judge` again on that commit and links no run, because there is none. No judge action fails and no CI makes it run again: after a crash the tier stays the one from before and the next `/judge` replaces it. Marker per commit, minimization and marker as a line stay as they were (4.6).

From 0.25, from the inbox line left by S19:

- The claim is read, and not only written: `scripts/board.sh` reads the `refs/remotes/origin/slice/*` refs, prints `in corso` in place of `todo` for the slice that has its branch and keeps it out of the eligible ones, with the name of the branch in `branch` in the JSON. The frontmatter does not change, because the file of the slice is not touched to mark it taken. `/board` and `/next` fetch with `--prune`, or a deleted branch would hold its slice still forever. Until here a slice taken by another session stayed `todo` on the screen and the next action sent `/next` onto work that already had an owner, who found out only at the `worktree add` (4.3, 4.4, 5.4, 5.7).

From 0.26, from finding F2 of PR #38:

- The branch of a slice is born with `git worktree add --no-track`: the starting point is `origin/<default>`, and without that option git makes it the upstream of the new branch, so in the worktree `git status` says "ahead" of the default branch, a bare `git pull` merges it and a bare `git push` misses the slice. Step 1 of the subagent names the ref of the first push, `git push -u origin slice/S<NN>-<slug>`: it is the claim, and it sets the right upstream for the pushes that come after (5.4).

From 0.27, from the inbox line of 17 September:

- The commit of `/board`'s `slice` answer has `docs(backlog): s<NN> from the inbox` as its subject, with the id lowercase: `commitlint.sh` wants a lowercase letter after `type(scope): `, and the model with the capital had the hook refuse it at the first commit of every run, fixed by hand from S24 on. The name of the slice's file stays uppercase, where the id is the id. A test passes every model subject of the `SKILL.md` files to `commitlint.sh`, so the next wrong one fails in CI and not in a session (5.7).

From 0.28, from ADR-0005:

- This document is in English, from section 0 to section 12, tables and figures included. What a program reads does not change: the names of the frontmatter fields, the branch names, the commit subjects, the labels of the policy lines of `AGENTS.md` and the paths stay the strings they are, and the block of 3.3 shows the `AGENTS.md` template as the repo writes it today. The documents already written are not translated, and neither are the quotations of them in here (3.3, 4.3).
- ADR-0005 names the day from which new intents, specs, slices and ADRs are written in English, and says that the history stays as it is: intents, specs, slices, ADRs and verdicts already written (4.1, 4.2, 4.3).

From 0.29, from the inbox line of 18 September:

- What waits for a human carries the ADRs too: an open slice that names an `ADR-<nnnn>` in `blocked_by` puts its decision in that section of the board, one row per ADR with the ids of the slices it holds and the title of its first heading, and the same entries are the `blocked` key of `--json`. `/board` asks one question per ADR after the lines of the inbox, and on the yes the ADR comes out of `blocked_by` and the `## Blocked` sections go, in one commit on main. Nothing evaluates the condition of a `## Blocked`: the board says the decision is due, the human says whether it is taken (5.7).

From 0.30, from the inbox line of 18 September:

- A commit subject may open with the name of a skill: one slash with a lowercase letter after it, `docs(board): /board and /next close a line of the inbox`, and the 72 characters count the slash. Everything else stays as it was, the lowercase letter included: `/` alone, `//next` and `/Board` are refused like `Board` and `52`. It is one regex for the two callers, the `commit-msg` hook and the range CI reads, so the rule is the same in both (6.1).

From 0.31, from a reading of 3.3:

- The `AGENTS.md` skeleton quoted in 3.3 is the template that exists. It was still the Italian one of 0.1, with `Mappa`, `Convenzioni` and `Non fare`, without the policy block the programs read and without the line that sends `/judge` before the PR: what 0.28 said, that the block shows the template as the repo writes it today, held for no version before this one. Now it quotes the sections the template has, Map, Commands (single-run), Conventions, Definition of done, Review policy, Human gates, Policy block and Do not, with the `{{}}` placeholders that `/harness-init local` fills; the JSON fence, which does not nest inside the quotation, is one line that names its keys (3.3).
- The judge asks that the "Do not" section of `AGENTS.md` be respected, in the template of `judge/prompt.md` and in the copy in `.github/`, and so does the comment at the top of the structural test the `ci` phase installs: all three still named `Non fare`, a section no repo set up after the translation has (5.5, 6.4).

From 0.32, from the Actions bill of 22 September:

- `ci.yml` is one job, `ci`, and the gates are its steps. GitHub bills every job rounded up to the whole minute: six jobs of a few seconds each cost seven minutes a run for two of work, on every PR of every repo that has the harness, and in September 2026 that was half of the free minutes of the account. Every gate goes on after a failure, so a PR shows every red gate at once, the tier lands whatever the gates said, and the last step is red if any gate is. The name of the status check does not change, so the ruleset and `policy.sh` read what they read before (4.5).

From 0.33, from the inbox line of 21 September:

- A subagent of `/next` stops a process by the PID it started, or by a pattern that names its own worktree path, and never by one that reaches the other checkouts. The slices of a wave run on the same machine: `pkill -f vitest`, launched from the worktree of a slice whose suite had hung, also ended the suite of another one, which saw two runs at exit 143 with no output instead of a red case. The rule is in the brief the subagent receives, next to the one that pins every command to the worktree (5.4).

From 0.34, from the inbox line of 22 September:

- A model commit subject is prose, and it is in English like the rest of the skills: `docs(backlog): s<NN> from the inbox`, `docs(backlog): take ADR-<nnnn> out of blocked_by` and `docs(inbox): <why>` for `/board`, `docs(spec): close the questions of <slug>` for `/spec`. The translation had kept the Italian ones as contract strings, and every run copied them into `git log`. A test fails when one of the four is back in a `SKILL.md`, and the subjects already in the log stay as they were written (2, 5.7).

## 1. Principles

Ten rules, each with the source that holds it up. The rest of the document applies them.

1. **Gate first, judge second.** Every deterministic check passes before any probabilistic judgement. "Regex is certain; LLM judgment is probabilistic" (zolty.systems, June 2026).
2. **The PR is the unit of automation.** Who opens the PR (an interactive session, a cloud session, a headless script, a GitHub coding agent) does not change the chain. The chain lives on the server, not in the terminal. It is this that makes strategic presence possible in place of constant presence.
3. **Plans are reviewed, not diffs.** "A bad line of a plan could lead to hundreds of bad lines of code" (Horthy, ACE-FCA). Human time goes where the leverage is highest: intent, spec, board.
4. **Human gates, explicit and by role.** Who approves the intent, who the spec, who the plan, who the merge, who the release (Anthropic, AI-native SDLC playbook). Alone the roles collapse into one person, but the gates stay.
5. **AGENTS.md short, as a map. `docs/` as the system of record.** OpenAI: "A short AGENTS.md (roughly 100 lines)... serves primarily as a map", and the knowledge of the repo sits in `docs/`. Everything tracked in git: what is not in the repo does not exist for the agent that runs in CI, nor for whoever clones without my skills.
6. **Mechanical rules, not prose.** Architecture is enforced "mechanically via custom linters... and structural tests" (OpenAI). A rule the agents break twice becomes a check.
7. **AI must not self-approve.** The judge is not whoever wrote the code: clean context, better still a different model (First AI Movers; the `--review` of afk-loop already worked that way).
8. **One slice per PR.** Vertical, small, with acceptance criteria written first. "One item per loop" (Huntley, Ralph).
9. **The verdict is data.** It is logged, audited, tuned. Without a log there are no evals and the thresholds stay numbers picked at random.
10. **Clean context at every run; the memory sits in the documents.** Every session rebuilds from `AGENTS.md`, `docs/` and the slice, never from a previous conversation (Ralph, Horthy).

## 2. Layered architecture

```
L0  Documents       ~/.claude/CLAUDE.md · ~/.claude/stack.md · AGENTS.md · docs/
L1  Specification   intent  ->  spec  ->  slices (DAG, expected tier, human flag)
L2  Execution       branch per slice  ->  coder with TDD  ->  PR with template
L3  Gates           git hooks (.githooks/)  ->  deterministic CI  ->  tier:N label
L4  Judgement       judge at clean context  ->  verdict.json  ->  policy.sh  ->  merge | fix loop | escalation
L5  Human           approves intent and spec · reviews the board · decides tier 2 and 3 · audit in Docket
L6  Observability   docs/review-log/verdicts.jsonl  ->  Docket  ->  tuning of the thresholds
```

Every layer talks to the next one only through a written artifact: a file, a label, JSON, a comment on the PR with a marker. No layer depends on a conversation. Everything L4 does by itself sits behind one switch, `HARNESS_AUTOMERGE`: off, the chain observes and reports; on, it acts.

## 3. Documents (L0)

### 3.1 `~/.claude/CLAUDE.md`, personal

It exists. It holds the firm rules (remote access, no attribution trailer), the prose style and the `@stack.md` line. It never enters a repo. In a team it stays with whoever writes it.

### 3.2 `~/.claude/stack.md`, personal and promotable

Written on 2026-09-03. The stack preferences that used to be repeated at every project, with the rule that when a project becomes a team project the shared lines are copied into the repo's `AGENTS.md` and the global file does not change.

Four things change from the sketch of 0.1. Next.js is used when its features are needed (server-side routing, SSR or RSC, route handlers, the image and font pipeline), otherwise React + Vite; 0.1 said "only if SSR is needed", which was too tight. The components are shadcn/ui on top of Tailwind, copied into the repo and owned; auth with Auth.js. The database is Postgres or MongoDB, decided in the spec with the reason written down and never by the agent alone: Postgres with Drizzle to try on new projects, Mongo when the data is document-shaped. Python with `uv`, `ruff`, `pytest` and `pyright` in CI. The rest confirms 0.1: pnpm and Prettier always, Vitest, the four single-run scripts, Vercel for small projects and Cloudflare for Workers. At the top of the file is the retrieval-led rule for Next and Tailwind: before writing code that touches their APIs you read the installed version and the documentation of that version, because they change faster than the model's memory.

### 3.3 `AGENTS.md` in the repo, one hundred lines at most

Tracked in git, read by every agent. The template is in `~/.claude/skills/harness-init/templates/AGENTS.md` and `/harness-init local` compiles it by reading the repo: the map with the real paths and one line per module, the commands with the real package manager, the sensitive paths derived from the layout (server, domain, sync, build and deploy config, `.github/**`, lockfile, migrations), the project's "Do not" lines. The repo's `CLAUDE.md` contains `@AGENTS.md` and at most five lines specific to Claude Code. In a monorepo, one `AGENTS.md` per package where the rules diverge.

```markdown
# {{project}}

{{One line on what it is.}} {{One line on who it is for.}}

## Map
- docs/codebase-map.md: modules, entry points, how it is tested, dragons. Read it before touching code.
- docs/intent/: ten human lines per idea. docs/specs/: specs with a status. docs/backlog/: slices. docs/decisions/: ADRs. docs/review-log/: verdicts.
- {{one line per top-level module: path: what it owns}}

## Commands (single-run)
{{pm}} typecheck · {{pm}} test · {{pm}} format:check · {{pm}} build

## Conventions
- Branch: slice/S<NN>-<slug>. The branch is how the slice is claimed: push at once; if it already exists, the slice is someone else's.
- Commit: type(scope): subject, imperative, lowercase, no full stop; body with the why and the what; no attribution trailer.
- PR: one slice, template filled in, nothing outside the scope. If a change outside the scope looks necessary, a new slice is opened. Before opening it /judge runs: at tier 1 and 2 the hook does not open the PR of a head without a verdict.
- Clean context at every session: start again from this file, from the map and from the slice, never from a previous conversation.

## Definition of done
The slice's criteria green with the tests written first; suite, typecheck, format and build green; no test weakened; docs touched if the behaviour changed.

## Review policy
- Sensitive paths: AGENTS.md, .claude/settings.json, .github/**, .githooks/**, .harness/**, scripts/**, package.json, pnpm-lock.yaml, tsconfig*.json, {{server/**, src/lib/engine/**, src/state/**, vite.config.ts}}.
- Tier 0: the prose nobody executes, at any length; the other docs up to 20 lines. The files on the line below are never tier 0, and neither are comments and formatting in code. Tier 1: within max_lines and max_files of the block below, no sensitive path, no dependency.
- Never tier 0: AGENTS.md, CLAUDE.md, .claude/**, docs/codebase-map.md.
- Tier 2: over the thresholds, or a sensitive path, or a dependency, or a schema, or .github/**. Tier 3: slice human: true, tests weakened, judges in disagreement, fix rounds used up, or a policy block that cannot be read at the base ref.
- The tier is the maximum of the signals. CI computes it with scripts/tier.sh, not whoever opens the PR.
- The judge never merges. The policy in .github/ decides.

## Human gates
- Human merge by path: docs/intent/**, docs/specs/**, docs/backlog/**, docs/decisions/**, docs/review-log/**, docs/inbox.md.
- The tier says how much scrutiny is needed, human_gate_paths says who merges: CI turns it into the human-gate label, neither automerge.yml nor policy.sh merges it, not even at tier 0, and only a human removes the label.
- Documents: on main. The files of human_gate_paths go on main with a commit, without a PR: the human's yes in the conversation is the approval and the commit is the record. The git hooks do not read this line: they read docs_mode, and with main they let through on main a commit made only of those files; on a team the key says pr, and the approval goes back to being the merge.
- Intent and spec: explicit approval. Board: review before the first PR. Tier 2 with an open high or needs-human, and tier 3: human merge. Audit: three automatic PRs a week.

## Policy block
What the programs read: scripts/policy-lines.sh extracts the fence and passes it to jq, and tier.sh, the git hooks and intent.sh read only from here. Every key is required.
<the json fence: version, docs_mode, sensitive_paths, never_tier_0, human_gate_paths, docs_extra_paths, max_lines, max_files>

## Do not
- Do not commit code on main: only the documents of the Documents line of "Human gates". Do not touch .github/ from a slice. Do not change a test to make it pass. Do not add dependencies without declaring them in the PR.
- Do not repair the harness from a skill that is working here: a template behind, a line missing in this file, a script that gets it wrong are one dated line in docs/inbox.md and the run carries on. The fix is made in the harness repo and comes back here by rerunning the /harness-init phase that owns the file.
- {{project rules derived from the map, for instance: src/lib/engine/ imports neither React nor src/state/}}
```

On Tipoff the project's "Do not" lines are five: the engine does not import React, `src/state/` or `src/components/`; score, fouls and lineups are read only from the engine's selectors; the permissions by role live in `src/lib/roles.ts`, imported by client and server; the canvas is fixed in landscape; the events in the `Y.Array` are append-only. They are the rules an agent at clean context would break first, and it is from here that the structural tests are born (6.4).

### 3.4 `docs/`, tracked in git

```
docs/
  codebase-map.md            one screen, the only living document: modules, entry points, tests, dragons
  intent/<slug>.md           ten human lines: problema, cosa vuol dire riuscire, fuori scope
  specs/SPEC-<slug>.md       spec with status: draft | approved | superseded
  backlog/S<NN>-<slug>.md    slice (format in 4.3)
  decisions/ADR-<n>.md       a decision that weighs, with the why and the alternatives dropped
  review-log/verdicts.jsonl  one verdict per line (format in 7.1)
```

Every folder is born with a README of a few lines that says what goes in it and who writes it, so an empty folder is not mute. Intents and specs are documents of departure: after the implementation they rot by construction, they are marked `superseded` and they are not rewritten after the fact. The truth moves into the code, into the map and into the ADRs. The map is kept aligned by the garbage collection task (4.9). The documents that already exist stay where they are: on Tipoff the design brief stayed `docs/scoring-view-brief.md`, tracked, and it will become an ADR when somebody feels like it.

### 3.5 Contract and convenience

The contract is what sits in the repo: `AGENTS.md`, `docs/`, `scripts/`, `.githooks/`, `.github/`, `.claude/settings.json` tracked. It holds for whoever clones and for CI. The skills in `~/.claude/skills/`, `stack.md` and `settings.local.json` are personal conveniences: they make whoever has them faster, they do not change the rules for whoever does not. Corollary: a rule that lives only in a skill does not exist. If it is really needed, it has a twin in the repo, as a script, a hook, a test or a workflow.

The skills of the chain and this draft have a repo of their own: `harness`, in `~/Projects/ai/harness`, remote `elrumordelaluz/harness`, private like the other two. Inside: `skills/<nome>/` for each of the seven skills with its templates, `docs/spec.md` for this document, a README with the installation. In `~/.claude/skills/` every skill of the chain is a symlink inside the checkout, so Claude Code finds it as before and the history sits in git. Until today the templates lived only in `~/.claude`, without a version: the changes of 4 September, already different from the ones that had landed on Tipoff, were tracked nowhere. The distinction above does not change: the templates are copied into the project's repo, and the contract is the copy, not the skill. The personal skills (de-ai, commit-conventions, session-start) stay where they are.

## 4. The process, step by step

| Step        | Who                                     | Input                            | Output                             | Gate                                                       |
| ----------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---------------------------------------------------------- |
| 0 Setup     | agent, three phases per repo            | repo                             | AGENTS.md, docs/, hooks, CI, judge | the human reviews the diff of each phase, one PR per phase |
| 1 Intent    | human                                   | an idea                          | docs/intent/slug.md                | none                                                       |
| 2 Spec      | the agent interviews, the human answers | intent, codebase-map             | docs/specs/SPEC-slug.md            | the human approves in the interview, commit on main        |
| 3 Slicing   | agent                                   | approved spec                    | docs/backlog/S*.md, board          | the human reviews the printed board, commit on main        |
| 4 Execution | agent, any runner                       | one eligible slice               | branch, commits, PR                | git hooks                                                  |
| 5 CI gates  | script                                  | PR                               | green checks, tier:N label         | deterministic                                              |
| 6 Judgement | judge at clean context                  | PR, slice, AGENTS.md, CI outcome | verdict.json, judge:<role>:* label | policy.sh                                                  |
| 7 Merge     | policy or human                         | verdict, tier                    | squash on main, slice done, deploy | by tier                                                    |
| 8 Audit     | human in Docket, then agent             | review log                       | agreement, new thresholds          | human                                                      |
| 9 GC        | background agent                        | repo                             | maintenance PR at tier 1           | like every PR                                              |

### 4.1 Intent

Ten lines, written by the human, with no agent. Three fixed sections: problema (with a concrete episode if there is one), cosa vuol dire riuscire (a verifiable sentence), fuori scope. In a team the product owner writes it. It is the document that keeps the interview from starting off a vague thesis. The rest is done by `scripts/intent.sh`: `new <slug>` prepares the file, `open` checks that no section is empty, commits `docs(intent): <slug>` and pushes. With `Documenti: su main` in `AGENTS.md` the commit goes on main and there is no PR: the intent was written by the human, and asking them to merge what they have just written adds nothing (ADR-0003). With `Documenti: PR`, the team case, `new` opens the `intent/<slug>` branch and `open` opens the PR, merged by whoever approves the intents.

### 4.2 Spec

The agent interviews, one question per message, every question with its recommendation and the reason for it, so that the human can say "yes" at no cost or push back with substance. Before asking it reads `codebase-map.md` and the modules the idea touches. It covers: success criteria, the boundary of the scope, flows and unhappy cases, data, integration points, decisions to lock (stack, patterns, names), non-functional requirements, risks.

A mandatory step, which the old skill did not have: **at least one structural alternative**. The agent proposes a different way of building the thing ("I would do it without Next", "a browser-side preview and the engine only for the final render") and the human chooses. It is the moment where the two cases of Tipoff and Mockupccino happened, and it has to be made systematic because it is where human intervention is worth most.

Output: `docs/specs/SPEC-slug.md` with `status: draft`, sections Problema, Soluzione, User stories con criteri, Decisioni bloccate (one line each, decision plus why), Moduli toccati (real paths), Fuori scope, Domande aperte. It closes with the three to five decisions with the widest reach, to be confirmed. The human's yes in the interview is the approval: the skill sets `status: approved` and `approved: <data>` in the frontmatter and, with `Documenti: su main`, makes a commit on main, `docs(spec): <slug>`, with the confirmed decisions one per line in the body. That commit is the record and `git log -- docs/specs/` the history; no PR to merge (ADR-0003). Open questions that are not empty block the approval and step 3. In a team, with `Documenti: PR`, the spec travels on `spec/<slug>` and the tech lead approves by merging.

### 4.3 Slicing

The agent cuts the spec into vertical slices: if that slice alone lands, a user or an end-to-end test sees something work. The first one is always the walking skeleton. A slice is one session at clean context: if the criteria run past one screen, it gets split. `blocked_by` only for real prerequisites, to keep parallelization wide.

```yaml
---
id: S03
title: The observer sees the score update in real time
status: todo            # todo | blocked | done
blocked_by: S01         # none or a list
tier: 1                 # expected tier, CI recomputes it
human: false            # true = only a human takes it, and it ends at tier 3
spec: docs/specs/SPEC-osservatore.md   # or audit (PR #12), or inbox (2026-09-12)
---
## Goal
## Acceptance criteria   (checkboxes, testable)
## Test plan             (which tests get written first)
## Touchpoints           (real paths)
## Notes                 (the spec's decisions inlined, so the implementer does not need the whole spec)
```

The same format sits in the README of `docs/backlog/`, which `/harness-init` writes into the repo: whoever cuts slices without the skill still has the contract in front of them.

`blocked_by` is `none` or a list, and every entry has one of two forms: the id of a slice, `S<NN>`, for a real prerequisite, or the id of an ADR, `ADR-<nnnn>`, for a decision that holds the slice still. The why sits in the field and not in a new field: the board prints `ferma per ADR-<nnnn>` reading that one. A slice held by an ADR is `todo` and stays out of the waves of `/next`, because an ADR is never a `done` slice, until a human takes the ADR out of the field. `status: blocked` means one thing only, the slice claimed and left half done of 4.4, with `## Blocked` in the file and the PR in draft: a slice nobody has taken is never `blocked`.

The sources are three and `spec:` always says which one: an approved spec, cut by `/slice`, with its path; the audit (4.8), for what it finds in the verdicts, in the PRs and in the runs, with `audit (PR #12)`; the inbox, a line of `docs/inbox.md` that `/board` (5.7) turns into a slice, with `inbox (<data>)`. A new feature does not come through the inbox: it stays intent, spec, slice. There is no slice without a source: it is the field that makes it possible to walk back from a backlog file to the document, the verdict or the line that justifies it. The ids are counted from the highest on the default branch, and they are not reused: they sit in the branch names and in the verdicts.

`human: true` when human eyes are needed by construction: visual or UX outcomes, destructive migrations, secrets, production data, behavior the spec has left ambiguous. It replaces the old `afk`, which described the runner instead of the risk. Behavior a test would know how to verify, a key that closes a panel, is not a visual outcome, even when the spec has chosen to check it by hand: the slice stays `human: false` and carries the manual steps in the Notes, because the flag sends it to tier 3 and out of the reach of `/next`.

Output: the printed board (id, title, blocked_by, tier, human, parallel width). The human reviews it in five minutes, above all the `human` flags and the slices that smell horizontal. The review is once per spec, not per slice, because the slice's file is the plan and an approval at every slice would put back the waiting that the chain exists to take away (ADR-0002). The skill asks one question, the one it is least sure about, and on the yes it commits on main, `docs(backlog): <slug>`, with the board in the body: the printed board is the review, the yes is the approval, the commit is the record (ADR-0003). With `Documenti: PR` the board sits in the body of a PR from `backlog/<slug>` and the merge is the review. The parallel width is the widest wave: the first wave is the slices with no `blocked_by`, every wave after it collects those whose prerequisites all sit in the waves before, and a slice that shares a path of "Touchpoints" with a lower id of its own wave moves to the next one, the same rule as `/next` (4.4, 5.4): the width printed is the one the run executes, not the one `blocked_by` alone would allow. In a team the board sits in GitHub Issues (one issue per slice, `tier:*` and `human` labels, "blocked by" relation), and the files are optional.

### 4.4 Execution

Whoever executes takes the eligible slice with the lowest id: `status: todo`, every `blocked_by` at `done`, `human: false` (unless a human is the one executing), and no `slice/S<NN>-<slug>` branch on the remote, which is the claim of step 1 and is read from the refs, not from a field. Then, in order:

1. `git switch -c slice/S03-osservatore` and an immediate push of the empty branch. **The branch is the claim**: if the push fails because the branch exists, the slice belongs to someone else. No `owner` field to keep in sync, and the claim is atomic because the server makes it. There is no second mark to leave: the "in corso" state is the branch on the remote, `in-progress` leaves `status`, and the PR of a slice does not touch `docs/backlog/`, which sits among the human-merge paths and would cost it the `human-gate` label and the merge by the policy.
2. For every criterion: a test that fails for the right reason, the minimum implementation, the whole suite plus typecheck, refactor. Commit only from green. The repo's git hooks check format, typecheck and message at every commit, for the agent and for the human alike; locally the `wip` type is allowed, which CI then refuses.
3. If it cannot be finished honestly (a test that would have to be weakened, a decision that is missing, a command that is denied): `status: blocked`, a `## Blocked` section in the slice's file, PR in draft with the `needs-human` label, the end.
4. Otherwise the judge, once (4.6): the `high` and `medium` findings are fixed here, in the same session, and each one is answered with the sha of the commit that closes it, `scripts/judge.sh answer <id> <sha>`; the `low` ones are declared in the PR. No second judgement, not even when the one who finds something is a human reading the open PR: `scripts/judge.sh finding <severity> <file>[:<line>] <claim>` writes their finding into the verdict of the judged head with `by: human`, and from there it counts like the others.
5. A PR with the template filled in: link to the slice, declarative checklist (new dependencies? schema? new external service? sensitive paths?), how to verify by hand, the `low` findings declared. CI reads the boxes: one ticked takes the PR to tier 2. `policy.sh` posts the verdict with the answers and, with automerge on, merges where the tier allows it.

The runner is irrelevant: Claude Code interactive, a cloud session, `claude -p` from a script, Copilot's coding agent. The rules are the same because they sit in `AGENTS.md` and in the hooks, not in the runner's prompt.

`/next` (5.4) does these steps for every eligible slice, in waves: the session that says "vai" is the orchestrator, every slice runs in a subagent at clean context, and the next wave starts when the PRs of the wave before are merged and the slices are `done`. The waves come from `blocked_by` and from the touchpoints: two eligible slices that name the same path in "Touchpoints" do not sit in the same wave, the one with the lower id stays and the other moves to the wave after. Two PRs of the same wave that write the same file both pass the gates, but the second does not merge, and rebasing it would change the head the verdict covers. A shared file is not a prerequisite: `blocked_by` stays for what cannot be built without the other slice. Every slice has a worktree of its own, `.claude/worktrees/S<NN>`, which the orchestrator creates before the wave with the slice's branch already inside: step 1 stays the push of that branch, and the shared checkout does not move from the default branch, because the subagents of a wave run together and in the same checkout one `git switch` moves everyone's HEAD. The verdict does not sit in the worktree but in the common git dir, `$(git rev-parse --git-common-dir)/harness`, one per clone. The worktree disappears at hand-back, with the PR merged, open or blocked: the branch stays, the verdict too, and whoever verifies by hand runs `gh pr checkout <n>` from the root. A blocked slice stops itself and not the others; the question arrives in the final hand-back, one line per PR (ADR-0003).

### 4.5 CI gates

One workflow, `ci.yml`, one job, `ci`, all deterministic. GitHub bills every job rounded up to the whole minute, and until 0.32 the gates were six jobs in parallel: seven minutes a run for two of work, on every PR of every repo that has the harness. The gates are the steps of that one job, in this order:

- conventions: commit lint on every commit of the PR (`scripts/commitlint.sh --range`, strict, `wip` refused) and on the title of the PR, which is the subject the squash lands; the gate on the prose (`scripts/prose.sh`: an em dash in an added line fails, in `pre-commit` as here, so that no model reads for style); and the **test-weakening detector** (`scripts/test-weakening.sh`): it looks only at the test files in the diff and reports assertions removed, `.skip`/`.only`/`xit`/`xdescribe` added, matchers widened (`toBeTruthy` in place of `toBe(x)`), test files deleted with no source deleted, suppressions added (`@ts-ignore`, `eslint-disable`, `noqa`). It always exits zero: it is a heuristic, a hit means "a human looks", not "guilty". The `tests-weakened` label takes the PR to tier 3. It is the tdd rule turned from a promise into a check.
- audit: `pnpm audit --prod --audit-level=high`.
- checks: `format:check`, `typecheck`, `test`, `build`, with `pnpm install --frozen-lockfile`. Structural tests of the architecture run inside the normal suite (6.4).
- secret scan: gitleaks over the commits of the PR. After the checks, because the scan leaves its SARIF report in the checkout and `format:check` would read it.
- tier: `scripts/tier.sh` computes the tier (7.2) and writes the `tier:0..3` label, removing the old one. It runs whatever the gates said.
- every gate green: the last step, red if any gate is.

A gate that fails does not stop the job: every step goes on, so a PR shows every red gate at once and the tier lands anyway, and the last step reads the outcome of each gate and fails if one did. The job is the only status check the ruleset requires and the name `policy.sh` waits for: a step added or renamed touches neither.

No LLM in this step. A red `ci` stops everything and the judge does not start. `tier.sh` and `test-weakening.sh` run locally too, with the same output, so a PR can be predicted before it is opened.

### 4.6 Judgement

The default judgement is local and comes before the PR. `/judge` (5.5) runs on the branch before `gh pr create`, writes the verdict of the current head, and `scripts/policy.sh` posts it as soon as the PR exists, with the same marker CI uses: the log, the audit and whoever reads the PR do not need to tell them apart. There is no cloud judge: since 0.16 the fallback of ADR-0001 has left the templates (ADR-0004), and a head without a verdict does not open a PR. The reason is not the cost but the feedback loop: a finding that arrives while the session that wrote the code is still open costs one commit, the same finding the day after costs a round of PR, and over the harness's first nine PRs the verdict always arrived afterwards (ADR-0001).

It runs once per PR, one pass per role, after the code (ADR-0003). The `high` and `medium` findings do not go back to the judge: the session that wrote the code fixes them, and each one gets an answer, the sha of the commit that closes it, with `scripts/judge.sh answer`. The verdict stays the judged commit's and the answers tie it to the commits that came after; the hook on `gh pr create` accepts the verdict of a commit that is an ancestor of the head, on the same branch and against the same base, when every `high` and `medium` finding has an answer, and it names the ones without. `policy.sh` posts the answers in the comment, one line per finding with the sha linked, and in the log. Whether the commit really closes the finding is not verified by a machine: it is verified by the audit, in Docket, with the verdict and the diff in front of it, and it is the thing the audit exists for. One more judgement, even restricted to the fixes, would cost a round, and the number of rounds is the thing to take away.

Even when the one who finds something is a human the judgement stays one. Whoever reads the open PR is the audit moved earlier, and their finding is worth as much for the calibration as one that slipped through: `scripts/judge.sh finding <severity> <file>[:<line>] <claim> [role]` writes it into the verdict that is there, marked `by: human`, and from there the chain reads it like one of the judge's. `have` and the hook keep the head out until every `high` and `medium` has its answer, `judge.sh answer` closes it with the sha of the commit, and the policy merges as at tier 1 and at tier 2. One difference only: the judge had its say before that finding existed, so an open human `high` or `medium` leads to `needs-human` whatever the verdict is, and the same holds for the other role's verdict at tier 2. A human `low` is a nit like the others and is declared in the PR. In the comment the severity carries the word `umano` next to it, and `review-log.sh` keeps `by` in the log: this is how the audit sees what the judge did not see, which is the data the log exists for. The command adds a finding, not a merge. The verdict sits in `.git/harness/` of the clone where `/judge` ran, so the command is launched there: anywhere else it says there is no verdict, and that is right.

It starts only with CI green, at tier 1 and 2, never at 0 and never at 3. The judge runs at clean context, has not seen the coder's reasoning, and receives artifacts only: the diff, the slice's file, `AGENTS.md`, `codebase-map.md`, the CI outcome. It verifies three things and nothing else: every acceptance criterion has a test and the test really covers it, not a tautology and not a mock; the diff stays inside the slice's scope; the conventions and the constraints of `AGENTS.md` are respected. Every finding carries file, line, claim and evidence, and without evidence it does not exist. Doubt escalates, it does not approve. It returns JSON (7.1), never free prose.

At tier 2 two judges run, one for correctness and one for security (injection, secrets, authorization on every new entry point, user data, external calls), once each and together. With two `approve`, or `request-changes` with all the findings answered, and no `high` open, the policy merges as at tier 1; with a `high` open, an `escalate` or a `needs_human` the human gets `needs-human` with `human_reason` at the top and reads two verdicts instead of a diff (ADR-0003).

The verdict travels as a single comment on the PR, in the order a human reads it: the line with role, tier, verdict, sha and `confidence`; the sentence of `reason`; if `needs_human` is true, `human_reason`, that is the decision the human has to take, as a question or an instruction with the options; the table of the criteria only when there is a slice, because the ids come from the slice's file and are compared across PRs, while without a slice the judge invents them and half of them repeat the gates; the findings with file and line; then, for the machines, the JSON in a `<details>` after the `<!-- verdict:<role> -->` marker; at the bottom what the policy did. The cost line is gone: the cloud judge read it from the action's log, and a local judgement carries none. The judge does not verify what a gate has already proved (`commitlint.sh`, `prose.sh`, `test-weakening.sh`, `tier.sh`, `pnpm audit`, gitleaks) and never reports a pass in prose: a criterion that holds is one line of `criteria` and nothing more. Before posting, `policy.sh` minimizes as outdated the previous verdict of the same role: the PR shows one live verdict per judge, and the log keeps them all with their `head_sha`. `policy.sh` writes it, `review-log.sh` reads it back for the log at closing time, the escalation puts it inside the notification. No table outside the repo is needed.

Before acting, `policy.sh` reads `head_sha` from the archived verdict, where `judge.sh` wrote it at the moment of archiving: it is the commit the judge saw. It stamps it again in the verdict together with the PR number and compares it with the PR's current head: if a push has arrived in the meantime that answers no finding, it does nothing and says so in the terminal, with the two shas, because nobody has judged that commit. A head that has moved means `/judge` on the new head, which brings its own judgement; no CI run brings one, because CI does not judge (ADR-0004). A verdict acts only on the commit it judged and on the commits that answer its findings (ADR-0003). The rule comes from CodeRabbit's approval conditions, which refuse when "the current pull request HEAD is not among the commits CodeRabbit reviewed" (6.3). A crash is not an escalation: with no verdict, or with invalid JSON, the PR receives `judge:<role>:crashed`, a comment that says to run `/judge` again on that commit and the notification, not `needs-human`. The comment links nothing, because there is no run to open: the judgement ran in a terminal, and the error is there. The difference matters because `needs-human` leads to tier 3 and at tier 3 the judge does not run: on PR #3 a passing 401 had taken the PR out of the loop forever, with CI green and no error anywhere. `tier.sh` ignores the crash label, so the tier stays what it was and the next `/judge` on that commit replaces the crash with a verdict. No judge action fails and no CI makes it run again: it is relaunched by whoever has the terminal, a person or `/next`. The crash comment is one per judged commit, with a `<!-- crash:<role>:<sha> -->` marker: a second crash on the same commit updates it, and that role's first successful judgement minimizes it as outdated together with the previous verdict, whatever commit it names, because it is the judgement that makes the crash old and not the head. The marker counts as a line, not as text inside a body: a verdict quotes the diff and a finding may quote a marker, and the live verdict of one judge must not disappear because the other has written its name. The first run on Tipoff ended with nothing on the PR (9.1); now it ends like this.

The notification leaves from `policy.sh`, which has the verdict in hand, at every escalation and at every crash: the body is `human_reason` and `reason`, never "no verdict yet". It no longer goes through the `labeled` event of `needs-human`, because GitHub does not emit an event for a label that is already there: on PR #3 the only notification that arrived was the crash one, and the real verdict of 16:06 warned nobody. For the same reason the policy never removes `needs-human` to put it back: the escalation state does not disappear even for an instant, and no CI in flight can read a lower tier. `escalate.yml` stays for the labels set by hand and filters bot actors, so nothing starts twice.

The tier says how much scrutiny is needed, not who may merge: they are two questions, and tier 0 used to answer both together with "nobody" and "the machine". The second one has a line of its own in `AGENTS.md`, "Gate umani", which names the human-merge paths. The `tier` job of CI turns it into the `human-gate` label; `automerge.yml` refuses that PR at tier 0 with CI green and `policy.sh` refuses it at tier 1 with `approve`, and in both cases they write it in the run's log and the PR gets `needs-human`, so the notification reaches whoever has to merge. The label adds itself and is removed only by hand: `tier.sh` keeps the one it finds on the PR, so a brake set by a person does not disappear at the next push. A spec sits this way at zero model scrutiny and at mandatory human merge, without the first thing dragging the second along. The two path lines, the sensitive ones and the gate, `tier.sh` reads from the base ref: on the `pull_request` event the checkout is the PR's copy, and the brake cannot sit inside the file the PR rewrites.

Policy, deterministic, in `scripts/policy.sh`:

| Tier | Judge's outcome                         | Action with `HARNESS_AUTOMERGE=on`                                                                             | With `off`                  |
| ---- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 0    | does not run                            | automatic merge with CI green, never with `human-gate`                                                         | nothing                     |
| 1    | approve                                 | squash merge with the App token, `--auto` if the repo allows it; with `human-gate` it is `needs-human` instead | comment "would have merged" |
| 1    | request-changes, answered               | like `approve`, with `answered` in the log                                                                     | comment "would have merged" |
| 1    | request-changes, open                   | `needs-human`, notification: the session did not answer a finding                                              | the same                    |
| 1, 2 | human finding open                      | `needs-human`, notification: the judge had spoken before                                                       | the same                    |
| 1    | escalate or `needs_human`               | `needs-human`, notification                                                                                    | the same                    |
| 2    | two approve or answered, no `high` open | squash merge as at tier 1; with only one verdict in, it waits                                                  | comment "would have merged" |
| 2    | otherwise                               | `needs-human` with `human_reason` at the top, human review                                                     | the same                    |
| 3    | does not run                            | human review, notification                                                                                     | the same                    |

The tier 2 line is the one of ADR-0003, which closes the decision postponed by ADR-0002: until 11 September every tier 2 ended at `needs-human` even with two judges in agreement, and on this repo the label had stopped saying anything. `fix-round` and the fixer of `fix.yml` no longer exist: the fixes are made by the session that wrote the code, before the PR (4.4), and the workflow left the templates with ADR-0004.

`HARNESS_AUTOMERGE` is a repo variable and is born `off`. On Tipoff it goes `on` from the first run of `/next` (ADR-0003): without it, `/next` opens PRs that wait for a click anyway, and the audit in Docket is the place where what the policy did is compared with what the human would have done. Off is for trying the chain without trusting it: the judge runs, the labels and the comments arrive, and every PR shows "would have merged". The first version of the switch covered the merge alone and let the fixer run, which pushed commits written by the agent onto the branch while calling itself "we are observing": fixed on 3 September. Off means the harness reports and the human acts, with no exceptions.

The judge that says "escalate" has to say why, and the why goes into the log: it is material for adding a deterministic rule at the next tuning.

### 4.7 Merge and close

Squash on main. At closing time, `close.yml` moves the slice to `done` (from the branch name it works back to the backlog file) and with `scripts/review-log.sh` appends to the log every verdict the judge left in the PR's comments, each with its `head_sha`, with the `outcome` filled in (`decided_by: policy` if whoever merged is a bot, otherwise `human`), and commits on main with `[skip ci]`. That commit is made with the token of a GitHub App, which the ruleset lets through (6.2). The deploy follows the project's pipeline (on Tipoff, Vercel).

A merge and a close count only on the default branch, whoever does the merging. A PR stacked on another slice is legitimate, and its merge closes nothing: `close.yml` moves the slice to `done` and appends the verdicts only if the PR's base is the default branch, read from the event because the template runs where it is called something else too, and when the base is another one it writes in the summary which PR it did not close and on which base, because a mute run cannot be told from one that never started. The line holds for every merge path of the chain, `automerge.yml` and `policy.sh`: a PR merged into the branch of another slice is not work that has arrived on the default branch. Without this line, on 14 September S12 went to `done` eleven seconds after the merge of a PR based on another slice, with the work not yet on main and the board calling it closed; `/next` reads that field to compute the waves (S14).

### 4.8 Audit

Every week, or every ten automatic PRs, the human picks three PRs merged without human eyes and reads them together with the verdict. The place where that happens is Docket (9.2): you drag `verdicts.jsonl` in, you scroll the queue, and for every verdict you say agree or not, issue missed yes or no, useless escalation yes or no, with a note on why. The calibration view answers the real question: from which tier up the judge can decide on its own, and whether its `confidence` means anything. The export rewrites `verdicts.jsonl` with the `audit` blocks inside, ready for a commit in `docs/review-log/`. The data sits in the browser and does not leave it.

From there the agent starts again: `/audit` aggregates the metrics (10) and proposes the changes to the thresholds as a PR on `AGENTS.md`, at tier 2, and opens slices for what it has found in the verdicts, in the PRs and in the runs and that is not a threshold: it is one of the three sources of the backlog (4.3), and those slices carry in `spec:` the reference to the PR or to the run. In a team the audit rotates among the people. It is the moment that replaces constant presence, and by construction it cannot be skipped: without the audit the judge is not tuned, `HARNESS_AUTOMERGE` stays off and trust stays a matter of feel.

### 4.9 Garbage collection

From OpenAI: background tasks that open maintenance PRs. Three jobs here, each one a PR at tier 1: `codebase-map.md` aligned with the code, implemented specs marked `superseded`, dead code and unused dependencies. The judge treats them like every other PR. The `gc.yml` workflow is not written yet: it arrives when there is enough code to make the map rot.

## 5. The skills

Seven skills in place of nine. The old tdd, commit-conventions and session-start/end are no longer skills: tdd is a rule in `AGENTS.md` plus the detector in CI, the commit conventions are a git hook, the session opens with the board (`/board`). Fewer skills, more checks. Every new skill archives the old ones it replaces; `workflow-init` is already in `~/.claude/skills-archive/`. Exception: `session-start` and `session-end` stay as long as there are projects without the harness, where they are still the way to open and close a session.

| Skill           | Replaces             | Trigger                     | Input                     | Output                             | State at 2026-09-04                           |
| --------------- | -------------------- | --------------------------- | ------------------------- | ---------------------------------- | --------------------------------------------- |
| `/harness-init` | workflow-init        | three phases, once per repo | repo                      | AGENTS.md, docs/, hooks, CI, judge | written, tried on Tipoff                      |
| `/spec`         | grill-me + write-prd | after the intent            | intent, codebase-map      | SPEC with status                   | to be written                                 |
| `/slice`        | prd-to-issues        | approved spec               | spec                      | slices, board                      | to be written                                 |
| `/next`         | afk-loop, tdd        | "prendi la prossima"        | board                     | branch, commits, PR                | to be written                                 |
| `/judge`        | the `--review`       | locally, before the PR      | branch                    | verdict.json                       | to be written, wrapper of `.github/judge/`    |
| `/audit`        | nothing              | after a round in Docket     | verdicts.jsonl with audit | report, tuning PR                  | to be written; the interactive part is Docket |
| `/board`        | session-start/end    | session opening             | backlog, open PRs         | state in one screen                | to be written                                 |

The writing order is `/spec`, `/slice`, `/next`, because the first real flow (the multi-writer slice of Tipoff, the harness on Docket) starts there, and the old grill-me, write-prd and prd-to-issues are not to be used as stopgaps: they produce a PRD instead of a SPEC and an `afk` flag instead of `human`, and the chain downstream would read the wrong files. Then `/judge`, `/audit`, `/board`.

### 5.1 `/harness-init`

Three idempotent phases, each one a `harness/<fase>` branch and a diff to review. Rerunning a phase updates what it owns and does not duplicate. On an empty repo the bootstrap from `stack.md` comes first: one question with a recommendation (Next.js or React + Vite, Python engine yes or no), then the framework's `create` command, TypeScript strict, Tailwind, Vitest, Prettier, the four single-run scripts, the README.

- **`local`.** It fixes `.gitignore` if it excludes `docs/`, `CLAUDE.md` or `.claude/` (keeping `settings.local.json` ignored): a harness ignored by git does not exist in CI. It writes `AGENTS.md` from the template compiled on the repo, `CLAUDE.md` with `@AGENTS.md`, `docs/` with `codebase-map.md` written by reading the code and the READMEs of the five folders, `.githooks/` with `pre-commit` and `commit-msg`, `scripts/commitlint.sh`, `scripts/ensure-hooks.sh` and `scripts/intent.sh`, the `prepare` script in `package.json`, `.claude/settings.json` tracked. Verification: the four commands, a wrong message refused, a test commit that fires the hooks.
- **`ci`.** The labels (`tier:0..3`, `human-gate`, `tests-weakened`, `needs-human`, `judge:<role>:<esito>`), `ci.yml`, `scripts/tier.sh` and `scripts/test-weakening.sh`, the PR template, the first structural test taken from a "Do not" line, the repo settings with `gh repo edit`, `.github/ruleset.json` applied with `gh api` when the plan allows it. If the structural test is red on the existing code it stays red and goes into the report: it is a finding, not a bug to fix here.
- **`judge`.** `.github/judge/prompt.md` and `verdict.schema.json`, the files `/judge` reads, `scripts/policy.sh` and `scripts/judge.sh`, `automerge.yml`, `escalate.yml`, `close.yml`. No workflow judges: the judge is the skill (5.5). It sets by itself the variables and the secrets it receives; the GitHub App is needed only when `HARNESS_AUTOMERGE` is turned on (6.2).

Fixed rules: never touch application code; what the repo already does wins over the defaults of `stack.md` (package manager, test runner, folder names); retrieval-led for everything that is GitHub, because the templates were written from memory and actions change inputs between one major and the next. Everything `gh` can do, the skill does: labels, variables, repo settings, secrets from the values the human pastes in. Before printing a command the `local` phase detects the GitHub plan: on a private repo on Free the rulesets answer 403 and are not even proposed.

The report fits one screen and always has the same shape: state before, what changed by theme with one line per file, findings, next phase. The human checklist arrives once, at the end of the `judge` phase, two items, the only ones that require the browser (the GitHub App, opening and merging the setup PR), each with the command in a block and one line of why; the ntfy topic is optional and the skill says so instead of asking for it. At the first setup the three phases land in a single PR from the last branch, to be merged by hand: the gates cannot watch over the PR that creates them. No manifesto: the harness is code and the diff is the documentation.

### 5.2 `/spec`

As in 4.2. Guardrails: one question per message, never in batches; every question with a recommendation; it pushes back on vague answers ("fast" is not a number); it keeps the list of open points; it stops when one more question would not change what gets built; the structural alternative is mandatory and goes into the document even if it is dropped, with the reason; the file is not approved until the human says so. On the yes, with `Documenti: su main`, a single commit on main with the confirmed decisions in the body, and the hand-back in three lines: the file, the sha, `/slice <spec>`. Nothing of the repo's harness is repaired from here: one line in `docs/inbox.md` and on (ADR-0003).

### 5.3 `/slice`

As in 4.3. It starts from an `approved` spec that sits on the default branch and has no slices yet. It reads the spec, `AGENTS.md`, the map and the modules touched, writes the slice files in the working tree, shows the board and asks one question, the one it is least sure about, with the recommendation, so that the yes confirms the whole board. On the yes a commit on main, `docs(backlog): <slug>`, with the board in the body, and the hand-back in three lines: the files, the sha, `/next`. With `Documenti: PR` it works on `backlog/<slug>` and opens the PR with the board in the body, and the merge is the review. Like `/spec`, it does not repair the repo's harness: one line in `docs/inbox.md` (ADR-0003). Guardrails: it refuses a spec with open questions; every criterion of the spec sits in one slice only, and none is added or lost; it tests every slice against the question "if only this one lands, does anything show?"; the first slice is always the skeleton; `blocked_by` only for real prerequisites; `human: true` by default on the listed cases; it writes slice files only and implements nothing.

### 5.4 `/next`

As in 4.4. The session that says "vai" is the orchestrator: it reads the board, takes the eligible slices in waves and for each one opens a subagent at clean context, Agent tool with `general-purpose` and Opus 5, never a fork, which receives `AGENTS.md`, the map, the slice's file and the guardrails below, and does the steps of 4.4. The waves come from `blocked_by` and from the touchpoints: inside a wave no path of "Touchpoints" appears in two slices, and when two eligible slices share one the one with the lower id stays in the wave and the other moves to the wave after, where it waits for the first to be `done` as it would wait for a `blocked_by`, for that run alone. The comparison is on the paths as written, the first backtick of every line, with `(nuovo)` and `(symlink nuovo)` ignored; a line without backticks does not count. The block of waves printed before the run says it with the path, `S22 dopo S21: skills/harness-init/templates/scripts/board.sh`. Before the wave the orchestrator creates the worktrees, one at a time, `git worktree add --no-track .claude/worktrees/S<NN> -b slice/S<NN>-<slug> origin/<default>` and `pnpm install --frozen-lockfile --offline` inside, and the subagent works only in that path: no command of its own runs in the shared checkout. `--no-track`, because without it git takes the starting point as the upstream of the slice branch, and in the worktree a bare `git pull` would merge the default branch and a bare `git push` would miss the slice; the right upstream is set by the first push of step 1, `git push -u origin slice/S<NN>-<slug>`, which is also the claim. The worktree is made by the orchestrator and not by `isolation: worktree` of the Agent tool, because the judge has to enter the same worktree as the coder and the path has to be known by whoever launches both. The judge, `gh pr create --head slice/S<NN>-<slug>`, `have` and `policy.sh` run from the worktree, because they read `HEAD`, and the verdict hook reads the head from `--head`, entering the worktree where that branch is checked out. The verdict sits in the common git dir, one per clone, and survives the worktree: `judge.sh answer` and `finding` on the open PR find it from any checkout of the branch. At hand-back `git worktree remove`, without `--force`, takes away the worktree of every slice of the run, merged, open or blocked, and the branch stays. Then the orchestrator runs `/judge` once per role, Sonnet 5 at tier 1 and Opus 5 at tier 2 (ADR-0002, decision 5), takes the findings back to the same subagent, which fixes and answers them, opens the PR and waits for the policy's merge and for the slice to close before the next wave, with a waiting cap beyond which it moves on and says so. An id or a slug as an argument runs that slice alone. The hand-back is one line per PR, link, tier, verdict in one sentence, state, plus "how to verify by hand" where the slice has manual steps; the questions of the blocked slices at the end. No retelling of the code: that sits in the body of the PR (ADR-0003; ADR-0002, decision 3).

The subagent's guardrails, non-negotiable: never modify a test to make it pass; no `.skip`, `.only`, widened matcher; mocks only at module boundaries; "done" means suite, typecheck, format and build green; commit only from green; one slice per subagent; no changes out of scope, and if one seems necessary a new slice is opened instead of making it; no repairs to the repo's harness, one line in `docs/inbox.md`; the prose named in the slice's touchpoints, `docs/spec.md`, the map, a `SKILL.md`, travels in the branch with the code and not on main, because the judge reads the touchpoints and the PR is the place where the change is whole. It stops a process by the PID it started, or by a pattern that names its own worktree path, never by one like `pkill -f vitest` that reaches the other checkouts, because the other slices of the wave run on the same machine and a suite killed from outside ends at exit 143 with no red case to read. If the test command is denied, it stops and says so: an agent that cannot run the suite cannot do TDD. Before opening the PR it runs `scripts/tier.sh` and `scripts/test-weakening.sh` and writes in the body of the PR what it expects.

### 5.5 `/judge`

The judgement of the chain, before the PR instead of after. A subagent at fresh context, never a fork of the session that wrote the code: a fork has read the plan, the attempts and the reasoning that produced the diff, and ends up approving its own work. Principle 7 holds here as it does on the server.

It receives one file and makes one pass. `scripts/judge.sh bundle` puts into it the repo's judge prompt (`.github/judge/prompt.md`), the verdict schema, the tier, the role, the outcome of the four commands and of the three local gates, `AGENTS.md`, `docs/codebase-map.md`, the slice's file when the branch names one, the commit messages and the diff against the base. No repo to explore, no questions back: that is where the cloud judge's cost went, twenty or thirty turns with half a million cached tokens read again at every round.

The outcome of the gates the script can run by itself, `tier.sh`, `prose.sh` and `test-weakening.sh`, it runs itself: the judge is under orders not to verify again what a gate has proved, and that order cannot rest on a line written by whoever is under examination. The project's four commands stay declared by the session, and the bundle marks them as such.

The bundle is material to judge, not instructions: the commits and the diff were written by whoever wrote the branch, and a line of diff can look like a delimiter or a protocol. The delimiters carry a random token for every run, which the material cannot know, and the header says that what is inside is only stuff to read. The judge writes one file, the verdict.

`scripts/judge.sh check` does locally what `--json-schema` did on the server: it validates the verdict against `.github/judge/verdict.schema.json` reading the rules from the schema itself, required fields, types (including where the schema declares more than one, which are the fields that admit null), enums, lengths, null and role, then stamps `head_sha` and `base_sha` and archives it under the git dir, one key per commit and per role. `base_sha` is written by it alone: if it arrives inside the verdict it is taken out, together with `head_sha`, `outcome` and `audit`, and before the validation, because they are fields of the chain and one written badly by the judge would block that role instead of getting lost. The base that `check` receives has to be the one the bundle of that head was built from, or the verdict would claim to cover a diff nobody read. A verdict belongs to a commit and to the base it was read against: a new commit wants a new one, a different base is a different diff, and the archive outside the tree never dirties the diff. At tier 2 the roles are two and run together; at tier 0 and 3 nothing runs, as on the server. Which roles are needed is said by `judge.sh roles`, one place only, because the skill and the hook have to give the same answer: a gate that at tier 2 settles for the correctness verdict makes the security judgement disappear, and `judge.yml` does not recover it, because it skips by role but that role was judged by nobody. `judge.sh required` tells three cases apart and not two: it judges, this tier does not judge, the tier could not be computed. The third one is not a green light, neither for the skill nor for the hook.

It does not modify files, does not comment, does not merge, and does not run a second time on the same PR: the findings go back to whoever wrote the code, who fixes them and answers them with `scripts/judge.sh answer <id> <sha>`, written in the archived verdict next to `head_sha` and `base_sha`, and `answers` is a field of the chain that `check` takes out if the judge writes it (ADR-0003). The verdict arrives on the PR when the PR exists, with `scripts/policy.sh` and the same marker CI uses, chained to `judge.sh have`: only what `check` has archived gets posted, and `path` on its own prints a path even when there is nothing inside. The model is a parameter of the skill, with the per-tier default of ADR-0002: Sonnet 5 at tier 1, Opus 5 at tier 2. If the prompt in the repo changes, the skill does not change: it is the reason the prompt sits there and not in `~/.claude`.

### 5.6 `/audit`

The interactive part is done by Docket (4.8). The skill reads the exported `verdicts.jsonl`, with the `audit` blocks filled in, aggregates the metrics (10), and proposes the new thresholds as a PR at tier 2 on `AGENTS.md` and, if needed, on `scripts/tier.sh`. It does not modify `AGENTS.md` directly. If the audits of the period are fewer than five it says so and proposes nothing: below that floor a rate is not a threshold.

### 5.7 `/board`

The screen is computed by a script, not by the skill: `scripts/board.sh`, bash 3.2 and jq, a template of the `local` phase. It reads the frontmatter of `docs/backlog/`, the `refs/remotes/origin/slice/*` refs, the lines of `docs/inbox.md`, the specs and the intents, the `## Ordine di lavoro` section of the last ADR that has one and the open PRs with `gh pr list`, and prints in forty lines the open slices with the count of the `done` ones at the top, the inbox, the open PRs by tier and judge outcome, what a human is waiting on, the step of the plan with the "oltre" mark when the backlog has passed it, and at the bottom the next action with its reason. A `todo` slice that has its branch on the remote is printed `in corso`: the claim of 4.4 is read from the refs, the frontmatter stays what it is, and in the JSON the slice carries the branch in `branch`, `null` when there is none. The script does not fetch, just as it does not read `docs/` from the remote: the screen is as fresh as the last fetch of whoever ran it. An empty section is one line that says so, and a `gh` that does not answer is `gh non disponibile`, not an error. What a human is waiting on is a closed list: the open PRs with one of the three labels, the draft specs, and the ADRs that an open slice names in `blocked_by`, one row per ADR with the ids of those slices and the title of its first heading, empty when the ADR has no file. The `## Blocked` section of a slice is never read and no condition is ever weighed: the board says the decision is due, a human says whether it is taken. With `--json` the same data is an object, `slices`, `prs`, `inbox`, `blocked`, `plan`, `next`, the model for every other reader. The next action is picked by a rule in fixed order, and the first one that fires wins: a PR waiting on a human, an eligible slice with the definition of `/next`, an approved spec without slices, an intent without a spec, the current step of the plan if the backlog has not passed it, otherwise the inbox. From a terminal the script costs no tokens and gives the same screen every time, and the rules can be tested only if a program applies them (SPEC-board).

The skill, personal in `~/.claude/skills/board` and never copied into the repos, runs `git fetch --prune origin`, runs the script, shows the output without summarizing it and repeats the last line. The `--prune` is part of the same rule: without it, a branch deleted on the remote would keep its slice `in corso` forever. It writes the rule in prose the same as the script's, with the pointer, so that whoever reads the reason knows what made it fire, and it does not apply it: two sessions, same answer. Then it reads the `Documenti` line of "Gate umani": with `PR` it stops after the screen, because in a team the inbox travels on a PR; with `su main` it asks one question for every open line of `docs/inbox.md`, one per message, with three answers and its own recommendation with the reason, and it stops at the answer.

- **Via.** It takes the line away, a commit on main, `docs(inbox): <why>`, and the push.
- **Slice.** It writes `docs/backlog/S<NN>-<slug>.md` with the id after the highest on main, `status: todo`, `spec: inbox (<date of the line>)`, the Goal from the line, criteria, test plan and touchpoints worked out by reading the files the line names, in the format of 4.3; it takes the line away, and slice and inbox go together in one commit on main, `docs(backlog): s<NN> from the inbox`, with the push, the id lowercase in the subject as `commitlint.sh` wants it and uppercase in the file name. The slice is eligible right away.
- **ADR.** After the lines of the inbox, one question for every entry of `blocked`: the id and the title of the ADR, the ids of the slices it holds, the sentence of each `## Blocked` quoted as it is, and one line of the skill's own reading of the repo today, declared as its own, with the paths it comes from. On the yes the ADR comes out of `blocked_by`, `none` takes its place in a field where nothing else is left, the `## Blocked` sections go, and the slices travel in one commit on main, `docs(backlog): take ADR-<nnnn> out of blocked_by`, with the push; on the no nothing is written and the next board asks again. The decision stays the human's, the edit stops being made by hand.
- **Intent.** It runs `scripts/intent.sh new <slug>`, takes the line away with a commit on main and stops: the ten lines are written by the human, and `intent.sh open` makes the commit of the intent. It is the only answer the skill does not close by itself, and it has to stay that way.

One answer, one commit, no half state: the board run again no longer shows the line. A line that names more than one thing gets one answer only, and the skill proposes splitting it by hand first. It writes only in `docs/inbox.md`, in `docs/backlog/` and the skeleton of `intent.sh new`: never code, never a spec, never `AGENTS.md`, and it does not touch the rest of the board. It does not repair the repo's harness, like the other skills: one line in `docs/inbox.md` (ADR-0002, decision 6; ADR-0003).

## 6. Hooks, ruleset, workflows

### 6.1 Local hooks

The checks on commits sit in the repo's git hooks, not in Claude Code's hook. The reason: they hold for whoever commits, human or agent, with or without my tool, and a `PreToolUse` that blocks a `git commit` has no equivalent for whoever opens the terminal. Two files in `.githooks/`, turned on by `"prepare": "git config core.hooksPath .githooks"` in `package.json`, so that every `pnpm install` installs them:

- `pre-commit`: it refuses commits on `main`, except a commit of documents alone when the `Documenti` line of "Gate umani" says `su main`: every staged file sits in the paths of the "Merge umano per path" line, read the way `tier.sh` reads it, otherwise the refusal names the first file outside (ADR-0003). Then Prettier on the staged files alone, the gate on the prose, `typecheck`. Under thirty seconds, otherwise it moves to CI. The whole suite sits in CI and in the discipline of `/next`.
- `commit-msg`: `scripts/commitlint.sh --file`, one regex for the subject (`^(feat|fix|chore|docs|style|refactor|test|perf|revert|build|ci)(\([a-z0-9-]+\))?: (/[a-z].{0,69}|[a-z].{0,70})[^.]$`), second line empty, attribution trailers refused. Locally `wip` is allowed too; in CI the same regex, without `wip`, runs on every commit of the PR. The `build` and `ci` types were missing in 0.1: the hook claimed them by refusing the commit that added the workflow.
- `pre-push`: it refuses pushes on `main`, with the same exception as `pre-commit` applied to the files touched by the commits of the push. Together they are the local twin of the ruleset, for the repos that cannot have one. `HARNESS_ALLOW_MAIN=1` overrides both, for a human who knows why. The merge goes through `gh pr merge`, which does not cross these hooks.

Claude Code's hooks are two, on the same `PreToolUse` on `Bash` in `.claude/settings.json`, tracked. `scripts/ensure-hooks.sh`: if the command is a `git commit` and `core.hooksPath` is not set, it sets it. It never blocks on its own, the checks are done by the git hooks. `scripts/ensure-verdict.sh`: if the command is a `gh pr create` and the current head does not have, for every role the tier asks for, a verdict judged against the PR's base, the PR does not open, and the reason for the refusal says which one is missing, or which one was made against another base, and to run `/judge`. The verdict of a commit that is an ancestor of the head on the same branch also counts, as long as every `high` and `medium` finding has an answer: the refusal then names the findings without an answer and says to answer or fix, never to judge again (ADR-0003). In the harness repo this hook is not there: its PRs are not judged by default, `/judge` runs on request as an audit. It is the only rule of the chain without a twin in a git hook, because opening a PR does not go through git, and it is deliberate: the rule sits in the hook and not in the model's memory, which at a new session does not have it. It blocks only where the judge would run anyway: without `scripts/tier.sh` or without `.github/judge/` the chain is not there, and at tier 0 and 3 nothing is judged, so the hook keeps quiet. A tier that cannot be computed is a refusal, not a green light: a gate that does not know and lets through is worse than one that stops and says so. It recognizes the command in command position and not a mention, because the same string inside a heredoc or between quotes is prose: a hook that stopped on that too would block the writing of the file that documents it. Command position includes the keywords that introduce one, the wrappers that launch one and the absolute path of `gh`. Without `jq` the hook reads the raw payload instead of giving up: it can only be more zealous, never less. In the same file sits the allowlist of the commands the agent may run without asking: the project's four commands, `git status/diff/log/add/commit/switch/push`, `gh pr`, `gh label`, `gh run`, and the scripts that read or prepare, `tier.sh`, `test-weakening.sh`, `commitlint.sh`, `prose.sh`, `judge.sh`. Not `policy.sh`: that one comments as the chain, sets the labels and with automerge on it merges, so it asks every time. Personal exceptions go in `settings.local.json`, ignored.

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/scripts/ensure-hooks.sh" }]
    }]
  },
  "permissions": {
    "allow": ["Bash(pnpm typecheck*)", "Bash(pnpm test*)", "Bash(pnpm format:check*)", "Bash(pnpm build*)", "Bash(git status*)", "Bash(git diff*)", "Bash(git log*)", "Bash(git add*)", "Bash(git commit*)", "Bash(git switch*)", "Bash(git push*)", "Bash(gh pr *)", "Bash(gh label *)", "Bash(gh run *)", "Bash(scripts/tier.sh*)", "Bash(scripts/test-weakening.sh*)", "Bash(scripts/commitlint.sh*)"]
  }
}
```

### 6.2 Ruleset on main

When the plan allows it. The reason for wanting it even alone is that whoever commits is an agent, and the branch per slice is what makes the judgement possible. The `.github/ruleset.json` file is the input of `gh api`: PR required with zero reviews required, `ci` as the required status check with a strict policy (the branch has to be up to date), linear history, no force push, no deletion. Alongside, `gh repo edit` for squash-only, auto-merge enabled, branch deleted after the merge.

On a private repo on GitHub Free none of this exists: the rulesets API answers 403 ("Upgrade to GitHub Pro or make this repository public"), and the same holds for branch protection and for auto-merge. Tipoff is in this situation and the choice of 2026-09-04 is not to move to Pro: main is protected by the `pre-commit` and `pre-push` hooks (6.1), which hold for whoever has run `pnpm install`, and the policy merges directly after CI is green instead of queueing with `--auto`. The hole that remains is a push on main from a machine without hooks. If it happens, the decision is reopened (11).

Two things write without going through a human PR: `close.yml`, which commits the slice at `done` and the log on main; the policy, which merges. Neither of the two can use `GITHUB_TOKEN`: GitHub does not start workflows for the events generated by that token, so a merge made that way would not fire `close.yml`, and the loop would stop with an error nowhere. A GitHub App is needed: `contents: write` and `pull-requests: write`, the id in the `HARNESS_APP_ID` variable (it identifies the app, it is not secret, and the `secrets` context cannot be read in a step `if`), the private key in the `HARNESS_APP_PRIVATE_KEY` secret. With a ruleset the App goes among the `bypass_actors`, otherwise `close.yml` cannot commit; without a ruleset `close.yml` falls back on the default token and works all the same. The App is therefore needed only when `HARNESS_AUTOMERGE` is turned on, and until then it blocks nothing.

In a team: one review required for tier 2 and 3, `CODEOWNERS` on the sensitive paths written from the list in `AGENTS.md`, a merge queue beyond two people.

### 6.3 Workflows

| File            | Trigger                                                | What it does                                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`        | `pull_request`                                         | the gates of 4.5, then `tier.sh` which writes the label; the `ci` job is the only required check                                                                                                                              |
| `automerge.yml` | `workflow_run` of ci concluded successfully            | with `HARNESS_AUTOMERGE=on` and the `tier:0` label: squash merge with the App token, `--auto` if the repo allows it, direct otherwise. On the CI run and not on the label, because the label arrives before the `ci` job ends |
| `escalate.yml`  | `needs-human` or `judge:*:crashed` label set by hand   | ntfy notification with the last verdict inside; the escalations and the crashes of the chain notify from `policy.sh`, and the bot actors are filtered                                                                         |
| `close.yml`     | `pull_request` closed and merged on the default branch | slice to `done`, verdicts from the comments to the log with `outcome`, commit on main with `[skip ci]` via the App; a different base closes nothing and writes it in the summary                                              |
| `gc.yml`        | weekly cron                                            | the three jobs of 4.9; to be written                                                                                                                                                                                          |

The judge is `/judge` (5.5): a subagent at clean context that receives the bundle of `scripts/judge.sh` and writes a verdict, validated against the schema by `judge.sh check`. Until 0.15 the fallback was `claude-code-action` in `judge.yml`, with `--json-schema`, `structured_output` and the cost read from the `execution_file`: it left with ADR-0004, and `policy.sh` keeps for now the branch that recognizes the GitHub Actions environment without anyone calling it from there. The two alternatives of 0.1 stay closed: the approval of Copilot code review is a net in parallel, not the judge, because its verdict is not structured our way and does not end up in the log.

CodeRabbit, read on 4 September, leads to the same conclusion with more force. It presents itself as "the control layer for software change" and it is the L4 judge sold as a service, with a piece of L1 (Plan, Agent Handoff) and of L6 (Learnings, reports). Its Issue Assessment verifies exactly `criteria` and `scope_ok`: "Verify PRs address linked issues without containing out-of-scope changes", with the outcome Addressed, Not addressed or Unclear. It does not cover the gates: the Custom Checks run in a read-only sandbox that "cannot run test suites, access build artifacts, execute repository code", so 4.5 stays ours and the order "gate first, judge second" cannot be imposed. It does not have the audit of 4.8: the Learnings are preferences in prose in the vendor's database, and the metrics count the suggestions accepted, not the judge's agreement with a human by tier and confidence. On private repos it is paid per developer, with a review cap per hour; on public ones it is free. It approves but does not merge, and the approval counts only with branch protection, which a private repo on Free does not have. It stays a net in parallel, then, like Copilot. Two things come in from it: the rule about the sha (4.6) and the shape of the Custom Checks, one criterion per check with the outcome Passed, Failed or Inconclusive "with reasoning", which is the shape of `criteria[]`.

No Claude token on the server: the judge runs in the terminal with the subscription of whoever launches it. Everything the human sets by hand, and that `/harness-init judge` prints at the end:

| Name                      | Type            | For                                                                      |
| ------------------------- | --------------- | ------------------------------------------------------------------------ |
| `HARNESS_APP_PRIVATE_KEY` | secret          | the policy's merge, `close.yml`'s commit; needed only with the switch on |
| `NTFY_TOPIC`              | secret          | escalation; optional, empty notifies nobody                              |
| `HARNESS_APP_ID`          | variable        | the same, it identifies the App                                          |
| `HARNESS_AUTOMERGE`       | variable, `off` | the switch of the autonomous actions                                     |

### 6.4 Structural tests

Where the prose of `AGENTS.md` says "non fare", a check enforces it. The choice is a normal Vitest test, `architecture.test.ts`, in the project's test folder: it walks the domain folder and fails on every forbidden import, with the file and the reason in the message. No dependency-cruiser: it is one more dependency for something twenty lines do, and a test runs in the suite that is already there, locally as in CI, without a dedicated job. On Tipoff the first rule is that `src/lib/engine/**` does not import React, `src/state/` or `src/components/`, and it is green on the current code. Every new rule is born from a violation seen in the review log, and it is written by having the agent write it.

## 7. Verdict and tier

### 7.1 The verdict schema

The truth is `.github/judge/verdict.schema.json` in the repo: the action imposes it on the judge and `policy.sh` refuses invalid JSON with an escalation, never with a merge. In readable form:

```json
{
  "pr": 42,
  "slice": "S03",
  "head_sha": "47f76d691afaeaf5e63154b5d102b01f33d9e006",
  "base_sha": "6f99601f0f7b4a8b5e6c3d2a1b0c9d8e7f6a5b4c",
  "tier": 1,
  "judge": { "role": "correctness | security", "model": "...", "ts": "2026-09-10T14:02:00Z", "where": "local" },
  "verdict": "approve | request-changes | escalate",
  "confidence": 0.0,
  "criteria": [ { "id": "AC1", "covered_by": "src/lib/__tests__/x.test.ts", "ok": true, "note": "" } ],
  "findings": [ { "severity": "high | medium | low", "file": "src/state/sync.ts", "line": 88, "claim": "...", "evidence": "...", "by": "judge | human" } ],
  "scope_ok": true,
  "needs_human": false,
  "reason": "one sentence, 240 characters",
  "human_reason": "only with needs_human: the decision the human has to take",
  "cost": { "turns": 12, "duration_ms": 41234, "cost_usd": 1.1, "input_tokens": 30, "cache_creation_input_tokens": 49917, "cache_read_input_tokens": 538470, "output_tokens": 13536 },
  "outcome": { "decided_by": "policy | human", "action": "merged | changes | closed", "ts": "" },
  "audit": { "agree": null, "missed_issue": null, "useless_escalation": null }
}
```

`slice` is null for the PRs without a slice (harness, maintenance): the judge then verifies that the body of the PR says what changes and that the diff matches. `high` means the PR does not merge as it is, `medium` should be fixed but could pass, `low` is a nit and at most three come in. `pr`, `head_sha` and `judge.where` are stamped by `policy.sh`, which removes a `cost` written by the judge; `base_sha` is stamped by `judge.sh check`, the only one that knows which base the bundle was built against, and it removes the one the judge wrote: either the field comes from the chain or it is not there. The PR number is not written by the judge because `/judge` runs before the PR exists: having to write it would mean inventing it, and an invented number ends up in the comment and in the log. The sha comes from the verdict itself, which `judge.sh` archived; `where` is only `local`, because since ADR-0004 the only judge is `/judge` in the terminal, and the line at the top of the comment shows it; `cost` is stamped by nobody: the cloud judge read it from the `result` message of the action's `execution_file`, and a local judgement carries none, because it comes out of the subscription's quota and not out of an action. `outcome` is written by `close.yml`, `audit` by Docket. `by` on a finding is optional and absent means `judge`: it is written by `judge.sh finding` when a human adds what they found reading the open PR, and `judge.sh check` removes it from the verdict the judge hands over. The judge touches none of the seven, nor `by`. The line is complete only after all of them.

`cost` also carries `cache_creation_input_tokens` and `cache_read_input_tokens`: the real input tokens are the sum of the three, and on the first verdict of PR #3 they were 588k against the 30 of `input_tokens`. The cost line the comment printed while the judge ran in the action summed the three; a local judgement carries no cost, and the comment no longer has that line. 0.4 said that with the subscription token `cost_usd` is zero: PR #3 proved the opposite, the action reports the list price even so, and that number is the one the audit uses to decide the thresholds. Only the verdicts written by the chain go into the log, that is by the App or by `github-actions`, or by an owner or member of the repo: the marker says where the JSON is, not who produced it, and on a public repo anyone can comment. Docket still has to learn `head_sha`, `base_sha` and `cost`: its export rewrites the lines in the order of the schema from a fixed list of keys, and today it would lose them (9.2).

### 7.2 Computing the tier

Starting values, in `scripts/tier.sh`. They are touched only after an audit. Lines and files are counted without the lockfile, without `*.tsbuildinfo` and without `dist/`.

| Signal                                                                                                                                          | Effect       |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Only prose that nobody executes: `docs/intent/**`, `docs/specs/**`, `docs/backlog/**`, `docs/decisions/**`, `docs/review-log/**`, at any length | tier 0       |
| No file at all, or only `*.md`, `docs/**`, `*.txt`, `LICENSE`, and <= 20 lines                                                                  | tier 0       |
| `AGENTS.md` and `CLAUDE.md` at every level, `.claude/**`, the map, the `Mai tier 0` line of `AGENTS.md`: prose that an agent executes           | never tier 0 |
| <= 200 lines changed, <= 8 files, no other signal                                                                                               | tier 1       |
| > 200 lines or > 8 files                                                                                                                        | tier 2       |
| A sensitive path touched (the `Path sensibili` line of `AGENTS.md`)                                                                             | tier 2       |
| `.github/**`, lockfile, dependencies changed in `package.json` or `pyproject.toml`                                                              | tier 2       |
| A path that smells of migration or schema (`*migrat*`, `*schema*`, `prisma/`, `drizzle/`)                                                       | tier 2       |
| A box ticked in the PR template                                                                                                                 | tier 2       |
| Slice `human: true`, at the base ref or in the branch (from the branch name to the backlog file)                                                | tier 3       |
| `tests-weakened` or `needs-human` label; `judge:<role>:crashed` does not count, the next CI judges again                                        | tier 3       |

The tier is the maximum among the signals. The script prints it, the reasons go to stderr, so that locally you see why.

The `Path sensibili`, `Mai tier 0` and `Gate umani` lines are read by the script from `AGENTS.md` at the base ref, not from the PR's checkout, and the slice's `human` flag is read both there and in the branch: a PR does not widen the rules it is judged by. The human gate is not a tier: for every file under a path of the `Gate umani` line the script prints `human-gate: <file>` on stderr, the `tier` job turns it into the label, and neither `automerge.yml` nor `policy.sh` merges a PR that carries it, not even at tier 0. If the label is already there the script prints it again (`human-gate: kept from the label`): it is removed only by hand. If `AGENTS.md` is missing at the base ref the lists are empty, except for the floor of the contracts, and the script goes up to tier 2 instead of staying at 0 or 1: with no rules it closes, it does not open. How much scrutiny is needed and who may merge stay two separate questions.

## 8. Alone and in a team

|                         | Alone                                            | In a team                                                                                               |
| ----------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Gate roles              | all me, but the gates stay written               | product owner (intent), tech lead (spec), engineer (plan), code owner (merge), release manager (deploy) |
| Documents               | global CLAUDE.md, stack.md, short AGENTS.md      | AGENTS.md is the contract; personal preferences stay outside the repo; stack.md promoted inside         |
| Board                   | files in docs/backlog                            | GitHub Issues with labels and "blocked by"; the files are optional                                      |
| Claim                   | the branch                                       | the branch, and the issue assigns itself from the branch                                                |
| Ruleset                 | PR and `ci` check required                       | plus one review for tier 2 and 3, CODEOWNERS, merge queue                                               |
| GitHub App              | mine, installed on the repo                      | the organization's, installed on the repos of the chain                                                 |
| Who merges tier 2 and 3 | me, on a notification                            | the code owner of the path, on a notification                                                           |
| Conventions             | git hooks                                        | git hooks plus commit lint in CI, PR template mandatory                                                 |
| Audit                   | me, three PRs a week, in Docket                  | by rotation, same list, same Docket                                                                     |
| Documents               | commit on main, `Documenti: su main`             | PR merged by the role, `Documenti: PR`                                                                  |
| Changes to the harness  | prose on main; scripts, hooks, workflows in a PR | PR at tier 2 with the tech lead's review: the harness is code                                           |
| Escalation              | ntfy to me                                       | the team's channel, with the verdict in the message                                                     |

The real difference is one: in a team the rules have to hold for whoever does not use my tool, so every rule that alone lives in `.claude/` has to have a twin in CI, in the hooks or in the ruleset. Moving the hooks from `PreToolUse` to `.githooks/` is exactly that, done early.

## 9. Application: Tipoff and Docket

The plan is applied in parallel to two repos, and the sessions open in their folders, not in the vault: the vault's `CLAUDE.md` limits writes to `wiki/`. The Claude Code sessions on the two repos run with Opus 5; Fable stays for specs and audits, where judgement counts more than speed.

### 9.1 Tipoff at 2026-09-04

Repo `elrumordelaluz/statsketball`, project `tipoff`, in `~/Projects/Frame/statsketball`. Vite, React 19, TypeScript strict, Tailwind 4, i18next, Yjs with y-partykit; server in `party/main.ts`; deploy on Vercel. The three phases of `/harness-init` landed on three branches pushed one on top of the other, `harness/local`, `harness/ci`, `harness/judge`, and they are on `main` since 4 September with PR #1.

- `harness/local`: `.gitignore` fixed (it tracks `AGENTS.md`, `CLAUDE.md`, `docs/`, `.claude/settings.json`; it ignores the rest of `.claude/`), `AGENTS.md` with the map of seven modules and the project's five rules, `CLAUDE.md` with two lines on the processes for local dev, `docs/` with the map and the READMEs, the design brief left in `docs/scoring-view-brief.md`, `.githooks/`, `scripts/commitlint.sh` and `ensure-hooks.sh`, the `prepare` script, `.claude/settings.json`. A `style` commit ran Prettier over the whole tree, otherwise `format:check` would never have been green, and the generated files left the check.
- `harness/ci`: `ci.yml`, `tier.sh`, `test-weakening.sh`, the structural test on the engine, `ruleset.json`, the PR template. The commit lint claimed the `build` and `ci` types.
- `harness/judge`: `.github/judge/`, `judge.yml`, `policy.sh`, `automerge.yml`, `fix.yml`, `escalate.yml`, `close.yml`, with the two fixes of 3 September (App id in a variable, fixer behind the switch). The actions are at the majors verified that day: `checkout@v7`, `pnpm/action-setup@v6`, `create-github-app-token@v3`, `claude-code-action@v1`.

On the server side, verified again on 2026-09-04 in the afternoon: PR #1 from `harness/judge`, with all three phases and CI green over six jobs plus the two Vercel checks, was merged with squash at 11:41 UTC. The harness is on `main` and the `workflow_run` workflows are active. PR #2, from `harness/hooks`, is the first one through the chain: it carries the hooks with the refusal of commits and pushes on main, `automerge.yml` on the CI run and the merge with the App token, and it is at tier 2 because it touches `.github/`. On it the judge ran for the first time and failed: the action closed with `is_error: true` after one turn and two seconds, with no tokens spent, and reported only "--json-schema was provided but Claude did not return structured_output", with the model's output hidden by default. An error before the first turn smells of authentication or of the model, but the log does not say. The PR received neither a label nor a comment, which is the worst way to fail (4.6). The eleven labels are there, with the descriptions in Italian. Variables: `HARNESS_AUTOMERGE=off`, the two models at `claude-opus-5`. Secret: `CLAUDE_CODE_OAUTH_TOKEN`. The GitHub App and the ntfy topic are missing, and they are not needed while the switch is off. Ruleset: not available (6.2). No data on the tokens.

### 9.2 Docket

`~/Projects/react/verdicts`, name `docket`, a single commit of 2026-09-03, remote `elrumordelaluz/verdicts` configured and nothing pushed. React 19, Vite, Tailwind 4, Vitest, oxlint, `clsx` and `tailwind-merge`. No file of the harness: no `AGENTS.md`, no `docs/`, no hooks, no workflows. The plan of 3 September called for six or seven slices built with the harness; it went differently: v0 was written in one go from the first prompt and already makes the whole round of 4.8. The little interaction the author saw was not the harness working: it was the harness not being there. It imports `verdicts.jsonl` or a JSON array by drag and drop or paste, lists the broken lines with their number instead of dropping them (an invalid line means the judge or `policy.sh` broke, and that is exactly what a board has to show), scrolls the queue from the keyboard (`j`/`k`, then `a`, `d`, `m`, `u` and a note), has the calibration view with the rates in grey below five audits, and exports the file with the `audit` blocks in the order of the schema, so that the diff in `docs/review-log/` is made of audits alone. Importing again never costs an audit: the judge's line comes from the file, the `audit` block stays the local one. With 0.4 the verdict has two more fields, `head_sha` and `cost`, which `toJsonl` has to keep and the view can show: the cost per PR and per tier is the first number that was missing.

The dogfooding changes shape: not "build Docket with the harness" but "set the harness up on Docket as an existing repo" (`/harness-init local`, then `ci`, then `judge`) and put every change after that through it, starting with the ones use will reveal. It is the case "existing repo with code but no harness", different from Tipoff only in age.

### 9.3 The path

The three evenings of 0.1 correspond to the three phases of `/harness-init` and on Tipoff they are done, on the branches. What remains, in order:

The order has changed three times, and every time an ADR says why: ADR-0001 finished the lower part here, ADR-0002 put the upper part before the maintenance, ADR-0003 takes away the ceremony and puts `/next` before `/board`. On this repo `judge.yml` has been off since 8 September and since the 15th it no longer exists (ADR-0004).

1. Done: the three phases of `/harness-init`, the templates under git, the verdict in one sentence, the crash separated from the escalation, the tier separated from the merge, the check that keeps `.github/workflows/` equal to the templates (S04), `/judge` local with the hook, `/spec` and `/slice` tried on Tipoff with esc-key.
2. S09: the documents on main, with the hooks reading the `Documenti` line.
3. S10: `/spec` and `/slice` that commit on main.
4. S11: the judge once, with the answers to the findings and the tier 2 line that merges.
5. S12: `/next`, with "vai" and the model per tier.
6. S13: the skills that do not repair the harness, `docs/inbox.md`, this repo without the verdict hook.
7. Tipoff ready: the three phases of `/harness-init` rerun from the harness's main, `HARNESS_AUTOMERGE=on`, `/slice` on `SPEC-esc-key.md`, `/next` with "vai" up to two PRs merged by the policy. Then the audit in Docket with Fable, `/board`, and `/audit` after the first month.

### 9.4 What to measure

The metrics of 10 over Tipoff's first twenty PRs. Plus two things only to understand whether the judge is worth it: how many tier 1 PRs I would have merged blind anyway, and how many times the judge found something I would not have read.

### 9.5 First use

Three things the author said on 2026-09-04, after the first evening on the two repos. On Tipoff too many commands to run by hand, spread over three reports, with no thread: partly by choice, because everything that touches the account was left to the human, partly because the allowlist of the commands arrived with the `local` phase and before that every `gh` asked for permission. On Docket almost no interaction, which looked like a merit and instead was the absence of the harness. In general answers too long, where the reader loses the commands and does not understand what they are for; in a team that reader will not always be whoever wrote the skill. The correction is in 5.1: the skill does everything it can do, the human checklist is one and arrives at the end, the report fits one screen. The principle does not change: you step in when it is worth it, and the setup has to be one intervention, not fifteen.

## 10. Metrics

| Metric              | Definition                                                    | What it says                                                                                  |
| ------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Judge agreement     | audits with `agree: true` over the total audited              | whether the judge reasons like me                                                             |
| Issues missed       | `missed_issue: true` over the total audited                   | what the automatic merge costs                                                                |
| Useless escalations | `useless_escalation: true` over tier 2 and 3                  | how much human time is wasted                                                                 |
| Calibration         | agreement by `confidence` band and by tier                    | whether the confidence means anything, and from which tier up the judge can decide on its own |
| Automatic share     | PRs merged by the policy over the total                       | how strategic the presence really is                                                          |
| Fix rounds          | average rounds per PR with `request-changes`                  | whether the coder understands the findings                                                    |
| Spec-to-merge       | hours from the spec's approval to the merge of the last slice | the throughput of the whole chain                                                             |
| Blocked slices      | `status: blocked` over the total                              | whether the specs are clear enough                                                            |

Below five audits a rate is shown but not used: Docket keeps it in grey and `/audit` proposes nothing.

## 11. Open decisions

- The judge's model: it is per tier, Sonnet 5 at tier 1 and Opus 5 at tier 2, written in the skills because it is the Agent tool that receives it (ADR-0002, ADR-0004). It stays open whether a model different from the coder's counts or clean context is enough: the audit over Tipoff's first twenty PRs will say.
- Lines or files as the size metric: both are in the table; the audit will say which one predicts better.
- Board in files or in Issues even alone: the files are enough, but Issues give the notifications for free.
- The verdict carried in a comment on the PR: it works and requires nothing outside the repo, but a comment can be edited or deleted. Alternatives: an artifact of the workflow, or the output of a check run. To be changed only if it happens. With `head_sha` inside, an old comment is no longer ambiguous: you know which commit it refers to.
- Where `verdicts.jsonl` lives in a team: in the repo it conflicts under a merge queue, and `close.yml` commits on main with an actor that skips the PR. The alternative is a table outside, or Docket reading the comments through the API.
- Who writes the tuning PR: the position is that Docket exports and the skill writes, because a PR needs to read `AGENTS.md` and `tier.sh`, and Docket is static and does not touch the repo. To be confirmed at the first audit.
- The tools of the local judge. It runs as a general-purpose subagent, so with Bash and Write, and its only input is text written by whoever wrote the branch: the commits and the hunks of the diff. The security judge raised it twice. The position, decided on 8 September: it stays this way, because the only read-only agent available reads by excerpts and declares that it does not do review, and a judge that reads half a bundle issues a verdict just as sure of itself, which is a worse failure than the one being avoided. The defenses are the random token on the delimiters and the framing in the header, which cover the forging of the delimiters and not obedience to an instruction. It reopens when a read-only agent exists that reads a whole file, or at the first real attempt.
- `/next` headless: is it really needed, or is the interactive one with "vai" plus the PRs of GitHub's coding agent enough. To be decided after Tipoff.
- Main locked on personal projects too: the position was yes, but on a private repo on Free it cannot be done without paying. Decided on 2026-09-04: local hooks, no Pro, private repo. Since 11 September the hooks let the documents alone through (ADR-0003); the code stays blocked. It reopens if a push on main escapes the hooks or if the policy's direct merge turns out to be fragile.
- Closed on 11 September with ADR-0003, after ADR-0002 had postponed it: at tier 2 two `approve` or answered with no `high` open merge, and `HARNESS_AUTOMERGE` goes `on` on Tipoff from the first run of `/next`. It reopens with the numbers of 10 if the audit finds an issue missed at tier 2.
- A UI of our own in place of CodeRabbit. The position is that the chain already produces all the artifacts (labels, comments with a marker, `verdicts.jsonl`) and the UI that is needed is a reader, not a control plane: Docket reading open PRs, labels and comments with a verdict from GitHub through the API, static, with the token in the browser, and it becomes `/board` with one screen and the calibration view next to it. No backend until we are in a team, where the store falls under the decision about `verdicts.jsonl`; no review UI, because the PR page already exists; no Learnings, because `AGENTS.md` and the rule "two violations, one check" do better. To be decided after the first audit, with the numbers of 10 in hand.

## 12. Sources

The pages clipped in the vault have a wiki page with the same title; the URLs stay here.

- OpenAI, Ryan Lopopolo, "Harness engineering: leveraging Codex in an agent-first world", 2026-02-11. https://openai.com/index/harness-engineering/
- Simon Willison, "Vibe engineering", 2025-10-07. https://simonwillison.net/2025/Oct/7/vibe-engineering/
- Andrej Karpathy, "Sequoia AI Ascent 2026", 2026-04-30. https://karpathy.bearblog.dev/sequoia-ascent-2026/
- Anthropic, "The AI-native SDLC playbook", 2026-08-21. https://claude.com/blog/the-ai-native-sdlc-playbook
- Dex Horthy, HumanLayer, "Advanced context engineering for coding agents", 2025-08. https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/ace-fca.md
- Geoffrey Huntley, "Ralph Wiggum as a software engineer", 2025-07-14. https://ghuntley.com/ralph/
- zolty.systems, "LLM review and fix in GitLab CI", 2026-06-15. https://blog.zolty.systems/posts/2026-06-15-llm-gitlab-ci-mr-review-fix/
- First AI Movers, "AI pull request auto-merge: enterprise guide", 2026-05-03. https://radar.firstaimovers.com/ai-pull-request-auto-merge-enterprise-guide-2026
- GitHub changelog, "Copilot code review can now approve pull requests", 2026-09-01. https://github.blog/changelog/2026-09-01-copilot-code-review-can-now-approve-pull-requests/
- CodeRabbit, documentation and pricing read on 2026-09-04: Request Changes Workflow, where the rule about the sha comes from (https://docs.coderabbit.ai/pr-reviews/request-changes-workflow), Custom Checks (https://docs.coderabbit.ai/pr-reviews/custom-checks), Pre-Merge Checks (https://docs.coderabbit.ai/pr-reviews/pre-merge-checks), Learnings (https://docs.coderabbit.ai/knowledge-base/learnings), plans (https://www.coderabbit.ai/pricing).
- GitHub docs, "Automatic token authentication", for the rule that the events generated by `GITHUB_TOKEN` do not start workflows. https://docs.github.com/en/actions/security-guides/automatic-token-authentication
- `anthropics/claude-code-action`, `action.yml` read on 2026-09-03: the `claude_args` input, the `--json-schema` flag, the `structured_output` output. https://github.com/anthropics/claude-code-action
- agents.md and the Claude Code memory docs: https://agents.md/ · https://code.claude.com/docs/en/memory · https://code.claude.com/docs/en/hooks
- Vercel, "AGENTS.md outperforms skills in our agent evals", 2026-01-27. https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals
- Carlo Martinucci, "Come è cambiato il mio modo di scrivere codice", 2026, for the first shift of the role. https://carlomartinucci.substack.com/p/come-e-cambiato-il-mio-modo-di-scrivere

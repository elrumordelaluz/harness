<p align="center">
  <img src="docs/assets/logo.png" width="640" alt="harness">
</p>

# harness

An agent production chain for [Claude Code](https://claude.com/claude-code). A feature goes from a ten-line intent to a spec, from the spec to slices, and from each slice to one pull request written by a subagent at clean context, judged once, checked by deterministic gates and merged by a policy a human can read. This repo holds the skills that run the chain, the templates that install it in a project repo, and the spec that describes it.

## Why

Working with a coding agent is slow at the review, not at the writing. The harness moves most of the review before the PR and makes it deterministic where it can: git hooks and CI compute the tier of a change from its size and the paths it touches, a judge at clean context reads the diff once against the slice and the repo's own rules, and a policy merges or hands over to a human according to a table that lives in the repo. The human writes the intent, approves the spec and the board, merges what the policy will not, and audits the log of verdicts.

It is built for one developer with Claude Code and a GitHub repo. A team mode exists in the spec and is designed, not proven.

## What it is and is not

- Markdown, bash 3.2 with `jq`, GitHub Actions workflows and one JSON schema. There is no library and no runtime.
- No workflow calls a model. The judgement runs in the terminal of whoever opens the PR, on their own Claude subscription. CI runs the gates and the policy only.
- Stack agnostic on the repo side: the gates call the four scripts every harness repo exposes, `typecheck`, `test`, `format:check` and `build`. The CI templates assume pnpm and are adapted to the repo when installed.
- Claude Code is needed for the skills. Hooks, CI, tier and PR template work for anyone who clones the repo; the verdict does not, because `/judge` produces it.

## How it works

    L0  Documents       ~/.claude/CLAUDE.md · AGENTS.md · docs/
    L1  Specification   intent  ->  spec  ->  slices (DAG, expected tier, human flag)
    L2  Execution       branch per slice  ->  subagent, tests first  ->  PR from the template
    L3  Gates           git hooks (.githooks/)  ->  deterministic CI  ->  label tier:N
    L4  Judgement       /judge at clean context  ->  verdict  ->  policy.sh  ->  merge | needs-human
    L5  Human           writes the intent · approves spec and board · merges what the policy won't · audits
    L6  Observability   docs/review-log/verdicts.jsonl  ->  audit  ->  threshold tuning

- Git hooks refuse code on the default branch and malformed commit messages.
- CI runs format, typecheck, test, build, a secret scan and a weakened-test check in one job, then computes the tier from lines, files, sensitive paths and dependencies with `scripts/tier.sh`. The rules it reads are the policy block of `AGENTS.md`, at the base ref, so a PR cannot widen the rules it is judged by.
- `/judge` reads artifacts only: the diff, the slice, `AGENTS.md`, the codebase map. It produces one verdict for one commit, once per PR. `high` and `medium` findings are fixed in the same session and answered with the sha of the fixing commit; `low` findings are declared in the PR body. Nobody judges twice.
- `scripts/policy.sh` posts the verdict on the PR and applies the table below. Every verdict lands in `docs/review-log/verdicts.jsonl` with the outcome of the PR.
- Layers talk through files, labels and marked comments, never through a conversation. Every session starts at clean context from `AGENTS.md`, the codebase map and the slice.

| Tier | Means                                                   | Judge     | Merge                                               |
| ---- | ------------------------------------------------------- | --------- | --------------------------------------------------- |
| 0    | prose nobody executes, small docs                       | none      | on green CI                                         |
| 1    | <= 200 lines, <= 8 files, no sensitive path, no new dep | one role  | on approve, or every finding answered               |
| 2    | over the thresholds, sensitive path, dependency, schema | two roles | both approve and no open `high`, else `needs-human` |
| 3    | slice with `human: true`, weakened tests                | none      | human                                               |

The tier says how much scrutiny a change needs. Who may merge is a separate line: the paths listed under human gates in `AGENTS.md` (intent, specs, backlog, decisions, review log) get the `human-gate` label and are never merged by the policy, at any tier.

Everything the chain does on its own sits behind the repo variable `HARNESS_AUTOMERGE`, `off` by default. When off, the policy comments what it would have done and a person merges.

## Commands

| Command                        | Use it when                                     | What you get                                                        |
| ------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------- |
| `/board`                       | you open a session and don't know what is next  | repo state on one screen, the next action, inbox lines triaged      |
| `scripts/intent.sh new <slug>` | you have an idea                                | an intent skeleton; you write the ten lines, then `intent.sh open`  |
| `/spec`                        | an intent is on main                            | an interview, one question per message, then the approved spec      |
| `/slice`                       | a spec is approved                              | slice files in `docs/backlog/` and the board, after one yes         |
| `/next`                        | slices are ready                                | one judged PR per slice; `/next S12` runs one, no argument runs all |
| `/judge`                       | you open a PR by hand                           | a verdict for the head; `/next` runs it for you                     |
| `/harness-init`                | the repo has no harness, or the templates moved | stages `local`, `ci`, `judge`; one PR, merged by hand               |

A feature goes top to bottom, from `intent.sh` to `/next`. Only `/next` produces code, through one clean-context subagent per slice, in a worktree of its own.

**`/next` or `/board`?** `/board` looks and tells you what to do. `/next` does it. If you know a slice is ready, `/next`. Otherwise `/board`.

**`/spec` or `/slice`?** `/spec` decides what gets built, once per intent. `/slice` decides which PRs, once per spec. `/slice` stops without an approved spec.

**Do I run `/judge`?** Only if you open the PR yourself. At tier 1 and 2 a hook blocks `gh pr create` until the head has a verdict. Once per PR: answer findings with a commit (`scripts/judge.sh answer <id> <sha>`), never with a second judgement.

**I found a problem outside my slice.** One dated line in `docs/inbox.md`, then carry on. The next `/board` asks whether it becomes an intent, a slice, or nothing.

## Requirements

- Claude Code with a Claude subscription, for the skills and the judge.
- Node 24, pnpm, `jq`, git 2.9 or later, and `gh` authenticated on the repo.
- bash 3.2 is enough: the scripts run on stock macOS without Homebrew, and on the bash of GitHub's runners.
- A GitHub repo. Rulesets need a public repo or a paid plan; without them the default branch is protected by the local hooks and by the policy alone.
- A GitHub App, only when `HARNESS_AUTOMERGE` goes on: merges made with the default token do not start workflows. An [ntfy](https://ntfy.sh) topic for notifications is optional.

## Install

    git clone https://github.com/elrumordelaluz/harness.git
    cd harness
    pnpm install
    mkdir -p ~/.claude/skills
    ln -s "$PWD"/skills/* ~/.claude/skills/

The symlinks point at the working tree: whatever is checked out here, uncommitted changes included, is what every command runs in every other repo. Keep this checkout on main and update it with `git pull`.

## Set up a repo

    /harness-init local    AGENTS.md, CLAUDE.md, docs/, git hooks, .claude/settings.json
    /harness-init ci       CI gates, tier label, PR template, ruleset
    /harness-init judge    judge prompt and schema, policy, automerge, escalate and close workflows

- On an empty repo `local` bootstraps the stack first, from `~/.claude/stack.md` if it exists.
- The three stages land in one PR, merged by hand: the gates cannot guard the PR that creates them. Everything `gh` can do, the skill does; the human checklist arrives once, at the end.
- Then fill `AGENTS.md` and `docs/codebase-map.md` with what is true of that repo: commands, sensitive paths, pitfalls. The judge and the subagents read them and nothing else.
- Each stage leaves its entry in `.harness/stamp.json`, the commit of the harness it copied from. When a template changes here, rerun the stage that owns it; `scripts/since.sh <sha>` says what moved. That is the only way updates reach a project: a skill working in a project that finds its harness out of date writes an inbox line there and moves on.
- Leave `HARNESS_AUTOMERGE` off until an audit says the thresholds hold for that repo.
- `skills/harness-init/templates/README.md` maps every template to its destination and stage.

## Work in a repo that has the harness

The contract is the repo, not the skills: `AGENTS.md`, `docs/`, `scripts/`, `.githooks/`, `.github/` and `.claude/settings.json` apply to anyone who clones, and to CI.

1. `pnpm install` installs the hooks.
2. Read `AGENTS.md`, then `docs/codebase-map.md`.
3. `scripts/board.sh` prints where the work stands.

Rules you meet first:

- One slice, one branch `slice/S<NN>-<slug>`, one PR. The branch on the remote is the claim: push it right away. If it already exists, the slice is someone else's.
- Commits: `type(scope): subject`, imperative, lowercase, no trailing period, no attribution trailer.
- Never change a test to make it pass. CI has a check for it, and it raises the tier.
- A change outside the slice's scope is a new slice.
- A slice PR does not touch `docs/backlog/`: that path carries the human gate, and the PR would lose its merge.
- Every session starts from `AGENTS.md`, the map and the slice, never from an earlier conversation.

Teams set `"docs_mode": "pr"` in the policy block of `AGENTS.md`: intent, spec and board go through a PR merged by the owning role instead of a commit on main, and the skills follow that line. Section 8 of the spec lists the differences.

## Repo layout

    skills/harness-init/     three-stage setup skill (local, ci, judge)
      templates/             files copied into project repos; its README maps destinations
    skills/spec/             intent to spec interview; templates/SPEC.md is the skeleton
    skills/slice/            approved spec to slices and board
    skills/next/             orchestrator: waves, one subagent and worktree per slice, judge, PR
    skills/judge/            clean-context judgement before the PR
    skills/board/            session opener: the screen of scripts/board.sh, inbox triage
    docs/spec.md             the spec; version and date in its header, changes listed in section 0
    docs/codebase-map.md     modules, entry points, how to test, pitfalls
    docs/                    this repo's own harness: intent, specs, backlog, decisions, review-log, inbox
    AGENTS.md, CLAUDE.md     the map for agents, with the policy block the scripts read
    .githooks/, scripts/     symlinks to the templates: the repo runs on its own hooks
    .github/                 copies of the workflow templates, kept equal to them by a test
    tests/                   Vitest suites that run the template scripts as processes

The repo eats its own food: the slices in `docs/backlog/` are how it was built, and `docs/review-log/verdicts.jsonl` is the log of the judgements on its own PRs. `/audit`, the skill that reads that log and opens slices from it, is not written yet.

## Develop the harness

    pnpm install        installs the hooks
    pnpm typecheck      tsc on the tests, bash -n on scripts and hooks, jq on JSON
    pnpm test           builds real git repos; about two minutes
    pnpm format:check
    pnpm build          declared no-op

- Change a script or hook in `skills/harness-init/templates/`, never through the symlink. Workflows under `.github/` are copies; a test fails until the copy matches the template.
- The scripts of the templates stay on bash 3.2 and `jq`: no `mapfile`, no associative arrays, no `${var,,}`. A structural test looks for them, because `bash -n` on CI's bash 5 does not.
- Prose, in `docs/**` and the `SKILL.md` files, is committed on main after a yes in the conversation. Scripts, hooks, workflows, tests and `package.json` go through a PR with the four gates. Here `/judge` runs on request, as an audit, because this is the repo that builds the gate and every PR to it is tier 2 anyway.
- Test a skill on a project repo, not here.
- No em dash anywhere: `scripts/prose.sh` fails on one, in the hooks and in CI. Technical terms stay in English. Some backlog and inbox lines of this repo's own harness are in Italian.
- Read `docs/codebase-map.md` before touching code. The "Dragons" section holds what went wrong before.

Issues and pull requests are welcome. A PR from a fork gets the gates and the tier label but not the automerge: a human reads it and merges it.

## Status

September 2026. Six skills in daily use on the author's repos; more than a hundred verdicts logged; `HARNESS_AUTOMERGE` on in this repo since 22 September, with the policy merging tier 0 and tier 1 PRs on its own. Not there yet: the audit skill, a proven team mode, and thresholds tuned from measurements rather than starting values.

## License

MIT. See `LICENSE`.

---

<a href="https://lionelt.dev">
  <img src="https://lionelt.dev/brand/readme-footer.png" alt="lionelt.dev" width="55%">
</a>

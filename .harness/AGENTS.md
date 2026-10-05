# The harness of this repo

What the chain reads here: the map, the conventions, the review policy and its block, the human gates and the "Do not". The root `AGENTS.md` says what the project is; this file is where `.harness/bin/policy-lines.sh` and the skills look for the rules.

## Map

- .harness/docs/codebase-map.md: modules, entry points, how to test, dragons. Read it before touching code. docs/spec.md: the spec of the chain, the source; version and date live in its header and not in a frontmatter, and the README only says where things are.
- .harness/docs/intent/: ten human lines per idea. .harness/docs/specs/: specs with a status. .harness/docs/backlog/: slices. .harness/docs/decisions/: ADRs. .harness/docs/review-log/: verdicts. The inbox is the open issues of the repo, as `/board` reads them. .harness/docs/decisions/ADR-0003 is the plan in force: documents on main without a PR, the judge once per PR, `/next` before `/board`, skills that do not repair the harness elsewhere. Slices S09-S13 are the work, in the order of the ADR, and a session at clean context starts there.
- skills/harness-init/SKILL.md: the skill in three stages (local, ci, judge), with skills/harness-init/templates/ holding the files it copies into the project repos and templates/README.md saying where each one goes and in which stage. skills/judge/SKILL.md: the judgement at clean context before the PR. skills/spec/SKILL.md: the interview that turns an intent into a spec, with the skeleton in templates/SPEC.md. skills/slice/SKILL.md: cutting an approved spec into slices. skills/next/SKILL.md: the orchestrator that carries every eligible slice to a merged PR, one subagent per slice. skills/board/SKILL.md: the screen of .harness/bin/board.sh at clean context and the issues of the inbox answered one at a time, after `/next` in the order of ADR-0003. `/audit`, which is not here yet, comes after.
- .harness/bin/: tracked symlinks to the templates, laid out the way .harness/bootstrap.sh lays out the fetch in a project repo (the scripts at its top, hooks/, judge/, ruleset.json), so this repo runs on its own hooks and scripts with no copies that drift; .harness/bootstrap.sh is a symlink too, and here it fetches nothing. .harness/bin/check-shell.sh and .harness/bin/since.sh, the answer to what moved in the templates since a sha, are the two regular files among the links, the two scripts here that are not templates. .github/: ci.yml with the deterministic gates and the tier label; judge/ with the prompt and the verdict schema for `/judge`; automerge.yml, escalate.yml, close.yml, and none of them judges; the PR template. The ruleset to apply to main when the GitHub plan allows it is .harness/bin/ruleset.json. tests/: Vitest that run the scripts of the templates and check what they do.

## Conventions

- Branch: slice/S<NN>-<slug>. The branch is how a slice is taken: push at once, and if it is already there the slice belongs to someone else. Commit: type(scope): subject, imperative, lowercase, no full stop; a body with the why and the what; no attribution trailer.
- PR: one slice, the template filled in, nothing out of scope. If a change out of scope looks necessary, a new slice is opened. The four gates and Lionel's merge are the review: here `/judge` does not run before every PR and the verdict hook is not installed, because the gate belongs in the project repos and this repo is the one that builds it (ADR-0003, decision 4). `/judge` runs when Lionel asks for it, as an audit: then it runs once, `high` and `medium` findings are fixed in the same session and answered with the sha of the commit (`.harness/bin/judge.sh answer`), `low` ones are declared in the PR, and nobody judges again.
- Documents: the prose of this repo, `docs/**`, `skills/**/SKILL.md` and `skills/spec/templates/SPEC.md`, is committed on main, without a PR, with the human's yes in the conversation as the approval; scripts, hooks, workflows, tests and `package.json` go through a PR with the four gates and Lionel's merge. Clean context every session: you start again from this file, from the map and from the slice, never from an earlier conversation. Prose: no em dash, no padded lists, technical terms in English, and it holds for the spec, the skills, the templates and the comments in the scripts.

## Definition of done

The criteria of the slice green with the tests written first; suite, typecheck, format and build green; no test weakened; docs touched if the behaviour changed. A template that changes goes back into the repo that uses it by rerunning the stage of /harness-init that owns it; here the workflows of `.github/` are copies and not symlinks, and the check in `tests/architecture.test.ts` fails until the copy is equal to the template again.

## Review policy

- Sensitive paths: `.harness/AGENTS.md`, `skills/*/templates/AGENTS.md`, `skills/*/templates/scripts/**`, `skills/*/templates/githooks/**`, `skills/*/templates/github/**`, `skills/*/templates/judge/**`, `skills/*/templates/settings.json`, `.github/**`, `.harness/bin/**`, `.claude/settings.json`, `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `vitest.config.ts`.
- Tier 0: prose that nobody runs, at any length; the other docs up to 20 lines. The files on the line below are never tier 0, and neither are comments and formatting in code. Tier 1: within `max_lines` and `max_files` of the block below, no sensitive path, no dependency.
- Never tier 0: `AGENTS.md`, `.harness/AGENTS.md`, `CLAUDE.md`, `.claude/**`, `docs/spec.md`, `.harness/docs/codebase-map.md`, `skills/**/SKILL.md`, `skills/*/templates/**`.
- Tier 2: over the thresholds, or a sensitive path, or a dependency, or a schema, or `.github/**`. Tier 3: a slice with `human: true`, weakened tests, judges that disagree, fix rounds used up, or a policy block that does not read at the base ref. The tier is the highest of the signals, and CI works it out with `.harness/bin/tier.sh`, not whoever opens the PR. The judge never merges: the policy in `.github/` decides.

## Human gates

- Human merge by path: `.harness/docs/intent/**`, `.harness/docs/specs/**`, `.harness/docs/backlog/**`, `.harness/docs/decisions/**`, `.harness/docs/review-log/**`, `.harness/docs/parked.md`. The tier says how much scrutiny is needed, `human_gate_paths` says who merges: CI turns it into the `human-gate` label, neither `automerge.yml` nor `policy.sh` merges it, not even at tier 0, and only a human takes the label off.
- Documents: on main. The paths of `human_gate_paths` plus those of `docs_extra_paths`, `docs/spec.md`, `.harness/docs/codebase-map.md`, `skills/**/SKILL.md` and `skills/spec/templates/SPEC.md`, are committed straight on main: whoever writes them has the human in the room and the yes is the approval (ADR-0003). The git hooks do not read this line: they read `docs_mode`, and on main a commit made only of those paths goes through, and nothing else.
- Inbox: the open issues of the repo, as `/board` reads them. An issue with any label of `inbox_skip_labels` stays open and leaves the board, and the first of the list is the label the harness puts on one. An issue by an author who is not a collaborator reaches the board only once a collaborator puts the label of `inbox_accept_label` on it, since only triage access can add a label; until then the board prints how many wait and never their titles. A skip label wins over the accept label.
- Intent and spec: explicit approval in the conversation, then the commit. Board: the board printed and one question, then the commit. Tier 2 with an open `high` or `needs-human`, and tier 3: human merge. Audit: three automatic PRs a week, in Docket.

## Policy block

What the programs read. The two sections above explain the policy to whoever reads it; this block says it, and this is where it changes: `.harness/bin/policy-lines.sh` cuts the fence out and hands it to `jq`, and `tier.sh`, the git hooks, `intent.sh`, `park.sh` and `board.sh` read it from this file and from no other, the root `AGENTS.md` included. The globs live in JSON strings, without backticks. Every key is required: taking one out does not widen the rule, it stops whoever reads it.

```json
{
  "version": 2,
  "docs_mode": "main",
  "sensitive_paths": [
    ".harness/AGENTS.md",
    "skills/*/templates/AGENTS.md",
    "skills/*/templates/scripts/**",
    "skills/*/templates/githooks/**",
    "skills/*/templates/github/**",
    "skills/*/templates/judge/**",
    "skills/*/templates/settings.json",
    ".github/**",
    ".harness/bin/**",
    ".claude/settings.json",
    "package.json",
    "pnpm-lock.yaml",
    "tsconfig.json",
    "vitest.config.ts"
  ],
  "never_tier_0": [
    "AGENTS.md",
    ".harness/AGENTS.md",
    "CLAUDE.md",
    ".claude/**",
    "docs/spec.md",
    ".harness/docs/codebase-map.md",
    "skills/**/SKILL.md",
    "skills/*/templates/**"
  ],
  "human_gate_paths": [
    ".harness/docs/intent/**",
    ".harness/docs/specs/**",
    ".harness/docs/backlog/**",
    ".harness/docs/decisions/**",
    ".harness/docs/review-log/**",
    ".harness/docs/parked.md"
  ],
  "docs_extra_paths": [
    "docs/spec.md",
    ".harness/docs/codebase-map.md",
    "skills/**/SKILL.md",
    "skills/spec/templates/SPEC.md"
  ],
  "max_lines": 200,
  "max_files": 8,
  "inbox_skip_labels": ["harness:skip"],
  "inbox_accept_label": "harness:accept"
}
```

## Do not

- Do not commit code on main: only the documents of the `Documents` line of "Human gates". Do not touch `.github/` from a slice. Do not change a test to make it pass. Do not add dependencies without declaring them in the PR.
- Do not repair the harness of another repo from a skill that is working in it: a template behind or a line missing there is an issue filed on this repo, the fix is made here and arrives with `/harness-init`. Do not open a second judgement on the same PR.
- Do not modify the symlinks in `.harness/bin/`: the template in `skills/harness-init/templates/` is what changes, and the link follows. Do not use anything beyond bash 3.2 and jq in the scripts of the templates: they run on the bash of macOS without brew, so no `mapfile`, no associative arrays, no `${var,,}`, no `-v` on an array.
- Do not add a template without its line in `skills/harness-init/templates/README.md`, with destination and stage. Do not write a workflow or an input of an action from memory: read the current doc of the action first and adapt the template. Do not change the spec without a new version in its header and a line in "What changes": the spec is the source, not a note.

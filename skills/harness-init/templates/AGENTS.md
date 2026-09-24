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
- PR: one slice, template filled in, nothing outside the scope. If a change outside the scope looks necessary, a new slice is opened. Before opening it `/judge` runs: at tier 1 and 2 the hook does not open the PR of a head without a verdict.
- Clean context at every session: start again from this file, from the map and from the slice, never from a previous conversation.

## Definition of done

The slice's criteria green with the tests written first; suite, typecheck, format and build green; no test weakened; docs touched if the behaviour changed.

## Review policy

The lines below explain the policy to whoever reads them; what the programs
read sits in "Policy block", and that is where it is changed.

- Sensitive paths: `AGENTS.md`, `.claude/settings.json`, `.github/**`, `.githooks/**`, `.harness/**`, `scripts/**`, `package.json`, `pnpm-lock.yaml`, `tsconfig*.json`, {{`server/**`, `src/lib/engine/**`, `src/state/**`, `vite.config.ts`}}.
- Tier 0: the prose nobody executes, at any length; the other docs up to 20 lines. The files on the line below are never tier 0, and neither are comments and formatting in code. Tier 1: within `max_lines` and `max_files` of the block below, no sensitive path, no dependency.
- Never tier 0: `AGENTS.md`, `CLAUDE.md`, `.claude/**`, `docs/codebase-map.md`.
- Tier 2: over the thresholds, or a sensitive path, or a dependency, or a schema, or `.github/**`. Tier 3: slice `human: true`, tests weakened, judges in disagreement, fix rounds used up, or a policy block that cannot be read at the base ref.
- The tier is the maximum of the signals. CI computes it with `scripts/tier.sh`, not whoever opens the PR.
- The judge never merges. The policy in `.github/` decides.

## Human gates

- Human merge by path: `docs/intent/**`, `docs/specs/**`, `docs/backlog/**`, `docs/decisions/**`, `docs/review-log/**`, `docs/inbox.md`.
- The tier says how much scrutiny is needed, `human_gate_paths` says who merges: CI turns it into the `human-gate` label, neither `automerge.yml` nor `policy.sh` merges it, not even at tier 0, and only a human removes the label.
- Documents: on main. The files of `human_gate_paths` go on main with a commit, without a PR: the human's yes in the conversation is the approval and the commit is the record. The git hooks do not read this line: they read `docs_mode`, and with `main` they let through on main a commit made only of those files; on a team the key says `pr`, and the approval goes back to being the merge.
- Intent and spec: explicit approval. Board: review before the first PR. Tier 2 with an open `high` or `needs-human`, and tier 3: human merge. Audit: three automatic PRs a week.

## Policy block

What the programs read. The two paragraphs above explain it in prose, this
block states it: `scripts/policy-lines.sh` extracts the fence and passes it to
`jq`, and `tier.sh`, the git hooks and `intent.sh` read only from here. The
globs sit in JSON strings, without backticks. Every key is required: whoever
removes one does not widen the rule, they stop whoever reads it.

```json
{
  "version": 1,
  "docs_mode": "main",
  "sensitive_paths": [
    "AGENTS.md",
    ".claude/settings.json",
    ".github/**",
    ".githooks/**",
    ".harness/**",
    "scripts/**",
    "package.json",
    "pnpm-lock.yaml",
    "tsconfig*.json",
    "{{server/**}}",
    "{{src/lib/engine/**}}",
    "{{src/state/**}}",
    "{{vite.config.ts}}"
  ],
  "never_tier_0": [
    "AGENTS.md",
    "CLAUDE.md",
    ".claude/**",
    "docs/codebase-map.md"
  ],
  "human_gate_paths": [
    "docs/intent/**",
    "docs/specs/**",
    "docs/backlog/**",
    "docs/decisions/**",
    "docs/review-log/**",
    "docs/inbox.md"
  ],
  "docs_extra_paths": [],
  "max_lines": 200,
  "max_files": 8
}
```

## Do not

- Do not commit code on main: only the documents of the Documents line of "Human gates". Do not touch `.github/` from a slice. Do not change a test to make it pass. Do not add dependencies without declaring them in the PR.
- Do not repair the harness from a skill that is working here: a template behind, a line missing in this file, a script that gets it wrong are one dated line in `docs/inbox.md` and the run carries on. The fix is made in the harness repo and comes back here by rerunning the `/harness-init` phase that owns the file.
- {{project rules derived from the map, for instance: `src/lib/engine/` imports neither React nor `src/state/`}}

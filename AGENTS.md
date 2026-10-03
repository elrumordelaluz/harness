# harness

The agent production chain: intent, spec, slice, PR, deterministic gates, a judge at clean context, policy, audit. This repo holds the Claude Code skills that build the chain and run it, the templates that land in the project repos, and the spec that describes it.

## Commands (single-run)

pnpm typecheck · pnpm test · pnpm format:check · pnpm build

typecheck is tsc over the tests plus .harness/bin/check-shell.sh (bash -n on the scripts and the hooks, jq on the JSON). build is a declared no-op: this repo produces no artifact.

## Harness

The map, the conventions, the review policy with its policy block, the human gates and the "Do not" of this repo live in `.harness/AGENTS.md`: read it before touching anything.

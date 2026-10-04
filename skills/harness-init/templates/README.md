# Templates: where each file goes

| Template                                                                                            | Destination in the repo                                                              | Stage            |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------- |
| `AGENTS.md`                                                                                         | `.harness/AGENTS.md`, and the root `AGENTS.md` gets the Harness section of the skill | local            |
| `CLAUDE.md`                                                                                         | `CLAUDE.md`, the line added if missing                                               | local            |
| `settings.json`                                                                                     | `.claude/settings.json` (tracked), merged with the jq filter of the skill            | local            |
| `githooks/pre-commit`, `githooks/commit-msg`, `githooks/pre-push`                                   | `.harness/bin/hooks/`, fetched                                                       | local            |
| `scripts/ensure-hooks.sh`, `scripts/ensure-verdict.sh`, `scripts/commitlint.sh`, `scripts/prose.sh` | `.harness/bin/`, fetched                                                             | local            |
| `scripts/intent.sh`                                                                                 | `.harness/bin/`, fetched                                                             | local            |
| `scripts/board.sh`                                                                                  | `.harness/bin/`, fetched                                                             | local            |
| `scripts/park.sh`                                                                                   | `.harness/bin/`, fetched                                                             | local            |
| `bootstrap.sh`                                                                                      | `.harness/bootstrap.sh`                                                              | local            |
| `scripts/policy-lines.sh`                                                                           | `.harness/bin/`, fetched, sourced by the hooks and tier.sh                           | local            |
| `docs/codebase-map.md`                                                                              | `.harness/docs/codebase-map.md`                                                      | local            |
| `docs/README.md`                                                                                    | `.harness/docs/README.md`, one section per folder of the documents                   | local            |
| `docs/inbox.md`                                                                                     | `.harness/docs/inbox.md`, created if missing                                         | local            |
| `docs/parked.md`                                                                                    | `.harness/docs/parked.md`, created if missing                                        | local            |
| no file, the lines `.harness/bin/` and `.claude/worktrees/`                                         | `.gitignore`, appended if missing                                                    | local            |
| no file, `pin`, written by all three, and the entry of the stage                                    | `.harness/stamp.json` (tracked)                                                      | local, ci, judge |
| `github/ci.yml`                                                                                     | `.github/workflows/ci.yml`                                                           | ci               |
| `github/pull_request_template.md`                                                                   | `.github/pull_request_template.md`                                                   | ci               |
| `github/ruleset.json`                                                                               | `.github/ruleset.json` (input for `gh api`)                                          | ci               |
| `scripts/tier.sh`, `scripts/test-weakening.sh`                                                      | `scripts/`                                                                           | ci               |
| `architecture.test.ts`                                                                              | the project's test dir                                                               | ci               |
| `judge/prompt.md`, `judge/verdict.schema.json`                                                      | `.harness/bin/judge/`, fetched                                                       | judge            |
| `judge.md`                                                                                          | `.harness/judge.md` (tracked), written if missing                                    | judge            |
| `github/automerge.yml`, `github/escalate.yml`, `github/close.yml`                                   | `.github/workflows/`                                                                 | judge            |
| `scripts/policy.sh`, `scripts/review-log.sh`, `scripts/judge.sh`                                    | `scripts/`                                                                           | judge            |

Placeholders are `{{like_this}}`. Scripts assume bash 3.2 (macOS default) and
`jq`; the CI templates assume pnpm and are adapted to the repo at run time.

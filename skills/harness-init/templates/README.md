# Templates: where each file goes

| Template                                                                                            | Destination in the repo                      | Stage            |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------- |
| `AGENTS.md`                                                                                         | `AGENTS.md`                                  | local            |
| `CLAUDE.md`                                                                                         | `CLAUDE.md`                                  | local            |
| `settings.json`                                                                                     | `.claude/settings.json` (tracked)            | local            |
| `githooks/pre-commit`, `githooks/commit-msg`, `githooks/pre-push`                                   | `.githooks/`                                 | local            |
| `scripts/ensure-hooks.sh`, `scripts/ensure-verdict.sh`, `scripts/commitlint.sh`, `scripts/prose.sh` | `scripts/`                                   | local            |
| `scripts/intent.sh`                                                                                 | `scripts/`                                   | local            |
| `scripts/board.sh`                                                                                  | `scripts/`                                   | local            |
| `scripts/policy-lines.sh`                                                                           | `scripts/`, sourced by the hooks and tier.sh | local            |
| `docs/codebase-map.md`, `docs/*/README.md`                                                          | `docs/`                                      | local            |
| `docs/inbox.md`                                                                                     | `docs/inbox.md`, created if missing          | local            |
| no file, the line `.claude/worktrees/`                                                              | `.gitignore`, appended if missing            | local            |
| no file, the entry of the stage                                                                     | `.harness/stamp.json` (tracked)              | local, ci, judge |
| `github/ci.yml`                                                                                     | `.github/workflows/ci.yml`                   | ci               |
| `github/pull_request_template.md`                                                                   | `.github/pull_request_template.md`           | ci               |
| `github/ruleset.json`                                                                               | `.github/ruleset.json` (input for `gh api`)  | ci               |
| `scripts/tier.sh`, `scripts/test-weakening.sh`                                                      | `scripts/`                                   | ci               |
| `architecture.test.ts`                                                                              | the project's test dir                       | ci               |
| `judge/prompt.md`, `judge/verdict.schema.json`                                                      | `.github/judge/`                             | judge            |
| `github/automerge.yml`, `github/escalate.yml`, `github/close.yml`                                   | `.github/workflows/`                         | judge            |
| `scripts/policy.sh`, `scripts/review-log.sh`, `scripts/judge.sh`                                    | `scripts/`                                   | judge            |

Placeholders are `{{like_this}}`. Scripts assume bash 3.2 (macOS default) and
`jq`; the CI templates assume pnpm and are adapted to the repo at run time.

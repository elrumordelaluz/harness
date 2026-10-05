# .harness

This folder is the harness of the repo: the rules an agent follows to carry an idea from intent to a merged PR. If a commit of yours was refused, this page says why and what to do.

`.harness/AGENTS.md` is the contract the agents and the scripts read: the conventions, the review policy and the policy block, whose `docs_mode` key says whether documents may go straight on the default branch. `.harness/docs/` holds the documents of the chain, intents, specs, the slices of the backlog, the decisions, with a README of its own. `.harness/bin/` is not tracked: `.harness/bootstrap.sh` fetches the scripts and the git hooks there at the version pinned in `.harness/stamp.json`, and points git at them.

Three hooks run on your machine. `pre-commit` refuses a commit on the default branch, except one made only of documents when `docs_mode` is `main`, then checks the format of the staged files, refuses an em dash in the lines you add and runs the typecheck. `commit-msg` wants `type(scope): subject`, imperative, lowercase, no full stop, and no attribution trailer. `pre-push` refuses a push to the default branch under the same rule as `pre-commit`. All three refuse when `.harness/bin/` is not at the pin: run `.harness/bootstrap.sh`.

A small change needs no intent, spec or slice. Make a branch off the default one, commit, run the four commands of `.harness/AGENTS.md`, `typecheck`, `test`, `format:check` and `build`, and open a PR. CI computes its tier: tier 0 and tier 3 are never judged, at tier 1 or 2 the hook on `gh pr create` asks for `/judge` first if you open it from Claude Code.

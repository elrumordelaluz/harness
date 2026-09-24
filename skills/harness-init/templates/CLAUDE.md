@AGENTS.md

For Claude Code only: hooks and permissions live in `.claude/settings.json`, tracked. Personal exceptions go in `.claude/settings.local.json`, ignored. Before every `git commit` a hook makes sure the repo's git hooks are installed: the checks are theirs. Before every `gh pr create` a second hook refuses the PR of a head without a verdict: run `/judge`.

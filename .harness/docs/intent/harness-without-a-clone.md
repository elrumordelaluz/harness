## Problem

To install the harness today team members need a local clone of this repo and a symlink per skill in `~/.claude/skills/`. I need to run for a teamate `/harness-init` for them, and `/judge`, `/next` and `/board` do not exist on their machine at all.

## What success looks like

A teammate with Claude Code and `gh`, and no clone of the harness, installs it from the public GitHub repo with one command, gets the six skills and the Claude Code hooks, and the CI of their project runs the harness's gates at the version the repo pins. Upgrading is changing that version. The symlinks stay as my development setup and nobody else's.

## Out of scope

The git hooks and the scripts: `SPEC-harness-in-one-folder` already fetches them at the pin. What the CI runs and how it sits next to a project's own CI. Publishing to a marketplace or a registry beyond the GitHub repo.

#!/usr/bin/env bash
# Claude Code PreToolUse hook (matcher: Bash). Reads the tool call as JSON on
# stdin. If the command is a git commit, makes sure this clone has the repo's
# git hooks installed, so pre-commit and commit-msg actually run. The checks
# live in those hooks, not here: this script never blocks on its own.
set -euo pipefail
input="$(cat)"
if command -v jq >/dev/null 2>&1; then
  cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || true)"
else
  cmd="$input"
fi
case "$cmd" in
  *"git commit"*)
    root="$(git rev-parse --show-toplevel 2>/dev/null || printf '%s' "${CLAUDE_PROJECT_DIR:-.}")"
    if [ -d "$root/.githooks" ] && [ "$(git -C "$root" config core.hooksPath || true)" != ".githooks" ]; then
      git -C "$root" config core.hooksPath .githooks
      echo "harness: git hooks installed (core.hooksPath=.githooks)" >&2
    fi
    ;;
esac
exit 0

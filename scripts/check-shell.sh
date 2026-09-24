#!/usr/bin/env bash
# Static check for the shell and JSON of this repo, the twin of `tsc` for the
# part that is not TypeScript. Every script and hook, in the templates and in
# scripts/, must parse under bash; every JSON file must parse under jq. Same
# output locally and in CI. Exit 1 on the first broken file.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
fail=0
while IFS= read -r f; do
  [ -L "$f" ] && continue
  if ! bash -n "$f"; then echo "check-shell: $f does not parse" >&2; fail=1; fi
done <<EOT
$(find skills/*/templates/githooks skills/*/templates/scripts scripts .githooks -type f 2>/dev/null | sort)
EOT
while IFS= read -r f; do
  if ! jq -e . "$f" >/dev/null 2>&1; then echo "check-shell: $f is not valid JSON" >&2; fail=1; fi
done <<EOT
$(find skills .claude -name '*.json' -not -path '*/node_modules/*' 2>/dev/null | sort)
EOT
[ "$fail" -eq 0 ] && echo "check-shell: ok"
exit "$fail"

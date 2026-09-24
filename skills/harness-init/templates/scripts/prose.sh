#!/usr/bin/env bash
# The gate on the prose: an em dash in a line the diff adds fails the commit
# and the CI, so no model ever reads for style. Same output locally and in CI.
#   prose.sh [base-ref]   the lines added between base-ref and HEAD
#   prose.sh --staged     the lines staged for the next commit
# Prints `file:line: em dash: <the line>` for every hit and exits 1 if there
# is one. Only added lines count: a file's past is not the PR's fault. Binary
# files show no added lines in a diff and pass on their own; the review log
# is data and is skipped by path, a verdict may quote anything.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
if [ "${1:-}" = "--staged" ]; then
  what="--cached"
else
  what="${1:-origin/main}...HEAD"
fi
# U+2014 as bytes: this file must pass its own gate.
dash=$'\xe2\x80\x94'
diff="$(mktemp)"
trap 'rm -f "$diff"' EXIT
# --unified=0: no context lines, so after a hunk header `@@ -a,b +c,d @@`
# every + line is an added line and c counts them. The prefixes are pinned:
# with diff.noprefix or diff.mnemonicPrefix in the user's config the header
# would not read `+++ b/`, and a gate that reads nothing must not pass.
git -c diff.noprefix=false -c diff.mnemonicPrefix=false \
  diff "$what" --unified=0 --no-color --src-prefix=a/ --dst-prefix=b/ --diff-filter=ACMR > "$diff"
fail=0
file=""
line=0
header=0
while IFS= read -r l; do
  case "$l" in
    # A file header opens with `diff --git`, which no content line can
    # produce, and closes at the first hunk: only there `+++ b/` names a
    # file. An added line whose content starts with `++ b/` stays content.
    diff\ --git\ *) header=1; file="" ;;
    @@*)
      header=0
      line="$(printf '%s' "$l" | sed -n 's/^@@ -[0-9]*\(,[0-9]*\)\{0,1\} +\([0-9]*\).*/\2/p')" ;;
    +*)
      if [ "$header" -eq 1 ]; then
        case "$l" in +++\ b/*) file="${l#+++ b/}"; line=0 ;; esac
        continue
      fi
      [ -z "$file" ] && continue
      case "$file" in
        docs/review-log/*|pnpm-lock.yaml|*.lock|*.min.*|*.svg) ;;
        *)
          if printf '%s' "${l#+}" | LC_ALL=C grep -q "$dash"; then
            echo "$file:$line: em dash: ${l#+}"
            fail=1
          fi ;;
      esac
      line=$((line + 1)) ;;
  esac
done < "$diff"
if [ "$fail" -eq 1 ]; then
  echo "prose: an em dash is a comma, a colon or a full stop. Rewrite the line." >&2
fi
exit "$fail"

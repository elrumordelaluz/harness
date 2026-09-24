#!/usr/bin/env bash
# Commit message lint. One regex, three callers:
#   commitlint.sh --file <path>            one message (the commit-msg hook passes the file)
#   commitlint.sh --range <base>..<head>   every commit in the range (CI; strict: no wip)
#   commitlint.sh --subject <subject>      one subject (CI, the title of the PR; strict: no wip)
# Format: type(scope): subject   imperative, lowercase, <= 72 chars, no trailing period.
# The subject may open with /name, the way this repo writes a skill: one slash
# with a lowercase letter after it. The 72 characters count the slash.
set -euo pipefail

TYPES='feat|fix|chore|docs|style|refactor|test|perf|revert|build|ci'
LOCAL_TYPES="$TYPES|wip"
SUBJECT='(\([a-z0-9-]+\))?: (/[a-z].{0,69}|[a-z].{0,70})[^.]$'

check_subject() {
  local subject="$1" allowed="$2"
  case "$subject" in "Merge "*|"Revert \""*) return 0 ;; esac
  if ! printf '%s\n' "$subject" | grep -Eq "^($allowed)$SUBJECT"; then
    echo "commitlint: bad subject: $subject" >&2
    echo "  expected: type(scope): imperative lowercase subject or /name, <= 72 chars, no trailing period" >&2
    echo "  types: $allowed" >&2
    return 1
  fi
}

check_trailers() {
  if printf '%s\n' "$1" | grep -Eiq '^(co-authored-by|generated with|claude-session)'; then
    echo "commitlint: attribution trailers are not allowed" >&2
    return 1
  fi
}

case "${1:-}" in
  --file)
    msg="$(grep -v '^#' "$2" || true)"
    subject="$(printf '%s\n' "$msg" | sed -n '1p')"
    second="$(printf '%s\n' "$msg" | sed -n '2p')"
    check_subject "$subject" "$LOCAL_TYPES"
    if [ -n "$second" ]; then echo "commitlint: the second line must be blank" >&2; exit 1; fi
    check_trailers "$msg"
    ;;
  --range)
    fail=0
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      sha="${line%% *}"; subject="${line#* }"
      check_subject "$subject" "$TYPES" || fail=1
      check_trailers "$(git show -s --format=%B "$sha")" || { echo "  in $sha" >&2; fail=1; }
    done <<EOT
$(git log --format='%H %s' --no-merges "$2")
EOT
    exit "$fail"
    ;;
  --subject)
    # Both merge paths squash, so the subject that lands is the title of the
    # PR and not one of the commits of the range. The caller passes it whole.
    subject="${2:-}"
    if [ -z "$subject" ]; then
      echo "commitlint: --subject needs one subject" >&2
      exit 2
    fi
    check_subject "$subject" "$TYPES"
    ;;
  *)
    echo "usage: commitlint.sh --file <msgfile> | --range <base>..<head> | --subject <subject>" >&2
    exit 2
    ;;
esac

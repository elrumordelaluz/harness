#!/usr/bin/env bash
# The only way a line of docs/parked.md is written or taken out. A parked
# document is written and not wanted yet: the board lists it and never picks
# it. Two verbs:
#   park.sh <path> "<why>"  check that <path> is one the board would pick, an
#                           intent no spec names, a draft spec or an approved
#                           spec no slice names, and add
#                           `- <YYYY-MM-DD>: <path>: <why>` to docs/parked.md
#   park.sh resume <path>   take the line of <path> out, even when the file
#                           it names is gone
# What happens to the list depends on the docs_mode key of AGENTS.md on the
# default branch, read as intent.sh reads it: with `main` the list is
# committed alone on the default branch, formatted, and pushed, as
# `docs(parked): <slug>` and `docs(parked): resume <slug>`; with `pr` the file
# is written and the change travels on a PR. The document itself never moves
# and never changes.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

LIST=docs/parked.md
# The sections of docs/intent/README.md, the check of intent.sh open: parking
# says a document was written and waits, and a skeleton was never written.
SECTIONS='Problem|What success looks like|Out of scope'

die() {
  echo "park: $*" >&2
  exit 1
}

usage() {
  echo 'usage: park.sh <path> "<why>" | park.sh resume <path>' >&2
  exit 2
}

[ -f .harness/bin/policy-lines.sh ] || die "no .harness/bin/policy-lines.sh: run /harness-init local"
. .harness/bin/policy-lines.sh

# main or pr, from AGENTS.md as the default branch has it on the remote. A
# block that cannot be read stops the script: there is no flow to fall back
# on. It runs inside $(...), so the callers read the status and stop on it.
mode() {
  local agents why
  agents="$(git show "origin/$1:AGENTS.md" 2>/dev/null || true)"
  why="$(policy_why "$agents")"
  [ -z "$why" ] || die "AGENTS.md on $1: $why"
  docs_mode "$agents"
}

# The remote's default branch, fetched now: the checks read its tree.
default_branch() {
  git fetch -q origin || return 1
  local ref
  ref="$(git symbolic-ref -q --short refs/remotes/origin/HEAD || true)"
  if [ -z "$ref" ]; then
    git remote set-head origin --auto >/dev/null || return 1
    ref="$(git symbolic-ref --short refs/remotes/origin/HEAD)" || return 1
  fi
  printf '%s\n' "${ref#origin/}"
}

# One frontmatter field of the text on stdin, as board.sh reads it: no
# trailing comment, no trailing blanks.
field() {
  awk -v want="$1" '
    fm == 0 && $0 == "---" { fm = 1; next }
    fm == 1 && $0 == "---" { exit }
    fm == 1 {
      key = $0
      sub(/:.*/, "", key)
      if (key != want) next
      value = $0
      sub(/^[^:]*:[ \t]*/, "", value)
      sub(/[ \t]+#.*$/, "", value)
      sub(/[ \t]+$/, "", value)
      print value
      exit
    }
  '
}

# The sections of the text on stdin that are missing or have no text under
# them, one per line, as intent.sh open finds them.
empty_sections() {
  awk -v want="$SECTIONS" '
    BEGIN { n = split(want, w, "|"); for (i = 1; i <= n; i++) seen[w[i]] = 0 }
    /^## / { cur = substr($0, 4); sub(/[ \t\r]+$/, "", cur); next }
    /^# / { cur = ""; next }
    /[^ \t\r]/ { if (cur in seen) seen[cur] = 1 }
    END { for (i = 1; i <= n; i++) if (!seen[w[i]]) print w[i] }
  '
}

# The markdown files of a folder on the remote's default branch, README apart.
tracked_in() {
  git ls-tree --name-only "origin/$1" -- "$2/" 2>/dev/null |
    { grep -E '\.md$' || true; } | { grep -vx "$2/README.md" || true; }
}

# The path of every line of the list, one per line, as board.sh parses it: the
# text after the date up to the first `: `.
parked_paths() {
  [ -f "$LIST" ] || return 0
  awk '
    /^- [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]:/ {
      text = substr($0, 14)
      sub(/^[ \t]+/, "", text)
      i = index(text, ": ")
      print (i > 0 ? substr(text, 1, i - 1) : text)
    }
  ' "$LIST"
}

slug_of() {
  local name="${1##*/}"
  name="${name%.md}"
  printf '%s\n' "${name#SPEC-}"
}

# With main, the list goes on the default branch alone: the branch checked out
# is that one, level with the remote, carrying nothing origin has not, and the
# list has no change of its own yet.
ready_main() {
  local base="$1" branch others
  branch="$(git symbolic-ref -q --short HEAD || true)"
  [ "$branch" = "$base" ] ||
    die "AGENTS.md says docs_mode main, so $LIST goes on $base: run it from $base, this is ${branch:-a detached HEAD}"
  git merge -q --ff-only "origin/$base" 2>/dev/null ||
    die "$base and origin/$base have gone apart: git pull --rebase, then run this again"
  others="$(git diff --no-renames --name-only "origin/$base...HEAD")"
  [ -z "$others" ] || die "$base carries more than $LIST, and the push would take it along:
$others"
}

ready_list() {
  [ -f "$LIST" ] || die "no $LIST here: run /harness-init local"
  [ -z "$(git status --porcelain -- "$LIST")" ] ||
    die "$LIST has changes of its own: commit or drop them first"
}

# Format the list, and with main commit it alone and push it.
land() {
  local flow="$1" base="$2" subject="$3"
  pnpm exec prettier --write --log-level warn "$LIST"
  if [ "$flow" != main ]; then
    echo "park: $LIST is written; AGENTS.md says docs_mode pr, so the change travels on a PR"
    return 0
  fi
  git add -- "$LIST"
  git commit -q -m "$subject" -- "$LIST"
  git push -q origin "$base" ||
    die "the commit is here and the push did not go through, its message is above: git push origin $base after the fix"
  echo "park: $LIST is on $base, $(git rev-parse --short HEAD)"
}

park() {
  local path="$1" why="$2"
  case "$why" in
    *$'\n'* | *$'\r'*) die "the why is one line: it lands in a line of $LIST" ;;
  esac
  [ -n "$(printf '%s' "$why" | tr -d ' \t')" ] || die "the why is empty: say in one line why $path waits"
  case "$path" in
    docs/intent/README.md | docs/specs/README.md) die "only an intent of docs/intent/ or a spec of docs/specs/ is parked, not $path" ;;
    docs/intent/*/* | docs/specs/*/*) die "only an intent of docs/intent/ or a spec of docs/specs/ is parked, not $path" ;;
    docs/intent/*.md | docs/specs/*.md) ;;
    *) die "only an intent of docs/intent/ or a spec of docs/specs/ is parked, not $path" ;;
  esac

  local base flow
  base="$(default_branch)" || die "origin cannot be read, and the checks need its refs as they are now"
  flow="$(mode "$base")" || exit 1
  [ "$flow" = main ] && ready_main "$base"
  ready_list

  git cat-file -e "origin/$base:$path" 2>/dev/null || die "$path is not tracked on $base"
  if parked_paths | grep -qxF -- "$path"; then
    die "$path is already parked: $(grep -F -- " $path: " "$LIST" | head -n 1)"
  fi

  local file status
  case "$path" in
    docs/intent/*)
      for file in $(tracked_in "$base" docs/specs); do
        if [ "$(git show "origin/$base:$file" | field intent)" = "$path" ]; then
          die "$file names it in intent:, and an intent with a spec is not parked; park the spec instead"
        fi
      done
      local missing
      missing="$(git show "origin/$base:$path" | empty_sections)"
      [ -z "$missing" ] || die "$path needs text under every section to be parked; missing or empty:
$missing"
      ;;
    docs/specs/*)
      status="$(git show "origin/$base:$path" | field status)"
      case "$status" in
        draft) ;;
        approved)
          for file in $(tracked_in "$base" docs/backlog); do
            if [ "$(git show "origin/$base:$file" | field spec)" = "$path" ]; then
              local id
              id="$(git show "origin/$base:$file" | field id)"
              die "${id:-$file} names it in spec:, and a spec with slices is not parked: its slices carry the state"
            fi
          done
          ;;
        *) die "$path has status ${status:-none}: only a draft spec, or an approved one no slice names, is parked" ;;
      esac
      ;;
  esac

  local line last
  line="- $(date +%Y-%m-%d): $path: $why"
  # A list with no line yet ends on prose: the blank line before the first
  # item is the one Prettier would add.
  last="$(awk 'NF { l = $0 } END { print l }' "$LIST")"
  case "$last" in
    "- "*) printf '%s\n' "$line" >>"$LIST" ;;
    *) printf '\n%s\n' "$line" >>"$LIST" ;;
  esac
  local slug
  slug="$(slug_of "$path")"
  land "$flow" "$base" "docs(parked): $slug"
}

resume() {
  local path="$1"
  [ -n "$path" ] || usage
  local base flow
  base="$(default_branch)" || die "origin cannot be read, and the push needs its default branch"
  flow="$(mode "$base")" || exit 1
  [ "$flow" = main ] && ready_main "$base"
  ready_list
  parked_paths | grep -qxF -- "$path" || die "no line for $path in $LIST: nothing to resume"
  local kept
  kept="$(awk -v want="$path" '
    /^- [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]:/ {
      text = substr($0, 14)
      sub(/^[ \t]+/, "", text)
      i = index(text, ": ")
      if ((i > 0 ? substr(text, 1, i - 1) : text) == want) next
    }
    { print }
  ' "$LIST")"
  printf '%s\n' "$kept" >"$LIST"
  local slug
  slug="$(slug_of "$path")"
  land "$flow" "$base" "docs(parked): resume $slug"
}

case "${1:-}" in
  '') usage ;;
  resume) resume "${2:-}" ;;
  -*) usage ;;
  *) park "$1" "${2:-}" ;;
esac

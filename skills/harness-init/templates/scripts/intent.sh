#!/usr/bin/env bash
# The typing around an intent, so the human writes the ten lines and nothing
# else. Two commands, because the writing happens in between. What they do
# depends on the docs_mode key of AGENTS.md on the default branch.
# With `"docs_mode": "main"`:
#   intent.sh new <slug>    on the default branch, brought up to date, write
#                           docs/intent/<slug>.md with the three sections of
#                           docs/intent/README.md, empty
#   intent.sh open [<slug>] on the default branch: refuse a section that is
#                           missing or empty and a branch that carries anything
#                           else, format the file, commit it alone, push it
#                           and print the sha; the commit is the approval
# With `"docs_mode": "pr"`, the team's flow:
#   intent.sh new <slug>    cut intent/<slug> from the remote's default branch
#                           and write the same file there
#   intent.sh open          from intent/<slug>: the same checks, then commit,
#                           push, open the PR or name the one already open; the
#                           merge stays the human's
# No agent in either: the intent is the one document of the chain nobody but a
# human writes. The checks are the mechanical half of what /spec checks before
# its first question, moved before the merge; whether "What success looks
# like" is verifiable is a judgement, and stays with /spec.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# The sections of docs/intent/README.md, in order. tests/intent.test.ts holds
# them equal to both copies of the README.
SECTIONS='Problem|What success looks like|Out of scope'

die() {
  echo "intent: $*" >&2
  exit 1
}

# The mode is read the way the git hooks read it, from the file they share
# with tier.sh.
[ -f scripts/policy-lines.sh ] || die "no scripts/policy-lines.sh: run /harness-init local"
. scripts/policy-lines.sh

# main or pr, from AGENTS.md as the default branch has it on the remote: the
# rule the hooks will hold the push to, not a copy edited here. A block this
# harness cannot read stops the script on all four of its faults, instead of
# falling back to pr: in a repo that puts the intent on main the fallback
# would cut a branch nobody merges, and a repo whose rules nobody can read has
# no flow to pick. It runs inside $(...), where die exits the subshell alone,
# so both callers read the status and stop on it.
mode() {
  local agents why
  agents="$(git show "origin/$1:AGENTS.md" 2>/dev/null || true)"
  why="$(policy_why "$agents")"
  [ -z "$why" ] || die "AGENTS.md on $1: $why"
  docs_mode "$agents"
}

# The slug goes into a path, into intent/<slug> and spec/<slug>, and into the
# subjects `docs(intent): <slug>` and `docs(spec): <slug>`. /spec accepts
# [a-z0-9][a-z0-9-]*; commitlint wants a letter after the colon, so here the
# first character is a letter, or the spec commit of a digit slug is refused.
# The letters are spelled out: a range in a pattern follows the locale's
# collation on bash 3.2, and [a-z] can match capitals.
valid() {
  case "$1" in
    '' | [!abcdefghijklmnopqrstuvwxyz]* | *[!abcdefghijklmnopqrstuvwxyz0123456789-]*) return 1 ;;
  esac
}

# The remote's default branch, the one /spec cuts spec/<slug> from and reads
# the intent on. It runs inside $(...), where bash drops set -e, so every step
# returns its own failure: an offline fetch would leave the checks on the refs
# of the last one, and a slug taken since then would pass them.
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

# The sections of $1 that are missing or have no text under them, one per
# line. A section runs from its "## " heading to the next "# " or "## ".
empty_sections() {
  awk -v want="$SECTIONS" '
    BEGIN { n = split(want, w, "|"); for (i = 1; i <= n; i++) seen[w[i]] = 0 }
    /^## / { cur = substr($0, 4); sub(/[ \t\r]+$/, "", cur); next }
    /^# / { cur = ""; next }
    /[^ \t\r]/ { if (cur in seen) seen[cur] = 1 }
    END { for (i = 1; i <= n; i++) if (!seen[w[i]]) print w[i] }
  ' "$1"
}

# The two sections of the PR template this script fills, and the file it fills
# them in. Named once: the awk below matches the headings and the check before
# it wants the same two.
TEMPLATE=.github/pull_request_template.md
SLICE_SECTION='## Slice'
HOW_SECTION='## How to check by hand'

# The template belongs to the repo and this script to the harness: they travel
# apart, and a repo where the stage that copies it has not run since the
# sections were renamed carries the old headings. Filling by the heading would
# then leave the template's own comments where the slice and the line on how
# to check the intent go, and the PR would go out with them. Stop instead, and
# name the stage: no second reading of an older heading, the repo comes
# forward.
check_template() {
  [ -f "$TEMPLATE" ] || return 0
  local missing=
  grep -qxF "$SLICE_SECTION" "$TEMPLATE" || missing="$SLICE_SECTION"
  grep -qxF "$HOW_SECTION" "$TEMPLATE" || missing="${missing:+$missing and }$HOW_SECTION"
  [ -z "$missing" ] ||
    die "$TEMPLATE has no $missing section, and the body would carry its comments instead: run /harness-init ci to copy the template back, then run open again"
}

# The body of the PR: the repo's template when there is one, with no slice and
# the line on how to check it; the boxes stay as they are, an intent declares
# none of them. Without the template, that line alone.
pr_body() {
  local how="Read \`$1\`. After the merge: \`/spec $1\`."
  if [ -f "$TEMPLATE" ]; then
    awk -v how="$how" -v slice="$SLICE_SECTION" -v hand="$HOW_SECTION" '
      /^## / { h = $0 }
      /^<!--.*-->[ \t\r]*$/ && h == slice { print "none"; next }
      /^<!--.*-->[ \t\r]*$/ && h == hand { print how; next }
      { print }
    ' "$TEMPLATE"
  else
    printf '%s\n' "$how"
  fi
}

new() {
  local slug="${1:-}"
  valid "$slug" || die "the slug is lowercase letters, digits and dashes, a letter first: '$slug'"
  [ -d docs/intent ] || die "no docs/intent/ here: the repo has no harness yet, run /harness-init local"
  # A switch carries uncommitted changes along, and half a slice would land on
  # the intent branch, or on the default branch the intent goes to. Untracked
  # files travel too, and that is the point: an intent begun before this
  # command keeps its lines.
  local dirty
  dirty="$(git status --porcelain --untracked-files=no)"
  [ -z "$dirty" ] || die "commit or stash these first, the switch would carry them along:
$dirty"
  local base remote flow file="docs/intent/$slug.md"
  base="$(default_branch)" || die "origin cannot be read, and the checks need its refs as they are now"
  flow="$(mode "$base")" || exit 1
  if git cat-file -e "origin/$base:$file" 2>/dev/null; then
    die "$file is already on $base: an intent is not rewritten, pick another slug"
  fi
  if git cat-file -e "origin/$base:docs/specs/SPEC-$slug.md" 2>/dev/null; then
    die "docs/specs/SPEC-$slug.md is already on $base: pick another slug"
  fi
  if [ "$flow" = main ]; then
    on_default "$base"
    write_skeleton "$file" "on $base"
    echo "intent: then scripts/intent.sh open $slug"
    edit "$file"
    return 0
  fi
  remote="$(git ls-remote --heads origin "refs/heads/intent/$slug")" ||
    die "origin cannot be read, and the checks need its refs as they are now"
  if git show-ref -q --verify "refs/heads/intent/$slug" || [ -n "$remote" ]; then
    die "the branch intent/$slug exists: someone is writing this intent"
  fi
  git switch -q --no-track -c "intent/$slug" "origin/$base"
  write_skeleton "$file" "on intent/$slug"
  echo "intent: then scripts/intent.sh open"
  edit "$file"
}

# The default branch checked out and level with the remote. A local one ahead
# stays ahead: open refuses to push what is not the intent, and says what.
on_default() {
  if [ "$(git symbolic-ref -q --short HEAD || true)" != "$1" ]; then
    if git show-ref -q --verify "refs/heads/$1"; then
      git switch -q "$1"
    else
      git switch -q -c "$1" --track "origin/$1"
    fi
  fi
  git merge -q --ff-only "origin/$1" 2>/dev/null ||
    die "$1 and origin/$1 have gone apart: git pull --rebase, then run this again"
}

write_skeleton() {
  if [ -e "$1" ]; then
    echo "intent: $2, $1 was already there and is kept"
  else
    tr '|' '\n' <<<"$SECTIONS" | awk 'NR > 1 { print "" } { print "## " $0 }' >"$1"
    echo "intent: $2, write $1 (docs/intent/README.md says what goes in each section)"
  fi
}

edit() {
  local editor="${VISUAL:-${EDITOR:-}}"
  if [ -n "$editor" ] && [ -t 0 ] && [ -t 1 ]; then
    # Unquoted on purpose: an editor is often a command with its flags, code -w.
    $editor "$1"
  fi
}

# The intents on the default branch that origin does not have yet: written and
# not committed, or committed and not pushed, which is where a refused push
# leaves one. README.md is the folder's, never an intent.
pending() {
  {
    git status --porcelain --untracked-files=all -- docs/intent/ | cut -c4-
    git diff --no-renames --name-only "origin/$1...HEAD" -- docs/intent/
  } | { grep -E '^docs/intent/[^/]+\.md$' || true; } | { grep -vx 'docs/intent/README.md' || true; } | LC_ALL=C sort -u
}

# With su main there is no branch and no PR: the file goes on the default
# branch in a commit of its own, the push is the approval, and the hooks hold
# it to the same rule, a commit made only of documents.
open_main() {
  local base="$1" slug="${2:-}" branch file found
  branch="$(git symbolic-ref -q --short HEAD || true)"
  [ "$branch" = "$base" ] ||
    die "AGENTS.md says docs_mode main, so the intent goes on $base: run it from $base, this is ${branch:-a detached HEAD}"
  if [ -z "$slug" ]; then
    found="$(pending "$base")"
    case "$(printf '%s' "$found" | grep -c . || true)" in
      0) die "no intent to open here: scripts/intent.sh new <slug> writes one" ;;
      1) slug="$(basename "$found" .md)" ;;
      *) die "more than one intent is waiting, name the one to open with scripts/intent.sh open <slug>:
$found" ;;
    esac
  fi
  valid "$slug" || die "the slug is lowercase letters, digits and dashes, a letter first: '$slug'"
  file="docs/intent/$slug.md"
  [ -f "$file" ] || die "$file does not exist"
  local missing
  missing="$(empty_sections "$file")"
  [ -z "$missing" ] || die "$file needs text under every section; missing or empty:
$missing"
  # The push carries everything $base holds that origin does not. The intent
  # is the only thing it may carry: the rest would land on main unread.
  local others
  others="$(git diff --no-renames --name-only "origin/$base...HEAD" | grep -vxF "$file" || true)"
  [ -z "$others" ] || die "$base carries more than $file, and the push would take it along:
$others"
  git merge -q --ff-only "origin/$base" 2>/dev/null ||
    die "$base and origin/$base have gone apart: git pull --rebase, then run this again"
  pnpm exec prettier --write --log-level warn "$file"
  git add -- "$file"
  if ! git diff --cached --quiet -- "$file"; then
    git commit -q -m "docs(intent): $slug" -- "$file"
  fi
  git push -q origin "$base" ||
    die "the commit is here and the push did not go through, its message is above; a run of open after the fix pushes the same commit"
  echo "intent: $file is on $base, $(git rev-parse --short HEAD)"
  echo "intent: next, /spec $file"
}

open_pr() {
  local base flow
  base="$(default_branch)" || die "origin cannot be read, and the push needs its default branch"
  flow="$(mode "$base")" || exit 1
  if [ "$flow" = main ]; then
    open_main "$base" "${1:-}"
    return 0
  fi
  local branch slug
  branch="$(git symbolic-ref -q --short HEAD || true)"
  slug="${branch#intent/}"
  if [ "$branch" != "intent/$slug" ] || ! valid "$slug"; then
    die "run it from intent/<slug>, the branch intent.sh new cut; this is ${branch:-a detached HEAD}"
  fi
  local file="docs/intent/$slug.md"
  [ -f "$file" ] || die "$file does not exist"
  local missing
  missing="$(empty_sections "$file")"
  [ -z "$missing" ] || die "$file needs text under every section; missing or empty:
$missing"
  local changed others
  # The PR opens from inside this script, where the hook that wants a verdict
  # never sees the command. So it carries the intent and nothing else, which
  # is tier 0 and owes no verdict. Renames count by both names, as in tier.sh.
  changed="$(git diff --no-renames --name-only "origin/$base...HEAD")"
  others="$(printf '%s\n' "$changed" | grep -vxF "$file" || true)"
  [ -z "$others" ] || die "intent/$slug carries more than $file; these go on a branch of their own:
$others"
  pnpm exec prettier --write --log-level warn "$file"
  git add -- "$file"
  # The path makes it a commit of this file only: whatever else is staged
  # stays staged, and out of a PR that the human gate reads as one intent.
  if ! git diff --cached --quiet -- "$file"; then
    git commit -q -m "docs(intent): $slug" -- "$file"
  fi
  git push -q -u origin "intent/$slug"
  # gh refuses a second PR for the same head, and a run after a failed push or
  # a PR opened by hand is the normal case, not an error: the open one is the
  # answer.
  local url
  url="$(gh pr list --head "intent/$slug" --state open --json url --jq '.[0].url // empty')" || url=""
  if [ -n "$url" ]; then
    echo "intent: the PR is already open, $url"
    return 0
  fi
  check_template
  pr_body "$file" | gh pr create --base "$base" --head "intent/$slug" --title "docs(intent): $slug" --body-file - ||
    die "intent/$slug is pushed and gh did not open the PR, its message is above; a run of open after the fix commits nothing new"
}

case "${1:-}" in
  new) new "${2:-}" ;;
  open) open_pr "${2:-}" ;;
  *)
    echo "usage: intent.sh new <slug> | intent.sh open [<slug>]" >&2
    exit 2
    ;;
esac

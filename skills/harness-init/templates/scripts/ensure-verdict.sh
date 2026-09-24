#!/usr/bin/env bash
# Claude Code PreToolUse hook (matcher: Bash). No verdict for this head, no
# `gh pr create`. The rule lives here and not in the model's memory: a session
# that forgot /judge is stopped by the tool call, not by a line it read once.
#
# Verified against the hooks reference (code.claude.com/docs/en/hooks) on
# 2026-09-08: stdin is the tool call as JSON, and a deny is the object
# {"hookSpecificOutput": {"hookEventName": "PreToolUse",
#  "permissionDecision": "deny", "permissionDecisionReason": "<text>"}}
# on stdout with exit 0. The reason is what the human and the agent read, so it
# says what to run. Re-check before editing: hook contracts move.
#
# What it stops is a session that forgot `/judge`, which is the whole point of
# moving the rule out of the model's memory. It is not a sandbox: `eval` and
# `bash -c '...'` hide the command inside a string, and there the words are
# indistinguishable from the prose that documents them. A session that means to
# get around it can; a session that lost the thread cannot.
#
# It bites only where the judge stage is installed and only where the judge
# would run anyway: no scripts/tier.sh or no .github/judge/ means the repo does
# not have the chain yet, and tier 0 and tier 3 never judge, on the server or
# here. A tier that cannot be computed is a deny, not a pass: a broken gate
# that lets everything through is worse than one that says so.
set -euo pipefail
input="$(cat)"
# Without jq the command cannot be read out of the call, and denying every
# Bash call would brick the session. The raw payload is the fallback, the same
# one ensure-hooks.sh takes: it can only be more eager, never less, so the gate
# does not open when a tool is missing. deny() works without jq too.
if command -v jq >/dev/null 2>&1; then
  cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || true)"
  escaped=""
  quotes=""
else
  # The raw payload is JSON, and two things about it are not true of a parsed
  # command. It sits inside a pair of double quotes, with nothing between them
  # and the first word. And its newlines are not newlines: they are the two
  # characters backslash and n, so a command written on two lines would hide
  # the second one behind an ordinary letter. Both have to become separators
  # here, or this branch matches less than the other one instead of more.
  # Only here: on a parsed command a quote means the words are prose.
  cmd="$input"
  escaped='s/\\[nrt]/;/g'
  quotes='"'
fi
# It has to be the command, not a mention of it. A tool call is one string, and
# a heredoc that documents the command, a grep for it or a quoted example carry
# the same three words: a hook that blocked on a mention would block writing
# the file that documents it, which is how this line was found. Command
# position is the start, a new line or a separator; a quote before it is not.
# Newlines and braces become separators first, so the pattern stays a plain
# ERE. What may sit between a separator and the command: the variable
# assignments that prefix one, the keywords that take one, the wrappers that
# run one, and a path, because `gh` can be called as /usr/local/bin/gh.
probe="$(printf '%s' "$cmd" | sed "${escaped:-}" | tr "\n{}$quotes" ';;;;')"
# A here-string and not a pipe: grep -q closes the pipe on the first match, and
# with pipefail a producer killed by SIGPIPE would turn a match into a non-zero
# status, which ends the hook as an error and lets the call through. The same
# accidental fail-open the comment below documents for origin/HEAD.
grep -Eq '(^|[;&|(])[[:space:]]*([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*((if|then|elif|else|do|while|until|env|command|exec|time|sudo|nohup|xargs)[[:space:]]+)*([^[:space:];&|]*/)?gh[[:space:]]+pr[[:space:]]+create([[:space:]]|[;&|)]|$)' <<< "$probe" \
  || exit 0

# The deny object. jq builds it when there is one; otherwise printf does, and
# the reason loses the characters that would need escaping. Every reason below
# is written without them, so the fallback prints the same text.
deny() {
  if command -v jq >/dev/null 2>&1; then
    jq -n --arg r "$1" '{hookSpecificOutput: {hookEventName: "PreToolUse",
      permissionDecision: "deny", permissionDecisionReason: $r}}'
  else
    printf '{"hookSpecificOutput": {"hookEventName": "PreToolUse", '
    printf '"permissionDecision": "deny", "permissionDecisionReason": "%s"}}\n' \
      "$(printf '%s' "$1" | tr -d '"\\' | tr '\n' ' ')"
  fi
  exit 0
}

root="$(git rev-parse --show-toplevel 2>/dev/null || printf '%s' "${CLAUDE_PROJECT_DIR:-.}")"
cd "$root"
[ -x scripts/tier.sh ] || exit 0
[ -x scripts/judge.sh ] || exit 0
[ -d .github/judge ] || exit 0

# The head of the PR that is about to open: what --head or -H says, or HEAD.
# /next works each slice in a worktree of its own and opens the PR from the
# root, whose HEAD is the default branch: reading HEAD there would ask the
# verdict of the wrong branch. The scripts below read HEAD, so the hook moves
# into the worktree where that branch is checked out, and the verdict is
# there too, because the store is one per clone. A branch checked out nowhere
# leaves no HEAD to compute a tier from, and a tier that cannot be computed
# is a deny. Read like --base below: the first one, standing on its own,
# filtered to what a ref may contain.
want="$(awk '
  {
    for (i = 1; i <= NF; i++) {
      if ($i == "--head" || $i == "-H") { print $(i + 1); exit }
      if ($i ~ /^--head=/) { sub(/^--head=/, "", $i); print $i; exit }
      if ($i ~ /^-H=/) { sub(/^-H=/, "", $i); print $i; exit }
    }
  }' <<< "$cmd" | tr -cd 'A-Za-z0-9._/-')"
if [ -n "$want" ]; then
  tree="$(git worktree list --porcelain 2>/dev/null | awk -v ref="refs/heads/$want" '
    /^worktree / { path = substr($0, 10) }
    $0 == "branch " ref { print path; exit }' || true)"
  if [ -z "$tree" ]; then
    deny "the harness cannot read the head of this PR: $want is not checked out in any worktree of this clone, and the tier and the verdict are read from a checkout of it. Run the command where $want is checked out, or check it out with git worktree add, then run /judge if it has no verdict."
  fi
  cd "$tree"
fi

# The base of the PR that is about to open: what --base says, or the remote's
# default branch, or main. tier.sh wants a ref that exists in this clone.
# What a ref may contain, not "everything up to the next space": in the raw
# payload of the branch above, --base main is followed by the JSON that closes
# the object, and the hook would deny naming a ref nobody wrote.
# Both spellings gh takes for the same option, --base and -B: reading only the
# long one leaves the hook computing the tier, and so which verdicts it wants,
# against a base that is not the PR's. The word has to stand on its own and the
# first one wins: a regex with a greedy .* took the last, which could be one
# quoted inside --title. Nothing here parses a shell, so a --base written
# before the real one inside a title still fools it; taking the first only
# makes that the unlikely order instead of the usual one.
# The value passes through a filter of what a ref may contain, because in the
# jq-less branch above it is followed by the JSON that closes the object.
base="$(awk '
  {
    for (i = 1; i <= NF; i++) {
      if ($i == "--base" || $i == "-B") { print $(i + 1); exit }
      if ($i ~ /^--base=/) { sub(/^--base=/, "", $i); print $i; exit }
      if ($i ~ /^-B=/) { sub(/^-B=/, "", $i); print $i; exit }
    }
  }' <<< "$cmd" | tr -cd 'A-Za-z0-9._/-')"
if [ -z "$base" ]; then
  # pipefail plus set -e: without the fallback, a clone with no origin/HEAD
  # ends the hook here with status 1, which reads as a hook that errored and
  # lets the call through. A gate must never fail open by accident.
  base="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||' || true)"
fi
base="${base:-main}"
if ! git rev-parse --verify --quiet "$base" >/dev/null 2>&1; then
  if git rev-parse --verify --quiet "origin/$base" >/dev/null 2>&1; then
    base="origin/$base"
  else
    deny "the harness cannot tell what this PR branches from: neither $base nor origin/$base is a ref in this clone. Fetch the base branch, then run /judge."
  fi
fi

# judge.sh answers three things, and only the middle one is a pass: 0 judge,
# 1 this tier never judges, 2 the tier could not be computed. A gate that
# cannot tell has to stop.
set +e
tier="$(scripts/judge.sh required "$base" 2>/dev/null)"
asks=$?
set -e
if [ "$asks" -eq 1 ]; then exit 0; fi
if [ "$asks" -ne 0 ]; then
  deny "scripts/tier.sh failed against $base, so the harness cannot tell whether this PR needs a verdict. Run scripts/tier.sh $base and read the error."
fi

# Every role the tier asks for, not just the first: at tier 2 the chain judges
# twice, and letting the PR open on the correctness verdict alone would drop
# the security judgement: no workflow judges, so what /judge does not do here
# nobody does later.
# And every role against this base. A verdict is stored for a head, and the
# same head against two bases is two diffs: without the base the judgement of
# one PR would open another one, on a diff nobody read. `have` says which of
# the two it is, so the reason can too.
# A verdict of a commit before HEAD counts too, once its answers reach HEAD:
# the judge ran once, and each high or medium finding has the commit that
# closes it. When they do not, `have` says so with 4 and prints the judged
# commit and the findings still open, and the reason says to fix and answer:
# the judge does not run a second time on the same work.
missing=""
stale=""
open=""
past=""
head="$(git rev-parse --short HEAD)"
for role in $(scripts/judge.sh roles "$tier"); do
  set +e
  said="$(scripts/judge.sh have "$role" "$base" 2>/dev/null)"
  answer=$?
  set -e
  case "$answer" in
    0) ;;
    3) stale="${stale:+$stale and }$role" ;;
    4)
      judged="$(printf '%s\n' "$said" | sed -n 1p | cut -c1-7)"
      ids="$(printf '%s\n' "$said" | sed -n 2p)"
      if [ -n "$ids" ]; then
        open="${open:+$open; }the $role verdict of $judged has no answer to $ids"
      else
        past="${past:+$past; }$head answers none of the findings of the $role verdict of $judged"
      fi
      ;;
    *) missing="${missing:+$missing and }$role" ;;
  esac
done
[ -n "$missing$stale$open$past" ] || exit 0
if [ -n "$open" ] && [ -z "$missing$stale$past" ]; then
  deny "this PR is tier $tier and $open. Fix each of them in a commit and answer it with scripts/judge.sh answer <id> <sha> <role>: the judge runs once per PR, and the answer is what carries its verdict to the fix."
fi
what=""
[ -z "$missing" ] || what="$head has no $missing verdict"
[ -z "$stale" ] || what="${what:+$what, and }the $stale verdict of $head does not cover the diff against $base"
[ -z "$open" ] || what="${what:+$what, and }$open"
[ -z "$past" ] || what="${what:+$what, and }$past"
if [ -z "$missing$stale" ]; then
  deny "this PR is tier $tier and $what. Answer the finding each commit closes with scripts/judge.sh answer <id> <sha> <role>; a commit that closes none is work nobody judged, and it wants /judge --base $base on its own."
fi
deny "this PR is tier $tier and $what. Run /judge --base $base first: it judges this branch at clean context and stores one verdict per role the tier asks for, then this command goes through and scripts/policy.sh posts them on the PR."

#!/usr/bin/env bash
# Sourced, never run: how the scripts of the chain read the policy block of
# AGENTS.md, written once. tier.sh reads it at the base ref in CI, the git
# hooks and intent.sh on main, and a pattern one of them accepts is one the
# others accept too. Bash 3.2, jq, and the text of AGENTS.md in, no side
# effects.
#   policy_fence <agents>          the json fence under the heading, as it is
#   policy_json <agents> <filter>  the policy block through jq, one value a line
#   policy_tool_missing            says so when jq is not installed, empty otherwise
#   policy_why <agents>            why the block cannot be read, empty when it can
#   policy_match <file> <patterns> the first pattern that matches, empty when none
#   docs_mode <agents>             main when the block says main, else pr
#   docs_outside <agents> <files>  the first file a commit on main may not carry
# <agents> is the text of the file, not a path: each caller reads it from the
# ref it trusts, and none of them from a copy the change under review wrote.

# The version of the block this script reads, and the keys it needs. Written
# here once, because every reader of the block comes through these functions:
# a repo mounted from an older template that says the same version keeps
# working, and a block that says a version this script has never read stops
# its readers, since a key read wrong is worse than a key not read at all.
POLICY_VERSIONS='1'
POLICY_KEYS='version docs_mode sensitive_paths never_tier_0 human_gate_paths docs_extra_paths max_lines max_files'

# The json fence under `## Policy block`, cut by awk. The one place that reads
# the file: everything else here and in tier.sh asks for a key. The heading
# and the key names are the contract; the prose around them is not, and
# translating it moves nothing.
# The section is the one under that heading and no other, and inside it the
# fence opens at a line that is exactly ```json and closes at the first ```
# after it: a json block somewhere else in the file is not the policy.
policy_fence() {
  printf '%s\n' "$1" | awk '
    /^## / { on = ($0 ~ /^## Policy block[ \t]*$/); next }
    !on { next }
    !inside && /^```json[ \t]*$/ { inside = 1; next }
    inside && /^```[ \t]*$/ { exit }
    inside { print }
  '
}

# The fence given to jq. Empty when there is no block or when jq refuses it:
# every caller asks policy_why first, and gets the fault named there.
policy_json() {
  policy_fence "$1" | jq -r "$2" 2>/dev/null || true
}

# jq is how the block is read, so without it nothing here can tell a block
# that is fine from one that is not. That is the environment and not the
# policy, and it stays a question of its own, for the caller that has to
# answer differently for the two: tier.sh fails closed at 2 for a machine
# without jq and at 3 for a block it has read and cannot use, because only
# the second is the repo failing to say how it wants to be judged. Zero and a
# line when jq is missing, one and nothing when it is there, so it reads as a
# condition.
policy_tool_missing() {
  command -v jq >/dev/null 2>&1 && return 1
  echo "jq is not installed, and the policy block is read with it: install jq"
}

# Why the block cannot be read, one line, empty when it can. Four faults with
# one answer: no fence at all, a fence jq refuses, a key missing, a version
# this script does not know. Whoever reads the block stops on all four and
# says which one it is, because a rule half read is a rule applied wrong: a
# missing key does not widen anything, it leaves a list empty, and an empty
# list is a gate that catches nothing. Every message of the four names the
# stage that writes the block back, since no script here repairs it; the
# missing jq above comes first and names what to install instead.
policy_why() {
  local fence missing version
  if policy_tool_missing; then return 0; fi
  fence="$(policy_fence "$1")"
  case "$fence" in
    *[![:space:]]*) ;;
    *)
      echo "no policy block under '## Policy block': run /harness-init local"
      return 0
      ;;
  esac
  # The exit status and not the output: a fence that parses to something that
  # is not an object has no keys to read either.
  if ! printf '%s\n' "$fence" | jq -e 'type == "object"' >/dev/null 2>&1; then
    echo "the policy block is not valid json: run /harness-init local"
    return 0
  fi
  missing="$(printf '%s\n' "$fence" | jq -r --arg want "$POLICY_KEYS" '($want | split(" ")) - keys_unsorted | join(", ")')"
  if [ -n "$missing" ]; then
    echo "the policy block has no $missing: run /harness-init local"
    return 0
  fi
  version="$(printf '%s\n' "$fence" | jq -r '.version')"
  case " $POLICY_VERSIONS " in
    *" $version "*) ;;
    *)
      echo "the policy block says version $version and this harness reads $POLICY_VERSIONS: run /harness-init local"
      return 0
      ;;
  esac
}

# First pattern of $2 (one per line) that matches $1, empty when none does.
# Both ** and * cross slashes: the patterns are read, not compiled.
policy_match() {
  local file="$1" pat glob
  while IFS= read -r pat; do
    [ -z "$pat" ] && continue
    glob="${pat//\*\*/*}"
    case "$file" in $glob) printf '%s' "$pat"; return 0 ;; esac
  done <<EOT
$2
EOT
  return 0
}

# `main` lets a commit of documents on main, anything else keeps main closed to
# every commit. `pr` and a word this does not know both read as pr. A block
# policy_why refuses never reaches here, because its callers stop first; this
# stays the backstop, and a rule that cannot be read does not open the branch.
docs_mode() {
  case "$(policy_json "$1" '.docs_mode')" in
    main) echo main ;;
    *) echo pr ;;
  esac
}

# What a commit on main may carry under `main`: the paths of human_gate_paths,
# the documents a human approves, plus docs_extra_paths, which is how a repo
# adds its own.
docs_paths() {
  policy_json "$1" '.human_gate_paths[]'
  policy_json "$1" '.docs_extra_paths[]'
}

# The first file of $2 (one per line) that is not a document, empty when all
# of them are. Names are read whole, one per line, as tier.sh reads them. A
# name git prints quoted is outside: quoted, it no longer looks like the name
# it is, and tier.sh reads it as sensitive for the same reason. So is a
# contract wherever it sits, the floor tier.sh keeps too: Claude Code loads an
# AGENTS.md or a CLAUDE.md at any depth and follows it, and under a document
# path the pattern alone would let one onto main with no PR and no judge. The
# floor stays here and not in the block, because the file that holds the gates
# cannot be the one to declare itself sensitive.
docs_outside() {
  local paths file
  paths="$(docs_paths "$1")"
  while IFS= read -r file; do
    [ -z "$file" ] && continue
    case "$file" in
      \"* | AGENTS.md | */AGENTS.md | CLAUDE.md | */CLAUDE.md | .claude/* | */.claude/*)
        printf '%s' "$file"
        return 0
        ;;
    esac
    if [ -z "$(policy_match "$file" "$paths")" ]; then
      printf '%s' "$file"
      return 0
    fi
  done <<EOT
$2
EOT
  return 0
}

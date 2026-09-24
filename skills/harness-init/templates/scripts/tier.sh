#!/usr/bin/env bash
# Review tier of the current branch against a base ref. Same output locally
# and in CI: the tier on stdout, the reasons on stderr. Max signal wins.
#   0  the prose nobody executes (docs/intent, specs, backlog, decisions,
#      review-log) at any size; any other docs (*.md, docs/, *.txt) <= 20
#      lines, except the contracts, which are never 0
#   1  inside max_lines and max_files, nothing else
#   2  bigger, or a sensitive path, or a dependency change, or .github/**,
#      or migration/schema, or a checked box in the PR body
#   3  slice human: true, labels tests-weakened / needs-human, or a policy
#      block at the base ref this script cannot read
#      (judge:<role>:crashed is not a signal: the next run judges again)
# The tier says how much scrutiny the diff needs, not who may merge it: those
# are two questions. A file under a path of human_gate_paths prints
# `human-gate: <file>` on stderr; ci.yml turns it into a label, and neither
# automerge.yml nor policy.sh merges that PR, tier 0 included. A label already
# on the PR is kept: a brake stays until a human takes it off, whatever the
# next push touches.
# The lists and the two thresholds come from the policy block of AGENTS.md
# read at the base ref, never from the working tree: on `pull_request` the
# tree is the PR's own copy, and a PR does not get to widen the rules it is
# judged by. No block at the base ref means no lists, and the script fails
# closed at tier 3 instead of open at 0 or 1: a repo that cannot say how a
# diff is judged is not one a model gets to judge. The slice's human flag is
# read at the base ref too, for the same reason.
# Usage: tier.sh [base-ref]   env: PR_BODY, PR_LABELS (comma separated), GITHUB_HEAD_REF
set -euo pipefail
base="${1:-origin/main}"
# The reading of the policy block lives next to this script, shared with the
# git hooks: a pattern this script accepts is one they accept. Found by this
# script's own path, before the cd, so a copy run against another checkout
# still finds it.
# The file belongs to stage local: a repo that runs stage ci again first
# would otherwise get a tier job that dies here with bash's words alone.
here="$(cd "$(dirname "$0")" && pwd)"
if [ ! -f "$here/policy-lines.sh" ]; then
  echo "tier: no scripts/policy-lines.sh next to this script, the reading of the policy block: run /harness-init local" >&2
  exit 2
fi
. "$here/policy-lines.sh"
cd "$(git rev-parse --show-toplevel)"
range="$base...HEAD"

tier=1
why() { echo "tier: $*" >&2; }
up() { [ "$1" -gt "$tier" ] && tier="$1"; why "$2"; }

# The prose nobody executes: no agent reads it to act on it, so no model reads
# it to judge it either. Apart from it stand the documents an agent does
# execute and the contracts, which are never tier 0 however short the diff:
# their list comes from the policy block.
prose='docs/intent/**
docs/specs/**
docs/backlog/**
docs/decisions/**
docs/review-log/**'

# First pattern of $2 (one per line) that matches $1, empty when none does.
match() { policy_match "$@"; }

# The policy block of AGENTS.md as it is at the base ref, one key at a time.
agents="$(git show "$base:AGENTS.md" 2>/dev/null || true)"
policy() { policy_json "$agents" "$1"; }
sensitive="$(policy '.sensitive_paths[]')"
gate="$(policy '.human_gate_paths[]')"
# The two thresholds of tier 1. A repo widens them in its own AGENTS.md, which
# is sensitive and never tier 0, so the change comes out tier 2 with the judge
# on it. Read as text and checked before use: without the block they arrive
# empty, the tier is already 2 for that, and a comparison against nothing
# would be a bash error.
max_lines="$(policy '.max_lines')"
max_files="$(policy '.max_files')"
number() { case "$1" in '' | *[!0123456789]*) return 1 ;; esac; }
# The contracts. AGENTS.md and CLAUDE.md at any depth, which Claude Code loads
# and follows, .claude/ with its commands, agents and skills, and the map are
# in every repo of the chain, so they are never tier 0 whatever the base says;
# never_tier_0 adds the repo's own.
contract="AGENTS.md
CLAUDE.md
*/AGENTS.md
*/CLAUDE.md
.claude/**
docs/codebase-map.md
$(policy '.never_tier_0[]')"

# A name has to reach the patterns as the name it is. core.quotePath off, or
# a name with a byte over 0x80 comes quoted and escaped; a name with a double
# quote, a backslash or a control character comes quoted whatever the setting,
# and the loop below reads it as sensitive: a miss on that list is a tier too
# low. --no-renames, or a file moved out of a sensitive path would show only
# under its new name, and an exact move counts zero lines.
names="$(git -c core.quotePath=false diff --no-renames --name-only "$range")"
nnames="$(printf '%s\n' "$names" | grep -c . || true)"
# Generated files: lockfiles, build info, build output. Their size says
# nothing about what there is to get wrong, so they leave the count of files
# and lines, and only that. Every name still goes through the contracts, the
# sensitive paths and the human gate: filtered before the matching, a lockfile
# alone or a file under any dist/ would count as no file at all, and pass at 0.
generated='(^|/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|uv\.lock)$|\.tsbuildinfo$|(^|/)dist/'
nfiles="$(printf '%s\n' "$names" | { grep -Ev "$generated" || true; } | grep -c . || true)"
# numstat is added, deleted and the name, split by tabs. On awk's default
# whitespace a name with a space would be cut there, and a first word that
# looks generated would take the whole file's lines out of the count. The
# pattern goes in through ENVIRON: -v would read its backslashes as escapes.
lines="$(git -c core.quotePath=false diff --no-renames --numstat "$range" | generated="$generated" awk -F'\t' '$3 !~ ENVIRON["generated"] {a+=$1+$2} END {print a+0}')"

# File names come from the PR author: read one per line, never word-split.
all_prose=1
docs_only=1
prose_hit=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  hit="$(match "$f" "$prose")"
  if [ -n "$hit" ]; then
    if [ -z "$prose_hit" ]; then prose_hit="$hit"; fi
  else
    all_prose=0
  fi
  if [ -n "$(match "$f" "$contract")" ]; then
    docs_only=0
  else
    case "$f" in *.md|docs/*|*.txt|LICENSE*) ;; *) docs_only=0 ;; esac
  fi
done <<EOT
$names
EOT

if [ "$nnames" -eq 0 ]; then
  tier=0
  why "no files"
elif [ "$all_prose" -eq 1 ]; then
  tier=0
  why "prose nobody executes ($prose_hit), $lines lines"
elif [ "$docs_only" -eq 1 ] && [ "$lines" -le 20 ]; then
  tier=0
  why "docs only, $lines lines"
fi

# Size is a proxy for how much there is to get wrong in code. Prose has no
# size limit: a spec is long because it is a spec.
if [ "$all_prose" -eq 0 ]; then
  if number "$max_lines" && [ "$lines" -gt "$max_lines" ]; then up 2 "$lines lines > $max_lines"; fi
  if number "$max_files" && [ "$nfiles" -gt "$max_files" ]; then up 2 "$nfiles files > $max_files"; fi
fi

# Without the policy block nothing below can raise the tier, and neither can
# the two lines above: fail closed, and at 3, which is the tier that wants a
# human and that no model judges. The four ways the block can be unreadable
# are told apart by policy_why, shared with the git hooks and intent.sh, so a
# repo answers the same way wherever the chain reads its rules. The floor
# above does not come from the block and holds through all four.
if [ -z "$agents" ]; then
  up 3 "no AGENTS.md at $base, the path lists are empty: run /harness-init local"
elif tool_why="$(policy_tool_missing)"; then
  # Without jq the lists arrive empty as well, so the tier fails closed here
  # too, but at 2: the repo said how it wants to be judged and this machine
  # cannot read it. Only a block that was read and cannot be used says 3,
  # because only then is it the repo that cannot answer.
  up 2 "$tool_why"
else
  block_why="$(policy_why "$agents")"
  if [ -n "$block_why" ]; then up 3 "AGENTS.md at $base: $block_why"; fi
fi

while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in \"*) up 2 "a name git prints quoted, read as sensitive: $f" ;; esac
  hit="$(match "$f" "$sensitive")"
  if [ -n "$hit" ]; then up 2 "sensitive path $f ($hit)"; fi
  hit="$(match "$f" "$gate")"
  if [ -n "$hit" ]; then echo "human-gate: $f ($hit)" >&2; fi
  case "$f" in
    .github/*) up 2 "$f" ;;
    pnpm-lock.yaml|package-lock.json|yarn.lock|uv.lock) up 2 "lockfile $f" ;;
    *migrat*|*schema*|prisma/*|drizzle/*|*/migrations/*) up 2 "migration or schema $f" ;;
  esac
done <<EOT
$names
EOT
mb="$(git merge-base "$base" HEAD)"
deps() { { git show "$1:package.json" 2>/dev/null || echo '{}'; } | jq -S '[.dependencies, .devDependencies, .peerDependencies, .optionalDependencies]' 2>/dev/null || echo invalid; }
[ "$(deps "$mb")" != "$(deps HEAD)" ] && up 2 "dependency change in package.json"
if git diff "$range" -- pyproject.toml | grep -Eq '^[+-].*[A-Za-z0-9_.-]+ *(>=|==|~=|<=|>|<|\^) *[0-9]'; then up 2 "dependency change in pyproject.toml"; fi

if printf '%s\n' "${PR_BODY:-}" | grep -Eq '^- \[x\]'; then up 2 "declared in the PR body"; fi

labels=",${PR_LABELS:-},"
case "$labels" in *,tests-weakened,*) up 3 "tests-weakened" ;; esac
case "$labels" in *,needs-human,*) up 3 "needs-human" ;; esac
# A brake put on by hand, or by an earlier push, does not come off on its own.
case "$labels" in *,human-gate,*) echo "human-gate: kept from the label" >&2 ;; esac

# The slice flag is read at the base ref as well: a PR that sets its own slice
# to human: false does not get out of tier 3 that way. The working tree still
# counts, so a slice that exists only on the branch raises the tier too. A
# here-string and not a pipe into grep -q, which under pipefail could turn a
# match into a failure.
branch="${GITHUB_HEAD_REF:-$(git rev-parse --abbrev-ref HEAD)}"
sid="$(printf '%s' "$branch" | sed -n 's#^slice/\(S[0-9][0-9]*\)-.*#\1#p')"
if [ -n "$sid" ]; then
  flagged=""
  while IFS= read -r s; do
    case "$s" in \"docs/backlog/"$sid"-*) flagged="$s at $base, a name git prints quoted"; continue ;; esac
    case "$s" in docs/backlog/"$sid"-*.md) ;; *) continue ;; esac
    if grep -Eq '^human: *true' <<< "$(git show "$base:$s" 2>/dev/null || true)"; then flagged="$s at $base"; fi
  done <<EOT
$(git -c core.quotePath=false ls-tree --name-only "$base" docs/backlog/ 2>/dev/null || true)
EOT
  for s in docs/backlog/"$sid"-*.md; do
    if [ -f "$s" ] && grep -Eq '^human: *true' "$s"; then flagged="${flagged:-$s}"; fi
  done
  if [ -n "$flagged" ]; then up 3 "slice $sid is human: true ($flagged)"; fi
fi

echo "$tier"

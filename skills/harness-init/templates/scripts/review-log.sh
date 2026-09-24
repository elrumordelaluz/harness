#!/usr/bin/env bash
# On merge, close.yml runs this: every verdict the judge posted on the PR goes
# to the review log, one line each, with the outcome filled in.
#   review-log.sh <pr-number> [verdicts.jsonl]
# Env: MERGED_BY (login of who merged; a `[bot]` login means the policy; empty,
# it is read from the PR), JUDGE_LOGINS (comma separated logins the chain
# writes with: the App slug and github-actions), GH_TOKEN,
# GITHUB_STEP_SUMMARY (where the notice below goes when the PR refuses it).
# Run it again on a merged PR and nothing is written twice: a verdict the log
# already holds is skipped. That is how a verdict posted after the merge, which
# the run at closing time could not see, still reaches the log. A run that
# appends nothing and leaves the PR without a line says so on the PR itself,
# because the audit reads a PR with no line as a PR nobody judged.
# From a terminal the policy merges with the account gh is logged in with, and
# that login is a person's: a verdict of the judge whose decision line says
# the policy merged credits the policy too.
# The marker "<!-- verdict:<role> -->" says where the JSON is, not who wrote
# it. A comment is a verdict only if its author is one of JUDGE_LOGINS, or the
# owner or a member of the repo: anyone else can write the marker on a public
# repo, and the log is what the audit tunes the thresholds on. A rejected
# comment is named on stderr, never dropped in silence.
set -euo pipefail
pr="$1"
out="${2:-docs/review-log/verdicts.jsonl}"
# close.yml fills MERGED_BY from the event. By hand, days later, there is no
# event: the PR itself says who merged, and the line credits them and not
# whoever reran the script. A read that comes back with nothing is a PR that
# was not merged, and `human` is the right answer for it.
merged_by="${MERGED_BY:-}"
if [ -z "$merged_by" ]; then
  merged_by="$(gh pr view "$pr" --json mergedBy -q '.mergedBy.login // ""' 2>/dev/null || true)"
fi
case "$merged_by" in *"[bot]"*) by=policy ;; *) by=human ;; esac
ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# The allowlist without empty elements: without the App close.yml passes
# "github-actions," and an empty element would match an empty login, which
# is what gh reports for a deleted account.
allowed=",$(printf '%s' "${JUDGE_LOGINS:-}" | tr ',' '\n' | grep . | tr '\n' ',' || true)"
is_judge() {
  local login="$1" assoc="$2"
  [ -n "$login" ] || return 1
  # gh shows a bot as its slug, the event payload as slug[bot]: take both.
  case "$allowed" in *",$login,"*|*",${login%\[bot\]},"*) return 0 ;; esac
  case "$assoc" in OWNER|MEMBER) return 0 ;; esac
  return 1
}

mkdir -p "$(dirname "$out")"

# What the log already holds, one key per line. The identity of a line is the
# PR, the judge and the head sha, three properties of verdict.schema.json, and
# `-S` sorts the keys of the judge object so that a line written by hand with
# its fields in another order is still the same key. `head_sha` is not required
# by the schema: without it the key falls back to the other two, which is the
# most a verdict that carries no sha can be told apart by. A line of the log
# that is not JSON is not a key, and the read is line by line so a broken line
# costs nothing but itself. No log yet is no keys and not an error: that is the
# first run of a fresh repo.
seen=""
have=0
if [ -f "$out" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    key="$(jq -Sc '[.pr, .judge, .head_sha]' <<<"$line" 2>/dev/null || true)"
    if [ -n "$key" ]; then
      seen="$seen$key
"
      # Whether the log holds a line for this PR at all. `pr` is an integer in
      # the schema and jq writes it as the argument does.
      case "$key" in "[$pr,"*) have=1 ;; esac
    fi
  done < "$out"
fi

in_log() {
  [ -n "$seen" ] || return 1
  grep -Fxq "$1" <<<"$seen"
}

comments="$(gh pr view "$pr" --json comments)"
n="$(jq '.comments | length' <<<"$comments")"

# The policy's own word, on the last line of a verdict it posted: `merged`,
# or `answered, merged`, and never `would have merged`. The last line, because
# the lines above it carry the model's text, and a reason can start with
# anything. Here-strings, not pipes into grep -q, which under pipefail can
# turn a match into a failure.
i=0
while [ "$by" = human ] && [ "$i" -lt "$n" ]; do
  c="$(jq -c ".comments[$i]" <<<"$comments")"
  i=$((i + 1))
  body="$(jq -r '.body // ""' <<<"$c")"
  grep -q '^<!-- verdict:' <<<"$body" || continue
  is_judge "$(jq -r '.author.login // ""' <<<"$c")" "$(jq -r '.authorAssociation // ""' <<<"$c")" || continue
  last="$(grep '^policy: ' <<<"$body" | tail -1 || true)"
  if grep -Eq '^policy: (answered, )?merged' <<<"$last"; then by=policy; fi
done

kept=0
skipped=0
i=0
while [ "$i" -lt "$n" ]; do
  c="$(jq -c ".comments[$i]" <<<"$comments")"
  i=$((i + 1))
  body="$(jq -r '.body // ""' <<<"$c")"
  printf '%s\n' "$body" | grep -q '^<!-- verdict:' || continue
  login="$(jq -r '.author.login // ""' <<<"$c")"
  assoc="$(jq -r '.authorAssociation // ""' <<<"$c")"
  if ! is_judge "$login" "$assoc"; then
    echo "review-log: a comment by ${login:-no author} ($assoc) carries a verdict marker and is not the judge: ignored" >&2
    continue
  fi
  # The JSON is the first fenced json block after the LAST marker, whatever
  # sits between the two (the <details> that folds it away for humans).
  # Everything above the last marker is text the model wrote, and the model
  # quotes the diff under review: a marker planted there must not win.
  from="$(printf '%s\n' "$body" | grep -n '^<!-- verdict:' | tail -1 | cut -d: -f1)"
  json="$(printf '%s\n' "$body" | tail -n +"$from" | awk 'NR > 1 && /^```json/{g=1; next} g && /^```/{exit} g{print}')"
  if ! jq -e 'type == "object"' <<<"$json" >/dev/null 2>&1; then
    echo "review-log: the verdict block by $login is not valid JSON: ignored" >&2
    continue
  fi
  key="$(jq -Sc '[.pr, .judge, .head_sha]' <<<"$json")"
  if in_log "$key"; then
    echo "review-log: the verdict by $login is already in $out: skipped" >&2
    skipped=$((skipped + 1))
    continue
  fi
  # The line keeps the shape it has always had, keys unsorted: only the keys of
  # the dedup are canonical, and the lines already in the log are never
  # rewritten. The `ts` of the outcome is the time of this run, which for a late
  # verdict is not the time of the merge: the log says when it was written and
  # `head_sha` says what was judged.
  jq -c --arg by "$by" --arg ts "$ts" \
    '.outcome = {decided_by: $by, action: "merged", ts: $ts}' <<<"$json" >> "$out"
  seen="$seen$key
"
  kept=$((kept + 1))
done

# Nothing appended and no line for this PR anywhere in the log: this is the
# hole the audit cannot see, and it is said where somebody is looking, with the
# command that closes it. Nothing is said when the lines are there already, so
# the repair is not announced twice.
#
# The notice is the only write this script makes to GitHub, and the token has to
# be allowed to make it: close.yml gives the step `pull-requests: read` and
# falls back to that token when the App is not configured, so the comment goes
# through with the App and is refused without it. Refused, the notice goes to
# the step summary, the run's own screen, which outlives the branch the merge
# deleted: the hole is never left on a stderr nobody reads, which is the whole
# point of saying it. Either way the run ends well, because close.yml pushes
# `status: done` in the same step, after this.
if [ "$kept" -eq 0 ] && [ "$skipped" -eq 0 ] && [ "$have" -eq 0 ]; then
  notice="$(printf '%s\n' \
    "No verdict reached \`$out\` for this PR: there was nothing to read on the PR when the log was written, and a PR with no line reads to the audit as a PR nobody judged." \
    "" \
    "Once the verdict is on the PR, \`scripts/review-log.sh $pr\` on a clone of the default branch appends it, and the file is committed from there. The run repeats safely: a line the log already holds is not written twice.")"
  if ! gh pr comment "$pr" --body "$notice"; then
    echo "review-log: could not comment on PR $pr, the token may not write on it" >&2
    if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
      printf '%s\n' "$notice" >> "$GITHUB_STEP_SUMMARY"
    fi
  fi
fi

if [ "$skipped" -gt 0 ]; then
  echo "review-log: $kept verdict(s) appended to $out, $skipped already there" >&2
else
  echo "review-log: $kept verdict(s) appended to $out" >&2
fi

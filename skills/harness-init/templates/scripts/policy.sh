#!/usr/bin/env bash
# The judge proposes, this decides. Deterministic.
#   policy.sh <verdict.json> <pr-number> <tier> <role>
# One caller: a terminal after /judge, or /next, once `gh pr create` has given
# the verdict a PR to land on (no workflow judges, and the script has one
# path, the terminal's, whatever the environment it runs in).
# Env: HARNESS_AUTOMERGE (on|off, default off), GH_TOKEN, HEAD_SHA (the commit
# the judge saw, optional: unset, it is read back from the verdict, which
# judge.sh stamped when it stored it).
# Stamps the PR number, head_sha and where it was judged, always local, into
# the verdict, drops a cost the judge wrote, decides, then posts ONE comment:
# for the human on top (role, tier, verdict, sha, confidence; one sentence;
# the question for the human; the criteria when there is a slice; the
# findings, one line each, severity, id, file with the line and claim, and no
# evidence), for the machines below (the JSON in a <details> after the marker
# "<!-- verdict:<role> -->", with the evidence of every finding whole inside
# it), the decision as the last line.
# The previous verdict of the same role on the PR is minimized as outdated,
# and so is any crash comment of that role: the page shows one live verdict
# per judge, the log keeps them all.
# Then the judge:<role>:<verdict> label (each role owns its own, so the two
# judges of tier 2 never overwrite each other) and the action, only if the PR
# head is still the judged commit or a commit that answers one of its
# findings (judge.sh answer: the judge runs once, the session fixes and
# answers):
#   escalate, needs_human, tier 3     -> needs-human, and the notification
#   request-changes, a finding high or medium with no answer
#                                     -> needs-human: the session did not answer
#   a high or medium a human added reading the PR (judge.sh finding), with no
#   answer                            -> needs-human: the judge said its word
#                                        before that finding existed, so it
#                                        holds the merge on its own
#   tier 1 approve, or request-changes with every high and medium answered
#                                     -> merge, as below; "answered" in the log
#   tier 2                            -> the same on both verdicts of the head,
#                                        the other one read off the PR, with no
#                                        high left open; with one still to come
#                                        it waits and says so
#   label human-gate                  -> needs-human: the path says a human merges
#   base not the default branch       -> no merge, and no escalation: a merge
#                                        counts only on the default branch, and
#                                        a stacked PR is its author's to land
#   merge                             -> squash when automerge is on, only
#                                        once ci has passed on the PR head, and
#                                        never past a higher tier ci labelled
# The notification (ntfy, NTFY_TOPIC) leaves from here, with the verdict in
# hand, at every escalation: even when needs-human was already on the PR,
# which raises no label event. needs-human never comes off by this script:
# an escalation is a state, not a pulse.
# No verdict, or one that is not valid JSON, is a crash, not an escalation:
# the PR gets judge:<role>:crashed, a comment that says to run /judge again on
# that commit (one per judged commit, updated on a second crash) and the
# notification. A later judgement of that role minimizes it, on this commit or
# on an older one: it is the judgement that makes the crash old, not the head.
# tier.sh ignores that label, so the next /judge replaces it: a crash never
# parks the PR at tier 3 the way needs-human would. A call to GitHub that fails
# under the policy ends in the same place: the policy crashing has to be as
# visible as a judge that crashed.
set -Eeuo pipefail
file="$1"; pr="$2"; tier="$3"; role="${4:-correctness}"
# The role names a label, a marker, and since the markers are matched as lines
# it is also a piece of two regexes: one of the two words judge.sh takes, and
# nothing else. Anything else would either widen a selector or fail to compile
# the jq program, and a read that fails here ends where a crashed judge ends.
case "$role" in
  correctness | security) : ;;
  *) echo "policy: $role is not a role: correctness or security" >&2; exit 2 ;;
esac
automerge="${HARNESS_AUTOMERGE:-off}"
# The rendered comment goes to a temp file, never to the working directory,
# which is the repo: a verdict written into the tree is the one artifact the
# whole design keeps out of it, because it lands in the diff of the branch that
# produced it and in the bundle of every judgement after.
# Plain mktemp, the form this script already uses to stamp the verdict: `-t
# <name>` is the BSD spelling and GNU coreutils refuses a template with no X's,
# so on Linux the script would die here, before the ERR trap that turns a
# failure into a crash comment is even installed.
comment="$(mktemp)"
other_file="$(mktemp)"
trap 'rm -f "$comment" "$other_file"' EXIT
pr_url="$(gh pr view "$pr" --json url -q .url 2>/dev/null || true)"
# Where a commit of the PR is linked from: the repo the PR lives in.
repo_url="${pr_url%/pull/*}"
[ "$repo_url" != "$pr_url" ] || repo_url=""

# ntfy, when a topic is set. Header values end at a newline, so a title with
# one would inject a second header: strip them.
notify() {
  [ -n "${NTFY_TOPIC:-}" ] || return 0
  # --data-raw, not -d: -d reads a file when the body starts with "@", and
  # the body here is prose the model wrote.
  curl -fsS -H "Title: $(printf '%s' "$1" | tr -d '\r\n')" -H "Click: $pr_url" \
    --data-raw "$2" "https://ntfy.sh/$NTFY_TOPIC" >/dev/null \
    || echo "policy: the notification did not go out" >&2
}

# Only the labels of this role: the other judge keeps its own.
label() {
  for v in approve changes escalate crashed; do
    gh pr edit "$pr" --remove-label "judge:$role:$v" 2>/dev/null || true
  done
  # A repo still on the old label list has no judge:<role>:<outcome>: saying so
  # on stderr is enough, the comment and the notification are the visible part.
  # Without this the ERR trap would turn every judgement into a crash, and the
  # crash into a non-zero exit, because crashed() labels too.
  gh pr edit "$pr" --add-label "judge:$role:$1" \
    || echo "policy: this repo has no label judge:$role:$1, run /harness-init ci" >&2
}

crashed() {
  local sha="${HEAD_SHA:-}" marker body id where again
  marker="<!-- crash:$role:$sha -->"
  # The guard below calls this very function when HEAD_SHA is missing, so the
  # sha goes through a variable of its own: a substring of an unset name is
  # empty on bash 3.2 and an error on newer ones, and neither reads well.
  if [ -n "$sha" ]; then where="\`${sha:0:7}\`"; else where="an unknown commit"; fi
  again="Run /judge again on this commit: nothing was stored for it."
  body="judge ($role) crashed on $where: $1
$again
$marker"
  # Same rule as the minimized verdicts below: the marker says where the crash
  # is, not who wrote it. Without the author check anyone on a public repo can
  # plant it and the policy would write its crash inside their comment. And a
  # marker line, not a body that contains the text: a comment that quotes the
  # marker inside a finding would be rewritten whole, which is worse than
  # being minimized. Anchored at both ends, because a finding that opens a
  # line with the marker and then comments on it is a line that quotes it.
  # The marker carries no character a regex reads.
  id="$(gh pr view "$pr" --json comments | jq -r --arg m "$marker" \
    '[.comments[]
      | select(.viewerDidAuthor or (.authorAssociation | . == "OWNER" or . == "MEMBER"))
      | select(.body | test("(^|\\n)" + $m + "(\\n|$)"))] | .[0].id // empty')"
  if [ -n "$id" ]; then
    gh api graphql -f id="$id" -f body="$body" \
      -f query='mutation($id: ID!, $body: String!) { updateIssueComment(input: {id: $id, body: $body}) { issueComment { id } } }' >/dev/null
  else
    gh pr comment "$pr" --body "$body"
  fi
  label crashed
  notify "PR #$pr: judge $role crashed" "$1
$again"
  echo "policy: crashed, $1" >&2
  exit 0
}

# Everything below reads the PR before it writes to it, because the comment
# has to say what the policy decided. Under set -e a `gh` read that fails on
# a transient error would exit here in silence: no comment, no label, and a
# PR that looks judged and is not. Any failure is the policy crashing, and it
# ends where a crashed judge ends. The trap disarms itself first, so a second
# failure inside crashed() cannot loop.
trap 'trap - ERR; crashed "a call to GitHub failed under the policy, before it could decide"' ERR

[ -s "$file" ] || crashed "no verdict produced"
jq -e 'type == "object"' "$file" >/dev/null 2>&1 || crashed "the verdict is not valid JSON"
# The verdict carries the judged commit, stamped by judge.sh when it stored the
# file: a stored verdict knows which commit it judged, and that is the one that
# counts here. A HEAD_SHA in the environment still comes first.
if [ -z "${HEAD_SHA:-}" ]; then HEAD_SHA="$(jq -r '.head_sha // empty' "$file")"; fi
[ -n "${HEAD_SHA:-}" ] || crashed "HEAD_SHA is not set, so the policy cannot tell which commit was judged"

# The chain fills these, never the judge: the PR it landed on, the commit it
# saw and where it was judged, which is always local. The PR number is here
# and not in the verdict because /judge runs before the PR exists: a judge
# that had to write it would have to invent it. A `cost` comes off: a local
# judgement measures none, and one the judge wrote would say a price nobody
# paid.
# The other fields of the chain, a base the hook trusts, an outcome close.yml
# writes at merge, an audit the board fills, the answers and a `by: human`,
# are not touched here: the verdict comes out of the store, where judge.sh
# check already took off what the judge wrote and put back the base it read.
tmp="$(mktemp)"
jq --arg sha "$HEAD_SHA" --argjson pr "$pr" \
  '.pr = $pr | .head_sha = $sha | .judge.where = "local" | del(.cost)' \
  "$file" > "$tmp" && mv "$tmp" "$file"

verdict="$(jq -r .verdict "$file")"
needs_human="$(jq -r '.needs_human // false' "$file")"
slice="$(jq -r '.slice // "null"' "$file")"
confidence="$(jq -r '.confidence // "?"' "$file")"
# The model's text goes above the marker, and the model quotes the diff under
# review: a line of it must never read as the marker or as a fence, or
# review-log.sh could take a planted JSON for the verdict. One-line fields
# lose their newlines and a leading "<!--" gets escaped; multi-line fields
# are indented after the first line, so nothing of theirs starts a line. The
# same holds inside the table and the findings, where `flat` does the job of
# one_line on every field the model filled in.
one_line() { jq -r "$1 // \"\" | gsub(\"\\n\"; \" \") | sub(\"^<!--\"; \"\\\\<!--\")" "$file"; }
reason="$(one_line .reason)"
human_reason="$(one_line .human_reason)"

# Findings are F1, F2, ... in the order of the verdict, the ids judge.sh
# answer takes. Open: a high or a medium with no answer. A low is a nit, and it
# is declared in the PR, not answered.
open_of() {
  jq -r --arg sev "$2" '[.findings // [] | to_entries[]
      | select(.value.severity as $s | $sev | split(",") | index($s))
      | "F\(.key + 1)"] - [(.answers // [])[] | .id] | join(" ")' "$1"
}
# The high and medium findings a human added reading the PR, with no answer.
# They are open like the others, and they block on their own: the judge wrote
# its verdict before they existed, so an approve says nothing about them, and
# `judge.sh finding` adds a finding, never a merge.
open_human() {
  jq -r '[.findings // [] | to_entries[]
      | select(.value.by == "human")
      | select(.value.severity == "high" or .value.severity == "medium")
      | "F\(.key + 1)"] - [(.answers // [])[] | .id] | join(" ")' "$1"
}
# The commits that answer a high or a medium finding: an answer to a low binds
# nothing, as in judge.sh, and neither does an id the verdict does not have.
answers_of() {
  jq -r '(.findings // []) as $f | (.answers // [])[]
    | ((.id // "" | tostring | ltrimstr("F") | tonumber?) // 0) as $n
    | select($n >= 1 and (($f[$n - 1].severity // "") | IN("high", "medium")))
    | .sha' "$1"
}
# A request-changes answered is one whose high and medium findings all have
# their commit. With none to answer it is not answered: the judge asked for a
# change it put in a criterion or in scope_ok, and no commit speaks to that.
unanswerable() {
  [ "$(jq -r .verdict "$1")" = request-changes ] &&
    [ "$(jq '[.findings // [] | .[] | select(.severity == "high" or .severity == "medium")] | length' "$1")" -eq 0 ]
}
blocks() {
  [ "$(jq -r '.needs_human // false' "$1")" = true ] && return 0
  [ "$(jq -r .verdict "$1")" = escalate ] && return 0
  [ -n "$(open_of "$1" high)" ] && return 0
  [ -n "$(open_human "$1")" ] && return 0
  [ "$(jq -r .verdict "$1")" = request-changes ] && [ -n "$(open_of "$1" high,medium)" ] && return 0
  unanswerable "$1" && return 0
  return 1
}

# The verdict of the other role on the same judged commit, as the policy
# posted it: the last marker line of that role in a comment the chain, the
# owner or a member wrote, and the JSON of the first fenced block after it,
# the reading review-log.sh makes. A verdict of another commit is no verdict.
other="correctness"
[ "$role" = correctness ] && other="security"
read_other() {
  local body from
  body="$(gh pr view "$pr" --json comments \
    -q "[.comments[]
         | select(.isMinimized | not)
         | select(.viewerDidAuthor or (.authorAssociation | . == \"OWNER\" or . == \"MEMBER\"))
         | select(.body | test(\"(^|\\n)<!-- verdict:$other -->(\\n|\$)\"))] | last | .body // \"\"")"
  from="$(printf '%s\n' "$body" | grep -n "^<!-- verdict:$other -->\$" | tail -1 | cut -d: -f1 || true)"
  : > "$other_file"
  [ -n "$from" ] || return 0
  printf '%s\n' "$body" | tail -n +"$from" |
    awk 'NR > 1 && /^```json/ { g = 1; next } g && /^```/ { exit } g { print }' > "$other_file"
  jq -e --arg sha "$HEAD_SHA" 'type == "object" and .head_sha == $sha' "$other_file" >/dev/null 2>&1 ||
    : > "$other_file"
}

# ci on the PR head, read from GitHub: the one precondition a terminal does
# not have by construction. The `ci` job of the ci workflow is the aggregate
# every repo of the chain has, and the one the ruleset requires. Every run of
# it on the head has to have passed, and there has to be one: the last entry
# alone could be a green run next to a red one, and a check or a status that
# only carries the name is not that job.
ci_passed() {
  [ "$(gh pr view "$pr" --json statusCheckRollup \
    -q '[.statusCheckRollup[]? | select(.__typename == "CheckRun" and .name == "ci" and .workflowName == "ci")]
        | length > 0 and all(.conclusion == "SUCCESS")')" = true ]
}

# Decide first, so the comment can say what happens. A verdict acts on the
# commit it judged and on the commits that answer its findings, its own
# answers or, at tier 2, the other role's on the same head: the two ran as
# one judgement. A push that answers nothing is a commit nobody judged, and
# /judge on it brings its own judgement.
labels="$(gh pr view "$pr" --json labels -q '.labels[].name')"
current="$(gh pr view "$pr" --json headRefOid -q .headRefOid)"
# Where the PR would land. close.yml and automerge.yml read it off the event;
# this script runs from a terminal, where there is no event, so it asks.
# The default branch comes from the repo and never from a name written here:
# the template runs in repos whose branch is called something else, and `main`
# in the script would stop every merge of those, silently and for good.
base="$(gh pr view "$pr" --json baseRefName -q .baseRefName)"
default_branch="$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name)"
# jq prints a field that is not there as the string "null". A read that says
# nothing is an unknown base, not a good one, and an unknown base never merges.
[ "$base" != null ] || base=""
[ "$default_branch" != null ] || default_branch=""
label_tier="$(printf '%s\n' "$labels" | sed -n 's/^tier:\([0-3]\)$/\1/p' | sort -n | tail -1)"
open="$(open_of "$file" high,medium)"
high_open="$(open_of "$file" high)"
human_open="$(open_human "$file")"
have_other=0
if [ "$tier" -eq 2 ]; then
  read_other
  [ -s "$other_file" ] && have_other=1
fi
# A here-string and not a pipe into grep -q: under pipefail a producer cut
# off on the first match would turn the match into a failure.
answered="$(answers_of "$file"; [ "$have_other" -eq 0 ] || answers_of "$other_file")"
covered=0
if [ "$current" = "$HEAD_SHA" ] || grep -qx "$current" <<< "$answered"; then
  covered=1
fi
lead=approved
if [ "$verdict" = request-changes ] ||
  { [ "$have_other" -eq 1 ] && [ "$(jq -r .verdict "$other_file")" = request-changes ]; }; then
  lead=answered
fi
action=none
if [ "$covered" -eq 0 ] && [ "$tier" -eq 2 ] && [ "$have_other" -eq 0 ]; then
  # The head is past the judged commit, and the answers that could bind it
  # may be in the verdict of the other role, which has not arrived yet.
  decision="waiting for the $other verdict of ${HEAD_SHA:0:7}: the PR head ${current:0:7} is past it, and only an answer binds a later commit"
elif [ "$covered" -eq 0 ]; then
  decision="PR head moved since the judgement (${HEAD_SHA:0:7} to ${current:0:7}) and answers none of its findings, no action: /judge on ${current:0:7} brings its own"
elif [ "$tier" -ge 3 ] || [ "$needs_human" = "true" ] || [ "$verdict" = "escalate" ]; then
  action=human
  decision="a human decides (tier $tier, needs_human=$needs_human, verdict=$verdict)"
elif [ "$verdict" = request-changes ] && [ -n "$open" ]; then
  action=human
  decision="a human decides: request-changes, and the session answered none of $open"
elif unanswerable "$file"; then
  action=human
  decision="a human decides: request-changes with no high or medium finding, so nothing a commit can answer"
elif [ -n "$human_open" ]; then
  action=human
  decision="a human decides: a human found $human_open reading the PR and no commit answers it"
elif [ "$tier" -eq 2 ] && [ -n "$high_open" ]; then
  action=human
  decision="a human decides: a high finding with no answer, $high_open"
elif [ "$tier" -eq 2 ] && [ "$have_other" -eq 0 ]; then
  decision="waiting for the $other verdict of ${HEAD_SHA:0:7}: tier 2 acts on both"
elif [ "$tier" -eq 2 ] && blocks "$other_file"; then
  action=human
  decision="a human decides: the $other verdict of ${HEAD_SHA:0:7} is $(jq -r .verdict "$other_file") and holds the merge"
elif [ -n "$label_tier" ] && [ "$label_tier" -gt "$tier" ]; then
  action=human
  decision="ci says tier $label_tier and this judgement was for tier $tier: a human decides"
elif printf '%s\n' "$labels" | grep -qx human-gate; then
  # The tier said how much scrutiny was needed and the judge gave it. Who may
  # merge is the other question: a path under the "Human gates" line of
  # AGENTS.md carries human-gate, and the machine never merges it, here as in
  # automerge.yml. An approve there is a verdict for the human who merges.
  action=human
  decision="$lead, and the PR is under a human gate: a human merges it"
# A merge counts only on the default branch (4.7), and the rule holds for every
# merge path of the chain. A PR stacked on another slice is legitimate and its
# merge carries nothing to the branch the board is about, so the policy leaves
# it to whoever opened it. Not an escalation: needs-human is a state, tier.sh
# reads it back as tier 3, and a stacked PR has nothing for a human to decide
# that the human who stacked it does not already know. The verdict still gets
# posted and labelled above: only the merge stops here.
elif [ -z "$base" ] || [ -z "$default_branch" ]; then
  decision="${lead#approved}"
  decision="${decision:+$decision, }not merged: github did not say where this PR would land (base '$base', default branch '$default_branch'), and a base nobody read is not the default branch"
elif [ "$base" != "$default_branch" ]; then
  decision="${lead#approved}"
  decision="${decision:+$decision, }not merged: the PR lands on $base and not on the default branch $default_branch, and a merge counts only there"
elif [ "$automerge" = "on" ] && ci_passed; then
  # ci has to have passed on the PR head, and the merge names that head, so a
  # push in between makes GitHub refuse it instead of merging what nobody saw.
  action=merge
  decision="${lead#approved}"
  decision="${decision:+$decision, }merged: ci passed on ${current:0:7}"
elif [ "$automerge" = "on" ]; then
  decision="${lead#approved}"
  decision="${decision:+$decision, }would have merged, and a local judgement never does before ci has passed on this head: run this again once it has"
else
  decision="${lead#approved}"
  decision="${decision:+$decision, }would have merged (HARNESS_AUTOMERGE is off)"
fi

{
  echo "## judge: $role (local) · tier $tier · **$verdict** · \`${HEAD_SHA:0:7}\` · confidence $confidence"
  if [ -n "$reason" ]; then echo; echo "$reason"; fi
  if [ -n "$human_reason" ]; then echo; echo "**For you:** $human_reason"; fi
  # The commits that answer a finding, the high and medium ones: whether each
  # really closes it is the audit's to say, with the verdict and the diff.
  if [ "$(jq '[(.answers // [])[]] | length' "$file")" -gt 0 ]; then
    echo
    echo "Answers:"
    jq -r --arg repo "$repo_url" '(.findings // []) as $f
      | (.answers // [])[]
      | (.id | ltrimstr("F") | tonumber - 1) as $i
      | select($f[$i].severity == "high" or $f[$i].severity == "medium")
      | "- \(.id) \($f[$i].severity): " + (if $repo == "" then "`\(.sha[0:7])`" else "[\(.sha[0:7])](\($repo)/commit/\(.sha))" end)' "$file"
  fi
  # The criteria ids come from the slice file and compare across PRs and
  # weeks. Without a slice the judge makes them up on the spot: decoration.
  if [ "$slice" != null ] && [ "$(jq '.criteria | length' "$file")" -gt 0 ]; then
    echo
    echo "| criterion | test | ok |"
    echo "|---|---|---|"
    jq -r 'def flat: tostring | gsub("\n"; " ");
      .criteria[] | "| \(.id | flat) | \((.covered_by // "") | flat) | \(if .ok then "yes" else "no" end) |"' "$file"
  fi
  # One line per finding, and no evidence under it. The evidence is the code
  # the judge saw, and GitHub renders it as markdown: a line of awk with `$i`
  # and `$(i + 1)` came out as a math error on PR #38. It also doubled the
  # length of a comment that is meant to be one page for the human who merges,
  # while the reader it serves is the audit, which finds it whole in the JSON
  # below, inside a block nothing renders.
  if [ "$(jq '.findings | length' "$file")" -gt 0 ]; then
    echo
    jq -r 'def flat: tostring | gsub("\n"; " ");
      .findings | to_entries[] | .key as $k | .value
      | "- **\(.severity | flat)\(if .by == "human" then " (human)" else "" end)** F\($k + 1) `\(.file | flat)\(if .line then ":\(.line)" else "" end)` \(.claim | flat)"' "$file"
  fi
  echo
  echo "<!-- verdict:$role -->"
  echo "<details><summary>verdict.json</summary>"
  echo
  echo '```json'
  jq -c . "$file"
  echo '```'
  echo
  echo "</details>"
  echo
  echo "policy: $decision"
} > "$comment"

# One live verdict per judge on the page: the previous comment of this role
# is minimized as outdated. It stays readable, and review-log.sh still reads
# it on merge, so the log keeps every judgement with its head_sha.
# The crash comments of this role go with them, whatever commit they name: a
# transient failure that the role has since judged is answered, and one left
# behind is a line the human has to clear by hand.
# The marker says where the JSON is, not who wrote it: on a public repo
# anyone can post it. Minimize only what this token wrote, or what came from
# the owner or a member, the same authors review-log.sh takes on merge.
# A marker line, not a body that contains the text: a verdict quotes the diff
# and a finding can quote a marker, and the live verdict of one judge must not
# disappear because the other one wrote its name. Anchored at both ends: a
# line that only starts with the marker is a quotation too, and the sha of a
# crash marker is whatever the crash named, so it is matched as a run without
# spaces rather than read as a sha.
prev="$(gh pr view "$pr" --json comments \
  -q "[.comments[]
       | select(.isMinimized | not)
       | select(.viewerDidAuthor or (.authorAssociation | . == \"OWNER\" or . == \"MEMBER\"))
       | select(.body | test(\"(^|\\n)<!-- (verdict:$role|crash:$role:[^ \\n]*) -->(\\n|\$)\"))] | .[].id")"
for id in $prev; do
  gh api graphql -f id="$id" -f query='mutation($id: ID!) { minimizeComment(input: {subjectId: $id, classifier: OUTDATED}) { minimizedComment { isMinimized } } }' >/dev/null \
    || echo "policy: could not minimize comment $id" >&2
done
gh pr comment "$pr" --body-file "$comment"

case "$verdict" in
  approve) label approve ;;
  request-changes) label changes ;;
  *) label escalate ;;
esac

case "$action" in
  human)
    gh pr edit "$pr" --add-label needs-human
    notify "PR #$pr needs you: $(gh pr view "$pr" --json title -q .title)" \
      "${human_reason:+$human_reason
}$reason
policy: $decision" ;;
  merge)
    # --auto needs auto-merge enabled on the repo (GitHub Pro, or a public
    # repo). Without it merge now: ci was just read green, on the head the
    # decision was made for.
    gh pr merge "$pr" --squash --auto --match-head-commit "$current" 2>/dev/null ||
      gh pr merge "$pr" --squash --match-head-commit "$current" ;;
esac
echo "policy: $decision" >&2

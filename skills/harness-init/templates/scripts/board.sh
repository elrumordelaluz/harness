#!/usr/bin/env bash
# The board of the repo in one screen, for whoever opens a cold session: the
# slices of docs/backlog/ that are still open, the lines of docs/inbox.md, the
# open PRs, what waits for a human, the plan in force and the next action, in
# forty lines and without a grep. The screen is computed here and not by the
# skill, because from a terminal it costs no tokens and a rule is only
# testable when a program applies it.
#   Harness    which commit of the harness each stage of /harness-init
#              installed here, from .harness/stamp.json: the stage, the short
#              sha and the date of that commit, and `-` for a stage never
#              installed. A sha that is not to be trusted carries its mark
#              here and not only in the file: `8f21c4d+` for a stage
#              installed from a harness checkout with uncommitted changes,
#              `?` in place of the sha of one installed where there was no
#              git repo under the skill to read it from.
#   Slices     the count of the done ones in the head, then one row per slice
#              that is not done: id, status, blocked_by, tier, human, title.
#              The done are not listed: they would eat the screen.
#   Inbox      one row per line of docs/inbox.md, its date and its text.
#   Open PRs   number, tier label, judge label and title, from `gh pr list`.
#   Waiting on a human
#              the open PRs labelled human-gate, needs-human or tier:3, the
#              draft specs of docs/specs/, and the ADRs that hold an open
#              slice still, one row each with the ids of the slices and the
#              title of the ADR.
#   Plan       the steps of `## Ordine di lavoro` of the latest ADR that has
#              one, each done, current, manual or todo, and `beyond` when the
#              backlog went past the highest id the plan names.
# The last line is `next action: <action>, because <rule>: <fact>`.
# A section with nothing in it is a row that says so, never a section that
# disappears: a cold reader must be able to tell that there was nothing from
# a board that skipped the section. No `gh`, or a `gh` that cannot answer, is
# the row `gh not available` and an exit 0: the board is not the place
# where a logged out terminal becomes an error.
# `--json` prints the same data as one object with the keys `harness`,
# `slices`, `prs`, `inbox`, `blocked`, `plan` and `next`, the sections of the
# screen: it is the model the roadmap view will read. `plan` is null when no
# ADR has a work order, and `next` is never null: the last rule always fires.
# What waits for a human is one key and two reads: `blocked` is the key, and
# the rest is `prs` read through the three labels plus the draft specs.
# `blocked` is one entry per ADR that an open slice names in blocked_by, with
# the ids of those slices and the `title` of the ADR, null when the file is
# not there. What the `## Blocked` section of a slice says is never read: the
# condition that would free it is a human's to weigh, and the board only says
# that the decision is due.
# `harness` is never null and says which of four states the stamp is in:
# `stamped`, with the `origin` the stage copied from and one entry of `stages`
# per stage, null for a stage never installed; `self`, with the sha and the
# date of HEAD, in the harness repo, which never installs into itself; `none`
# when there is no file; `unreadable` when jq refuses the file or an entry is
# not a sha and a date. The screen says the four in as many lines, and `-` for
# the stage that is null.
# `prs` is null when `gh` could not answer and [] when there are none,
# which are two different facts. `slices` keeps the done ones, which only the
# screen leaves out.
# The rows are printed as the frontmatter has them, with two exceptions: an
# `ADR-<nnnn>` in blocked_by is printed `held by ADR-<nnnn>`, after the slice
# ids the field names, because a slice held by a decision is `todo` and only
# the field says why it does not move; and a `todo` slice whose branch is on
# the remote is printed `in progress` in the status column. The JSON keeps both
# fields as written and carries the branch in `branch`, null when there is
# none.
# "in progress" is not a status, it is the branch slice/S<NN>-* on the remote.
# Usage: board.sh [--json]
set -euo pipefail

json=0
for arg in ${@+"$@"}; do
  case "$arg" in
    --json) json=1 ;;
    *)
      echo "board.sh: unknown argument $arg. Usage: board.sh [--json]" >&2
      exit 2
      ;;
  esac
done

cd "$(git rev-parse --show-toplevel)"

# Which commit of the harness this repo installed, and when: one entry per
# stage of /harness-init in .harness/stamp.json, which the board reads and
# never writes. A file that jq refuses, or an entry that is not a sha and a
# date, is a state of its own and still a line of the screen: the board does
# not turn a file it reads into an exit 1, the way a `gh` that cannot answer
# is a row. The shape is checked and not only the type, forty hex characters
# and a YYYY-MM-DD date anchored with \A and \z, because those two values are
# printed into the first line a cold session reads: with ^ and $, which in a
# Perl syntax stop at the end of a line, a date carrying a newline would write
# a line of the screen by itself. An entry says so when the sha is not to be
# trusted, and both cases are a shape of their own: `"dirty": true`, which the
# stage writes only when it is true and nothing else is read in its place, and
# `sha` and `date` both null, which is no git repo under the skill at all. One
# of the two null and the other not comes from nowhere the stage writes, and
# is refused with the rest. In the harness repo itself, recognised by
# its templates on disk, there is no stamp and there never will be, and the
# line is its own HEAD,
# read the way the stage reads the commit it stamps, the full sha and the
# committer date, so the two readings of the same fact cannot disagree.
if [ -d skills/harness-init/templates ]; then
  head_sha="$(git rev-parse -q --verify HEAD 2>/dev/null || true)"
  head_date=""
  if [ -n "$head_sha" ]; then
    head_date="$(git log -1 --format=%cd --date=short 2>/dev/null || true)"
  fi
  harness="$(jq -n --arg sha "$head_sha" --arg date "$head_date" '
    { state: "self",
      sha: (if $sha == "" then null else $sha end),
      date: (if $date == "" then null else $date end) }')"
elif [ ! -f .harness/stamp.json ]; then
  harness='{ "state": "none" }'
elif ! harness="$(jq '
  . as $stamp
  | { state: "stamped",
      origin: (if ($stamp.harness | type) == "string" then $stamp.harness
               else null end),
      stages: (["local", "ci", "judge"] | map({ key: ., value: (
          $stamp.stages[.]
          | if . == null then null
            else (if .dirty == null then {}
                  elif .dirty == true then { dirty: true }
                  else error("stage") end) as $dirty
            | if .sha == null and .date == null then
                { sha: null, date: null } + $dirty
              elif (.sha | type) == "string"
                and (.sha | test("\\A[0-9a-f]{40}\\z"))
                and (.date | type) == "string"
                and (.date | test("\\A[0-9]{4}-[0-9]{2}-[0-9]{2}\\z"))
                then { sha: .sha, date: .date } + $dirty
              else error("stage") end
            end) })
        | from_entries) }' .harness/stamp.json 2>/dev/null)"; then
  harness='{ "state": "unreadable" }'
fi

# Every slice file, README apart: the backlog is one slice per file and the
# frontmatter is what the board reads. A repo with no backlog yet is an empty
# list and not an error.
files=()
if [ -d docs/backlog ]; then
  for file in docs/backlog/*.md; do
    [ -f "$file" ] || continue
    case "${file##*/}" in README.md) continue ;; esac
    files[${#files[@]}]="$file"
  done
fi

# One tab separated row per slice, in the order id, status, blocked_by, tier,
# human, spec, title, so the title, the only field that can carry anything, is
# last. The spec is not a key of a slice in the JSON: it is read to tell an
# approved spec that no slice names.
# A value keeps neither a trailing comment nor trailing spaces: the skeleton in
# docs/backlog/README.md carries its legend as a comment, and a repo that
# copied it must not read `todo # todo | blocked | done` as a status.
slices_tsv=""
if [ ${#files[@]} -gt 0 ]; then
  slices_tsv="$(awk '
    function flush() {
      if (id != "") printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\n", id, status, blocked, tier, human, spec, title
    }
    FNR == 1 {
      flush()
      id = ""; status = ""; blocked = ""; tier = ""; human = ""; spec = ""; title = ""
      fm = 0
      name = FILENAME
      sub(/.*\//, "", name)
      sub(/\.md$/, "", name)
      fallback = name
      sub(/-.*/, "", fallback)
    }
    fm == 0 && $0 == "---" { fm = 1; next }
    fm == 1 && $0 == "---" { fm = 2; if (id == "") id = fallback; next }
    fm == 1 {
      key = $0
      sub(/:.*/, "", key)
      value = $0
      sub(/^[^:]*:[ \t]*/, "", value)
      sub(/[ \t]+#.*$/, "", value)
      sub(/[ \t]+$/, "", value)
      gsub(/\t/, " ", value)
      if (key == "id") id = value
      else if (key == "status") status = value
      else if (key == "blocked_by") blocked = value
      else if (key == "tier") tier = value
      else if (key == "human") human = value
      else if (key == "spec") spec = value
      else if (key == "title") title = value
    }
    END { flush() }
  ' ${files[@]+"${files[@]}"})"
fi
# The claim of a slice is its branch on the remote and nothing else, so the
# board reads it from the refs a fetch has left here: the script fetches
# nothing, as it reads docs/ from the working tree, and the screen is as fresh
# as the last fetch of whoever ran it. The id is the part between `slice/` and
# the first dash, compared whole with the id of the frontmatter, so slice/S1-x
# does not take S10; a ref that is not `slice/S<NN>-<slug>` names no slice. A
# repo with no remote has no such ref and no row changes.
branches_tsv=""
if branch_refs="$(git for-each-ref --format='%(refname:lstrip=3)' \
  refs/remotes/origin/slice/ 2>/dev/null)"; then
  branches_tsv="$(printf '%s\n' "$branch_refs" | awk '
    /^slice\/S[0-9]+-/ {
      id = $0
      sub(/^slice\//, "", id)
      sub(/-.*/, "", id)
      printf "%s\t%s\n", id, $0
    }')"
fi
branches="$(printf '%s' "$branches_tsv" | jq -R -s '
  split("\n") | map(select(length > 0)) | map(split("\t"))
  | reduce .[] as $ref ({}; if has($ref[0]) then . else .[$ref[0]] = $ref[1] end)')"

slices="$(printf '%s' "$slices_tsv" | jq -R -s --argjson branches "$branches" '
  split("\n") | map(select(length > 0)) | map(split("\t")) | map({
    id: .[0],
    title: (.[6] // ""),
    status: (.[1] // ""),
    blocked_by: (.[2] // ""),
    tier: ((.[3] | tonumber?) // .[3]),
    human: (.[4] == "true"),
    branch: ($branches[.[0]] // null),
  })')"
slice_specs="$(printf '%s' "$slices_tsv" | jq -R -s '
  split("\n") | map(select(length > 0)) | map(split("\t")[5] // "")')"

# One entry per line, `- <YYYY-MM-DD>: <text>`, as docs/inbox.md says: the
# prose above the list is not an entry, and a closed line is removed and not
# ticked, so what is in the file is what is open.
inbox_tsv=""
if [ -f docs/inbox.md ]; then
  inbox_tsv="$(awk '
    /^- [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]:/ {
      text = substr($0, 14)
      sub(/^[ \t]+/, "", text)
      gsub(/\t/, " ", text)
      printf "%s\t%s\n", substr($0, 3, 10), text
    }
  ' docs/inbox.md)"
fi
inbox="$(printf '%s' "$inbox_tsv" | jq -R -s '
  split("\n") | map(select(length > 0)) | map(split("\t"))
  | map({ date: .[0], text: (.[1] // "") })')"

# Every spec of docs/specs/, README apart, with the two fields the board reads:
# its status, for the drafts that wait for a human and the approved ones not
# cut yet, and its intent, for the intents nobody has specced.
spec_files=()
if [ -d docs/specs ]; then
  for file in docs/specs/*.md; do
    [ -f "$file" ] || continue
    case "${file##*/}" in README.md) continue ;; esac
    spec_files[${#spec_files[@]}]="$file"
  done
fi
specs_tsv=""
if [ ${#spec_files[@]} -gt 0 ]; then
  specs_tsv="$(awk '
    function flush() {
      if (path != "") printf "%s\t%s\t%s\n", path, status, intent
    }
    FNR == 1 { flush(); path = FILENAME; status = ""; intent = ""; fm = 0 }
    fm == 0 && $0 == "---" { fm = 1; next }
    fm == 1 && $0 == "---" { fm = 2; next }
    fm == 1 {
      key = $0
      sub(/:.*/, "", key)
      value = $0
      sub(/^[^:]*:[ \t]*/, "", value)
      sub(/[ \t]+#.*$/, "", value)
      sub(/[ \t]+$/, "", value)
      gsub(/\t/, " ", value)
      if (key == "status") status = value
      else if (key == "intent") intent = value
    }
    END { flush() }
  ' ${spec_files[@]+"${spec_files[@]}"})"
fi
specs="$(printf '%s' "$specs_tsv" | jq -R -s '
  split("\n") | map(select(length > 0)) | map(split("\t"))
  | map({ path: .[0], status: (.[1] // ""), intent: (.[2] // "") })')"

# Every intent of docs/intent/, README apart, by path: an intent without a spec
# is one that no spec names in its `intent:` field.
intents_list=""
if [ -d docs/intent ]; then
  for file in docs/intent/*.md; do
    [ -f "$file" ] || continue
    case "${file##*/}" in README.md) continue ;; esac
    intents_list="$intents_list$file
"
  done
fi
intents="$(printf '%s' "$intents_list" | jq -R -s 'split("\n") | map(select(length > 0))')"

# The labels that make a PR wait for a human, a closed list: the rule of the
# next action and the screen read the same one.
human_labels='def human: . == "human-gate" or . == "needs-human" or . == "tier:3";'

# Every ADR of docs/decisions/ by id and title, so that a slice held by a
# decision can say which one in words. The title is the text of the first
# heading without the `ADR-<nnnn>:` the id column already carries, and an ADR
# with no heading has none, like one with no file: the board says what
# blocked_by says, and a decision nobody wrote down is still a decision a
# slice is waiting for.
decisions_tsv=""
if [ -d docs/decisions ]; then
  for file in docs/decisions/ADR-*.md; do
    [ -f "$file" ] || continue
    rest="${file##*/ADR-}"
    number="${rest%%[!0-9]*}"
    [ -n "$number" ] || continue
    title="$(awk '
      /^#+[ \t]/ {
        sub(/^#+[ \t]+/, "")
        sub(/^ADR-[0-9]+:[ \t]*/, "")
        sub(/[ \t]+$/, "")
        gsub(/\t/, " ")
        print
        exit
      }' "$file")"
    decisions_tsv="$decisions_tsv$(printf 'ADR-%s\t%s' "$number" "$title")
"
  done
fi
decisions="$(printf '%s' "$decisions_tsv" | jq -R -s '
  split("\n") | map(select(length > 0)) | map(split("\t"))
  | reduce .[] as $adr ({}; if has($adr[0]) then . else
      .[$adr[0]] = (if ($adr[1] // "") == "" then null else $adr[1] end) end)')"

# The plan in force is the ADR with the highest number among those with a
# `## Ordine di lavoro` section, and nothing else names it: a pointer kept by
# hand grows old, and a newer ADR that decides one thing and has no work order
# leaves the plan where it was.
plan_adr=""
plan_file=""
plan_number=-1
if [ -d docs/decisions ]; then
  for file in docs/decisions/ADR-*.md; do
    [ -f "$file" ] || continue
    rest="${file##*/ADR-}"
    number="${rest%%[!0-9]*}"
    [ -n "$number" ] || continue
    awk '/^## Ordine di lavoro[ \t]*$/ { found = 1 } END { exit !found }' "$file" || continue
    if [ $((10#$number)) -gt "$plan_number" ]; then
      plan_number=$((10#$number))
      plan_adr="ADR-$number"
      plan_file="$file"
    fi
  done
fi

# One row per numbered step of that section, number and text. A line indented
# under a step belongs to it, so an id on a wrapped line still counts; the
# numbered lists of the other sections, the decisions, are not steps.
steps_tsv=""
if [ -n "$plan_file" ]; then
  steps_tsv="$(awk '
    function flush() {
      if (n != "") printf "%s\t%s\n", n, text
      n = ""
    }
    /^## / { flush(); in_order = ($0 ~ /^## Ordine di lavoro[ \t]*$/); next }
    !in_order { next }
    /^[0-9]+\.[ \t]/ {
      flush()
      n = $0
      sub(/\..*/, "", n)
      text = $0
      sub(/^[0-9]+\.[ \t]+/, "", text)
      gsub(/\t/, " ", text)
      next
    }
    /^[ \t]*$/ { next }
    /^[ \t]/ {
      if (n != "") {
        more = $0
        sub(/^[ \t]+/, "", more)
        gsub(/\t/, " ", more)
        text = text " " more
      }
      next
    }
    { flush() }
    END { flush() }
  ' "$plan_file")"
fi
steps="$(printf '%s' "$steps_tsv" | jq -R -s '
  split("\n") | map(select(length > 0)) | map(split("\t"))
  | map({ number: (.[0] | tonumber), text: (.[1] // "") })')"

# null and [] are two different facts, and the screen says them with two
# different rows. An empty answer is a `gh` that printed nothing on success,
# which no real gh does: it is the stub of the tests, and it means no PR.
prs="null"
if command -v gh >/dev/null 2>&1; then
  if open_prs="$(gh pr list --state open --limit 100 --json number,title,labels 2>/dev/null)"; then
    if [ -z "$open_prs" ]; then
      prs="[]"
    else
      prs="$(printf '%s' "$open_prs" | jq '
        [.[] | { number, title, labels: [(.labels // [])[].name] }]' 2>/dev/null || echo null)"
    fi
  fi
fi

# A step is done when it names slices and every one is done; the first step
# not done is the current one, and a step that names no slice can be it, since
# the board cannot tell it is done: that is how the step that is the acceptance
# of a plan reaches the next action. A slice the backlog does not have is not
# done. The backlog went beyond the plan when a slice has an id higher than
# every id the plan names.
# The next action is the first rule that fires, in a fixed order, so that two
# sessions give the same answer: a PR that waits for a human; an eligible
# slice, `/next`; an approved spec that no slice names, `/slice <path>`; an
# intent that no spec names, `/spec <path>`; the current step of the plan, if
# the backlog has not gone beyond it; else the inbox. Eligible is the
# definition of section 2 of skills/next/SKILL.md: `status: todo`, every id in
# blocked_by a slice that is done, `human: false`, and no branch of its own on
# the remote, which is the claim of a slice and makes it `in progress`. An ADR
# in blocked_by is not a slice, so it is never done. The fact names what fired
# the rule, never a judgement, and with `gh` that cannot answer no PR is taken
# to wait.
board="$(jq -n \
  --argjson harness "$harness" \
  --argjson slices "$slices" \
  --argjson prs "$prs" \
  --argjson inbox "$inbox" \
  --argjson steps "$steps" \
  --arg adr "$plan_adr" \
  --argjson specs "$specs" \
  --argjson slice_specs "$slice_specs" \
  --argjson intents "$intents" \
  --argjson decisions "$decisions" \
  "$human_labels"'
  def num: ltrimstr("S") | tonumber? // 0;
  (reduce $slices[] as $s ({}; .[$s.id] = $s.status)) as $status
  | (if $adr == "" then null else
      ($steps | map(. + { ids: ([.text
        | match("(?<![A-Za-z0-9])S[0-9]{2,}(?![A-Za-z0-9])"; "g").string]
        | unique_by(num)) })) as $named
      | ($named | map((.ids | length) > 0 and all(.ids[]; $status[.] == "done"))) as $done
      | ([range(0; $named | length) | select($done[.] | not)] | first) as $current
      | ([$named[].ids[] | num] | max // 0) as $top
      | {
          adr: $adr,
          steps: [range(0; $named | length) as $i | $named[$i] | {
            number,
            text,
            status: (if $done[$i] then "done"
              elif $i == $current then "current"
              elif (.ids | length) == 0 then "manual"
              else "todo" end),
            ids
          }],
          beyond: [$slices[] | select((.id | num) > $top) | .id] | unique_by(num)
        }
    end) as $plan
  | ([$slices[] | select(.status != "done") | . as $slice
      | ($slice.blocked_by | [splits("[, \t]+")])[]
      | select(test("^ADR-[0-9]{4}$"))
      | { adr: ., slice: $slice.id }]
     | group_by(.adr)
     | map({
         adr: .[0].adr,
         title: ($decisions[.[0].adr] // null),
         slices: (map(.slice) | unique_by(num))
       })
     | sort_by(.adr)) as $blocked
  | def eligible:
      .status == "todo" and (.human | not) and .branch == null
      and all(.blocked_by | splits("[, \t]+") | select(. != "" and . != "none");
        $status[.] == "done");
  ([($prs // [])[] | select(.labels | any(human))] | sort_by(.number) | first) as $waiting
  | ([$slices[] | select(eligible) | .id] | sort_by(num)) as $eligible
  | [$specs[] | select(.status == "approved")
      | select(.path as $path | any($slice_specs[]; . == $path) | not)] as $unsliced
  | [$intents[] | select(. as $intent | any($specs[]; .intent == $intent) | not)] as $unspecced
  | (if $plan == null then null
     else [$plan.steps[] | select(.status == "current")] | first end) as $step
  | (if $waiting != null then {
        action: "review PR #\($waiting.number)",
        rule: "PR waiting on a human",
        fact: "#\($waiting.number) \($waiting.labels | map(select(human)) | join(" "))"
      }
    elif ($eligible | length) > 0 then
      { action: "/next", rule: "eligible slice", fact: ($eligible | join(", ")) }
    elif ($unsliced | length) > 0 then {
        action: "/slice \($unsliced[0].path)",
        rule: "approved spec with no slice",
        fact: ($unsliced[0].path | sub(".*/"; ""))
      }
    elif ($unspecced | length) > 0 then {
        action: "/spec \($unspecced[0])",
        rule: "intent with no spec",
        fact: ($unspecced[0] | sub(".*/"; ""))
      }
    elif $step != null and ($plan.beyond | length) == 0 then {
        action: "step \($step.number) of \($plan.adr)",
        rule: "step of the plan",
        fact: $step.text
      }
    else {
        action: "read the inbox",
        rule: "no other rule",
        fact: "\($inbox | length) lines"
      }
    end) as $next
  | { harness: $harness, slices: $slices, prs: $prs, inbox: $inbox,
      blocked: $blocked, plan: $plan, next: $next }')"

if [ "$json" = 1 ]; then
  printf '%s\n' "$board"
  exit 0
fi

# The screen. The board cuts in width and never in number of rows: a slice or
# a line that is not there is a slice nobody reads. Widths add up to a hundred
# columns, the width of a terminal nobody has resized: a column wider than its
# minimum, the blocked_by of the slices and the labels of the two PR sections,
# widens it for every row of that section and the title gives the columns
# back. The width is computed on the values that section prints and not on the
# longest label the CI could ever put, so a board of short labels stays as it
# is. What waits for a human is a closed list, the PRs with one of three
# labels, the draft specs and the ADRs of `blocked`, in that order; the specs
# are not a key of the JSON and are read here for the screen only, the ADRs
# are. An ADR row carries its id and the slices in the column of the labels,
# so the title starts where the other titles do, and it is the only row whose
# last column can be empty, when the ADR has no file to take a title from.
printf '%s' "$board" | jq -r --argjson specs "$specs" "$human_labels"'
  def pad($n): tostring | . + ((" " * ($n - length)) // "");
  def cut($n): tostring | if length > $n then .[0:$n - 3] + "..." else . end;
  def tag($prefix): (map(select(startswith($prefix))) | first) // "-";
  def mark:
    if .status == "done" then "done"
    elif .status == "current" then
      (if (.ids | length) == 0 then "current, manual" else "current" end)
    elif .status == "manual" then "manual"
    else "todo" end;
  def state:
    if .status == "todo" and .branch != null then "in progress" else .status end;
  def entry:
    if . == null then "-"
    elif .sha == null then "?"
    else .sha[0:7] + (if .dirty then "+" else "" end)
      + (if .date == null then "" else " " + .date end) end;
  def stamp:
    . as $h
    | if $h.state == "self" then
        "this is the harness"
        + (if $h.sha == null then ""
           else ", " + $h.sha[0:7]
             + (if $h.date == null then "" else " " + $h.date end) end)
      elif $h.state == "stamped" then
        (["local", "ci", "judge"] | map(. + " " + ($h.stages[.] | entry))
          | join("  "))
      elif $h.state == "unreadable" then "stamp unreadable, run /harness-init"
      else "no stamp, run /harness-init" end;
  def blocked:
    [.blocked_by | splits("[, \t]+") | select(. != "")] as $ids
    | [$ids[] | select(test("^ADR-[0-9]{4}$"))] as $adrs
    | if ($adrs | length) == 0 then .blocked_by
      else [$ids[] | select(test("^ADR-[0-9]{4}$") or . == "none" | not)]
        + ["held by " + ($adrs | join(", "))] | join(", ") end;
  (.slices | map(select(.status != "done"))) as $open
  | (.slices | map(select(.status == "done")) | length) as $done
  | ["Harness  " + (.harness | stamp)]
  + [""]
  + ["Slices  \($done) done, \($open | length) open"]
  + (if ($open | length) == 0 then ["  no open slices"] else
      ([12, ($open | map(blocked | length) | max) + 2] | max) as $wide
      | ["  " + ("id" | pad(6)) + ("status" | pad(12)) + ("blocked_by" | pad($wide))
            + ("tier" | pad(6)) + ("human" | pad(7)) + "title"]
      + ($open | map("  " + (.id | pad(6)) + (state | pad(12))
            + (blocked | pad($wide)) + (.tier | pad(6)) + (.human | pad(7))
            + (.title | cut([69 - $wide, 20] | max))))
    end)
  + [""]
  + ["Inbox  \(.inbox | length) lines"]
  + (if (.inbox | length) == 0 then ["  inbox empty"] else
      (.inbox | map("  " + (.date | pad(12)) + (.text | cut(86))))
    end)
  + [""]
  + ["Open PRs"]
  + (if .prs == null then ["  gh not available"]
     elif (.prs | length) == 0 then ["  no open PRs"] else
      ([25, ((.prs | map(.labels | tag("judge:") | length) | max) + 2)] | max) as $wide
      | (.prs | map("  " + ("#" + (.number | tostring) | pad(7))
            + (.labels | tag("tier:") | pad(8))
            + (.labels | tag("judge:") | pad($wide))
            + (.title | cut([83 - $wide, 20] | max))))
    end)
  + [""]
  + ["Waiting on a human"]
  + (([25, ((([(.prs // [])[] | select(.labels | any(human))
        | .labels | map(select(human)) | join(" ") | length]
      + [$specs[] | select(.status == "draft") | ("draft" | length)]
      + [.blocked[] | (.adr + " " + (.slices | join(", "))) | length])
      | max // 0) + 2)] | max) as $wide
    | (if .prs == null then ["  gh not available"] else
      (.prs | map(select(.labels | any(human)))
        | map("  " + ("#" + (.number | tostring) | pad(7))
            + (.labels | map(select(human)) | join(" ") | pad($wide))
            + (.title | cut([91 - $wide, 20] | max))))
    end)
    + ($specs | map(select(.status == "draft"))
        | map("  " + ("spec" | pad(7)) + ("draft" | pad($wide))
            + (.path | cut([91 - $wide, 20] | max))))
    + (.blocked | map("  " + ("adr" | pad(7))
        + ((.adr + " " + (.slices | join(", "))) | pad($wide))
        + ((.title // "") | cut([91 - $wide, 20] | max))
        | sub(" +$"; "")))
    | if length == 0 then ["  nothing waits for a human"] else . end)
  + [""]
  + ["Plan" + (if .plan == null then "" else "  " + .plan.adr end)]
  + (if .plan == null then ["  no plan in force"] else
      (.plan.beyond | if length == 0 then []
        elif length == 1 then ["  beyond: " + .[0]]
        else ["  beyond: " + .[0] + "-" + .[-1]] end)
      + (if (.plan.steps | length) == 0 then ["  no steps"] else
          (.plan.steps | map("  " + (.number | pad(4)) + (mark | pad(18))
            + (.text | cut(76))))
        end)
    end)
  + [""]
  + [.next | "next action: \(.action), because \(.rule): " as $head
      | $head + (.fact | cut([100 - ($head | length), 20] | max))]
  | .[]'

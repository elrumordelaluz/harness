---
name: next
description: >
  Take the eligible slices of docs/backlog/ and carry each one to a merged PR:
  read the board, run the waves, give every slice a clean-context subagent
  that writes the tests first and the code from green, judge it once, answer
  the findings with commits, open the PR and wait for the policy to merge it.
  Use when the user runs /next, says "take the board", "build the slices",
  "take the next slice", or when a board is on the default branch and the code
  is the next step of the chain. With an id or a slug it runs that slice
  alone. The only skill that produces code: it never writes the code itself,
  the subagents do.
---

# Next

The step that turns a board into merged code. Everything above it, intent,
spec, slices, exists so that this one can run without a human in the loop: the
slice file already carries the criteria, the tests to write first, the paths
and the decisions of the spec. The session that runs `/next` is the
orchestrator, not the implementer. The design is in 4.4 and 5.4 of the harness
spec, and decision 3 of ADR-0003 is what makes `/next` with no argument cover
a whole board instead of one slice.

## Ground rules

- **The orchestrator does not write code.** It reads the board, opens
  subagents, runs the judge, opens PRs and waits. Not one line of the
  product, not one fix to a finding: a fix goes back to the subagent that
  wrote the code, because the fix has to stand on the same reading the code
  did.
- **One subagent per slice, at clean context, never a fork.** A fork has read
  the board, the other slices and this session's reasoning; the slice file is
  the whole brief, and if it is not enough that is a defect of the slice, not
  a reason to hand over more. Clean context is principle 7 of `docs/spec.md`.
- **The subagent's reasoning is not read.** What comes back is its report:
  what it did, what the gates said, the sha, the PR. A retelling of the code
  is not wanted anywhere, here or in the hand-back: the code is in the diff
  and the reasons are in the PR body.
- **The board is the only source of work.** A slice that is not on the
  default branch does not exist, and nothing outside the slice's scope gets
  touched. A change that seems necessary and is out of scope is a new slice,
  written by `/slice`, not done here.
- **Never weaken a test, never lower a gate.** The four commands green is what
  "done" means, and a subagent that cannot get there honestly blocks its slice
  and says why. The same goes for the judge: a finding is answered with a
  commit or it stays open, never argued away.
- **A blocked slice stops itself and nothing else.** The other slices of the
  wave carry on, and the one-line question reaches the human at the end.
- **The harness of the repo you are working in is not yours to fix.** A
  template behind, a line missing in `AGENTS.md`, a script that misbehaves:
  write one dated line in `docs/inbox.md`, `- <YYYY-MM-DD>: <one line>`, and
  carry on with what is there. Never rerun `/harness-init`, never edit a
  script, a hook, a workflow or the `AGENTS.md` of that repo: the fix belongs
  to the harness repo and comes back with the stage of `/harness-init` that
  owns the file. The only stop is a directory this skill must write into that
  is not there, which means there is no harness. If `docs/inbox.md` alone is
  missing, say so in the hand-back and do not create it.

## 1. Refuse early

Stop and say why, before opening a branch or a subagent, when:

- `docs/backlog/` is missing: the repo has no harness. Say `/harness-init
local` and stop.
- `docs/backlog/` holds no slice but its README: the board is `/slice`'s to
  write, from a spec the human approved. Say so and stop.
- `package.json` has no `typecheck`, `test`, `format:check` and `build`
  script, all four. Name the ones missing and stop: the definition of done
  is those four green, and a slice cannot be finished against a contract the
  repo does not have.
- the test command does not run here. Run it once, on the default branch,
  before anything else:

  ```
  pnpm test
  ```

  Denied by the permission layer, or failing on a tree nobody has touched
  yet, and the run stops: an agent that cannot execute the suite cannot write
  a failing test first, and everything below this line assumes it can. Say
  which of the two it was, and that a red suite on the default branch is a
  slice of its own, not this run's to fix.

- an argument was given and it names no slice, or names one that is not
  eligible. Say which of the four reasons it is, in its words: its `status`
  is not `todo`; a `blocked_by` is not `done`, and which; `human: true`, so a
  human takes it and it is out of reach here; a branch `slice/S<NN>-<slug>`
  is on the remote, so another session has taken it and the board prints it
  `in corso`.

## 2. The board and the waves

Read every `docs/backlog/S*.md` of the working tree on the default branch,
fetched and pulled first, with `git fetch --prune origin`: the fourth point
below reads the remote branches from the refs that fetch leaves, and without
the prune a branch deleted on the remote would hold its slice for good. A
slice is **eligible** when all four hold: `status: todo`, every id in
`blocked_by` is a slice with `status: done`, `human: false`, and no branch
`slice/S<NN>-<slug>` on the remote, which is the claim of a slice (4.4) and
what the board prints `in corso`.

The fourth point does not take from this run the slices it is about to claim:
the waves are computed here, once, before any branch of this run exists. A
branch left by a run that fell over halfway, with no `status: blocked` in the
file, keeps its slice out until a human deletes it, which is what the claim
says.

The waves come out of `blocked_by` and the touchpoints:

- wave one is every eligible slice whose `blocked_by` is `none`, or whose
  prerequisites are already `done` on the board as it is now;
- each next wave is what becomes eligible once the wave before it has landed;
- inside a wave, order by id; the slices of one wave run at the same time,
  one subagent each;
- inside a wave no path of "Touchpoints" appears in two slices. Walk the wave
  by id: a slice that names a path already named by a slice kept in the wave
  moves to the next wave, so of two slices that share a path the lower id
  stays. The moved slice waits for the one that kept the path to be `done`,
  as it would for a `blocked_by`, for this run only.

The path of a touchpoint is the text inside the first pair of backticks of
its line in "Touchpoints", compared as written. A `(nuovo)` or
`(symlink nuovo)` after it changes nothing, since two slices that both create
a file conflict the same way, and a line with no backticks names no path.

The reason is the merge, not the code. Two PRs of one wave that write the
same file both pass their gates, `policy.sh` says `merge` on the second, and
`gh pr merge` refuses the conflict; a rebase would change the head the verdict
covers, and nobody judges twice (ADR-0003). A shared file is not a
prerequisite, so it is kept out of `blocked_by` and handled here.

With an id or a slug as the argument there is one wave of one slice, and 3
onwards is the same.

Print the waves before starting, as one short block: wave, ids, titles, and
under the waves one line for every slice moved for a path, with the path, for
example `S22 dopo S21: skills/harness-init/templates/scripts/board.sh`. It is
the last thing the human sees before the run, and it is what they interrupt if
a slice is in the wrong place. After it, one line per event and nothing
more: the subagents launched, a subagent reporting back, a verdict in one
word, a PR opened with its number, the wait on the policy. Never the plan,
never what this skill says, never the code: the plan is this file and the code
is in the PRs. A human watching a half-hour run needs to know where it is,
not what it will do next.

## 3. One subagent per slice

Before the wave starts, the orchestrator gives each of its slices a worktree
of its own, from the root, one slice after the other and never in parallel:

```
git fetch origin
git worktree add --no-track .claude/worktrees/S<NN> -b slice/S<NN>-<slug> origin/<default branch>
(cd .claude/worktrees/S<NN> && pnpm install --frozen-lockfile --offline)
```

`--no-track` is on purpose too: without it git takes the start point,
`origin/<default branch>`, as the upstream of the slice branch, and then in the
worktree `git status` reads as ahead of the default branch, a bare `git pull`
merges it and a bare `git push` misses the slice; the push of step 1 names the
ref and sets the upstream that every push after it uses.

The parentheses are on purpose, here and in 4 and 5: the working directory of
this session persists between calls, and a bare `cd` would leave the
orchestrator inside one slice's worktree for everything that follows.

The subagents of a wave run at the same time, and in one shared checkout the
`git switch -c` of one moves the HEAD of all of them: in the first run of
`/next` on the harness repo the commit of S18 landed on the branch of S19,
and the uncommitted files of each were there for the others to commit. A
worktree each, made in sequence before any subagent starts, closes that race
before it can open. The orchestrator makes them, and not the subagents or
`isolation: worktree` of the Agent tool, because the judge in 4 has to work in
the same worktree as the coder and the path is the orchestrator's to know.
The shared checkout stays on the default branch, and no command of a
subagent runs in it.

A `worktree add` that fails because `slice/S<NN>-<slug>` already exists is
the claim of someone else, as a failed push is in step 1 below: that slice
ends there for this run. An install that fails leaves a slice that cannot run
its tests: no subagent for it, and the error goes to the hand-back.

For each slice of the wave, one Agent tool call, `subagent_type:
general-purpose`, `model: opus`, **never `subagent_type: fork`**. All the
calls of a wave go in a single message, so the slices run at the same time.

The subagent is given, by path and not by summary: its worktree, and in it
`AGENTS.md`, `docs/codebase-map.md` and the slice file. Not the spec: the
slice carries the decisions inlined, by construction, and that is why `/slice`
writes them. Then these instructions, which are 4.4 of the harness spec and
the guardrails of 5.4, and are not negotiable:

```
Read AGENTS.md, docs/codebase-map.md and <the slice file> in <the
worktree path>. Work only on that slice.

1. Work only in <the worktree path>, where slice/S<NN>-<slug> is already
   checked out from the updated default branch. Every command you run
   starts with cd <the worktree path> &&, because your working directory
   resets between calls to the shared checkout, and nothing of yours runs
   there. Push the empty branch at once, naming the ref:
   git push -u origin slice/S<NN>-<slug>. The branch was created with
   --no-track and has no upstream, so a bare push has no target, and that
   push is still the claim. If it fails because the branch already
   exists, the slice is someone else's. Stop there and report it, change
   nothing. The branch is the whole claim: do not touch docs/backlog/,
   not to mark the slice taken and not for anything else.
2. For every acceptance criterion, in order: a test that fails for the
   right reason first, then the smallest code that passes it, then the
   whole suite and typecheck. Commit only from green. Never weaken or
   skip a test, no .skip, no .only, no widened matcher; mock only at
   module boundaries.
3. The four commands of AGENTS.md, all green: typecheck, test,
   format:check, build.
4. scripts/tier.sh <default branch> and scripts/test-weakening.sh
   <default branch>, and keep their output, stdout and stderr both: it
   goes in the PR body. A clean test-weakening.sh says so on stderr only.
5. Nothing outside the slice's scope. If a change out of scope seems
   necessary, do not make it: report it as a question. The prose the
   slice names in Touchpoints, docs/spec.md, docs/codebase-map.md, a
   SKILL.md, is in scope and travels in this branch with the code, never
   in a commit on the default branch: the judge reads the touchpoints of
   the slice, and the PR is where the change is whole.
6. Do not repair the harness of this repo. A template behind, a line
   missing, a script that misbehaves: one dated line, `- <YYYY-MM-DD>:
   <one line>`, in your report, and carry on. Never in docs/inbox.md on
   your branch: that file is a human-merge path, a PR that touches it gets
   human-gate and the policy does not merge it, and the judge reads it as
   out of scope.

If you cannot finish honestly, because a test would have to be weakened,
because a decision the slice does not cover is needed, or because a
command is denied: set the slice to status: blocked, add a ## Blocked
section saying what is missing in one line, commit, push, and report
that instead. Do not guess the decision.

Report back: the branch, the shas, the output of the two scripts, what
the four commands said, and the one-line question if there is one.
Nothing about how you reasoned, and no retelling of the code.
```

The backlog is out of bounds for a slice branch, and that is the point.
`docs/backlog/**` is in "Merge umano per path" of `AGENTS.md`, so `tier.sh`
prints `human-gate` for any PR that touches it and the CI puts the label on:
neither `automerge.yml` nor `policy.sh` merges a PR that carries it, not even
at tier 1 with zero findings. The commit that used to mark the slice
`in-progress` cost exactly that, on every slice of every wave, and it said
nothing the branch on the remote had not already said. The one exception is
the blocked slice below: its PR is a draft waiting for a human anyway.

A subagent that reports the branch already taken, or a blocked slice, ends
there for this run: no judge, no PR from here. A blocked slice gets its draft
PR and the `needs-human` label from 5, and its question goes to the hand-back.

## 4. The judge, once

For every slice that came back green, `/judge` on its branch, once per role,
with the tier the subagent's `scripts/tier.sh` printed: correctness alone at
tier 1, correctness and security together at tier 2, and the model the tier
asks for, `sonnet` at tier 1 and `opus` at tier 2 (ADR-0002, decision 5).

The judge runs from the slice's worktree: every command of `/judge`, the
gates, `judge.sh bundle` and `judge.sh check`, goes inside
`(cd .claude/worktrees/S<NN> && ...)`, because each of them reads `HEAD` and
in the root `HEAD` is the default branch. The verdict file each judge
subagent writes goes outside the worktree, in this session's scratch
directory: a file left in the tree is untracked, and `git worktree remove` in
7 refuses a tree that has one. The store is outside it already, under the git
common dir, one per clone, so what `check` stores from the worktree the root
reads too.

One judgement per PR, and no second one, ever (ADR-0003, decision 2). The
`high` and `medium` findings go back to the subagent that wrote the code, with
SendMessage, in one message:

```
The judge found these on your branch. For each one: decide whether it is
right. If it is, fix it, run the four commands, commit from green, and
answer it with scripts/judge.sh answer <id> <sha> <role>, one commit per
finding. If you believe a finding is wrong, say so in one line with the
reason and answer it anyway with the commit that makes the code say why,
a comment or a test. Do not open a second judgement and do not touch the
verdict by hand. If a fix would make the code say something the approved
spec does not, do not fix it here: write one dated line in docs/inbox.md,
it becomes a slice with spec: inbox (<date>), and say so in your report.

<the findings, as scripts/judge.sh findings <role> prints them>
```

The `low` findings are not sent: they are declared in the PR body, with their
id and file, and the audit reads them there. A `high` or `medium` left without
an answer is a slice that does not open its PR: the hook refuses it and names
the ids, and that refusal is correct, not something to work around.

A human who reads a PR this run opened and finds something goes through the
same message, not through a second judgement and never through a merge as it
is: `scripts/judge.sh finding <severity> <file>[:<line>] <claim> [role]`
writes it into the verdict of the judged head with `by: human`, it is sent to
the subagent like the others, and the fix answers it with its commit. Until
then the policy holds the PR for a human, whatever the judge said.

## 5. The PR and the verdict

Once every `high` and `medium` has its answer, the orchestrator opens the PR,
one per slice, from its worktree, with `--body-file -` and a quoted heredoc:

```
(cd .claude/worktrees/S<NN> && gh pr create --base <default branch> --head slice/S<NN>-<slug> --title "<the slice's commit subject>" --body-file -)
```

`--head` is always there. The hook that refuses a head with no verdict reads
the head from `--head` when the command carries one, wherever it runs, and
from `HEAD` otherwise, which in the root is the default branch. It reads the
tier and the verdict from the worktree where that branch is checked out, so
the worktree is still there when the PR opens.

The body is the repo's PR template, filled: "Slice" is the path of the slice
file; the "Declarations" boxes ticked as the slice really is, because the CI
reads them and one ticked box makes the PR tier 2; "How to check by hand"
copied from the slice's Notes, or `tests only` when it has none; then the
declared `low` findings and the output of `tier.sh` and `test-weakening.sh`.
A blocked slice gets the same PR as a draft, with the `needs-human` label and
its `## Blocked` line in the body.

Then wait for the CI on the PR head and post the verdict, once per role:

```
gh pr checks <pr> --watch
(cd .claude/worktrees/S<NN> && scripts/judge.sh have <role> <base> && \
  scripts/policy.sh "$(scripts/judge.sh path <role>)" <pr> <tier> <role>)
```

From the worktree too, because `have` and `path` read `HEAD`: in the root they
would look for a verdict of the default branch.

The order matters and is not a preference: `policy.sh` from a terminal merges
only when the `ci` check has passed on the head of the PR, so a verdict posted
before the CI is green is a verdict that will not merge anything (S11). `have`
and not `path` alone, for the reason section 7 of `/judge` gives.

## 6. Wait for the merge

With `HARNESS_AUTOMERGE` on, `policy.sh` merges what the tier allows, and
`close.yml` then sets the slice to `done` on the default branch. The next wave
needs both, because its slices read `blocked_by` against that board:

```
gh pr view <pr> --json state,mergedAt
git fetch origin && git log --oneline -1 origin/<default branch>
```

The cap is **twenty minutes per PR**, from the moment the verdict is posted.
Past it, stop waiting, leave the PR as it is, and carry the fact into the
hand-back as that PR's state. Do not merge by hand and do not remove a
`human-gate` label: that label is the human's, and a tier 2 with an open
`high` or a `needs-human` is theirs to decide.

With `HARNESS_AUTOMERGE` off everything above runs the same and every PR stays
open with `policy.sh`'s "would have merged" comment. That is how the chain is
tried without trusting it yet, and in that mode the next wave does not start:
its prerequisites are not `done`, so say so in the hand-back and stop.

Then the next wave, from the default branch pulled again.

## 7. Hand back

First the worktrees go, from the root, one for every slice of the run,
merged, open or blocked alike:

```
git worktree remove .claude/worktrees/S<NN>
```

The branch stays, local and on the remote, and so does the verdict, which
lives in the git common dir and never lived in the worktree: `judge.sh answer`
and `judge.sh finding` on a PR left open still find it from any checkout of
that branch. With the worktree gone `gh pr checkout <n>` from the root works,
which it does not while the branch is checked out somewhere else, and whoever
verifies by hand does it there, never inside `.claude/worktrees/`. No
`--force`: a worktree that refuses holds something uncommitted, and its path
goes in the hand-back instead of in the bin.

Then one line per PR, and nothing else:

`<link> · tier <n> · <the verdict in one sentence> · <merged | open | blocked>`

Under them, only what a human has to act on:

- "How to check by hand" for the slices whose Notes carry manual steps,
  those and no others;
- the one-line question of every blocked slice, each with its slice id;
- what the twenty-minute cap left open, if anything;
- the worktrees `git worktree remove` refused, with their path, if any;
- the inbox lines the subagents reported, verbatim, with one question:
  whether to commit them on the default branch. `docs/inbox.md` goes on main
  with the human's yes, and the hand-back is where the human is.

No retelling of the code, no summary of the diffs, no list of the files
touched: all of it is in the PRs, and the whole point of the chain is that the
human reads one line unless something needs them.

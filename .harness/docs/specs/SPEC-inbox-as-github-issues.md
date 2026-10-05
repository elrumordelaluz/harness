---
status: approved
intent: .harness/docs/intent/inbox-as-github-issues.md
date: 2026-10-05
approved: 2026-10-05
---

# SPEC: The inbox is the open issues of the repo

## Problem

The inbox is one file, `.harness/docs/inbox.md`, and every line costs a
commit on the default branch. Two sessions that append at once conflict. A
subagent of `/next` may not write to it, because the file is in
`human_gate_paths` and a PR that touches it gets `human-gate`, so its lines
travel in the report and wait for a yes in the hand-back (`skills/next/SKILL.md`,
section 7). A project repo that finds a defect of the harness has no channel
to this repo but Lionel copying the line across. `board.sh` reads the file
with awk (`skills/harness-init/templates/scripts/board.sh:275-292`) and
`/board` closes a line with a commit that takes it out.

## Solution

The inbox is the open issues of the repo, written by a collaborator or
marked by one with the accept label, minus the issues that carry one of the
skip labels the repo lists in its policy block. Filing an issue is enough to make it a candidate: nobody has to know a
label to reach the harness. A label is the way out, for a discussion, an epic,
something that will not be built: `/board` asks once and the issue stays open
and off the board. Without `gh`, offline, rate limited or logged out, the
Inbox section says `gh not available` and the rest of the screen is the same.

## User stories with criteria

- Come membro del team, apro una issue e la ritrovo su `/board` senza
  aggiungere label.
  - [ ] An open issue by a collaborator, with none of the skip labels, is a row of the Inbox section of `board.sh` and an entry of `inbox` in `board.sh --json`.
  - [ ] An open issue that carries any label of the skip list is in neither.
  - [ ] An open issue by an author who is not a collaborator, without the accept label, is in neither, and the Inbox section prints one line with the count of such issues and no title.
  - [ ] The same issue with the accept label is a row like any other.
  - [ ] An open issue that a slice names in `spec: issue #<n>` is in neither.
  - [ ] With `gh` missing or failing, the Inbox section reads `gh not available` and the exit is 0.
- Come subagente di `/next`, segnalo una cosa fuori scope senza passare dall'umano.
  - [ ] The hand-back of `/next` lists the numbers of the issues its subagents filed and asks no question about them.
  - [ ] A skill working in a project repo whose `.harness/stamp.json` has `pin.origin` files a defect of the harness on that repo, and on the current repo when the field is missing.
- Come Lionel, rispondo a una issue su `/board` con una parola.
  - [ ] `via` leaves the issue closed with a comment that carries the reason.
  - [ ] `slice` leaves a slice on main with `spec: issue #<n>`, the issue open with a comment naming the slice, and the PR that `/next` opens for it carries `Fixes #<n>` in its body.
  - [ ] `intent` leaves `.harness/docs/intent/<slug>.md` with the line `Source: #<n> <url>` above `## Problem`, and the issue closed with a comment naming the intent.
  - [ ] `skip` leaves the issue open with the first skip label and a comment.

## Locked decisions

- Structural choice: the issues are the inbox, `board.sh` reads them through `gh api` and `.harness/docs/inbox.md` goes. Rejected: the file stays the inbox and a workflow on `issues: opened` appends a line with a commit on main, because it keeps one commit per line, races every human commit on main, and leaves two states for one item, a line taken out of the file with its issue still open and an issue closed by `Fixes #n` with its line still there. What it buys, a board offline, the issues get by printing `gh not available` in the Inbox section as the Open PRs section already does (`board.sh:485-492`).
- The inbox is every open issue by a collaborator minus those with a skip label, rather than every issue (an epic or a discussion would come back on every `/board` with no way to stay open and leave the board) or only the issues with an `inbox` label (an issue filed without it is invisible, and the label is effort asked of every human who files one).
- The skip labels are per repo, a list in the policy block of `.harness/AGENTS.md`, so a repo can name its own (`harness:skip`, `discussion`, `wontfix`) without a change to the harness.
- `/board` answers each issue in one of four ways. `via`: a comment with the reason, then `gh issue close`, `completed` when a commit, slice or ADR settled it and `not planned` when it is no longer true. `slice`: the slice is committed on main with `spec: issue #<n>` in place of `spec: inbox (<date>)`, the issue gets a comment naming the slice and stays open, and `/next` writes `Fixes #<n>` in the PR body from that field, so the squash merge closes it. `intent`: `intent.sh new <slug> --issue <n>`, a comment on the issue naming the intent, and `gh issue close` as `completed`. `skip`, the fourth answer: the first skip label and a one-line comment with the reason, the issue left open.
- `board.sh` leaves off the board an open issue that a slice names in `spec: issue #<n>`, so an issue waiting on its slice is not asked again. Rejected: closing the issue when the slice is written, which would leave `Fixes #n` with nothing to close.
- The skeleton `intent.sh new <slug> --issue <n>` writes opens with one line, `Source: #<n> <url of the issue>`, above `## Problem`, so whoever writes the ten lines rereads the issue from the file; `intent.sh open` keeps the line and does not count it as a section.
- A skill or a subagent of `/next` files a line about the repo it works in with `gh issue create`, the slice id, the PR and what it saw in the body, with no human yes: an issue costs nothing to close and `/board` asks about every one. The hand-back of `/next` lists the issue numbers instead of asking whether to commit inbox lines. Rejected: the orchestrator files them after a yes in the hand-back, the cost the file made necessary and the issues remove.
- A defect of the harness found in a project repo is an issue on the harness repo, `gh issue create -R <owner/name>`, the repo read from `pin.origin` of `.harness/stamp.json` (`bootstrap.sh:40`), never hardcoded; with no `pin.origin`, as in the harness repo, the current repo. It replaces the ground rule of the five skills that writes a dated line in `.harness/docs/inbox.md`.
- `Bash(gh issue *)` joins the allowlist of `skills/harness-init/templates/settings.json:42-44`.
- `board.sh` reads the inbox with one call, `gh api repos/{owner}/{repo}/issues?state=open`, drops the entries with a `pull_request` key and keeps those whose `author_association` is `OWNER`, `MEMBER` or `COLLABORATOR`, the field `policy.sh` already trusts on comments (`policy.sh:436-437`). Rejected: one collaborator check per author, a call each against the rate limit. `tests/fixtures/bin/gh` answers the call from `STUB_ISSUES`, as it answers `pr list` today.
- An issue by an author who is not a collaborator reaches the board only once it carries the accept label, `harness:accept` by default, a key of the policy block like the skip list. Only a user with triage access or more can add a label on GitHub, so the label is a collaborator vouching for the text. Until then `board.sh` prints one line under the inbox, `<n> issues from outside, waiting for harness:accept`, with no title. Rejected: a key that lets any author in, which removes the one defence that keeps a crafted issue from steering the recommendation of `/board` and, through a `slice`, the code `/next` writes.
- The call reads one page of 100 issues, `per_page=100`; past it the Inbox section says `100+`, since the screen holds 40 lines and the filter of the board is its own intent.
- The labels of the policy block, the skip list and the accept label, are created by stage `local` if missing, before it labels the issues open at install time.
- No ADR: decision 6 of ADR-0002, the inbox as a source of work, stands and only the medium changes; the line in "What changes" of `docs/spec.md` cites it.
- No backwards compatibility: the harness has one user and one project repo, so nothing migrates. `.harness/docs/inbox.md` leaves the templates, the policy block and every reader, and a repo on the old layout starts over with `/harness-init`. The lines open today in this repo are Lionel's to file or drop by hand. Rejected: stage `local` moving each line into an issue, idempotent, which is code written once for a handful of lines.
- The policy block goes to version 2 with two required keys, `inbox_skip_labels`, a list whose first entry is the one `/board` and stage `local` apply, and `inbox_accept_label`, and `policy-lines.sh` reads 2 only: a block at version 1 is refused with `run /harness-init local`, which is the start over of the line above.
- Stage `local` puts the first skip label of the list on every issue open at install time and prints the count in its hand-back, rather than leaving them all to the first `/board`, which would ask about each one in turn and show only the oldest rows of a 40 line screen.

## Modules touched

- `skills/harness-init/templates/scripts/board.sh`: the inbox read from `gh api repos/{owner}/{repo}/issues` instead of `.harness/docs/inbox.md`, the issues claimed by a slice left off, the count of the issues from outside.
- `skills/harness-init/templates/scripts/policy-lines.sh`: version 2 of the block, with `inbox_skip_labels` and `inbox_accept_label` required.
- `skills/harness-init/templates/docs/inbox.md`: removed, with its row in `skills/harness-init/templates/README.md`.
- `.harness/docs/inbox.md`: removed.
- `skills/harness-init/templates/AGENTS.md` and `.harness/AGENTS.md`: version 2 of the block, the two keys, `.harness/docs/inbox.md` out of `human_gate_paths`.
- `skills/board/SKILL.md`: the answers close or label an issue instead of committing.
- `skills/harness-init/templates/scripts/intent.sh`: `new` takes `--issue <n>` and writes the `Source:` line; `open` keeps it.
- `skills/next/SKILL.md`: `Fixes #<n>` in the PR body of a slice with `spec: issue #<n>`; the brief of the subagent and the hand-back file issues instead of reporting inbox lines.
- `skills/board/SKILL.md`, `skills/next/SKILL.md`, `skills/spec/SKILL.md`, `skills/slice/SKILL.md`, `skills/judge/SKILL.md`: the ground rule on the harness of another repo files an issue on the repo of `pin.origin`.
- `skills/harness-init/templates/settings.json`: `Bash(gh issue *)` in the allowlist.
- `skills/harness-init/templates/docs/README.md` and `.harness/docs/README.md`: the `spec:` field of a slice takes `issue #<n>`, the `inbox.md` lines go.
- `docs/spec.md`: a new version, the inbox as issues wherever it names `.harness/docs/inbox.md`, a line in "What changes".
- `tests/board.test.ts`, `tests/fixtures/bin/gh`: the inbox from a stubbed issue list.
- `skills/harness-init/SKILL.md`: stage `local` labels the issues open at install time.

## Out of scope

Moving the other documents of `.harness/docs/` to issues. GitHub Projects or
any board beyond the labels. A question at install time on who may reach the
inbox: the keys are edited by hand in `.harness/AGENTS.md`. Moving the lines of an existing
`.harness/docs/inbox.md` into issues, here or in a project repo. A filter for the board, `board.sh --search
<query>` handed to `gh issue list --search` and `/board <query>` asking only
about the issues that match, with `--page` for the rows past the screen: its
own intent once the issues are the inbox, deterministic in the script and
never a choice of the agent.

## Open questions

None.

## Decisions to confirm

1. The inbox is the open issues by collaborators, plus those an outsider wrote and a collaborator marked `harness:accept`, minus those with a skip label; `.harness/docs/inbox.md` goes, with no migration.
2. The skip labels and the accept label are keys of the policy block, which goes to version 2: a repo on version 1 starts over with `/harness-init local`.
3. `/board` answers with `via`, `slice`, `intent` or `skip`; a slice keeps its issue open until the PR of `/next` closes it with `Fixes #<n>`, and an intent closes it with the link in `Source:`.
4. Skills and subagents file issues with `gh issue create` without asking, and a defect of the harness goes to the repo of `pin.origin`.
5. Stage `local` puts the first skip label on the issues already open at install, so the first board starts empty.

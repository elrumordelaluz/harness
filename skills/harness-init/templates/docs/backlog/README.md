One slice per file, `S<NN>-<slug>.md`. There are three sources. An approved spec: `/slice` cuts it all at once and prints the board, once per spec; it follows the `docs_mode` key of the policy block in `AGENTS.md`, and with `main` the human's yes to the board is the approval and the commit on the default branch, `docs(backlog): <slug>`, is the record, while with `pr` the slices travel on the branch `backlog/<slug>` and the approval is the merge of the PR. The audit, which opens a slice for what it finds reading the verdicts in `docs/review-log/`, the PRs and the runs. The inbox, a line of `docs/inbox.md` that `/board` turns into a slice. Nothing else puts work in the backlog: a new feature stays intent, spec, slice.

    ---
    id: S03
    title: The watcher sees the score update in real time
    status: todo            # todo | blocked | done
    blocked_by: S01         # none or a list
    tier: 1                 # the expected tier, the CI recomputes it
    human: false            # true = only a human takes it, and it lands at tier 3
    spec: docs/specs/SPEC-watcher.md
    ---
    ## Goal
    ## Acceptance criteria   (checkboxes, testable)
    ## Test plan             (which tests are written first)
    ## Touchpoints           (real paths)
    ## Notes                 (the decisions of the spec, inlined)

`spec:` names the source and is never empty: the path of the spec; `audit (<reference>)` with the PR or the run it comes from, for example `audit (PR #3)`; `inbox (<date>)` with the day of the line, for example `inbox (2026-09-12)`. A slice with no source is not taken. `id` is the number after the highest one already taken, and it is never reused: it lives in branch names and in verdicts. With `main` the default branch is enough, because a spec is cut in a single session and its board lands there before the next one; with `pr` the open `backlog/*` branches count too, because that is where the boards not yet merged are.

`blocked_by` is `none` or a list, and every entry has one of two shapes: `S<NN>`, a slice without which this one cannot be built, or `ADR-<nnnn>`, a decision that holds it still. A slice held still by an ADR stays `todo`, `/board` says so on its row, reading the field, and `/next` does not take it until a human removes the ADR, because an ADR is never a `done` slice. The ADR is removed by `/board`, which lists it under what waits for a human, with the ids of the slices it holds still, and asks whether to remove it: on a human's yes it leaves `blocked_by`, the `## Blocked` section goes away and a commit says so. The decision stays a human's; the edit by hand does not.

Taking a slice: the branch `slice/S<NN>-<slug>`, pushed at once, and nothing else. If it is already there, the slice is someone else's. The frontmatter has no state for work under way, because the branch on the remote says it: the file of the slice is not touched to mark it taken. `docs/backlog/**` is among the human merge paths, so a slice PR that touches the backlog takes the `human-gate` label and the policy does not merge it, not even at tier 1 with zero findings. The exception is a slice that stops: `status: blocked` and a `## Blocked` section in the file, and its PR is a draft that waits for a human anyway. `blocked` means only that, a slice taken and left half done: a slice nobody has taken is `todo`, even when it is held still. Eligible: `status: todo`, every entry of `blocked_by` in `done`, `human: false` unless a human is the one running it, and no `slice/S<NN>-<slug>` branch on the remote, because that slice is already taken: `/board` shows it as taken instead of `todo`, and neither it nor `/next` counts it as eligible.

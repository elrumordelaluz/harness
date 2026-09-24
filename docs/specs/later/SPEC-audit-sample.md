---
status: draft
intent: docs/intent/later/audit-sample.md
date: 2026-09-24
approved:
---

# SPEC: a sampler that picks what the audit reads

## Problem

Section 4.8 of `docs/spec.md` asks for three audited PRs a week, and by 5.6
`/audit` proposes nothing under five audits. On 24 September
`docs/review-log/verdicts.jsonl` holds 106 rows across 54 PRs, 180 findings,
19 verdicts carrying `answers` from `judge.sh answer`, and not one filled
`audit` block. Nobody has ever checked whether an answering commit closes its
finding, which 4.6 names as the thing the audit exists for. Picking three PRs
out of 54 means reopening the verdict and the diff of each to learn which one
deserved the read: choosing costs as much as auditing, and the audit never
starts.

## Solution

A command in this repo, outside the templates, run as
`pnpm audit-sample <verdicts.jsonl> <owner/repo>`. It reads the log, keeps the
merged PRs, fetches each PR's diff with `gh pr diff` and each answering commit
with `git show`, asks a probability model the same questions of every verdict,
and prints the three PRs with the lowest confidence next to the question that
lowered it. The human audits those three in Docket as today: Docket does not
change.

## User stories with criteria

As the human who audits, I know before running the command whether it picked well.

- [ ] The unit of the test is the PR, not the verdict: at tier 2 a PR carries two verdicts, and the command prints PRs.
- [ ] A PR is a positive when at least one of its `audit` blocks, written by the Docket export into `docs/review-log/verdicts.jsonl`, has `agree: false` or `missed_issue: true`. The ground truth lives in the log, in the shape of 7.1, and needs no file of its own.
- [ ] The ten PRs are drawn at random from the merged PRs of the log before the command runs for the first time, and audited by hand in Docket.
- [ ] The test counts only when at least two of the ten are positives; with fewer, "at least two of those" cannot be met and the draw is repeated on ten more.
- [ ] The test passes when the three PRs the command prints include at least two of the positives.

As the human who audits, I point the command at one repo's log and it ranks every merged PR in it.

- [ ] The pool is every PR of the given `verdicts.jsonl` with `outcome.action: merged`, whoever merged it: 54 on this repo on 24 September, of which only 11 carry `decided_by: policy`.
- [ ] The command takes the path of a `verdicts.jsonl` and the `owner/repo` its diffs come from, and runs unchanged on this repo and on Tipoff.
- [ ] The success test runs on this repo first.

As the human who audits, I see beside each PR the question that made it doubtful.

- [ ] Three questions, each a yes/no that returns P(fine), the same polarity everywhere: (Q1) for each answered finding, state the finding and the diff of its answering commit, "Does this commit change what the finding's claim describes, in the way the claim asks?"; (Q2) for each criterion with `ok: true`, state the criterion's text from the slice file and the PR diff, "Does the diff contain a test that would fail if this criterion stopped holding?"; (Q3) for each PR with a slice and `scope_ok: true`, state the slice's Goal and Touchpoints and the diff's file list, "Does every change in the diff serve this slice's goal?"
- [ ] The question texts live in one module as constants, with a version string printed with every run.
- [ ] Before Q1 a rule runs in code: an answering commit that does not touch the finding's `file` scores 0 with the text "commit does not touch `<file>`", and the model is not asked.
- [ ] A PR's score is the lowest of its answers, and the line printed for it names that answer: the question, the finding or criterion id, and the probability.

As the human who audits, I never read a failure as if it were an answer.

- [ ] The PR diff comes from `gh pr diff <n>`; the answering commits from one `git fetch origin 'refs/pull/*/head:refs/remotes/pr/*'` at the start, then `git show <sha>`; the criterion text and the slice Goal and Touchpoints from the slice file at the PR's merge commit, `git show <mergeCommit>:docs/backlog/S<NN>-*.md`, never from today's file.
- [ ] A question that cannot be asked (a sha no fetch returns, a slice file absent at that commit, a criterion id with no line, a 429 or a timeout from the model) is recorded as unasked with its reason, and never as a probability.
- [ ] PRs with an unasked question are printed in a block "could not rank" below the three, each with its reasons.
- [ ] The exit code is 0 when at least three PRs were ranked, and not 0 otherwise.

As the human who audits, I know which model answered and can tell two runs apart.

- [ ] The model sits behind one seam, `score(state, questions)`, which returns the probabilities, the model string as the provider returned it and the usage.
- [ ] Two implementations: Jev, through `fetch` against `POST https://api.typesafe.ai/v1/systemone` with the key from `TYPESAFE_API_KEY`, and a fake with fixed probabilities that every test uses. No test touches the network.
- [ ] Without `TYPESAFE_API_KEY` the command stops before any fetch and says which variable is missing.
- [ ] Every run prints the model string returned (for example `jev-1.13.0`, never `jev-latest`) and the version of the questions.
- [ ] No new dependency in `package.json`.

## Locked decisions

- The shape: a command in this repo, under `tools/audit-sample/`, that prints three PR numbers; the human audits them in Docket, which does not change. Rejected: the ranking inside Docket, because a static browser app would need a GitHub token and a Jev key in the page, could not reach SemIf on the Mac without a local server, and 11 of `docs/spec.md` keeps Docket a reader with no backend; its one gain, choosing and auditing on one screen, saves reading three numbers (interview, question 3).
- No gate: nothing enters CI, `tier.sh` or `policy.sh`, and no workflow calls a model (intent, ADR-0004).
- The model picks what is read, the judgement stays the human's in Docket (intent).
- The success test counts PRs, and a positive is `agree: false` or `missed_issue: true` in a Docket `audit` block (interview, question 1).
- The pool is every merged PR, not only those with `decided_by: policy`: here `human` mostly means a click after the gates, not a read diff, and 11 PRs are too few for a draw of ten to prove anything (interview, question 2).
- Three questions, Q1 on answered findings, Q2 on criteria marked ok, Q3 on scope; a PR's score is its lowest answer. Whether an answering commit touches the finding's file is a rule in code, not a question, because a rule already decides it (interview, question 4).
- The slice text is read at the PR's merge commit, because a slice rewritten later (S51) would ask about criteria the judge never saw (interview, question 5).
- A failure is recorded as unasked with its reason and never becomes a probability, so it cannot move a PR in the ranking (interview, question 5, and the Jev playbook).
- Jev through plain `fetch`, not `@typesafe-ai/sdk`: the SDK is pre-1.0 and the call is one POST, so no dependency. SemIf is the second implementation of the seam and is not built until Jev's data terms or its spread fail, and it would need a local server or a subprocess (interview, question 6).
- The state holds the code and verdicts of this repo and Tipoff, both the author's own; Jev's terms (no training on inputs, US retention) do not conflict with anything signed for them. Client repos stay out (intent, interview, question 6).
- One repo per run, named by the path of its log and its `owner/repo`; this repo and Tipoff, as the intent allows (interview, question 2).

## Modules touched

- `tools/audit-sample/` (new): the command.
- `package.json`: the `audit-sample` script.
- `docs/codebase-map.md`: the new module.
- Not `skills/harness-init/templates/`: project repos do not receive the command.

## Out of scope

- A gate: none of this enters CI, `tier.sh` or `policy.sh`, and no workflow calls a model (ADR-0004).
- Replacing the judge or the human audit.
- The metrics and the tuning PRs of 5.6.
- A sweep over the files of a repo, and the hook on remote commands.
- Diffs from client repos sent to an external API: this repo and Tipoff come first.
- SemIf, until the seam needs it.

## Open questions

- Cost, time and the spread between two identical runs.

## Decisions to confirm

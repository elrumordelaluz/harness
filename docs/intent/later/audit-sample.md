## Problem

Section 4.8 asks for three audited PRs a week, and by 5.6 `/audit` proposes nothing under five audits. On 21 September `docs/review-log/verdicts.jsonl` holds 69 rows across 34 PRs, 138 findings, ten verdicts with answers from `judge.sh answer`, and zero `audit` blocks. Nobody has ever checked whether an answering commit closes its finding, which 4.6 names as the thing the audit exists for. Picking three PRs out of 34 means reopening the verdict and the diff of each to learn which one deserved the read: choosing costs as much as auditing, and the audit never starts.

## What success looks like

One command reads `verdicts.jsonl` and the PR diffs, asks a model that answers with probabilities and no text (Jev, or SemIf locally) the same questions of every verdict, for example whether an answering commit touches what its finding names and whether the diff covers a criterion marked `met`, and prints the three PRs with the lowest confidence next to the question that lowered it; on ten verdicts I audited by hand beforehand, the three it picks include at least two of those where I had found something.

## Out of scope

A gate: none of this enters CI, `tier.sh` or `policy.sh`, and no workflow calls a model (ADR-0004). Replacing the judge or the human audit: the model picks what I read, the judgement stays mine in Docket. The metrics and the tuning PRs of 5.6. A sweep over the files of a repo and the hook on remote commands, which are other ideas. Diffs from client repos sent to an external API: this repo and Tipoff come first.

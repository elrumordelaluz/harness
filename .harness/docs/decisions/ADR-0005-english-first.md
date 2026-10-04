# ADR-0005: from today the harness is written in English, and the history is not translated

Date: 2026-09-21. Status: accepted by Lionel in the conversation that approved `docs/specs/SPEC-english-first.md`. It lands with the PR of slice S48; `docs/decisions/**` is a human-merge path, so that merge is the approval.

## Context

The harness was born in Italian because it had to serve an Italian audience. It runs on Tipoff and on Docket, it has to go onto codebases in production, and whoever opens one of those repos will not always read Italian. The skills and the judge's prompt are already in English; the contract is not. `AGENTS.md` here and in the template, `CLAUDE.md`, `docs/codebase-map.md`, the five READMEs of `docs/`, `docs/inbox.md`, the PR template and the 707 lines of `docs/spec.md` are the documents a dev reads to understand what is in front of them, and they are all Italian. Every repo more that installs the harness raises the cost of the change.

`docs/specs/SPEC-english-first.md` decides how the change is made: the contract comes out of the prose into a block of fixed keys inside `AGENTS.md`, nobody parses a sentence any more, and everything a human reads or writes becomes English. What a spec cannot decide is the day, and what happens to what is already written. Without a day, a document written tomorrow in Italian is nobody's mistake, and the next one takes the language of whoever writes it.

## Decision

1. **From 2026-09-21 the new documents of this repo are written in English.** Intents, specs, slices and ADRs opened from this day on are in English: `docs/intent/`, `docs/specs/`, `docs/backlog/`, `docs/decisions/`. A document written in Italian after this day is a mistake to fix, not a choice. The rule holds for this repo, because the prose of a repo that installs the harness is decided by that repo and not by the harness.
2. **The history is not translated.** The intents, specs, slices, ADRs and verdicts already written stay where they are and as they are, and so do the quotations of them: `docs/intent/`, `docs/specs/SPEC-*.md`, `docs/backlog/S*.md`, `docs/decisions/ADR-*.md`, `docs/review-log/`. They are the record of conversations that happened in Italian, and a record translated after the fact is a record rewritten. For the same reason `SPEC-english-first` stays in Italian, although it is the spec of this very change.
3. **What a program reads is not prose and does not follow this rule.** The names of the frontmatter fields, the branch names, the commit subjects, the labels of the policy lines of `AGENTS.md` and the paths stay the strings they are, until `SPEC-english-first` moves them into the block of keys. Inside an ADR the one string a program reads is the `## Ordine di lavoro` heading, which `scripts/board.sh` looks for: an ADR written in English keeps that heading as it is, or the board stops finding the plan.

## Alternatives dropped

Translating the history too, so that the repo is in one language. It costs the reading of every document already written, it puts a translation between a decision and the words in which it was taken, and it buys nothing: nobody opens a `done` slice of 14 September to learn how the chain works. They open `docs/spec.md`, which this slice translates.

Declaring the day at the end, when every slice of `SPEC-english-first` has landed. It leaves the documents written in the meantime in a language nobody has decided, and it is exactly the week in which the most documents get written, because the spec is made of slices that each carry their own prose.

## Consequences

`docs/spec.md` goes up to 0.29 and names this ADR in "What changes since 0.1". The ADRs, the intents, the specs and the slices that come after this one are in English, and the skeletons that `/spec`, `/slice` and `scripts/intent.sh new` write follow with the slices of `SPEC-english-first` that own them: until then a new document is written in English inside sections whose headings are still Italian, and that is the seam the migration leaves open for a few days.

The test that keeps Italian out, S50, reads a declared set of paths and leaves out `docs/intent/`, `docs/specs/SPEC-*.md`, `docs/backlog/S*.md`, `docs/decisions/ADR-*.md` and `docs/review-log/`: decision 2 is the reason that list exists, and this ADR is the document the test points at when somebody asks why the history is red nowhere.

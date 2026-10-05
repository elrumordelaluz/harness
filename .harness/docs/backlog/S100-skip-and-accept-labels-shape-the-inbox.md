---
id: S100
title: A label takes an issue off the board, and another lets an outsider's in
status: done
blocked_by: S99
tier: 2
human: false
spec: .harness/docs/specs/SPEC-inbox-as-github-issues.md
---

## Goal

The policy block of `.harness/AGENTS.md` goes to version 2 with two required
keys, `inbox_skip_labels` and `inbox_accept_label`, and `board.sh` reads them:
an issue with a skip label stays open and leaves the board, an issue from
outside the collaborators reaches it only once a collaborator puts the accept
label on it, and until then the board counts those issues without printing
their titles. Stage `local` creates the labels and puts the first skip label
on the issues already open at install, so the first board of a repo starts
empty.

## Acceptance criteria

- [ ] An open issue by a collaborator that carries any label of `inbox_skip_labels` is neither a row of the Inbox section nor an entry of `inbox` in `--json`.
- [ ] An open issue by an author who is not a collaborator, without the label of `inbox_accept_label`, is in neither, and the Inbox section prints one line, `<n> issues from outside, waiting for <accept label>`, with no title; with none such, the line is not printed.
- [ ] The same issue with the accept label is a row like any other, and an entry of `inbox`.
- [ ] An issue with both the accept label and a skip label is in neither: the skip wins.
- [ ] `.harness/bin/policy-lines.sh` reads version 2 only and requires both keys: a block at version 1 is refused with `run /harness-init local`, and a block without either key is refused naming it, the way the other keys are.
- [ ] `.harness/AGENTS.md` and `skills/harness-init/templates/AGENTS.md` carry a block at version 2 with `"inbox_skip_labels": ["harness:skip"]` and `"inbox_accept_label": "harness:accept"`, and the prose of "Review policy" or "Human gates" says what the two keys do.
- [ ] `skills/harness-init/SKILL.md`, stage `local`: creates every label of the two keys that is missing with `gh label create`, then puts the first skip label on every issue open at that moment and prints the count in the hand-back.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/agents.ts`: `PolicyBlock` gains the two keys; the broken block `a version it does not know` moves to version 3, since 2 becomes the one the harness reads; a new broken face for a key missing is not needed, the existing one covers the mechanism. Then `tier.test.ts`, `hooks.test.ts`, `intent.test.ts` and `park.test.ts`, which read the real block, must stay green with the new one.
- `tests/board.test.ts`: in the describe of S99, cases for the first four criteria, the fixture writing a `.harness/AGENTS.md` with a block of version 2 (from the template through `withPolicy`, so the board reads what a repo has). Red today: the script reads no label and no block.
- A case per refusal of the fifth criterion where the readers of the block are tested today (`tests/tier.test.ts`, through `brokenPolicies`): version 1 named with `/harness-init local`, each new key missing named.
- `tests/architecture.test.ts`: a case that `skills/harness-init/SKILL.md` names `gh label create`, `inbox_skip_labels` and `inbox_accept_label` in the stage `local` section, red today.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/scripts/policy-lines.sh`: `POLICY_KEYS` at `:24` and the versions it reads near `:18-24`, `:92-96`.
- `skills/harness-init/templates/scripts/board.sh`: reads the two keys through `.harness/bin/policy-lines.sh`, filters, prints the outsiders line; header comment.
- `skills/harness-init/templates/AGENTS.md`: block to version 2, the two keys, a sentence on them.
- `.harness/AGENTS.md`: the same block of this repo, version 2 and the two keys.
- `skills/harness-init/SKILL.md`: stage `local`, the labels and the issues open at install.
- `tests/agents.ts`, `tests/board.test.ts`, `tests/tier.test.ts`, `tests/architecture.test.ts`.

## Notes

From the spec, binding here:

- The inbox is every open issue by a collaborator minus those with a skip label, rather than every issue (an epic or a discussion would come back on every `/board` with no way to stay open and leave it) or only issues with an `inbox` label (an issue filed without it is invisible).
- The skip labels are per repo, a list in the block, so a repo names its own (`harness:skip`, `discussion`, `wontfix`) without a change to the harness. The first entry of the list is the one `/board` and stage `local` apply.
- Only a user with triage access or more can add a label on GitHub, so the accept label is a collaborator vouching for the text. The rejected alternative, a key that lets any author in, removes the one defence that keeps a crafted issue from steering the recommendation of `/board` and, through a `slice`, the code `/next` writes. So the outsiders line carries a count and never a title.
- No backwards compatibility: `policy-lines.sh` reads 2 only, and a repo at version 1 starts over with `/harness-init local`. Every reader of the block (tier.sh, the git hooks, intent.sh, park.sh, now board.sh) gets the new keys through the same file.
- The spec does not say what `board.sh` does with a block it cannot read. The board's own rule holds: a file it reads is never an exit 1. The Inbox section prints the reason `policy_why` gives, and the rest of the screen is the same.
- Stage `local` labels the issues open at install rather than leaving them to the first `/board`, which would ask about each in turn and show only the oldest rows of a 40 line screen. The labels are created before the issues are labelled.
- `.harness/docs/inbox.md` stays in `human_gate_paths` here: the skills still write to it until S103, and S104 takes it out of the block with the file.

Out of scope: a question at install time on who may reach the inbox, the keys are edited by hand in `.harness/AGENTS.md`.

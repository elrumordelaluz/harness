---
id: S106
title: The codebase map says how board.sh reads the inbox and its two labels
status: todo
blocked_by: none
tier: 1
human: false
spec: issue #46
---

## Goal

`.harness/docs/codebase-map.md` is the first thing a cold session reads before
touching code. The `board` part of its scripts row describes the stamp, the
plan, the ADRs and `--json`, and says nothing of the Inbox section: that it
is the open issues of the repo, that a label of `inbox_skip_labels` takes an
issue off the board and leaves it open, that an outsider's issue reaches it
only with the label of `inbox_accept_label`, the skip winning, and that the
issues an outsider filed without that label are counted and never printed.
S100 added the two labels and left the map alone, because the map was not
among its touchpoints. This slice brings the row level with the script.

## Acceptance criteria

- [ ] The `board` part of the scripts row of `.harness/docs/codebase-map.md` says that the Inbox is the open issues of the repo, names `inbox_skip_labels` and `inbox_accept_label` with what each does and that the skip wins, says that the outsider issues without the accept label are counted and not printed, and that an issue named by a slice in `spec: issue #<n>` is off the inbox.
- [ ] A case in `tests/architecture.test.ts` asserts that every key of the policy block that `skills/harness-init/templates/scripts/board.sh` reads with `policy_fence` or `policy_json` is named in `.harness/docs/codebase-map.md`, so the next key the board starts reading cannot land without the map.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, next to the describe `.harness/docs/codebase-map.md names no test file but architecture.test.ts` (near `:4583`): a new describe that collects the keys `board.sh` reads from the block (the `.<key>` right after `policy_fence ... | jq` or inside `policy_json`) and expects each one in the map. Red today, because the map names neither `inbox_skip_labels` nor `inbox_accept_label`.
- Then `pnpm test` whole.

## Touchpoints

- `.harness/docs/codebase-map.md`: the scripts row, `:21`, the part on `board`.
- `tests/architecture.test.ts`: one new describe near `:4583`.

## Notes

- Issue #46, https://github.com/elrumordelaluz/harness/issues/46, filed by the `/next` run of S97-S100 while building S100.
- The behaviour the row must describe is the comment above the inbox computation in `skills/harness-init/templates/scripts/board.sh:310-326` and the reads at `:338-339`; the row says it in a sentence or two, it does not copy the comment.
- Row `:25` already says the inbox is the open issues and no file (#50): it stays as it is.
- Out of scope: any change to `board.sh` or to `skills/board/SKILL.md`; the other scripts of the row.

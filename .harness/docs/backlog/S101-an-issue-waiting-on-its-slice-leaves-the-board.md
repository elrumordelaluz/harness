---
id: S101
title: An issue already turned into a slice is not asked about again
status: done
blocked_by: S99
tier: 2
human: false
spec: .harness/docs/specs/SPEC-inbox-as-github-issues.md
---

## Goal

A slice can name an issue as its source, `spec: issue #<n>`, and `board.sh`
leaves that issue off the Inbox while it stays open waiting for the PR that
closes it. Whoever runs `/board` after the `slice` answer of S102 does not
see the same issue come back, and the documents of the harness say that
`spec:` takes the new form.

## Acceptance criteria

- [ ] An open issue that a slice of `.harness/docs/backlog/` names in `spec: issue #<n>` is neither a row of the Inbox section nor an entry of `inbox` in `--json`, whatever the status of the slice.
- [ ] An issue whose number appears only inside another `spec:` value, `spec: audit (PR #<n>)` for example, stays on the board: the match is the whole field, `issue #<n>`.
- [ ] The `backlog/` section of `.harness/docs/README.md` and of `skills/harness-init/templates/docs/README.md` lists `issue #<n>` among the sources of `spec:`, with an example, next to `audit (<reference>)` and `inbox (<date>)`.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/board.test.ts`, in the describe of S99: a slice fixture with `spec: issue #7` and an issue 7 by a collaborator, absent from the screen and from `--json`; the same with the slice `done`; a slice with `spec: audit (PR #7)` and issue 7 present. Red today: the script does not read the issue in `spec:`. The `frontmatter()` helper of the test already writes a `spec:` line; the case passes its own value.
- `tests/architecture.test.ts`: a case that both READMEs name `issue #<n>` in the `backlog/` section. The case `every spec: and intent: path of the documents names a tracked file` near `:575` already ignores values without a slash, so `issue #<n>` passes it untouched.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/scripts/board.sh`: the claimed numbers from the `spec` column it already reads (`slice_specs`, near `:290`), applied to the inbox filter; header comment.
- `.harness/docs/README.md` and `skills/harness-init/templates/docs/README.md`: the `spec:` paragraph of `backlog/`.
- `tests/board.test.ts`, `tests/architecture.test.ts`.

## Notes

From the spec, binding here:

- `board.sh` leaves off the board an open issue that a slice names in `spec: issue #<n>`, so an issue waiting on its slice is not asked again. Rejected: closing the issue when the slice is written, which would leave `Fixes #<n>` with nothing to close. The issue is closed by the squash merge of the PR `/next` opens, which carries `Fixes #<n>` (S103).
- A slice that is `done` and an issue still open means the PR did not close it: the board still leaves it off, the criterion says whatever the status. Reopening is a human's call on GitHub.
- The `inbox (<date>)` form stays documented until S104: the slices already on main carry it.

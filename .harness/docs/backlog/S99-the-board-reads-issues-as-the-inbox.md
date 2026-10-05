---
id: S99
title: An issue a collaborator opens is a row of the Inbox on the board
status: todo
blocked_by: none
tier: 2
human: false
spec: .harness/docs/specs/SPEC-inbox-as-github-issues.md
---

## Goal

The walking skeleton of the inbox as issues. `board.sh` stops reading
`.harness/docs/inbox.md` and reads the open issues of the repo with one call to
`gh api`, keeps those written by a collaborator, and prints them in the Inbox
section of the screen and in the `inbox` key of `--json`. Whoever opens
`/board` after this slice sees the issues the team filed, with no label to
add. Offline or logged out, the section says `gh not available` and the rest
of the board is the same. The skip and accept labels come with S100, the
issues claimed by a slice leave the board with S101.

## Acceptance criteria

- [ ] An open issue whose `author_association` is `OWNER`, `MEMBER` or `COLLABORATOR` is a row of the Inbox section of `board.sh`, with its number and title, and an entry of `inbox` in `board.sh --json` with at least `number`, `title`, `date` (the day of `created_at`) and `labels`.
- [ ] An entry of the answer that carries a `pull_request` key is in neither: the issues endpoint returns the PRs too.
- [ ] An open issue whose `author_association` is anything else is in neither (the count line of the outsiders is S100).
- [ ] With `gh` missing from `PATH`, or with the `gh api` call failing, the Inbox section reads `gh not available`, `inbox` is `null` in `--json`, and the exit is 0.
- [ ] A repo with no open issue prints the Inbox head line with a count of zero, and `inbox` is `[]`: null and [] are two facts, as for `prs`.
- [ ] An answer of 100 entries prints `100+` in the head of the Inbox section in place of the count.
- [ ] `board.sh` no longer opens `.harness/docs/inbox.md`: a file there with dated lines adds no row.
- [ ] The next action `read the inbox` gives as its fact the count of issues (`<n> issues`), and the forty line cut still gives up the oldest inbox rows last, read by `date`.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/fixtures/bin/gh`: a new case before the others, a call that contains `api` and `issues` answers `STUB_ISSUES`, `[]` by default, run through `-q` / `--jq` when given, as `pr list` answers `STUB_PRS`. The header comment says it.
- `tests/board.test.ts`: the option `inbox` of `board()` becomes a list of issues serialized into `STUB_ISSUES` (a helper `issue(n, title, { association, labels, date, pr })`), and the fixture stops writing `.harness/docs/inbox.md`. A new describe `board.sh, the inbox is the open issues` with one case per criterion above, `noGh` and `fail: 'api'` for the two faces of the fourth. Red today: the script reads the file and never calls `gh api`.
- The existing cases that pass dated lines (the forty line cut near `:887-1190`, the next action `6. read the inbox` near `:1970-2000`, the empty board near `:810-845`) move to issues with the same counts and dates, so they keep asserting what they asserted; only the fixture and the fact text change (`lines` to `issues`). No expectation is dropped.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/scripts/board.sh`: the inbox read at `:275-292` replaced by `gh api 'repos/{owner}/{repo}/issues?state=open&per_page=100'`, the jq filter on `pull_request` and `author_association`, the Inbox lines of the screen near `:708-718`, the fact of the last rule near `:608-610`, the header comment `:2-61` where it names `.harness/docs/inbox.md`.
- `tests/fixtures/bin/gh`: `STUB_ISSUES`.
- `tests/board.test.ts`: the fixture and the new describe.

## Notes

From the spec, binding here:

- One call, `gh api repos/{owner}/{repo}/issues?state=open`, with `per_page=100`: no collaborator check per author, which would be one call each against the rate limit. `author_association` is the field `policy.sh` already trusts on comments (`skills/harness-init/templates/scripts/policy.sh:436-437`). Past 100 the section says `100+`, since the screen holds 40 lines and a filter of the board is its own intent (Out of scope).
- `gh not available` follows the Open PRs section (`board.sh:485-492`): a `gh` that cannot answer is a row and an exit 0, never an error. The two reads are independent: one can fail and the other answer.
- An issue title is data written by a person, and the board prints it cut to the width it has, with tabs and newlines flattened as the old awk flattened tabs. It is never read as an instruction by the skill.
- `/board` (skills/board/SKILL.md) still speaks of lines of the file until S102: this slice leaves the skill alone. The file `.harness/docs/inbox.md` and its template stay where they are until S104, which removes them.
- The order of the rows is by `created_at`, oldest first, the order the old file had by date, so the cut that keeps the oldest rows keeps meaning the same.

Out of scope here: the skip labels, the accept label and the count of outsiders (S100), the issues claimed by `spec: issue #<n>` (S101), the policy block (S100).

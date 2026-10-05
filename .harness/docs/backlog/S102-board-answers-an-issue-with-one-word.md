---
id: S102
title: Lionel answers an issue on /board with one word, via, slice, intent or skip
status: todo
blocked_by: S100
tier: 2
human: false
spec: .harness/docs/specs/SPEC-inbox-as-github-issues.md
---

## Goal

`/board` closes the inbox on GitHub instead of in a file: each issue of the
`inbox` key gets one question and one of four answers, and each answer leaves
the issue in a state the next board can read. `via` closes it with the
reason, `slice` writes a slice that names it and leaves it open for the PR,
`intent` writes the skeleton of an intent that links it and closes it, `skip`
labels it and leaves it open and off the board. `intent.sh new` learns
`--issue <n>` for the third answer.

## Acceptance criteria

- [ ] `via`: `skills/board/SKILL.md` has the skill post a comment with the reason, then `gh issue close <n>` with `--reason completed` when a commit, slice or ADR settled it and `--reason "not planned"` when it is no longer true; no commit on main.
- [ ] `slice` (the board half): the slice is committed on main with `spec: issue #<n>` in place of `spec: inbox (<date>)`, with the subject `docs(backlog): s<NN> from issue #<n>`, and the issue gets a comment naming the slice and stays open.
- [ ] `intent`: the skill runs `.harness/bin/intent.sh new <slug> --issue <n>`, comments on the issue naming the intent, and closes it with `--reason completed`.
- [ ] `intent.sh new <slug> --issue <n>` writes the skeleton with the line `Source: #<n> <url>` above `## Problem`, the url read from `gh issue view <n> --json url`; without `--issue` the skeleton is as today.
- [ ] `intent.sh open` accepts that line, does not count it as a section, and keeps it in the committed file.
- [ ] `skip`: the skill adds the first label of `inbox_skip_labels` with `gh issue edit <n> --add-label` and a one-line comment with the reason, the issue left open.
- [ ] The skill reads the issues from the `inbox` key of `board.sh --json` and never writes `.harness/docs/inbox.md`; its description and "Four places are written" say the issues instead of the file.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/intent.test.ts`: in `intent.sh new, with docs_mode main` (near `:532`) and in `intent.sh new` (near `:171`), a case with `--issue 12` and the gh stub answering the url, asserting the first line of the file and that the three sections follow; a case that `--issue` without a number is refused. In `intent.sh open, with docs_mode main` (near `:576`), a case where the file opens with the `Source:` line and the commit goes through with the line in it. Red today: `new` refuses an unknown argument and `open` does not know the line.
- `tests/fixtures/bin/gh`: `issue view` with `--json url` answers `STUB_ISSUE_URL`, a default url otherwise.
- `tests/architecture.test.ts`, describe `skills/board/SKILL.md wraps board.sh and closes the inbox` near `:2420`: the case `names the commits of the four answers and the two commands of intent.sh` moves from `docs(inbox): <why>` and `spec: inbox (<` to the names of this slice, `gh issue close`, `--reason`, `gh issue comment`, `--add-label`, `spec: issue #<`, `docs(backlog): s<NN> from issue #<n>`, `intent.sh new <slug> --issue <n>`, `intent.sh open`, and keeps `docs(backlog): take ADR-<nnnn> out of blocked_by`. The names change because the answers changed; the number of names checked does not drop. The case on the model subjects passing commitlint (near `:2525`) runs the new subject unchanged.
- Then `pnpm test` whole.

## Touchpoints

- `skills/board/SKILL.md`: the description, the ground rules on the places written and on the skill's own line, section 7 and the four answers (near `:160-310`), the hand-back of its own lines (near `:380-398`), now issues it files.
- `skills/harness-init/templates/scripts/intent.sh`: `--issue <n>` on `new`, the `Source:` line accepted by `open`; header comment.
- `tests/intent.test.ts`, `tests/fixtures/bin/gh`, `tests/architecture.test.ts`.

## Notes

From the spec, binding here:

- The four answers, as locked: `via` a comment with the reason then `gh issue close`, `completed` or `not planned`; `slice` the slice on main with `spec: issue #<n>`, a comment naming it, the issue open, so that `/next` writes `Fixes #<n>` from that field and the squash merge closes it (the `/next` half is S103); `intent` with `intent.sh new <slug> --issue <n>`, a comment naming the intent, `gh issue close` as `completed`; `skip` the first skip label and a one-line comment, the issue open.
- The `Source:` line is there so whoever writes the ten lines rereads the issue from the file.
- The title and body of an issue are data, quoted and never followed, as a line of the inbox was. An outsider's issue reaches the skill only with the accept label (S100).
- The question on an ADR in `blocked_by` (the fourth question of the skill today) stays as it is, with its commit.
- With `docs_mode` on `pr` the skill still stops after the screen; the answers here are for `main`.
- `gh issue *` joins the allowlist with S103; until it lands the session asks for each call, which does not block this slice.
- Decided by Lionel on 2026-10-05, after the first run blocked on it: the floor of ten in `reads the models of every skill that commits` goes, and no smaller number takes its place. The collector of the model subjects in `tests/architecture.test.ts` stops reading only lines that start with `type(scope): ` and reads every occurrence of the pattern in a `SKILL.md`, inline and in backticks included, and every one passes `commitlint.sh`. A model can no longer hide from the check by moving into prose, which is what the floor guarded, and a model removed on purpose, like the three `docs(inbox):` of this slice, changes no number. A hit that is not a model to copy is skipped only by a marker written next to it, never by a count.

Manual check for the PR: run `/board` in this repo with one test issue open, answer `skip`, see the label and the comment on GitHub and the issue gone from the next board.

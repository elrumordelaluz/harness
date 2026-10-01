---
id: S83
title: The board cuts the inbox, then the slices that wait, to stay in forty lines
status: todo
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-29)
---

## Goal

`scripts/board.sh` promises one screen, forty lines, and keeps it by cutting
every row in width. Nothing cuts in number: each section prints all its rows,
and the board of this repo has passed forty with a backlog and an inbox that
are ordinary. The four cases that assert forty do it on fixtures small enough
to fit. After this slice the script counts its own lines and, when they would
pass forty, gives rows up in a fixed order: first the Inbox, from its newest
line back, then the open slices that cannot be taken, which collapse into one
row of ids. What a session acts on is never cut: the slices that are eligible
or in progress, the open PRs, what waits for a human, the plan and the next
action. `--json` keeps everything.

## Acceptance criteria

- [ ] A board that fits in forty lines prints what it prints today, byte for byte.
- [ ] A board that would pass forty prints the Inbox section cut to its oldest lines, as many as fit, and one row under them that says how many more there are; the head of the section still carries the full count.
- [ ] The inbox gives up only the rows needed: the screen is forty lines exactly when cutting the inbox is enough.
- [ ] With the Inbox down to its head and the row of the count, and the screen still over forty, the open slices that are neither eligible nor in progress, a `blocked` one, one held by an ADR, one whose `blocked_by` names a slice not `done`, leave their rows and become one row with their ids in order; the head of the Slices section still carries its counts.
- [ ] A slice that is eligible or `in progress` always has its row, and the rows of Open PRs, Waiting on a human, Parked and Plan and the line of the next action are never cut.
- [ ] When both cuts are made and the screen is still over forty, it prints over forty and nothing else is cut: the overflow is the fact.
- [ ] The next action is the one the uncut board chooses: the cut changes the rows printed and never the rule.
- [ ] `--json` is the same with and without a cut: `inbox` and `slices` whole.
- [ ] The header comment of the script says the order of the two cuts and what is never cut, and 5.7 of `docs/spec.md` says it in a sentence, with a new version in the header and its entry in section 0.
- [ ] `skills/board/SKILL.md` says where it says the screen cuts a line at its column that it may cut the inbox in number too, and that the questions read `--json`.
- [ ] Bash 3.2 and jq, nothing else. Suite, typecheck, format and build green.

## Test plan

- `tests/board.test.ts`, in the describe `the screen fits in forty lines`,
  on its helper: the fixture of today with twenty inbox lines in place of
  seven, asserted to print forty lines, the oldest inbox lines, the row of
  the count with the right number, and every slice row. Red today, the screen
  is longer.
- Same describe: the fixture with twenty inbox lines and twelve open slices,
  eight of them held by a slice not done, two eligible, two with a branch on
  the remote, asserted to print the collapsed row with the eight ids, the
  four rows of the slices that move, and forty lines or fewer. Red today.
- Same describe: a fixture with thirty eligible slices, asserted to print
  them all and more than forty lines, with the inbox and the waiting slices
  already cut. Red today on the cut.
- Same describe: `--json` on the three fixtures, `inbox` and `slices` asserted
  whole. Green today, and it holds the model while the screen changes.
- In the describe `the next action is the first rule that fires, in a fixed
order`: one case where the only eligible slice sits on a board that is cut,
  asserted `/next`. Green today, the guard of the rule.
- The four cases there now stay as they are: they are the boards that fit,
  and they hold the first criterion. The comment "the board cuts in width,
  never in number" is rewritten to say when it does.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/scripts/board.sh`: the count of the lines, the two cuts, the header comment.
- `tests/board.test.ts`: the new cases, the comment of the first one.
- `skills/board/SKILL.md`: the sentence of section 3 on what the screen cuts.
- `docs/spec.md`: 5.7, the header, the new entry of section 0.

## Notes

The inbox line, 2026-09-29: the forty-line cases in `tests/board.test.ts`
measure a fixture, while this repo's real board already prints 48 lines, so
"one screen" is not held on real data.

Decided by Lionel on 2026-10-01, among four rules: the inbox gives way
first, then the slices that wait. Set aside, so nobody builds them here: the
inbox alone; a fixed cap per section; no cut and a test on the live board of
this repo, which would turn main red whenever the backlog grows.

Found on 2026-10-01: the promise of forty lines at
`skills/harness-init/templates/scripts/board.sh:2-5` and `:35-38`; the rows
of the Slices and of the Inbox described at `:16-19`; the two exceptions in
how a slice row is printed at `:67-74`; the fixture and its four cases at
`tests/board.test.ts:767-876`, with the comment on width and number at
`:792`; 5.7 of the spec at `docs/spec.md:529`; the sentence of the skill at
`skills/board/SKILL.md:158`. The board of this repo printed 41 lines on
2026-10-01 with six open slices and seven inbox lines.

The inbox goes first because its rows are the ones `/board` reads again from
`--json`, one question at a time: a line off the screen is still asked. The
oldest stay because they are the ones waiting longest. A slice that waits is
named by its id and not dropped, because the id is what a human looks up.

`scripts/board.sh` is a symlink to the template: the template is the file to
edit. The names and the order of the rules of the next action do not change,
so the describe of `tests/architecture.test.ts` that holds them equal to the
skill stays green as it is.

Out of scope: the width of a row; the height of the terminal, which the
script does not read, forty being the number; the Parked and Plan sections;
a flag to print the board whole.

---
id: S70
title: Every path on a Touchpoints line keeps two slices out of the same wave
status: todo
blocked_by: none
tier: 1
human: false
spec: inbox (2026-09-22)
---

## Goal

`/next` keeps two slices that write the same file out of the same wave,
because their two PRs would both pass the gates and the second would not
merge. It finds the shared file by reading "Touchpoints", but only the text
in the first pair of backticks of each line counts as the path. A line like
`` `docs/spec.md`: 4.5, and the paragraph of `skills/harness-init/SKILL.md` ``
hides the second file, and two slices that both touch it land in the same
wave: S55 and S56 shared `tests/architecture.test.ts` and
`skills/harness-init/SKILL.md` that way, and a human checked them with
`git merge-tree` by hand. After this slice every backticked text on a
Touchpoints line that is a path of the repo counts, so the rule holds however
the line is written.

## Acceptance criteria

- [ ] Section 2 of `skills/next/SKILL.md` says that every text between backticks on a line of "Touchpoints" that is a path of the repo, tracked or marked as new, is a path of that slice, compared as written; text in backticks that is not a path, a command, a key, a string, names nothing.
- [ ] The same sentence drops the Italian `(nuovo)` and `(symlink nuovo)` for the English markers the slices write today, `(new)`.
- [ ] `docs/spec.md` says the same where it describes the waves, 2 and 5.4, with a new version in the header and a line in section 0.
- [ ] `tests/architecture.test.ts` has a case that fails when section 2 of `skills/next/SKILL.md` still says "the first pair of backticks", and one that fails when it does not say "every" path on the line.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, next to the cases that read
  `## 2. The board and the waves` of `skills/next/SKILL.md` through
  `section('next', ...)`: a case that asserts the section does not contain
  `first pair of backticks`, red today, and one that asserts it contains the
  new rule's key words, red today.
- Then `pnpm test` whole.

## Touchpoints

- `skills/next/SKILL.md`: the paragraph of section 2 on the path of a touchpoint.
- `docs/spec.md`: 2, 5.4, the header, section 0.
- `tests/architecture.test.ts`: the two cases.

## Notes

The inbox line, 2026-09-22: the wave rule of `skills/next/SKILL.md` compares
only the text in the first pair of backticks of a Touchpoints line, so two
slices that both name a file second on a shared line land in the same wave:
S55 and S56 shared `tests/architecture.test.ts` and
`skills/harness-init/SKILL.md` that way and were only checked with
`git merge-tree` by hand. The empty intent
`docs/intent/waves-serialize-on-shared-file.md` is untracked in the tree and
names this.

Found on 2026-09-24: the rule at `skills/next/SKILL.md:122-125`; the waves in
the spec at `docs/spec.md:125` and in 5.4; `skills/slice/SKILL.md:318-320`
points at the rule of `/next` for the parallel width and needs no change. The
empty intent the line names is no longer in the tree.

Why a path and not every backticked text: a Touchpoints line also quotes keys,
commands and strings, and counting `pull-requests: write` as a path would
split waves for nothing. A path is what `git ls-files` lists, or a text the
line marks as new.

Out of scope: a script that computes the waves, which would be a design and
an intent of its own; the "Touchpoints" format of `/slice`, which stays one
line per file.

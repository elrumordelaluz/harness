---
id: S82
title: tier.sh counts an exact rename as one file and no lines
status: todo
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-29)
---

## Goal

`tier.sh` reads the diff with renames turned off, so that a file moved out of
a sensitive path is still seen under the name it had. The same reading feeds
the two thresholds, and there it is wrong: a file moved and not changed counts
as two files and as twice its lines, and a PR that only moves three documents
goes over `max_files` and `max_lines` to tier 2. After this slice the script
reads the diff twice. The names that meet the patterns are the ones of today,
old and new. The files and the lines that meet the thresholds follow the
renames that are exact, byte for byte: one file, zero lines. A file moved and
edited stays a delete and an add, as it is now.

## Acceptance criteria

- [ ] Three files moved with no change, in a PR that touches no sensitive path, never tier 0 path or human gate path, give tier 1 where today the count of files or of lines takes them to tier 2 against thresholds set below the doubled count.
- [ ] An exact rename counts one file against `max_files` and zero lines against `max_lines`, and the reason the script prints carries those numbers.
- [ ] A file moved and changed, by one line or more, counts as today: two files, the lines removed plus the lines added.
- [ ] A file moved out of a sensitive path is tier 2 with the reason naming the old path, as today, and the same holds for a path of `never_tier_0` and for the `human-gate` line of a path of `human_gate_paths`: both names of a rename go through every pattern.
- [ ] A generated file that is renamed stays out of the counts, and both its names still go through the patterns.
- [ ] A name with a space, an accent or a tab in it is counted right when it is one side of a rename, and a name git prints quoted is still read as sensitive.
- [ ] The script uses nothing beyond bash 3.2 and git, and the comment above the two readings says what each one is for.
- [ ] 7.2 of `docs/spec.md` says in a sentence what a rename counts, with a new version in the header and its entry in section 0.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/tier.test.ts`, next to the case "sees a file moved out of a
  sensitive path under its old name", on the same helper and with a policy
  whose `max_files` and `max_lines` are small enough for the doubled count to
  pass them: three files under `src/` moved to another folder with the same
  body, asserted tier 1. Red today, tier 2.
- Same place: one file moved with one line changed, asserted to count two
  files and the sum of its lines in the reason. Green today, and it keeps the
  rename detection at exact while the code changes.
- Same place: a moved file with a space in its name, asserted to count one
  file and zero lines. Red today.
- Same place: a lockfile moved, asserted to add nothing to the counts. Red or
  green today depending on the count it adds to, and written before the code
  either way.
- The existing case of the file moved out of `scripts/` and out of
  `.github/workflows/` stays as it is: it is the guard of the first reading.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/scripts/tier.sh`: the two readings of the diff, the count of files and of lines, the comment above them.
- `tests/tier.test.ts`: the new cases.
- `docs/spec.md`: 7.2, the header, the new entry of section 0.

## Notes

The inbox line, 2026-09-29: `tier.sh` counts a pure `git mv` as both the
removed and the added file, so three unchanged renames push S77 over
`max_lines`/`max_files` and to tier 2 instead of its declared tier 1.

Found on 2026-10-01: the names read with `--no-renames` at
`skills/harness-init/templates/scripts/tier.sh:92`, and the reason in the
comment at `:86-91`; the count of files at `:100` and of lines at `:105`,
from the same reading; the thresholds applied at `:142-143`; the pattern of
the generated files at `:99`; the case that holds the old name of a moved
file at `tests/tier.test.ts:395-414`, and the one on the quoted names right
after it. The comment at `:91` says an exact move counts zero lines when git
follows it: that is the number the thresholds want, and the reason the
patterns must not get it.

Exact means a similarity of one hundred per cent, which git can be asked for:
a lower bar would let a file be moved and rewritten for the price of the
lines that differ, and the thresholds are there for what a reader has to
read. `scripts/tier.sh` is a symlink to the template: the template is the
file to edit, and it runs on the bash of macOS, so no `mapfile` and no
associative array.

The tier of S77 on PR #18 is not fixed by hand: CI works it out again with
the script of the base ref once this slice is on main.

Out of scope: copies, which are new files and count as such; the thresholds
themselves in the policy block; the other reasons PR #18 waits for a human,
which are its labels and not its count.

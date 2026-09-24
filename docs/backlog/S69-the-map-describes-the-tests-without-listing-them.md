---
id: S69
title: The codebase map says how the tests work without listing every file
status: todo
blocked_by: none
tier: 1
human: false
spec: inbox (2026-09-22)
---

## Goal

`docs/codebase-map.md` is meant to be one screen, updated when the shape of
the code changes. Its "How to run it and test it" section is one paragraph of
about five thousand characters that walks the test files one by one, so every
new test file edits the map, and the list has already drifted: it names ten
files and `commitlint.test.ts` is not one of them. The row of `tests/` in the
table above says what the directory holds, and the paragraph repeats it.
After this slice the paragraph says how the tests are built, the fixtures,
the disposable repos, `tests/agents.ts`, what `architecture.test.ts` is for,
and names no single test file but that one, so a new test file leaves the map
alone.

## Acceptance criteria

- [ ] "How to run it and test it" in `docs/codebase-map.md` describes the tests by kind and fixture in a few lines, and names no `*.test.ts` file except `architecture.test.ts`.
- [ ] The row of `tests/` in the table and the paragraph do not say the same thing twice.
- [ ] `tests/architecture.test.ts` has a case that fails when `docs/codebase-map.md` names a `<name>.test.ts` other than `architecture.test.ts`.
- [ ] Nothing the paragraph says today about how a fixture is built is lost: what is not a list of files stays, shorter.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`: a case that reads `docs/codebase-map.md`,
  collects every match of `[a-z-]+\.test\.ts`, and asserts the only one is
  `architecture.test.ts`. Red today on the ten names of the paragraph.
- Then `pnpm test` whole.

## Touchpoints

- `docs/codebase-map.md`: the paragraph of "How to run it and test it", the row of `tests/`, the date in the header.
- `tests/architecture.test.ts`: the new case.

## Notes

The inbox line, 2026-09-22: `docs/codebase-map.md` names every test file in
one paragraph of "How to run it and test it", so every new test file edits
that paragraph, and the row at `:22` and that paragraph now say the same
thing twice.

Found on 2026-09-24: the paragraph is `docs/codebase-map.md:36`, one line; the
row of `tests/` is at `:23`, one below the line the inbox names. The file
names in the paragraph: `architecture`, `board`, `hooks`, `intent`, `judge`,
`policy`, `prose`, `review-log`, `since`, `tier`; `commitlint.test.ts` is
missing from the list.

`architecture.test.ts` stays named because it is the file a session opens to
find where a rule of the repo is enforced, and that is a question of shape.

Out of scope: the Dragons and every other section of the map.

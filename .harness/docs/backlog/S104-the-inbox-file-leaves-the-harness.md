---
id: S104
title: The inbox file is gone, and the spec of the chain says the inbox is the issues
status: todo
blocked_by: S101, S102, S103
tier: 2
human: false
spec: .harness/docs/specs/SPEC-inbox-as-github-issues.md
---

## Goal

The last slice of the spec takes `.harness/docs/inbox.md` out of the harness:
the template, the row that installs it, the file of this repo, its path in
`human_gate_paths` and every reader still naming it. `docs/spec.md` gets a new
version that describes the inbox as the open issues, and the map follows. A
repo installed after this slice has no inbox file, and a reader of the spec
finds the issues where the file was.

## Acceptance criteria

- [ ] `skills/harness-init/templates/docs/inbox.md` and `.harness/docs/inbox.md` are deleted, and the row of `docs/inbox.md` in `skills/harness-init/templates/README.md` with them; stage `local` in `skills/harness-init/SKILL.md` no longer copies it.
- [ ] `.harness/docs/inbox.md` is out of `human_gate_paths` in `.harness/AGENTS.md` and in `skills/harness-init/templates/AGENTS.md`, and out of the "Human gates" prose of both.
- [ ] No file under `skills/`, `.harness/AGENTS.md`, `.harness/docs/README.md`, `skills/harness-init/templates/docs/README.md` or `.harness/docs/codebase-map.md` names `.harness/docs/inbox.md` or `spec: inbox (`, except as the form of slices written before this spec.
- [ ] `docs/spec.md` has a new version in its header and a line in "What changes" that cites decision 6 of ADR-0002 (the inbox as a source of work stands, the medium changes), and every place that names `.harness/docs/inbox.md` as the inbox now says the open issues, 5.7 included.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`: a new case that walks the files of the third criterion and fails on `.harness/docs/inbox.md`, red today. The describes `.harness/docs/inbox.md is a template plus the entries of this repo` near `:2190` and `.harness/AGENTS.md lets a line of inbox land` near `:2254` assert a file and a path this spec removes: they are replaced by the new case and by one asserting that neither block names the path, not deleted bare. The list near `:511-555` that names `inbox.md` among the documents under `.harness/docs/` drops it.
- `tests/hooks.test.ts` near `:191` and `:422`, `tests/tier.test.ts` near `:579`, `tests/intent.test.ts` near `:550` and `:671` use `.harness/docs/inbox.md` as an example of a human gate path or of a file on main: they take `.harness/docs/parked.md`, still in `human_gate_paths`, so they keep asserting the same rule.
- The architecture describes on `docs/spec.md` (version and "What changes") hold the new version.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/docs/inbox.md`: deleted.
- `.harness/docs/inbox.md`: deleted.
- `skills/harness-init/templates/README.md`: the row at `:17`.
- `skills/harness-init/SKILL.md`: stage `local` near `:259`.
- `skills/harness-init/templates/AGENTS.md`, `.harness/AGENTS.md`: `human_gate_paths` and the prose of "Human gates" and the Map.
- `.harness/docs/README.md`, `skills/harness-init/templates/docs/README.md`: the `backlog/` sources paragraph and any line naming the file.
- `docs/spec.md`: header version, "What changes", 3.x skeleton near `:353-381`, 4.x near `:434-447`, 5.7 near `:606-617`, the principles near `:94-107`.
- `.harness/docs/codebase-map.md`: the rows near `:19` and `:25`.
- `tests/architecture.test.ts`, `tests/hooks.test.ts`, `tests/tier.test.ts`, `tests/intent.test.ts`.

## Notes

From the spec, binding here:

- No backwards compatibility: the harness has one user and one project repo, so nothing migrates. `.harness/docs/inbox.md` leaves the templates, the policy block and every reader, and a repo on the old layout starts over with `/harness-init`. Rejected: stage `local` moving each line into an issue, which is code written once for a handful of lines.
- The lines open today in `.harness/docs/inbox.md` of this repo are Lionel's to file or drop by hand, before this slice merges. The PR names them in "How to check by hand", so the deletion is not where they get lost; the history keeps them anyway.
- No ADR: decision 6 of ADR-0002 stands and only the medium changes; the line in "What changes" cites it.
- The entries of section 0 of `docs/spec.md` that quote the inbox file as history stay as they are: they describe what was true then.
- The slices already on main with `spec: inbox (<date>)` keep it; the README says the form is the one of the slices written before this spec.

Out of scope: moving the other documents of `.harness/docs/` to issues; GitHub Projects; a filter for the board (`board.sh --search`), its own intent.

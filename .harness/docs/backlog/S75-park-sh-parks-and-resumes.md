---
id: S75
title: scripts/park.sh parks a document and picks it up again with one command
status: done
blocked_by: S74
tier: 2
human: false
spec: .harness/docs/specs/SPEC-intent-and-spec-later-state.md
---

## Goal

After S74 the board reads `docs/parked.md`, but the line is written by hand.
This slice adds `scripts/park.sh`, a template of the `local` stage, the only
way the line is written or taken out: `park.sh <path> "<why>"` checks the
document and adds the dated line, `park.sh resume <path>` takes it out. With
`docs_mode: main` each verb commits the list alone and pushes it. Parking is
then one command with its checks held by a test, where `later/` was a move by
hand with none.

## Acceptance criteria

- [ ] `scripts/park.sh docs/intent/<slug>.md "<why>"` on main, with the intent tracked and no spec naming it, adds `- <today>: docs/intent/<slug>.md: <why>` to `docs/parked.md`, commits that file alone as `docs(parked): <slug>` and pushes it.
- [ ] The same command on a draft spec, and on an approved spec that no slice names in `spec:`, does the same.
- [ ] It exits non zero, writes nothing and says why for: a path not tracked on the default branch; a path outside `docs/intent/` and `docs/specs/`; an intent a spec already names; an approved spec a slice names; a superseded spec; an intent with a missing or empty section; a path already in `docs/parked.md`; an empty why.
- [ ] With `docs_mode: pr` it writes the line and commits nothing.
- [ ] `scripts/park.sh resume <path>` takes its line out of `docs/parked.md`, and nothing else, and commits it as `docs(parked): resume <slug>` on main.
- [ ] After it, `board.sh` names `/spec <path>` or `/slice <path>` for the document when no earlier rule fires, as for one never parked.
- [ ] `resume` on a path with no line exits non zero and writes nothing; `resume` on a line whose path is gone takes the line out.
- [ ] `scripts/park.sh` is a symlink to the template, the template has its row in `templates/README.md`, stage `local`, and runs on bash 3.2.
- [ ] Both subjects pass `scripts/commitlint.sh`.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/park.test.ts`, new, built like `tests/intent.test.ts`: a clone of a
  throwaway bare origin with `AGENTS.md` from the template, `park.sh`,
  `policy-lines.sh` and `board.sh` copied in, the `gh` stub and a `pnpm` that
  runs the repo's Prettier. One describe per verb and mode: the three
  parkable states commit and push one file with the subject; one case per
  refusal, each asserting the exit, the message and a clean tree; `pr` writes
  and does not commit; `resume` then `board.sh --json` names `/spec` or
  `/slice`; `resume` of a missing line, and of a line whose file is gone.
  Red: the script does not exist.
- The subjects go through `scripts/commitlint.sh` inside the same file, as
  the architecture describe on model subjects does (`:1742`).
- `tests/architecture.test.ts` needs no new case: the describes on the
  README rows, bash 3.2 and the symlinks derive their lists from the
  templates and fail by themselves until the row and the link are there.

## Touchpoints

- `skills/harness-init/templates/scripts/park.sh`: new.
- `scripts/park.sh`: new, the symlink to the template.
- `skills/harness-init/templates/README.md`: the row of `scripts/park.sh`, stage `local`.
- `tests/park.test.ts`: new.
- `docs/spec.md`: a new version in the header with its line in "What changes", and 5.7 describes the parked state next to the board.
- `docs/codebase-map.md`: `park.sh` among the modules and `park.test.ts` among the tests.

## Notes

Decisions of the spec that bind this slice:

- A new script, not two verbs on `intent.sh`: `intent.sh` is the typing
  around the one document only a human writes (`intent.sh:1-22`), and parking
  covers specs too.
- Mode read as `intent.sh` reads it, from `AGENTS.md` on the remote's default
  branch through `scripts/policy-lines.sh` (`intent.sh:34-51`), and a block
  that cannot be read stops the script. With `main` the file is committed
  alone, formatted, and pushed; with `pr` the file is written and the script
  says the change travels on a PR.
- The section check is the one of `intent.sh open`, the three headings of
  `docs/intent/README.md`: parking says a document was written and waits,
  and a skeleton was never written.
- Parkable states, as the board reads them: an intent is named by a spec
  through `intent:`, a spec by a slice through `spec:`
  (`board.sh:244-295` and the slice parser above it).
- The why lands in a markdown line: refuse a newline in it, and pass it to
  commands only quoted.

Bash 3.2 and jq only (AGENTS.md, "Do not"). The version of `docs/spec.md` is
the one after the header at the moment the slice is built; the architecture
describe at `:2333` checks the last entry of section 0.

Out of scope: `/spec` and `/slice` (S76), the files of `later/` (S77),
parked slices, reminders or expiry dates.

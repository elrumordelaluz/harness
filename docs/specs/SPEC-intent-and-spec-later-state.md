---
status: approved
intent: docs/intent/intent-and-spec-later-state.md
date: 2026-09-29
approved: 2026-09-29
---

# SPEC: a parked state for intents and specs

## Problem

On 24 September `/spec audit-sample` stopped at Q8, and three intents,
`audit-sample`, `roadmap-view` and `harness-inbox-across-repos`, were written
but not wanted yet. The four files went into `docs/intent/later/` and
`docs/specs/later/`. The board stops naming them only because `board.sh`
globs `docs/intent/*.md` and `docs/specs/*.md` without recursing
(`skills/harness-init/templates/scripts/board.sh:249` and `:286`). Without
that accident each of them would drive the screen: an intent with no spec is
rule 4 of the next action, an approved spec with no slice is rule 3
(`board.sh:475-477`), and a draft spec is a row under "Waiting on a human"
(`board.sh:605`). No document says what `later/` means, `/spec` and `/slice`
do not know it, and a glob that learns to recurse brings all four back as the
next action without anyone having decided so.

## Solution

A document that is written and not wanted yet is parked by a line in a new
file, `docs/parked.md`, in the form of the inbox:
`- <YYYY-MM-DD>: <path>: <why>`. The document itself does not move and does
not change, so every path and every `intent:` field stays true.

`scripts/park.sh`, a new template of the `local` stage, is the only way the
line is written or taken out. `park.sh <path> "<why>"` checks that the path
is tracked on the default branch, that it is an intent with no spec, a draft
spec, or an approved spec with no slice, that an intent has its three
sections written, and that it is not parked already; then it adds the line.
`park.sh resume <path>` takes the line out. With `docs_mode: main` each verb
commits `docs/parked.md` alone on the default branch and pushes it; with `pr`
it writes the file and says the change travels on a PR.

`board.sh` reads the list. A parked document never fires rule 3 or rule 4 of
the next action and is never a row under "Waiting on a human"; it is a row of
a new `Parked` section, after "Waiting on a human", with its kind, slug, date
and why. `--json` carries the same data under a `parked` key. A line whose
path is not there any more is still a row, marked `missing`, and `resume`
still takes it out. `/spec` and `/slice` refuse a parked document and name
the command that picks it up.

The first slice that lands the list also empties `later/`: `audit-sample`,
its draft spec and `roadmap-view` move up and are parked in the same commit,
and the empty skeleton `harness-inbox-across-repos.md` is deleted, its idea a
line of the inbox.

## User stories with criteria

As Lionel, I park a written intent I do not want now.

- [ ] `scripts/park.sh docs/intent/<slug>.md "<why>"` on main, with the
      intent tracked and no spec naming it, adds
      `- <today>: docs/intent/<slug>.md: <why>` to `docs/parked.md`, commits
      that file alone as `docs(parked): <slug>` and pushes it.
- [ ] The same command on a draft spec, and on an approved spec that no slice
      names in `spec:`, does the same.
- [ ] It exits non zero, writes nothing and says why for: a path not tracked
      on the default branch; a path outside `docs/intent/` and `docs/specs/`;
      an intent a spec already names; an approved spec a slice names; a
      superseded spec; an intent with a missing or empty section; a path
      already in `docs/parked.md`; an empty why.
- [ ] With `docs_mode: pr` it writes the line and commits nothing.

As Lionel, I pick a parked document up again.

- [ ] `scripts/park.sh resume <path>` takes its line out of `docs/parked.md`,
      and nothing else, and commits it as `docs(parked): resume <slug>` on
      main.
- [ ] After it, `board.sh` names `/spec <path>` or `/slice <path>` for the
      document when no earlier rule fires, as for one never parked.
- [ ] `resume` on a path with no line exits non zero and writes nothing;
      `resume` on a line whose path is gone takes the line out.

As whoever opens a cold session, I see what waits and why.

- [ ] `board.sh` prints a `Parked` section after "Waiting on a human", one row
      per line of `docs/parked.md`: kind (`intent`, `spec draft`,
      `spec approved`, or `missing`), slug, date and why cut at the column.
- [ ] With no line, or no `docs/parked.md`, the section is one row that says
      nothing is parked.
- [ ] `board.sh --json` has a `parked` key, an array of `path`, `kind`,
      `status`, `date` and `why` whole, `[]` when nothing is parked.
- [ ] A parked intent with no spec does not fire `intent with no spec`; a
      parked approved spec with no slice does not fire
      `approved spec with no slice`; a parked draft spec is not a row under
      "Waiting on a human".
- [ ] `tests/architecture.test.ts` holds the name `Parked` equal in
      `board.sh` and in `skills/board/SKILL.md`.

As Lionel, I do not reopen a parked document by mistake.

- [ ] `/spec <path>` on a parked intent, or on the intent of a parked spec,
      stops before the first question, quotes the line of `docs/parked.md`
      and names `scripts/park.sh resume <path>`.
- [ ] `/spec` without an argument leaves parked intents out of its list.
- [ ] `/slice <path>` on a parked approved spec stops the same way.

As Lionel, I no longer have a `later/` folder.

- [ ] `docs/intent/later/` and `docs/specs/later/` are gone from the default
      branch.
- [ ] `docs/intent/audit-sample.md`, `docs/intent/roadmap-view.md` and
      `docs/specs/SPEC-audit-sample.md` are tracked, the last with
      `intent: docs/intent/audit-sample.md`, and all three have a line in
      `docs/parked.md` dated 2026-09-24, in the same commit as the move.
- [ ] `docs/intent/later/harness-inbox-across-repos.md` is deleted and
      `docs/inbox.md` carries one dated line for its idea, the path that
      carries feedback from a project repo back to this one.
- [ ] `board.sh` on the default branch after that commit names none of the
      three as a next action and lists them under `Parked`.

## Locked decisions

- Structural choice: a list file, `docs/parked.md`, one line per parked
  document, `- <YYYY-MM-DD>: <path>: <why>`, in the form of the inbox. It
  touches neither the intent, which is the human's text and is not updated,
  nor the spec, and it keeps every path stable, so the `intent:` field of a
  spec keeps pointing right. Rejected: a frontmatter field, `parked: <date>
<why>`, because intents have no frontmatter and a command would write into
  the human's text; and a folder the board knows, `docs/intent/parked/` and
  `docs/specs/parked/`, because moving a file breaks the `intent:` field that
  names it (today `docs/specs/later/SPEC-audit-sample.md` names
  `docs/intent/later/audit-sample.md`) and the date and the why would come
  from `git log` per file. The price of the choice: a spec opened alone does
  not say it is parked, so `/spec` and `/slice` read `docs/parked.md`.
- What can be parked: an intent that no spec names, a `draft` spec, and an
  `approved` spec that no slice names. These are the three states the board
  turns into a next action or a row waiting on a human. A spec with slices is
  not parked: its slices carry the state with `blocked` and `blocked_by`.
- The command is a new template script, `scripts/park.sh`, stage `local`:
  `park.sh <path> "<why>"` and `park.sh resume <path>`. Both follow
  `docs_mode` as `intent.sh` does: with `main` they commit `docs/parked.md`
  alone and push, `docs(parked): <slug>` and `docs(parked): resume <slug>`;
  with `pr` they write the file and say it travels on a PR. Rejected: two more
  verbs on `intent.sh`, which is the typing around the one document only a
  human writes (`intent.sh:1-22`), while parking covers specs too.
- `park.sh` refuses an intent with a missing or empty section, the check of
  `intent.sh open`: parking says a document was written and waits, and a
  skeleton was never written.
- The board shows parked documents in a `Parked` section after "Waiting on a
  human", one row each: kind, slug, date parked and why, cut at the column;
  `--json` carries them under a new `parked` key with `path`, `kind`,
  `status`, `date` and `why` whole. An empty section is a row that says so, as
  every section of `board.sh` (`board.sh:29-32`).
- A line whose path is gone is a row with kind `missing`, and `resume` takes
  it out: the board does not turn a stale line into an error, as it does not
  for a `gh` that cannot answer.
- `/spec` and `/slice` refuse a parked document early, as they refuse an
  approved spec, naming its line in `docs/parked.md` and
  `scripts/park.sh resume <path>`; `/spec` without an argument leaves parked
  intents out of its list (`skills/spec/SKILL.md:106-110`). `/next` and
  `/board` change nothing: `/next` works on slices, never parked, and `/board`
  takes the screen from `board.sh`.
- `docs/parked.md` joins `human_gate_paths` in the policy block, next to
  `docs/inbox.md`, in `AGENTS.md` and in its template: without it the
  pre-commit hook refuses the commit of `park.sh` on main, because only the
  documents of the block land there.
- `later/` goes. `audit-sample` (intent and draft spec) and `roadmap-view`
  move back to `docs/intent/` and `docs/specs/`, the `intent:` field of
  `SPEC-audit-sample.md` follows, and three lines dated 2026-09-24 land in
  `docs/parked.md` in the same commit, so the board never sees them live.
  `docs/intent/later/harness-inbox-across-repos.md` is an empty skeleton: it
  is deleted, and its idea goes back to `docs/inbox.md` as one dated line.
- `tests/architecture.test.ts` holds the section name `Parked` equal in
  `board.sh` and in `skills/board/SKILL.md`, as it holds the rules of the
  next action.
- `docs/spec.md` takes a new version with its line in "What changes", and 5.7
  describes the parked state next to the board; `docs/codebase-map.md` names
  `park.sh`. Project repos get the script and the file with
  `/harness-init local`, the stage that owns them, and nothing more.

## Modules touched

- `skills/harness-init/templates/scripts/board.sh`: rules 3 and 4 of the next
  action and the "Waiting on a human" rows skip parked documents; a new
  `Parked` section and a `parked` key in `--json`.
- `skills/harness-init/templates/scripts/park.sh`: new; `scripts/park.sh`
  the symlink to it.
- `skills/harness-init/templates/docs/parked.md`: new, the empty list with
  its heading, created if missing by the `local` stage.
- `docs/parked.md`: new, with the three lines of `later/`.
- `skills/harness-init/templates/README.md`: the lines of `park.sh` and of
  `docs/parked.md`, stage `local`.
- `AGENTS.md`, `skills/harness-init/templates/AGENTS.md`: `docs/parked.md` in
  `human_gate_paths` and in the "Human gates" prose.
- `docs/intent/later/`, `docs/specs/later/`: removed; `audit-sample.md`,
  `roadmap-view.md` and `SPEC-audit-sample.md` moved up, the skeleton
  deleted.
- `docs/inbox.md`: one line for the idea of the deleted skeleton.
- `skills/spec/SKILL.md`, `skills/slice/SKILL.md`: the refusal of a parked
  document, and the list of `/spec` without an argument.
- `skills/board/SKILL.md`: the name of the `Parked` section.
- `docs/spec.md`: new version, "What changes", 5.7.
- `docs/codebase-map.md`: `park.sh`.
- `tests/park.test.ts`: new, the checks and the two verbs in both modes.
- `tests/board.test.ts`: the section, the key, `missing` and the rules that
  skip.
- `tests/architecture.test.ts`: the name `Parked` in both places, and the
  template line of `park.sh`.

## Out of scope

Parked slices, which already have `blocked` and `blocked_by`. A reminder or
an expiry date for parked documents. A spec with slices, which cannot be
parked. Any change to `/next` or to the `/board` questions on the inbox.
Rerunning `/harness-init local` on Tipoff or on any other repo: that is the
normal path of a template, not a step of this spec.

## Open questions

None.

## Decisions to confirm

1. The parked state lives in `docs/parked.md`, a list in the form of the
   inbox; intents and specs never move and never change. Frontmatter and
   folder rejected.
2. What can be parked is an intent with no spec, a draft spec, and an approved
   spec with no slice, through `scripts/park.sh` and its `resume`, which
   follow `docs_mode` and commit the list alone on main.
3. The board never picks a parked document as the next action or as waiting
   on a human, and lists it in a `Parked` section and a `parked` key;
   `/spec` and `/slice` refuse it and name `park.sh resume`.
4. `docs/parked.md` joins `human_gate_paths` in `AGENTS.md` and in its
   template.
5. `later/` goes in one commit: three documents moved up and parked on
   2026-09-24, the empty skeleton deleted and turned into an inbox line.

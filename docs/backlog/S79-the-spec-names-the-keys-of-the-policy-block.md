---
id: S79
title: The body of the spec names the keys of the policy block, not the Italian lines
status: todo
blocked_by: none
tier: 1
human: false
spec: inbox (2026-09-24)
---

## Goal

The policy of a repo is the json block of `AGENTS.md`, with the keys
`docs_mode`, `sensitive_paths`, `never_tier_0`, `human_gate_paths` and
`docs_extra_paths`, under the headings "Review policy" and "Human gates". The
skeleton the spec quotes in 3.3 already says so. The paragraphs after it still
describe the hooks and `tier.sh` reading prose lines that are gone:
`Documenti: su main`, "Gate umani", `Path sensibili`, `Mai tier 0`,
"Merge umano per path". A reader who looks for those lines in an `AGENTS.md`
finds nothing. After this slice the spec, from section 1 on, names the key a
program reads and the heading a human reads, and a test keeps the old names
out. Section 0 is the record of what each version said and stays as written.

## Acceptance criteria

- [ ] From the heading `## 1. Principles` to the end, `docs/spec.md` contains none of `Gate umani`, `Documenti: su main`, `Documenti: PR`, the `Documenti` line, `Path sensibili`, `Mai tier 0` and `Merge umano per path`.
- [ ] 4.6, 6.1 and 7.2 name the key each program reads: `docs_mode` for the hooks, `human_gate_paths` and `docs_extra_paths` for the documents a commit on main may carry, `sensitive_paths`, `never_tier_0` and `human_gate_paths` for `tier.sh`; where the text points a human to the section, the heading is "Human gates" or "Review policy".
- [ ] The row `Documents` of the table of the modes in 8 says `docs_mode: main` and `docs_mode: pr`.
- [ ] Every key the body of the spec names between backticks in those paragraphs is a key of the policy block of `AGENTS.md`.
- [ ] Section 0 is unchanged but for its new entry: the lines that tell what an earlier version said keep the names that version used.
- [ ] The header of the spec carries a new version and date, and section 0 has the entry of that version, starting from the version before it.
- [ ] `tests/architecture.test.ts` has a case that fails when one of the old names comes back after section 0, and the case bites on a sample that puts one back.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, next to the describe
  `no template names an Italian section of AGENTS.md`: a case that cuts
  `docs/spec.md` at the heading `## 1. Principles` and asserts the seven old
  names are absent from what follows. Red today on the lines in Notes.
- Same describe: the check run on a sample string that holds `"Gate umani"`
  after a `## 1.` heading, asserted to fail, and on a sample that holds it
  only before that heading, asserted to pass. The pure function is written
  first and both are red until it exists.
- Same describe: the key names the body quotes, `docs_mode`,
  `sensitive_paths`, `never_tier_0`, `human_gate_paths`, `docs_extra_paths`,
  are each found in the body and each a key of the block the describe
  `the policy block of AGENTS.md` already parses. Red today for the keys the
  body does not name yet.
- The describe `the last entry of section 0 starts from the version before
the header` stays as it is and holds the new version.
- Then `pnpm test` whole.

## Touchpoints

- `docs/spec.md`: 4.6, 6.1, 7.2 with its table, the table of the modes in 8, the step of S09 in 9.3, the header, the new entry of section 0.
- `tests/architecture.test.ts`: the new describe.

## Notes

The inbox line, 2026-09-24: `docs/spec.md` still names the `Documenti` and
`Gate umani` lines of the policy in 2, 5.8, the table of the modes and the
Review policy paragraph, where the hooks read `docs_mode` and the heading is
"Human gates"; S63 takes only the board strings.

Found on 2026-10-01, at version 0.40 of the spec. After section 0: "Gate
umani" at `docs/spec.md:429` (4.6), `:548` (6.1) and twice at `:657` (7.2);
the `Documenti` line and `su main` at `:548`, `Documenti: su main` and
`Documenti: PR` at `:672` (the table of the modes), the `Documenti` line at
`:705` (9.3); "Merge umano per path" at `:548`; `Mai tier 0` at `:645` and
`:657`; `Path sensibili` at `:648` and `:657`. The line names 2 and 5.8:
neither holds an old name today, and the places are the ones above. The line
names two of the old names; the other three sit in the same paragraphs and
are wrong for the same reason, so they go in the same slice.

Inside section 0, and left alone: `:43`, `:80`, `:98` and `:176`, entries
that record what a version introduced under the name it had then. S63 kept
the header line of version 0.26 for the same reason.

What is right already: the skeleton of 3.3 at `docs/spec.md:278-297` says
"Review policy", "Human gates" and lists the keys of the fence at `:294`.
The keys are those of the policy block in `AGENTS.md`, and
`skills/harness-init/templates/scripts/policy-lines.sh` is what reads them.

`docs/spec.md` is a document and could be committed on main, but the test
goes through a PR, so the two travel together on the slice branch.

Out of scope: the Italian section names of an intent and of a spec that 4.1
and 4.2 quote at `docs/spec.md:341` and `:349`, which describe another
template; the scripts and the hooks, which read the block already; the
templates, held by the describe this one sits next to.

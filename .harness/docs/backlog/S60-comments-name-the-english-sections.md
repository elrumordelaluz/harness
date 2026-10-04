---
id: S60
title: The comments of the templates name the sections the template has
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-21)
---

## Goal

The template of `AGENTS.md` was translated, and its sections are now called
`## Human gates` and `## Do not`. Three comments in the templates still send
the reader to the "Gate umani" line, a section no installed `AGENTS.md` has
any more: nobody parses them, but an agent that follows the pointer finds
nothing. After this slice every comment names the English heading, and a
structural test keeps an Italian section title from coming back into the
templates.

## Acceptance criteria

- [ ] No file under `skills/harness-init/templates/` names `Gate umani` or `Non fare`.
- [ ] The comments in `templates/github/ci.yml` and `templates/scripts/policy.sh` name the "Human gates" line of `AGENTS.md`, and `.github/workflows/ci.yml` is equal to its template again.
- [ ] `tests/architecture.test.ts` has a case that fails when a file of the templates, `.github/` or `skills/*/SKILL.md` quotes `Gate umani` or `Non fare`.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`: a new case that walks the files of
  `skills/harness-init/templates/`, `.github/` and every `skills/*/SKILL.md`
  and asserts none of them contains `Gate umani` or `Non fare`, naming the
  file and the line in the message. Red today on the three comments below.
- The describe that keeps `.github/` equal to the templates covers the copy
  of `ci.yml`.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/github/ci.yml`: the comment of the tier step.
- `.github/workflows/ci.yml`: the copy, put back equal to the template.
- `skills/harness-init/templates/scripts/policy.sh`: the comment of the `human-gate` branch.
- `tests/architecture.test.ts`: the new case.

## Notes

The inbox line, 2026-09-21: `templates/judge/prompt.md`,
`templates/github/ci.yml`, `templates/scripts/policy.sh`,
`templates/architecture.test.ts` and `skills/slice/SKILL.md` name the Italian
titles of the sections of the template, "Non fare" and "Gate umani": nobody
parses them, but after the translation they point at sections that do not
exist any more and no slice names them.

PR #78 fixed most of them. What is left on 2026-09-24:
`skills/harness-init/templates/github/ci.yml:123`, its copy at
`.github/workflows/ci.yml:123`, and
`skills/harness-init/templates/scripts/policy.sh:340`. The headings they
should name are at `skills/harness-init/templates/AGENTS.md:38` and `:92`.

Out of scope: the Italian inside `docs/**`, the ADRs and the older slices,
which record what was true when they were written; any other Italian string
of the templates that is not a section title, which other inbox lines own.

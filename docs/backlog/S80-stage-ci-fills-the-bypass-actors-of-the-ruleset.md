---
id: S80
title: Stage ci of /harness-init fills the bypass actors of the ruleset it applies
status: done
blocked_by: none
tier: 1
human: false
spec: inbox (2026-09-25)
---

## Goal

The ruleset of main wants a PR and a green `ci` for every push. Two writers of
the chain push to main without a PR: `close.yml`, with the token of the
GitHub App, and the human who commits documents when `docs_mode` is `main`.
The template ships an empty `bypass_actors`, and stage `ci` applies it as
written, so on a repo with rulesets both pushes are refused until somebody
adds the actors by hand, as happened here. After this slice stage `ci` fills
the list in the copy it writes and applies: the App when the repo has one,
the admin role when `docs_mode` is `main`. The template stays empty, because
neither actor can be known before the repo is.

## Acceptance criteria

- [ ] Step 6 of stage `ci` in `skills/harness-init/SKILL.md` says that `.github/ruleset.json` is the template with `bypass_actors` filled, and that the file written is the file applied.
- [ ] It says the App goes in as an `Integration` actor whose id is the value of the `HARNESS_APP_ID` variable of the repo, and that with the variable unset the actor is left out and the hand-back says in one line that `close.yml` will be refused once the App is set until the stage runs again.
- [ ] It says the admin role goes in as a `RepositoryRole` actor only when the `docs_mode` key of the policy block is `main`, and that with `pr` it is left out, because nobody commits on main there.
- [ ] It says the shape of an actor, `actor_id`, `actor_type` and `bypass_mode`, is read from the current rulesets REST reference before it is written, never from memory, and that a ruleset already on the repo is updated and not created twice.
- [ ] It says a rerun changes `bypass_actors` only by adding what is missing: an actor a human put there stays.
- [ ] `skills/harness-init/templates/github/ruleset.json` still ships `"bypass_actors": []`, and a test says why next to the assertion.
- [ ] The comparison of `.github/` with the templates in `tests/architecture.test.ts` reads `ruleset.json` without `bypass_actors`, with the reason written next to the exception, and still fails when any other key differs.
- [ ] 6.2 of `docs/spec.md` says who the two bypass actors are and when each goes in, with a new version in the header and its entry in section 0.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, a new describe next to
  `stage local of /harness-init merges the policy block key by key`, which
  cuts step 6 of stage `ci` out of the skill the way that describe cuts its
  own point: one case per sentence of the criteria, that the step names
  `bypass_actors`, `Integration` with `HARNESS_APP_ID`, `RepositoryRole` with
  `docs_mode` and `main`, the rulesets REST reference, and the rerun that only
  adds. All red today: the step names none of them.
- Same file: the template parsed with `JSON.parse`, `bypass_actors` asserted
  to be an empty array. Green today, and it holds the template still while
  the skill changes.
- Same file, in the describe `.github matches the templates it was copied
from`: a case on two sample objects, equal but for `bypass_actors`, asserted
  equal by the comparison, and two that differ in `rules`, asserted different.
  Red until the comparison of `ruleset.json` exists as a function.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/SKILL.md`: step 6 of stage `ci`, "Repo settings and ruleset".
- `tests/architecture.test.ts`: the new describe, and the exception for `ruleset.json` in the comparison of `.github/`.
- `docs/spec.md`: 6.2, the header, the new entry of section 0.

## Notes

The inbox line, 2026-09-25: `.github/ruleset.json` and its template ship
`"bypass_actors": []`, so a repo that applies it as written refuses
close.yml's push (the App) and the direct commits of `docs_mode: main` (the
owner); on this repo the App and the admin role were added by hand, and the
template should carry them

Found on 2026-10-01: the empty list at
`skills/harness-init/templates/github/ruleset.json:30` and at
`.github/ruleset.json:30`; the step that applies it at
`skills/harness-init/SKILL.md:283-291`, which says nothing of the actors; the
sentence that the App is a bypass actor at `skills/harness-init/SKILL.md:354`,
in stage `judge`, after the ruleset has been applied already; the same
sentence at `docs/spec.md:574` and the ruleset described at `:570`; the
comment of `skills/harness-init/templates/github/close.yml:7-8`; the
retrieval-led rule at `skills/harness-init/SKILL.md:40-43`; the comparison of
the copies at `tests/architecture.test.ts:244`, with its map of the copies
that differ on purpose.

Decided with Lionel on 2026-10-01, and it is where this slice leaves the
inbox line: the template does not carry the actors. The id of the App is one
per account and is known only where `HARNESS_APP_ID` is set, so the skill
adds it at the moment it applies the ruleset. The admin role goes in only
with `docs_mode: main`: with `pr` nobody commits on main, and a bypass there
would only weaken the rule for the team.

`.github/ruleset.json` of this repo is not touched: a slice does not touch
`.github/`, and the actors of this repo live in the ruleset on GitHub, where
they were added by hand. The exception in the comparison is there for the
day stage `ci` is rerun here and writes them in the file.

Out of scope: the strict status check that leaves the second PR of a wave
behind, another line of the inbox; `CODEOWNERS` and the team ruleset of the
same step; the workflows.

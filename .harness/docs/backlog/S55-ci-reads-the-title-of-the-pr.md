---
id: S55
title: CI checks the title of the PR, which is the subject that lands
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-18)
---

## Goal

Both merge paths squash, so the subject that lands on the default branch is
the title of the PR and never one of the commits CI linted. With more than one
commit GitHub builds that title from the name of the branch, and nobody looks
at it: PR #54 landed as `docs/readme onboarding (#54)`, a subject the
commit-msg hook would have refused at the first commit of any session.

After this slice `commitlint.sh` can be given one subject on the command line,
and the `conventions` job checks the title of the PR the way it will land, so
a title out of format is red before the merge and not visible only afterwards
in `git log`.

## Acceptance criteria

- [ ] `commitlint.sh` checks one subject passed on the command line, with the strict type list: a `wip:` subject is refused there, as `--range` refuses it.
- [ ] That mode refuses a missing or empty argument with a non-zero exit: a title nobody could read is not a green light.
- [ ] The usage line and the comment at the head of the script name the new mode next to `--file` and `--range`.
- [ ] The `conventions` job of `skills/harness-init/templates/github/ci.yml` reads the title of the PR and checks the subject that will land, the title with the ` (#<n>)` suffix GitHub appends on squash.
- [ ] The failure names the title and says the suffix is counted, so a title of 69 characters that fails is readable as a failure.
- [ ] `edited` joins the `pull_request` types of the template: without it a title fixed after the red run gets no new run and the required check stays red on a PR that is now in format.
- [ ] A case in `tests/architecture.test.ts` holds the step and the `edited` type in the template, and names the file to fix.
- [ ] `.github/workflows/ci.yml` is equal to its template again, put back by rerunning `/harness-init ci` and never edited by hand.
- [ ] Suite, typecheck, format and build green.

## Test plan

- First, in `tests/commitlint.test.ts`, next to the `describe` on `--file`, the
  cases of the new mode through a helper that spawns the script the way `lint`
  does at `:12`: a good subject exits 0, `wip: half done` exits non-zero, no
  argument exits non-zero. Red today, because the `case` at
  `skills/harness-init/templates/scripts/commitlint.sh:30` falls through to
  `usage` and exits 2 for anything that is not `--file` or `--range`.
- Then, in `tests/architecture.test.ts`, a case that reads the text of
  `skills/harness-init/templates/github/ci.yml` and asserts the `conventions`
  job runs `commitlint.sh` on the title and that `edited` is among the
  `pull_request` types. Red today on both.
- The copy is covered by the case already there that compares
  `.github/workflows/ci.yml` with the template: red when the template moves,
  green when the stage has copied it back.
- The step against GitHub is not proved in Vitest. It is proved once by hand on
  a PR of this slice, opened with a title out of format, which has to go red,
  and green after the title is fixed with no push: that is what `edited` buys,
  and the way to redo it goes in the "How to verify by hand" section of the PR.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/scripts/commitlint.sh`: the `case` at `:30`, the usage at `:52`, the comment at `:2-5`. `scripts/commitlint.sh` is a symlink to it and follows.
- `skills/harness-init/templates/github/ci.yml`: the `types` at `:7`, the `conventions` job at `:63-74`.
- `.github/workflows/ci.yml`: the copy, put back by rerunning `/harness-init ci`.
- `tests/commitlint.test.ts`, `tests/architecture.test.ts`.

## Notes

The line of the inbox, of 2026-09-18: PR #54 landed on main with the subject
`docs/readme onboarding (#54)`, out of format: CI passes `commitlint.sh` over
the commits of the branch, but the squash of GitHub uses the title of the PR,
which with more than one commit is born from the name of the branch and which
nobody looks at. CI has to pass the title of the PR to `commitlint.sh` too.

What the reading found: the only commit check is
`scripts/commitlint.sh --range "origin/$BASE_REF..HEAD"` at
`skills/harness-init/templates/github/ci.yml:74`, and both merges squash,
`skills/harness-init/templates/scripts/policy.sh:464` and
`skills/harness-init/templates/github/automerge.yml:78`. `conventions` is
already among the `needs` of the `ci` job at `:117`, the single required check,
so a step that fails there holds the merge with no change to the ruleset. The
`types` at `:7` do not include `edited`, which is why the title fixed by hand
would otherwise leave the PR red.

The suffix is the repository's setting for the squash title, and this repo
appends it, which `docs/readme onboarding (#54)` shows. Counting it can only
make the check stricter than the landing, never looser, and that is the safe
direction for a gate.

The other road, not taken: `policy.sh` and `automerge.yml` could pass
`--subject` to `gh pr merge` and write the subject themselves. It would fix the
subject only where the chain merges, and in this repo the merge is Lionel's by
hand, so the gate has to be the red check, which holds whoever merges.

S52 also changes `commitlint.sh`, so the two name the same path and do not run
in the same wave of `/next`. They are independent: that one widens the first
character of a subject, this one adds a caller.

Out of scope: the default title GitHub builds from the name of the branch,
which is GitHub's and not the harness's, and the titles of the PRs already
merged.

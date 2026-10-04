---
id: S84
title: A clone with a pin fills `.harness/bin/` with one command
status: done
blocked_by: none
tier: 1
human: false
spec: .harness/docs/specs/SPEC-harness-in-one-folder.md
---

## Goal

The walking skeleton of the harness in one folder: the fetch. A new template,
`bootstrap.sh`, reads the pin of `.harness/stamp.json`, fetches the harness
repo at that sha, lays its templates out as `.harness/bin/`, writes the sha it
fetched in a marker and points `core.hooksPath` at `.harness/bin/hooks`. A
test sees it work end to end on a clone of a disposable bare origin. Nothing
calls the script yet and the scripts it lays out still call each other under
`scripts/`: S85 moves them, S87 makes the hooks check the marker, S93 makes
stage `local` install the file.

## Acceptance criteria

- [ ] In a repo whose `.harness/stamp.json` has `pin.origin` and `pin.sha`, and with no `.harness/bin/`, `bootstrap.sh` fills `.harness/bin/` from `pin.origin` at `pin.sha`, writes that sha in `.harness/bin/.sha`, sets `core.hooksPath` to `.harness/bin/hooks`, and exits 0.
- [ ] What lands is the tree of `skills/harness-init/templates/` at `pin.sha`, fetched with `git fetch` by sha: `scripts/` as `.harness/bin/`, `githooks/` as `.harness/bin/hooks/`, `judge/` as `.harness/bin/judge/`, `github/ruleset.json` as `.harness/bin/ruleset.json`, the executable bits kept.
- [ ] Run again with `.harness/bin/.sha` equal to `pin.sha`, it fetches nothing and exits 0.
- [ ] With `.harness/bin/.sha` different from `pin.sha`, it fetches and the tree and the marker are the ones of the new pin.
- [ ] A fetch that fails leaves the `.harness/bin/` that was there untouched, file for file, and the script exits non-zero with the reason on stderr.
- [ ] `skills/harness-init/templates/README.md` has the row of `bootstrap.sh`, destination `.harness/bootstrap.sh`, stage `local`.
- [ ] Bash 3.2 and jq, nothing else: the script is under the bash 3.2 check of `tests/architecture.test.ts` and under `scripts/check-shell.sh`. Suite, typecheck, format and build green.

## Test plan

- `tests/bootstrap.test.ts` (new), first. The fixture: a disposable repo that
  holds a copy of `skills/harness-init/templates/` under that same path,
  committed twice so there are two shas, pushed to a bare origin; then a second
  disposable repo, the project, with a `.harness/stamp.json` whose `pin` names
  the bare origin by path and one of the two shas, and a copy of the template
  script as `.harness/bootstrap.sh`. Red today: the script does not exist.
- Case: no `.harness/bin/`, run, exit 0; `.harness/bin/tier.sh`,
  `.harness/bin/hooks/pre-commit`, `.harness/bin/judge/prompt.md` and
  `.harness/bin/ruleset.json` exist and are byte for byte the template files
  at that sha; `tier.sh` is executable; `.harness/bin/.sha` is the pin;
  `git config core.hooksPath` is `.harness/bin/hooks`.
- Case: run twice, with a `git` wrapper on `PATH` that records its calls: the
  second run records no `fetch`.
- Case: move the pin to the other sha, run: the marker and one file that
  differs between the two commits follow.
- Case: a pin whose origin does not exist, with a `.harness/bin/` already
  there: exit non-zero, stderr not empty, every file of `.harness/bin/` as it
  was, marker included.
- `tests/architecture.test.ts`, the describe `template scripts and hooks run
on bash 3.2`: the list it derives takes `templates/bootstrap.sh` in. Red
  until the script is there.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/bootstrap.sh` (new): the reading of the pin, the fetch, the layout, the marker, the swap, `core.hooksPath`.
- `skills/harness-init/templates/README.md`: the row of the new template.
- `tests/bootstrap.test.ts` (new): the fixture and the cases.
- `tests/architecture.test.ts`: the bash 3.2 check reaches the new script.
- `scripts/check-shell.sh`: `bash -n` reaches `skills/*/templates/bootstrap.sh`.
- `docs/codebase-map.md`: the row of the templates names the bootstrap.

## Notes

Decisions of the spec that bind this slice. The machinery is not tracked in
the project repos: it lives in `.harness/bin/`, ignored, the same in every
repo at a given version, and this script is what fetches it. The fetch is
`git fetch --depth 1 <origin> <sha>` into a scratch repo, and
`skills/harness-init/templates/` copied out of it, because git checks the
content against the sha; a tarball with `curl` was rejected, one request and no
check, for code that runs in every teammate's git hooks. The script fetches
into a temporary folder and swaps it in only when complete, so a failed run
leaves the old `.harness/bin/` whole. The temporary folder and the scratch
repo sit where `git status` does not see them, under the git dir for
instance, and are removed on every exit.

The name of the marker is fixed here, `.harness/bin/.sha`, one line with the
full sha, because S87 reads it from the three git hooks.

The shape of the pin is `{"pin": {"origin": "...", "sha": "...", "date":
"..."}}` next to the `harness` and `stages` keys of today. This slice reads
`origin` and `sha` and writes nothing in the stamp: S92 is where
`/harness-init` writes the pin. A stamp with no `pin`, or no stamp, is an
exit non-zero with one line that says so.

A local bare origin refuses a fetch by a sha that is not the tip of a ref
unless it has `uploadpack.allowAnySHA1InWant` set: the fixture sets it, since
one of its two shas is not a tip. GitHub serves any reachable sha.

The test plan names a path for `pin.origin`; the `https://` form is a
criterion of S92, about what the skill writes, and this script fetches
whatever the pin says.

Out of scope here: the hooks that compare the marker (S87), the
`SessionStart` hook (S87), the step in the workflows and what the script does
in this repo, where `.harness/bin` is tracked (S85), the copy of the script
into a project repo (S93). No fallback when `jq` is missing: `jq` stays a
requirement, as the spec leaves it.

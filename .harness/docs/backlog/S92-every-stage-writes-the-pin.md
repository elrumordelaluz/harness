---
id: S92
title: Every stage of /harness-init writes the pin, and an upgrade is one line to review
status: todo
blocked_by: none
tier: 1
human: false
spec: .harness/docs/specs/SPEC-harness-in-one-folder.md
---

## Goal

`.harness/stamp.json` gains the key every clone and every CI run fetches by:
`pin`, with `origin`, `sha` and `date`. Each stage of `/harness-init` moves
it to the commit it runs from, so whoever reviews an upgrade of the harness
reads one line of diff. A stage run from a checkout nobody can fetch, dirty
or with no git, leaves the pin alone and says so.

## Acceptance criteria

- [ ] The snippet of "Ground rules" in `skills/harness-init/SKILL.md` writes `.pin = {origin, sha, date}` next to `.harness` and `.stages.<stage>`, merged with `jq`, the other keys left as they are.
- [ ] `pin.origin` is an `https://` url with no credentials whatever the checkout was cloned with: `git@github.com:owner/repo.git` and `ssh://git@github.com/owner/repo.git` become `https://github.com/owner/repo.git`, and `https://<token>@github.com/owner/repo.git` loses the token.
- [ ] Each of the three stages names the pin in its "Stamp" step: it sets `pin` to the commit it runs from, and its own entry under `stages` as today.
- [ ] From a checkout with uncommitted changes the snippet leaves `pin` byte for byte as it was, and the `stages` entry keeps its `dirty` mark; from no git repo it leaves `pin` as it was and the entry keeps its nulls.
- [ ] The skill says that in both cases the hand-back names the pin that was not moved, and why: a sha every clone will fetch has to exist on the remote.
- [ ] `templates/README.md` says in the row of the stamp that the three stages write the pin.
- [ ] 5.1 of `docs/spec.md` says the pin, with a new version in the header and its entry in section 0.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, the describe `skills/harness-init/SKILL.md
stamps every stage`, first, the way its cases already read the skill: the
  snippet is cut out of the `sh` fence of "Ground rules", `<checkout>` and
  `<stage>` are filled in, and it is run with `bash` in a disposable
  directory against a disposable checkout. Cases: a clean checkout whose
  origin is `git@github.com:owner/repo.git` writes the pin with the `https`
  origin, the full sha and the date; the `ssh://` and the token forms; a
  dirty checkout with a stamp that already has a pin leaves the pin equal and
  writes `dirty: true` in the stage; a directory with no git leaves the pin
  equal and writes the nulls; a stamp with other keys keeps them. Red today:
  the snippet writes no pin. If the describe today only matches text, the
  cases that run the snippet are new and the text ones stay.
- Same describe: each of the three "Stamp" steps names the pin; the
  sentence on the hand-back is there.
- The describe `templates/README.md has the row of the stamp`: the row names
  the pin.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/SKILL.md`: the last rule of "Ground rules", the snippet at `:55-58` and `:84-103`, the "Stamp" step of each stage, the hand-back of section 6.
- `skills/harness-init/templates/README.md`: the row of `.harness/stamp.json`.
- `tests/architecture.test.ts`: the cases.
- `docs/spec.md`: 5.1, the header, section 0.

## Notes

Decisions of the spec. `pin` is the one commit `bootstrap.sh` and the
workflows fetch, and the line a reviewer watches; `stages` stays and says
which commit last wrote the tracked files of each stage, which can lag the
pin. Every stage moves the pin to the commit it runs from. A stage run from a
dirty checkout, or from no git repo, refuses to write the pin, because a sha
every clone will fetch has to exist on the remote; the `stages` entry keeps
its `dirty` mark or its nulls as today, and the install is not stopped, since
running a stage from the checkout where a template is being written is the
only way to try one. `pin.origin` is stored in its `https://` form so a
teammate and a CI runner fetch it without a key.

The `harness` key of today keeps the origin as the checkout has it, scp form
included, and `board.sh` reads it: leave it. `pin.origin` is a second
reading of the same url with one more rewrite, and `pin.date` is the
committer date the stage entry already takes.

A clean checkout whose HEAD was never pushed has a sha the remote does not
have. The spec draws the line at dirty and at no git, so this slice does
too: the skill says in one sentence that the commit must be on the remote
before the install is pushed, and builds no check.

On a first install from a dirty checkout there is no pin to leave as it was:
the stamp has none, the bootstrap of S84 says so and exits non-zero, and the
hand-back says the stage has to be run again from a clean checkout. That
follows from the rule and is said in the skill.

The rest of the skill, where each file goes, is S93 and S94: here only the
stamp.

Out of scope: `board.sh` printing the pin (S91); the bootstrap reading it
(S84); a command to upgrade the pin alone without rerunning a stage.

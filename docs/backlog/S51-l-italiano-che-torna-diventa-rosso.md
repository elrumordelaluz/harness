---
id: S51
title: Italian coming back into the declared set turns the suite red
status: blocked
blocked_by: none
tier: 2
human: false
spec: docs/specs/SPEC-english-first.md
---

## Goal

A translation without a guard undoes itself: one session writes an Italian
comment inside a template or a `description`, and in six months the contract is
bilingual again with nobody having decided anything. In this repo a rule in
prose that a check can hold is a check.

After this slice `tests/architecture.test.ts` has a case that looks for Italian
over a declared set of paths, and goes red when an Italian word comes back into
one of those files. The case stays in this repo and does not enter the
templates: the harness does not decide the language of whoever installs it.

This slice is rewritten after PR #78, which translated about 290 lines of the
set and closed the block that PR #70 reported. Three things the first cut of
this slice could not have known shape it now.

The word list of S46 is function words, `il`, `lo`, `che`, `una`. The Italian
the chain actually emitted was content words: every judged PR carried a comment
with `| criterio | test | ok |` and a column of `sì`, and `judge.sh` wrote the
evidence of a human finding into the verdict JSON in Italian. Not one of those
six strings contains a word of the list. A guard that misses what the chain
says out loud is not a guard.

The list catches English too: `non-zero`, `non_fast_forward` in the GitHub
ruleset, `non-functional`, and jq's `del(`. Nine lines of the set matched on
those alone. The boundary rule of S46 treats `-` and `_` as word boundaries,
which is right for `l'harness` and wrong for `non-zero`.

The irreducible Italian is small and it has two shapes. The detector's own
data, the word list and the probe phrase that proves it bites, which no
translation can touch because translating it is what breaks it. And a handful
of lines quoting a source that is Italian, a citation and a spec.

## Blocked

The case finds 46 lines, not the seven this slice names: with the content words, `umani`, `umano`, `sì`, `Nessuna.`, `non`, `ferma` hit about 35 more lines across docs/spec.md, four SKILL.md, policy.sh, ci.yml and tests, one of them in `.github/workflows/ci.yml`, which a slice may not touch; translating or marking them is a scope decision this slice does not make.

The work so far, the case and `tests/fixtures/italian.ts`, is commit `5ae2768` on the branch `wip/S51-italian-guard`: resume with `git cherry-pick 5ae2768` on the slice branch.

## Acceptance criteria

- [ ] `tests/architecture.test.ts` has a case that looks for Italian over a set of paths declared in the test, and the message of a failure names the file, the line number and the words found.
- [ ] The set is `skills/harness-init/templates/**`, `skills/*/SKILL.md`, `skills/spec/templates/SPEC.md`, `AGENTS.md`, `CLAUDE.md`, `docs/spec.md`, `docs/codebase-map.md`, `docs/*/README.md`, `.github/**`, `tests/**`, and it excludes `tests/fixtures/**`, `docs/intent/`, `docs/specs/SPEC-*.md`, `docs/backlog/S*.md`, `docs/decisions/ADR-*.md`, `docs/review-log/` and `docs/inbox.md`.
- [ ] The word list carries the function words of S46 and the content words the chain emitted: at least `criterio`, `criteri`, `risposte`, `umano`, `umani`, `giudice`, `verdetto`, `nessuna`, `prossima`, `ferma`, `sì`. It does not carry `per`, `in`, `a`, `e`, `di`, `come`.
- [ ] A word is only a match when it stands between non-letters that are not `-` or `_`, so `non-zero`, `non_fast_forward`, `non-functional`, `non-default` and jq's `del(` do not match, and a case proves each of those five passes.
- [ ] The word list and the probe phrase of the S46 detector live in `tests/fixtures/`, which the set excludes, and both the S46 case and this one read them from there. No Italian word is written as a literal in `tests/architecture.test.ts`.
- [ ] A line carrying the marker `i18n-allow` is skipped, in a `//` comment, a `#` comment or an HTML comment, and the marker on its own line exempts the line after it. A case proves a marked Italian line passes and the same line unmarked fails.
- [ ] The marker is on the three lines that quote an Italian source and cannot be translated: the Martinucci citation in the bibliography of `docs/spec.md`, the verbatim quote of `SPEC-spec-skill.md:55` in `tests/architecture.test.ts`, and the `## Ordine di lavoro` heading of `tests/board.test.ts` that `board.sh` matches literally with awk.
- [ ] The four lines PR #78 missed are translated: `docs/spec.md:448`, where the `/next` row of the commands table still gives `"prendi la prossima"` as a trigger; `docs/spec.md:573`, a fifth reference to the renamed `"non fare"` section; `tests/judge.test.ts:206`, the commit-message fixture `'la base si muove'`; and `tests/policy.test.ts:382`, the `it.each` label `'del giudice'`.
- [ ] The case fails on a fixture that puts an Italian word back into a file of the set, and the message names the file and the word.
- [ ] The case passes over the whole set as it is after PR #78 and the criteria above, with no line left needing a marker that does not have one.
- [ ] `skills/harness-init/templates/architecture.test.ts` does not carry the case, and an assertion proves it.

## Test plan

- `tests/architecture.test.ts`, the new case: it walks the set, skips the excluded paths, skips marked lines, and looks for the words. It fails before it is written and, once written, passes only because #78 and S59 are on main.
- The same file, the fixture case: a temporary file inside the set holding a word of the list, passed to the same function the case uses, and the detection expected with the file name and the word. It fails first because the function does not exist. This is the proof the case does not pass by being empty, which is how the drift guard of S42 died and `cc5a1e2` had to revive it.
- The same file, the false-positive case: `non-zero`, `non_fast_forward`, `non-functional`, `non-default` and `del(.reason)` each pass the detector. All five fail first against the S46 boundary rule, which is what makes this criterion worth writing.
- The same file, the marker case: one Italian line with `i18n-allow` passes, the same line without it fails. Fails first because no marker is read.
- The same file, the set boundary case: a file under `docs/backlog/` and one under `docs/decisions/` holding a word of the list fail nothing, and a file under `tests/fixtures/` holding the whole word list fails nothing.
- The same file, the S46 case: it keeps passing while reading its list and its probe from `tests/fixtures/`, with the same number of assertions.
- A case that reads `skills/harness-init/templates/architecture.test.ts` and expects not to find the language rule in it. It fails first because nothing holds it there.

## Touchpoints

- `tests/architecture.test.ts`: the new case, the set and its exclusions, the boundary rule, the marker, the fixture case, the false-positive cases, the case on the template, and the S46 detector now reading its data from the fixtures.
- `tests/fixtures/italian.ts` (new): the word list and the probe phrase, the only place an Italian word is written as a literal in `tests/`.
- `tests/board.test.ts`: the marker on the `## Ordine di lavoro` heading.
- `tests/judge.test.ts`: the commit-message fixture at `:206`.
- `tests/policy.test.ts`: the `it.each` label at `:382`.
- `docs/spec.md`: the trigger of `/next` at `:448`, the `"non fare"` reference at `:573`, the marker on the citation at `:737`, a new version in the header and its line in "What changes".
- `AGENTS.md`: the "Do not" line saying the prose of these paths is written in English.
- `docs/codebase-map.md`: the row of `tests/`, which lists the structural rules covered.

## Notes

`blocked_by: none`. S42 to S50 translated their own files and PR #78 did
the 290 lines they left, so every prerequisite of this slice is on main. S59
wrote `tests/architecture.test.ts` and `docs/spec.md` too and was briefly
named here to keep the two out of one wave, but it merged as PR #79 before
this slice was cut and the collision went with it.

Whoever takes this slice should still read the wave rule of `/next` before
trusting it: it compares only the text inside the first pair of backticks of a
Touchpoints line, so two slices that name a shared file second on a line run
together. That is how S55 and S56 shared two files in one wave on 22
September, and only a hand check with `git merge-tree` caught it. The inbox
carries the defect.

What stays Italian after this slice, and why each one cannot move. The word
list and the probe are the detector's data, in `tests/fixtures/`. The
Martinucci citation is the title of a real article. The quote of
`SPEC-spec-skill.md:55` is verbatim from a file the set excludes, because specs
are history and history is not translated. `## Ordine di lavoro` is matched
literally by `board.sh`, so translating it means translating every file of
`docs/decisions/` in the same commit, which is a slice of its own and not this
one. The accented path of `tests/tier.test.ts` proves `tier.sh` reads bytes
above 0x80 and an English name has no accent. The commit subjects the skills
carry, `<perché>` and `docs(backlog): s<NN> dall'inbox`, are contract strings
pinned by `toContain` against the skill files, and they move when whoever owns
those subjects moves them.

The set drops `docs/inbox.md`. It is a human-merge path, a PR that touches it
never merges, so a check that can only be fixed by editing it would deadlock:
the line that turns the case red could not be removed on the same branch.

The case walks files: a `walk` already exists at the top of
`tests/architecture.test.ts` for the template tree, and it is reused rather
than written a second time.

Out of scope: translating anything else, which PR #78 did; the language of the
project repos; a check on the quality of the English, which no test makes.

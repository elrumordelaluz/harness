---
id: S52
title: A commit subject can open with the name of a skill
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-18)
---

## Goal

The commits of this repo talk about the skills, and the name of a skill is
`/board`, `/next`, `/judge`. A subject that opens with one is refused by the
commit-msg hook, because the rule wants a lowercase letter right after
`type(scope): `, and whoever is committing rewrites the sentence to put the
name somewhere else. The rule is there for the imperative lowercase subject,
not against the slash: a name that the repo itself writes with a slash has no
way of standing first.

After this slice a subject may open with `/` when a lowercase letter follows
it, the lowercase rule and the 72 characters stay as they are, and the message
of the refusal says the rule the way it works.

## Acceptance criteria

- [ ] `scripts/commitlint.sh --file` accepts `docs(board): /board and /next close a line of the inbox`.
- [ ] `scripts/commitlint.sh --range` accepts a commit with that subject.
- [ ] The lowercase rule holds: `docs(board): Board first`, `docs(board): 52 lines` and `docs(board): /Board first` are refused, and the refusal still says `bad subject`.
- [ ] A slash with no lowercase letter after it is refused: `docs(board): /` and `docs(board): //next twice`.
- [ ] The length does not change: 72 characters after `type(scope): ` pass and the 73rd fails, with the leading slash and without it.
- [ ] The second line of the refusal and the comment at the head of the script say the rule as it stands after the change.
- [ ] `docs/spec.md` quotes the regex of `commit-msg` as it stands after the change, with a new version in the header and a line in "What changes".
- [ ] Suite, typecheck, format and build green.

## Test plan

- First, in `tests/commitlint.test.ts`, next to `rejects an uppercase subject
with a trailing period` (`:44`), the cases above through the `lint` helper
  that is already there, which runs the script as a process on a message file.
  Red today on the first one: `SUBJECT` at
  `skills/harness-init/templates/scripts/commitlint.sh:10` starts the subject
  with `[a-z]`, so the slash fails and the helper returns `ok: false`.
- The `--range` case needs a commit: a repo in a temporary directory, one
  commit with that subject, `--range` over it, exit 0. `tests/commitlint.test.ts`
  today only covers `--file`, so the helper for the range is new.
- The two length cases mirror `allows 72 characters after the type and rejects
the 73rd` (`:56`), one with `/` as the first character of the subject.
- Then `pnpm test` whole.

## Touchpoints

- `skills/harness-init/templates/scripts/commitlint.sh`: `SUBJECT` at `:10`, the format line of the comment at `:5`, the expected line of the refusal at `:17`. `scripts/commitlint.sh` is a symlink to it and follows.
- `tests/commitlint.test.ts`: the new cases and the helper for `--range`.
- `docs/spec.md`: the regex quoted at `:499`, the version in the header, the line in "What changes". This one is prose.

## Notes

The line of the inbox, of 2026-09-18: `commitlint.sh` refuses a subject that
opens with the name of a skill, `docs(board): /board e /next ...`, because it
wants a lowercase letter: whoever commits on the skills has to work around the
rule.

The rule read today is `SUBJECT` at
`skills/harness-init/templates/scripts/commitlint.sh:10`, one regex for both
callers, `--file` from the hook and `--range` from CI, so one change covers
both. S34 is the other commitlint line of the inbox and it closed something
else: the template subject of `/board` with the uppercase `S<NN>`, which is why
the id is written `s<NN>` today. Nothing since has touched the first character
of the subject.

`docs/spec.md:499` quotes the regex whole, so it goes stale the moment the
script changes. It is prose, and in this repo prose is committed on main, the
`Documents` line of "Human gates" in `AGENTS.md`. How a prose touchpoint is
marked in a slice is the open line of the inbox of 2026-09-21, so this slice
marks nothing and leaves the choice where it already is.

Out of scope: the slug of an intent, which `docs/spec.md:88` wants starting
with a letter because it becomes the subject of two commits, stays as it is and
`scripts/intent.sh` is not touched. The slash is allowed as the first character
of the subject and nowhere else: after the first character the rule already
allows it, which is how `89b9cc8` carries `/next` in its subject.

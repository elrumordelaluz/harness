---
id: S103
title: A skill or a subagent of /next files what it saw as an issue, with no question
status: todo
blocked_by: none
tier: 2
human: false
spec: .harness/docs/specs/SPEC-inbox-as-github-issues.md
---

## Goal

What a run notices out of its scope stops travelling as a line for the human
to approve: the subagent of `/next` files it with `gh issue create`, and the
hand-back lists the numbers. A defect of the harness found in a project repo
goes to the harness repo, read from `pin.origin` of `.harness/stamp.json`. The
PR of a slice born from an issue closes it with `Fixes #<n>`. The guardrail
paragraph every skill carries says the new channel.

## Acceptance criteria

- [ ] The brief of the subagent in `skills/next/SKILL.md` (near `:238` and `:346`) has it file what it saw with `gh issue create`, the slice id, the PR and what it saw in the body, and put the number in its report, instead of a dated line.
- [ ] The hand-back of `/next` (near `:468`) lists the numbers of the issues its subagents filed and asks no question about them.
- [ ] `/next` writes `Fixes #<n>` in the PR body of a slice whose frontmatter says `spec: issue #<n>`, and nothing of the kind for any other `spec:`.
- [ ] The guardrail paragraph, word for word in `skills/board`, `skills/next`, `skills/spec`, `skills/slice` and `skills/judge`, says: file an issue with `gh issue create -R <owner/name>` on the repo of `pin.origin` of `.harness/stamp.json`, on the current repo when the field is missing, and carry on; no line of `.harness/docs/inbox.md`.
- [ ] `skills/harness-init/templates/settings.json` and `.claude/settings.json` allow `Bash(gh issue *)`.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, describe `every skill carries the same harness guardrail` near `:2146`: the `guardrail` constant becomes the new paragraph, which names `gh issue create -R`, `pin.origin` and `.harness/stamp.json`. Red today on all five skills. The describe keeps checking every skill but `harness-init`, by folder.
- The same file: a describe on `skills/next/SKILL.md` asserting it names `Fixes #<n>` next to `spec: issue #<n>`, names `gh issue create` in the brief, and no longer says "whether to commit them on the default branch". Red today.
- The same file: a case that the template settings allow `Bash(gh issue *)`; the describe `.claude/settings.json is the template without the verdict hook` near `:2293` then holds this repo's copy to it.
- Then `pnpm test` whole.

## Touchpoints

- `skills/next/SKILL.md`: the guardrail, the brief of the subagent, the PR body, the hand-back.
- `skills/board/SKILL.md`, `skills/spec/SKILL.md`, `skills/slice/SKILL.md`, `skills/judge/SKILL.md`: the guardrail paragraph only.
- `skills/harness-init/templates/settings.json`: `Bash(gh issue *)` next to `Bash(gh label *)` near `:42-44`.
- `.claude/settings.json`: the same line.
- `tests/architecture.test.ts`.

## Notes

From the spec, binding here:

- A skill or a subagent files a line about the repo it works in with `gh issue create`, with no human yes: an issue costs nothing to close and `/board` asks about every one. Rejected: the orchestrator files them after a yes in the hand-back, the cost the file made necessary and the issues remove.
- A defect of the harness found in a project repo is an issue on the harness repo, `gh issue create -R <owner/name>`, the repo read from `pin.origin` of `.harness/stamp.json` (`skills/harness-init/templates/bootstrap.sh:40`), never hardcoded; with no `pin.origin`, as in the harness repo, the current repo. `pin.origin` is an `https://` URL, so the skill cuts it to `<owner>/<name>`.
- The guardrail keeps its other sentences: never rerun `/harness-init`, never edit a script, hook, workflow or `AGENTS.md` of that repo. The sentence on `.harness/docs/inbox.md` missing goes, since the stop is now `gh` not answering: say so in the hand-back and carry on.
- The rest of `skills/board/SKILL.md` is S102's: here only its guardrail paragraph changes, so the two slices do not rewrite the same lines.
- `.harness/docs/inbox.md` and its template are removed by S104, after this slice has taken away the last writer.

Manual check for the PR: in a scratch repo with a stamp whose `pin.origin` points at a test repo, read the guardrail and confirm the `-R` value the skill would compute.

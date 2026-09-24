## Slice

<!-- path of the slice file, e.g. docs/backlog/S03-observer.md; "none" for a maintenance or harness PR -->

## Declarations

<!-- the CI reads the boxes: one ticked takes the PR to tier 2 -->

- [ ] Adds or updates dependencies
- [ ] Touches schema, migrations or persisted data
- [ ] Calls a new external service
- [ ] Touches a sensitive path (the list is in AGENTS.md)

## How to check by hand

<!-- two or three steps, or "tests only" -->

## Declared findings

<!-- the `low` ones of the judgement, one per line: id, file, the sentence of the finding. "None" when there are none. The `high` and the `medium` do not belong here: they are fixed before the PR and each one is answered with the sha of the commit that closes it, `scripts/judge.sh answer`. The judge runs once per PR -->

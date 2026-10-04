---
id: S67
title: close.yml lets the repair notice reach the PR without the App
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-22)
---

## Goal

When a merged PR has no verdict to log, `review-log.sh` posts a notice on
the PR that says how to repair the log. `close.yml` runs it with the token of
the App when the App is configured, and with the default token otherwise, and
it gives that default token `pull-requests: read`: in a repo without the App
the comment is refused, and since S53 the notice lands only in the step
summary of a run nobody opens. After this slice `close.yml` gives
`pull-requests: write`, so the notice reaches the PR on either token, and the
comment of `review-log.sh` that explains the fallback says the new truth.

## Acceptance criteria

- [ ] `skills/harness-init/templates/github/close.yml` sets `pull-requests: write`, and `.github/workflows/close.yml` is equal to it.
- [ ] `tests/architecture.test.ts` has a case that fails when `close.yml` does not give `pull-requests: write`.
- [ ] The comment above the notice in `skills/harness-init/templates/scripts/review-log.sh` no longer says the step has `pull-requests: read`; the fallback to the step summary stays, for a token that is refused anyway.
- [ ] Suite, typecheck, format and build green.

## Test plan

- `tests/architecture.test.ts`, next to the cases that read the jobs of
  `github/close.yml`: a case that reads the top-level `permissions` of the
  template and asserts `pull-requests: write`. Red today on `read`.
- The describe that keeps `.github/` equal to the templates covers the copy.
- Then `pnpm test` whole, `tests/review-log.test.ts` included, whose cases on
  the refused comment do not change.

## Touchpoints

- `skills/harness-init/templates/github/close.yml`: the permission.
- `.github/workflows/close.yml`: the copy, put back equal to the template.
- `skills/harness-init/templates/scripts/review-log.sh`: the comment on the token.
- `tests/architecture.test.ts`: the new case.

## Notes

The inbox line, 2026-09-22: `close.yml` gives the close step
`pull-requests: read`, so the repair notice `review-log.sh` posts is refused
on the token it falls back to without the App; raise it to `write` in the
template and in the `.github/` copy. Found answering the medium of S53, which
fixed the other half by sending the notice to `$GITHUB_STEP_SUMMARY`.

Found on 2026-09-24: the permission at
`skills/harness-init/templates/github/close.yml:23-25`; the token fallback at
`:70` and `:74`; the comment that describes it at
`skills/harness-init/templates/scripts/review-log.sh:146-153`. The notice is
the only write the script makes to GitHub, so the widened permission buys
nothing else.

The repos that already have the harness get the fix by rerunning the stage of
`/harness-init` that owns `close.yml`, never from this slice.

Out of scope: the App and its permissions, which are set on GitHub by a
human; the step summary fallback, which stays.

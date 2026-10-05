## Problem

The inbox is one file, `.harness/docs/inbox.md`, and every line costs a commit. Two sessions that append at once conflict, a subagent of `/next` cannot write its own line and hands it to me in the report, a PR that carries one line gets `human-gate`, and a project repo that finds a defect of the harness has no way to tell this repo except me copying the line across.

## What success looks like

The inbox is the GitHub issues, a subagent files its own line, a slice that settles one closes it with `Fixes #n`, a project repo reports to the harness repo with an issue there, and `/board` reads and closes them as it closes lines today. `board.sh` still prints a screen offline or rate limited, reads only issues from collaborators, and its tests stub `gh`.

## Out of scope

Moving the other documents of `.harness/docs/` to issues. GitHub Projects or any board beyond the label.

# Parked

Intents and specs that are written and not wanted yet. One line per document, `- <YYYY-MM-DD>: <path>: <why>`: the date it was parked, the path of the intent or the spec as it sits in `docs/intent/` or `docs/specs/`, and the reason in one line. The document itself does not move and does not change. A parked document is never the next action of `scripts/board.sh` and never a row of "Waiting on a human": the board lists it under `Parked`, with its kind and the why. `scripts/park.sh <path> "<why>"` writes the line and `scripts/park.sh resume <path>` takes it out; a line whose path is gone is shown as `missing` until it is taken out. Resumed lines are removed, not ticked off: the history is in git.

- 2026-09-24: docs/intent/audit-sample.md: interview stopped at Q8, the priority is using the harness in the project repos.
- 2026-09-24: docs/specs/SPEC-audit-sample.md: interview stopped at Q8, the priority is using the harness in the project repos.
- 2026-09-24: docs/intent/roadmap-view.md: wanted after the harness is in use on Tipoff.

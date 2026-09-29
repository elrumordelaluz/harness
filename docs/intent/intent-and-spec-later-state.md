## Problem

On 24 September `/spec audit-sample` stopped at Q8 because the priority had
become using the harness in the project repos. It left a draft spec and its
intent with nowhere to wait. The same held for `roadmap-view` and
`harness-inbox-across-repos`, intents written but not wanted yet. All four
files went into `docs/intent/later/` and `docs/specs/later/`, and the board
stopped naming them only because `board.sh` globs `docs/intent/*.md` and
`docs/specs/*.md` without recursing. No document says the folder means
anything. `/spec` and `/slice` don't know about it, and a glob that learns
to recurse would bring all four back as the next action without anyone
having decided so.

## What success looks like

An intent or a spec can be marked as parked, with the date and one line of
why, in a form the board reads on purpose and a t
`tests/architecture.test.ts` holds. The board lists parked documents in a
section of their own and never picks one as the n
again is one command that commits on main, and after it the board names
`/spec` or `/slice` for it as it would for a fres

## Out of scope

Choosing between a frontmatter field and a folder
question of `/spec`. Parked slices, which already have `blocked` and
`blocked_by`. A reminder or an expiry date for pa
four files of `later/` by hand before the spec says where they go.

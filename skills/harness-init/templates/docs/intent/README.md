One file per idea, `<slug>.md`, ten lines written by hand by a human, with no agent. Three fixed sections:

    ## Problem
    (with a concrete episode, where there is one)
    ## What success looks like
    (a verifiable sentence)
    ## Out of scope

It is the document that keeps the interview of `/spec` from starting on a vague thesis. After the implementation it is not updated.

The typing around it is `scripts/intent.sh`, and it follows the `docs_mode` key of the policy block in `AGENTS.md`. With `main`, `new <slug>` writes the file with the three empty sections on the default branch; once the lines are written, `open` refuses an empty section, commits that file alone, `docs(intent): <slug>`, and pushes it: the approval is the commit, because the human wrote the intent. With `pr`, the team case, `new` cuts the branch `intent/<slug>` and `open` opens the PR: the approval is the merge.

## Problem

`/harness-init` copies templates into a repo and leaves nothing behind that
says which commit of the harness they came from. Tipoff has taken the three
stages more than once, and ADR-0003 writes down what that costs: on its
`harness/judge` branch sat six commits that had nothing to do with the
product, because a skill compares the repo with the current template and the
copies drift. When feedback comes back from a repo like that, nobody can say
whether it describes a bug fixed here two weeks ago or one still open, and
the only way to find out is to read the template by hand and guess.

## What success looks like

The repo carries a stamp that names the harness, the commit each stage
installed and the date of that commit, rewritten every time that stage runs,
and a session in that repo prints it in one line. A line of feedback written
there carries that sha, and here it turns into a command over the templates
between that commit and HEAD, which says whether the fix has already landed
and in which commit.

## Out of scope

A declared version number for the harness. The sha and its date are derived
at install time and cannot be forgotten; a version has to be remembered at
every release, and one that nobody bumped makes the stamp lie. The three
stages move separately anyway, so a repo can sit at three different points at
once and a single number cannot say so. Moving a repo forward when the
harness moves: the stamp says where the repo is, it does not update it. The
path that carries feedback back to this repo, which is a line of its own in
the inbox and comes after this.

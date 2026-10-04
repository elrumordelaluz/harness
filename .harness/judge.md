# This repo

There is no application here. The product is the files under
`skills/harness-init/templates/`: they are copied into every repo that runs
the chain, so a one-line change to `scripts/tier.sh` moves the review tier of
every PR everywhere, and a hook that fails on macOS blocks every commit of
every project. Those scripts must stay on bash 3.2 and jq: no bash 4
constructs, no new tool. The workflows and `judge/` run with secrets in every
project; an action input that changed name fails at run time, not in tests,
so a change there is trusted only if the PR body says which doc it was checked
against.

`skills/harness-init/SKILL.md` is prose that an agent executes. A sentence
changed there changes what happens in every repo: check that it still names
the templates that exist and the steps the scripts actually perform.
`docs/spec.md` is the source of the design and changes only with a new
version in its header and a line in section 0. The type checker covers only
`tests/`: bash, YAML and markdown are reviewed by reading. `.githooks/` and
the scripts with a namesake in the templates are symlinks; a diff that turns
one into a regular file is out of scope.

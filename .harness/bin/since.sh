#!/usr/bin/env bash
# What moved in the templates since a commit. A line of feedback that comes
# back from a repo carries the sha its stamp says, and this turns that sha
# into an answer: one line per commit between it and HEAD, with the date, the
# subject and the files it touched, so whoever reads it knows whether the fix
# has already landed and in which commit.
# Plain `git log` prints the same nothing for the two cases that mean opposite
# things, a sha this repo does not have and a range with nothing in it, so
# they are told apart here: the unknown sha goes to stderr with exit 1, the
# empty range is a sentence on stdout with exit 0.
# This script is not a template: it answers about the templates of this repo
# and would mean nothing in a repo that received them. bash 3.2 all the same.
# Usage: since.sh <sha> [path...]
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "since: usage: since.sh <sha> [path...]" >&2
  exit 2
fi
sha="$1"
shift

cd "$(git rev-parse --show-toplevel)"

# Caught before the log, so a sha that is not here is never an empty answer.
if ! git cat-file -e "$sha^{commit}" 2>/dev/null; then
  echo "since: $sha is not a commit of this repo, so there is nothing to say about it" >&2
  exit 1
fi

# With no path the question is the one the stamp asks; a path argument
# replaces that limit and is passed through.
if [ "$#" -eq 0 ]; then
  set -- skills/harness-init/templates/
  empty="the templates have not moved since $sha"
else
  empty="nothing moved under $* since $sha"
fi

commits=$(git log --format=%H "$sha..HEAD" -- "$@")
if [ -z "$commits" ]; then
  echo "since: $empty"
  exit 0
fi

for c in $commits; do
  line=$(git show -s --format='%ad %h %s' --date=short "$c")
  files=""
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    if [ -z "$files" ]; then files="$f"; else files="$files $f"; fi
  done <<EOT
$(git show --pretty=format: --name-only "$c" -- "$@")
EOT
  if [ -n "$files" ]; then
    echo "$line | $files"
  else
    echo "$line"
  fi
done

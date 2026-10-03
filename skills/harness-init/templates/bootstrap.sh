#!/usr/bin/env bash
# Fills .harness/bin/ with the harness at the sha that .harness/stamp.json
# pins, and points core.hooksPath at .harness/bin/hooks. The fetch is git, by
# sha, so the content is checked against the pin; it goes into a scratch repo
# under the git dir, where `git status` does not see it, and the new tree is
# swapped in only when complete: a failed run leaves the old .harness/bin/ as
# it was. .harness/bin/.sha holds the sha it was filled from, and when it is
# already the pin nothing is fetched. In the harness repo itself .harness/bin
# is tracked, links into its own templates, and there is nothing to fetch:
# that repo is told by what a project cannot be at the same time, no stamp,
# the templates tracked, and .harness/bootstrap.sh a tracked link to them.
# Anywhere else a tracked .harness/bin counts for nothing: the pin is fetched
# over it, marker or not, so a branch cannot hand CI its own gates.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

stamp=.harness/stamp.json
bin=.harness/bin
templates=skills/harness-init/templates

tracked="$(git ls-files -- "$bin")"
if [ ! -f "$stamp" ] && [ -n "$tracked" ] &&
  [ -n "$(git ls-files -- "$templates/bootstrap.sh")" ] &&
  [ "$(git ls-files -s -- .harness/bootstrap.sh | cut -c1-6)" = 120000 ] &&
  [ "$(readlink .harness/bootstrap.sh)" = "../$templates/bootstrap.sh" ]; then
  git config core.hooksPath "$bin/hooks"
  exit 0
fi
if [ ! -f "$stamp" ]; then
  echo "bootstrap: no $stamp, run /harness-init local first" >&2
  exit 1
fi
origin="$(jq -r '.pin.origin // empty' "$stamp" 2>/dev/null || true)"
sha="$(jq -r '.pin.sha // empty' "$stamp" 2>/dev/null || true)"
if [ -z "$origin" ] || [ -z "$sha" ]; then
  echo "bootstrap: $stamp has no pin.origin and pin.sha, rerun /harness-init local" >&2
  exit 1
fi
# The stamp is tracked, so whoever pushes it chooses what reaches the git of
# every teammate: a full sha and an origin that git cannot read as an option.
case "$sha" in
  *[!0-9a-f]*) sha_ok=0 ;;
  *) [ "${#sha}" -eq 40 ] && sha_ok=1 || sha_ok=0 ;;
esac
if [ "$sha_ok" -ne 1 ]; then
  echo "bootstrap: pin.sha in $stamp is not a full sha of 40 hex characters" >&2
  exit 1
fi
case "$origin" in
  -*)
    echo "bootstrap: pin.origin in $stamp starts with -, git would read it as an option" >&2
    exit 1
    ;;
esac

if [ -n "$tracked" ] || [ ! -f "$bin/.sha" ] || [ "$(cat "$bin/.sha")" != "$sha" ]; then
  scratch="$(mktemp -d "$(git rev-parse --absolute-git-dir)/harness-bootstrap.XXXXXX")"
  trap 'rm -rf "$scratch"' EXIT
  git init -q "$scratch/repo"
  if ! git -C "$scratch/repo" fetch -q --depth 1 -- "$origin" "$sha" 2>"$scratch/err"; then
    echo "bootstrap: cannot fetch $sha from $origin: $(tail -n 1 "$scratch/err")" >&2
    exit 1
  fi
  mkdir "$scratch/tree"
  git -C "$scratch/repo" --work-tree="$scratch/tree" checkout -q "$sha" -- "$templates"
  t="$scratch/tree/$templates"
  mv "$t/scripts" "$scratch/bin"
  mv "$t/githooks" "$scratch/bin/hooks"
  mv "$t/judge" "$scratch/bin/judge"
  mv "$t/github/ruleset.json" "$scratch/bin/ruleset.json"
  printf '%s\n' "$sha" >"$scratch/bin/.sha"
  if [ -d "$bin" ]; then mv "$bin" "$scratch/old"; fi
  if ! mv "$scratch/bin" "$bin"; then
    if [ -d "$scratch/old" ]; then mv "$scratch/old" "$bin"; fi
    echo "bootstrap: cannot move the new tree into $bin" >&2
    exit 1
  fi
fi
git config core.hooksPath "$bin/hooks"

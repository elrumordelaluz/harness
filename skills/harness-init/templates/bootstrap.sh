#!/usr/bin/env bash
# Fills .harness/bin/ with the harness at the sha that .harness/stamp.json
# pins, and points core.hooksPath at .harness/bin/hooks. The fetch is git, by
# sha, so the content is checked against the pin; it goes into a scratch repo
# under the git dir, where `git status` does not see it, and the new tree is
# swapped in only when complete: a failed run leaves the old .harness/bin/ as
# it was. .harness/bin/.sha holds the sha it was filled from, and when it is
# already the pin nothing is fetched.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

stamp=.harness/stamp.json
bin=.harness/bin
templates=skills/harness-init/templates

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

if [ ! -f "$bin/.sha" ] || [ "$(cat "$bin/.sha")" != "$sha" ]; then
  scratch="$(mktemp -d "$(git rev-parse --absolute-git-dir)/harness-bootstrap.XXXXXX")"
  trap 'rm -rf "$scratch"' EXIT
  git init -q "$scratch/repo"
  if ! git -C "$scratch/repo" fetch -q --depth 1 "$origin" "$sha" 2>"$scratch/err"; then
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

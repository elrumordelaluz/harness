#!/usr/bin/env bash
# Looks only at test files in the diff against a base ref and prints one line
# per suspicious change on stdout. Empty stdout means nothing found, and
# ci.yml reads a non-empty one as "tests weakened", so nothing else goes
# there. A run that finds nothing prints one line on stderr instead, with the
# range and how many test files it read, zero included, so an empty stdout
# pasted into a PR body still shows the script ran. Heuristics on purpose: a
# hit means "a human looks", not "guilty". Exit code is always 0; the label
# decides.
# Usage: test-weakening.sh [base-ref]
set -euo pipefail
base="${1:-origin/main}"
cd "$(git rev-parse --show-toplevel)"
range="$base...HEAD"

is_test() {
  case "$1" in
    *.test.*|*.spec.*|*/__tests__/*|__tests__/*|tests/*|*/tests/*|test_*.py|*_test.py|*/test_*.py) return 0 ;;
    *) return 1 ;;
  esac
}

# The subject of every expect( on the lines read from stdin, one per line,
# sorted and unique: the text up to the first "," or ")" at its own depth,
# compared as written. A widened matcher is an exact one removed and a loose
# one added on the same subject; a subject on the next line is not seen.
subjects() {
  awk '{
    s = $0
    while ((i = index(s, "expect(")) > 0) {
      s = substr(s, i + 7); n = length(s); d = 0; out = ""
      for (j = 1; j <= n; j++) {
        c = substr(s, j, 1)
        if (d == 0 && (c == "," || c == ")")) break
        if (c == "(" || c == "[" || c == "{") d++
        else if (c == ")" || c == "]" || c == "}") d--
        out = out c
      }
      gsub(/^[ \t]+|[ \t]+$/, "", out)
      if (out != "") print out
      s = substr(s, j)
    }
  }' | sort -u
}

tests=""
count=0
src_deleted=0
for f in $(git diff --name-only "$range"); do
  if is_test "$f"; then
    tests="$tests $f"
    count=$((count + 1))
  fi
done
for f in $(git diff --name-only --diff-filter=D "$range"); do
  is_test "$f" || src_deleted=1
done

found="$(for f in $tests; do
  if ! git cat-file -e "HEAD:$f" 2>/dev/null; then
    [ "$src_deleted" -eq 0 ] && echo "$f: test file deleted with no source file deleted"
    continue
  fi
  d="$(git diff "$range" -- "$f")"
  printf '%s\n' "$d" | grep -E '^\+.*(\.skip\(|\.only\(|\bxit\(|\bxdescribe\(|\bxtest\(|\.todo\(|pytest\.mark\.skip|@skip\b)' \
    | sed "s|^+|$f: skip/only added: |" || true
  removed="$(printf '%s\n' "$d" | grep -cE '^-.*(expect\(|\bassert\b|assert_|\.should\b)' || true)"
  added="$(printf '%s\n' "$d" | grep -cE '^\+.*(expect\(|\bassert\b|assert_|\.should\b)' || true)"
  [ "$removed" -gt "$added" ] && echo "$f: assertions removed ($removed removed, $added added)"
  exact="$(printf '%s\n' "$d" | grep -E '^-.*(toBe\(|toEqual\(|toStrictEqual\(|toHaveLength\(|toMatchObject\()' | subjects || true)"
  loose="$(printf '%s\n' "$d" | grep -E '^\+.*(toBeTruthy\(|toBeDefined\(|toBeFalsy\(|not\.toBeNull\(|toBeInstanceOf\()' | subjects || true)"
  if [ -n "$exact" ] && [ -n "$loose" ] \
     && [ -n "$(comm -12 <(printf '%s\n' "$exact") <(printf '%s\n' "$loose"))" ]; then
    echo "$f: matcher widened (exact matcher removed, loose matcher added)"
  fi
  printf '%s\n' "$d" | grep -E '^\+.*(@ts-(ignore|expect-error)|eslint-disable|# *noqa|# *type: *ignore)' \
    | sed "s|^+|$f: suppression added: |" || true
done)"

if [ -n "$found" ]; then
  printf '%s\n' "$found"
else
  echo "test-weakening.sh: nothing found in $range, $count test files read" >&2
fi
exit 0

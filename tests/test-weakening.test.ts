// Behaviour of scripts/test-weakening.sh on a real range. Each case is a
// throwaway git repo with a base commit and a work commit, built the way
// tests/tier.test.ts builds its own. Stdout is what ci.yml reads as "tests
// weakened", so a clean run keeps it empty and says what it read on stderr.
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const script = join(root, 'scripts/test-weakening.sh')

type Files = Record<string, string>

function write(dir: string, files: Files): void {
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  }
}

function git(dir: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' })
}

function weakening(
  base: Files,
  work: Files,
): { status: number | null; stdout: string; stderr: string; base: string } {
  const dir = mkdtempSync(join(tmpdir(), 'weakening-'))
  git(dir, 'init', '-b', 'main', '-q')
  git(dir, 'config', 'user.email', 'weakening@test')
  git(dir, 'config', 'user.name', 'weakening')
  write(dir, base)
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'base')
  const sha = git(dir, 'rev-parse', 'HEAD').trim()

  write(dir, work)
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'work')

  const run = spawnSync(script, [sha], { cwd: dir, encoding: 'utf8' })
  return {
    status: run.status,
    stdout: run.stdout,
    stderr: run.stderr,
    base: sha,
  }
}

// The skipped call is assembled, so this file does not carry the literal the
// script looks for and its own PR is not read as a test that skips.
const skipped = ['it', 'skip'].join('.')

const test =
  "import { it, expect } from 'vitest'\nit('a', () => {\n  expect(1).toBe(1)\n})\n"

describe('test-weakening.sh, what it says', () => {
  it('names the range and zero test files when the range touches no test', () => {
    const run = weakening(
      { 'src/a.ts': 'export const a = 1\n' },
      { 'src/a.ts': 'export const a = 2\n' },
    )
    expect(run.status).toBe(0)
    expect(run.stdout).toBe('')
    expect(run.stderr).toBe(
      `test-weakening.sh: nothing found in ${run.base}...HEAD, 0 test files read\n`,
    )
  })

  it('names the range and the test files it read when it finds nothing', () => {
    const run = weakening(
      { 'src/a.test.ts': test },
      { 'src/a.test.ts': test.replace('})\n', '  expect(2).toBe(2)\n})\n') },
    )
    expect(run.status).toBe(0)
    expect(run.stdout).toBe('')
    expect(run.stderr).toBe(
      `test-weakening.sh: nothing found in ${run.base}...HEAD, 1 test files read\n`,
    )
  })

  it('keeps the finding on stdout and prints no stderr line', () => {
    const run = weakening(
      { 'src/a.test.ts': test },
      { 'src/a.test.ts': test.replace("it('a'", `${skipped}('a'`) },
    )
    expect(run.status).toBe(0)
    expect(run.stdout).toBe(
      `src/a.test.ts: skip/only added: ${skipped}('a', () => {\n`,
    )
    expect(run.stderr).toBe('')
  })
})

// Behaviour of scripts/prose.sh, the gate on the prose: an em dash in a line
// the diff adds fails the commit and the CI, so the judge never has to read
// for style. Each case is a throwaway git repo; the dash is written as an
// escape so this file passes its own gate.
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const script = resolve(import.meta.dirname, '../scripts/prose.sh')
const dash = '\u2014'

function git(dir: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' })
}

function repo(base: Record<string, string> = { 'README.md': 'clean\n' }): {
  dir: string
  sha: string
} {
  const dir = mkdtempSync(join(tmpdir(), 'prose-'))
  git(dir, 'init', '-b', 'main', '-q')
  git(dir, 'config', 'user.email', 'prose@test')
  git(dir, 'config', 'user.name', 'prose')
  write(dir, base)
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'base')
  return { dir, sha: git(dir, 'rev-parse', 'HEAD').trim() }
}

function write(dir: string, files: Record<string, string | Buffer>): void {
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true })
    writeFileSync(join(dir, name), content)
  }
}

function prose(
  dir: string,
  ...args: string[]
): { status: number | null; out: string } {
  const run = spawnSync(script, args, { cwd: dir, encoding: 'utf8' })
  return { status: run.status, out: `${run.stdout}${run.stderr}` }
}

describe('prose.sh on a range', () => {
  it('fails on an em dash in a line the diff adds, naming file and line', () => {
    const { dir, sha } = repo()
    write(dir, { 'docs/x.md': `first\nsecond ${dash} third\n` })
    git(dir, 'add', '-A')
    git(dir, 'commit', '-q', '-m', 'work')
    const run = prose(dir, sha)
    expect(run.status).toBe(1)
    expect(run.out).toMatch(/docs\/x\.md:2/)
  })

  it('passes a clean diff', () => {
    const { dir, sha } = repo()
    write(dir, { 'docs/x.md': 'first, second: third\n' })
    git(dir, 'add', '-A')
    git(dir, 'commit', '-q', '-m', 'work')
    expect(prose(dir, sha).status).toBe(0)
  })

  it('ignores files that are not text', () => {
    const { dir, sha } = repo()
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]),
      Buffer.from(dash, 'utf8'),
      Buffer.from([0x00, 0xff]),
    ])
    write(dir, { 'img.png': png })
    git(dir, 'add', '-A')
    git(dir, 'commit', '-q', '-m', 'work')
    expect(prose(dir, sha).status).toBe(0)
  })

  it('looks at the lines the diff adds, not at the past of the file', () => {
    const { dir, sha } = repo({ 'README.md': `old ${dash} line\n` })
    write(dir, { 'README.md': `old ${dash} line\nnew clean line\n` })
    git(dir, 'add', '-A')
    git(dir, 'commit', '-q', '-m', 'work')
    expect(prose(dir, sha).status).toBe(0)
  })

  it('leaves the review log alone: verdicts are data', () => {
    const { dir, sha } = repo()
    write(dir, {
      'docs/review-log/verdicts.jsonl': `{"reason":"a ${dash} b"}\n`,
    })
    git(dir, 'add', '-A')
    git(dir, 'commit', '-q', '-m', 'work')
    expect(prose(dir, sha).status).toBe(0)
  })
})

describe('prose.sh under a different git configuration', () => {
  it('still reads the diff with diff.noprefix on', () => {
    const { dir, sha } = repo()
    git(dir, 'config', 'diff.noprefix', 'true')
    write(dir, { 'docs/x.md': `a ${dash} b\n` })
    git(dir, 'add', '-A')
    git(dir, 'commit', '-q', '-m', 'work')
    const run = prose(dir, sha)
    expect(run.status).toBe(1)
    expect(run.out).toMatch(/docs\/x\.md:1/)
  })

  it('still reads the staged diff with diff.mnemonicPrefix on', () => {
    const { dir } = repo()
    git(dir, 'config', 'diff.mnemonicPrefix', 'true')
    write(dir, { 'notes.md': `a ${dash} b\n` })
    git(dir, 'add', '-A')
    const run = prose(dir, '--staged')
    expect(run.status).toBe(1)
    expect(run.out).toMatch(/notes\.md:1/)
  })

  it('does not mistake an added line that starts with ++ b/ for a file header', () => {
    const { dir, sha } = repo()
    write(dir, { 'docs/x.md': `ok\n++ b/other.md\nx ${dash} y\n` })
    git(dir, 'add', '-A')
    git(dir, 'commit', '-q', '-m', 'work')
    const run = prose(dir, sha)
    expect(run.status).toBe(1)
    expect(run.out).toMatch(/^docs\/x\.md:3:/m)
  })
})

describe('prose.sh --staged', () => {
  it('fails on an em dash in the staged changes', () => {
    const { dir } = repo()
    write(dir, { 'notes.md': `a ${dash} b\n` })
    git(dir, 'add', '-A')
    const run = prose(dir, '--staged')
    expect(run.status).toBe(1)
    expect(run.out).toMatch(/notes\.md:1/)
  })

  it('passes clean staged changes', () => {
    const { dir } = repo()
    write(dir, { 'notes.md': 'a, b\n' })
    git(dir, 'add', '-A')
    expect(prose(dir, '--staged').status).toBe(0)
  })
})

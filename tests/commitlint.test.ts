// Behaviour of scripts/commitlint.sh, the commit-msg hook of every repo that
// runs the harness. The script is run as a process on a message file, the way
// git runs it, so the test covers the shell, not a port of its regex.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const script = resolve(import.meta.dirname, '../scripts/commitlint.sh')

function lint(message: string): { ok: boolean; stderr: string } {
  const file = join(
    mkdtempSync(join(tmpdir(), 'commitlint-')),
    'COMMIT_EDITMSG',
  )
  writeFileSync(file, message)
  try {
    execFileSync(script, ['--file', file], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { ok: true, stderr: '' }
  } catch (error) {
    const { stderr } = error as { stderr: Buffer }
    return { ok: false, stderr: stderr.toString() }
  }
}

function git(dir: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' })
}

// The other caller, the one CI runs: the subject comes from `git log`, not
// from a file, so a throwaway repo with one commit is the only way to reach
// it. One regex for both, and this is the proof that it is one.
function lintRange(subject: string): { ok: boolean; stderr: string } {
  const dir = mkdtempSync(join(tmpdir(), 'commitlint-range-'))
  git(dir, 'init', '-b', 'main', '-q')
  git(dir, 'config', 'user.email', 'commitlint@test')
  git(dir, 'config', 'user.name', 'commitlint')
  git(dir, 'commit', '-q', '--allow-empty', '-m', 'chore: base')
  const base = git(dir, 'rev-parse', 'HEAD').trim()
  git(dir, 'commit', '-q', '--allow-empty', '-m', subject)
  try {
    execFileSync(script, ['--range', `${base}..HEAD`], {
      cwd: dir,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { ok: true, stderr: '' }
  } catch (error) {
    const { stderr } = error as { stderr: Buffer }
    return { ok: false, stderr: stderr.toString() }
  }
}

// The script as a process, with whatever arguments a case wants: the usage
// line is reached only by a mode the script does not know.
function run(...args: string[]): { ok: boolean; stderr: string } {
  try {
    execFileSync(script, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    return { ok: true, stderr: '' }
  } catch (error) {
    const { stderr } = error as { stderr: Buffer }
    return { ok: false, stderr: stderr.toString() }
  }
}

// The third caller, the one CI runs on the title of the PR: both merges
// squash, so the subject that lands on the default branch is that title and
// no commit of the branch is. It arrives whole, as one argument.
function lintSubject(...args: string[]): { ok: boolean; stderr: string } {
  return run('--subject', ...args)
}

describe('commitlint.sh --file', () => {
  it('accepts type(scope): subject with a body', () => {
    expect(
      lint('feat(hooks): refuse commits on main\n\nWhy and what.\n').ok,
    ).toBe(true)
  })

  it('accepts a subject without scope and a merge commit', () => {
    expect(lint('docs: add the codebase map\n').ok).toBe(true)
    expect(lint("Merge branch 'harness/local'\n").ok).toBe(true)
  })

  it('accepts wip locally', () => {
    expect(lint('wip: half done\n').ok).toBe(true)
  })

  it('rejects an uppercase subject with a trailing period', () => {
    const result = lint('Bad message.\n')
    expect(result.ok).toBe(false)
    expect(result.stderr).toContain('bad subject')
  })

  it('accepts a subject that opens with the name of a skill', () => {
    expect(
      lint('docs(board): /board and /next close a line of the inbox\n').ok,
    ).toBe(true)
  })

  it('keeps the lowercase rule, slash or no slash', () => {
    for (const subject of [
      'docs(board): Board first',
      'docs(board): 52 lines',
      'docs(board): /Board first',
    ]) {
      const result = lint(`${subject}\n`)
      expect(result.ok, subject).toBe(false)
      expect(result.stderr, subject).toContain('bad subject')
    }
  })

  it('rejects a slash with no lowercase letter after it', () => {
    for (const subject of ['docs(board): /', 'docs(board): //next twice']) {
      const result = lint(`${subject}\n`)
      expect(result.ok, subject).toBe(false)
      expect(result.stderr, subject).toContain('bad subject')
    }
  })

  it('rejects a trailing period and an unknown type', () => {
    expect(lint('feat: add the thing.\n').ok).toBe(false)
    expect(lint('feature: add the thing\n').ok).toBe(false)
  })

  it('allows 72 characters after the type and rejects the 73rd', () => {
    expect(lint(`chore: ${'x'.repeat(72)}\n`).ok).toBe(true)
    expect(lint(`chore: ${'x'.repeat(73)}\n`).ok).toBe(false)
  })

  it('counts the leading slash in the 72 characters', () => {
    expect(lint(`chore: /${'x'.repeat(71)}\n`).ok).toBe(true)
    expect(lint(`chore: /${'x'.repeat(72)}\n`).ok).toBe(false)
  })

  it('rejects a body that starts on the second line', () => {
    const result = lint('fix: keep the second line blank\nbody right away\n')
    expect(result.ok).toBe(false)
    expect(result.stderr).toContain('second line')
  })

  it('rejects attribution trailers', () => {
    for (const trailer of [
      'Co-Authored-By: Someone <x@y.z>',
      'Claude-Session: https://example.test/s',
      'Generated with a tool',
    ]) {
      const result = lint(`chore: tidy\n\n${trailer}\n`)
      expect(result.ok, trailer).toBe(false)
      expect(result.stderr).toContain('attribution trailers')
    }
  })

  it('says the rule it applies, in the refusal and at the head of the script', () => {
    expect(lint('docs(board): /\n').stderr.split('\n')[1]).toContain('/name')
    const head = readFileSync(script, 'utf8')
      .split('\n')
      .slice(0, 12)
      .join('\n')
    expect(head).toContain('/name')
  })

  it('ignores comment lines, as git does', () => {
    expect(lint('# a comment git strips\nchore: tidy\n# another\n').ok).toBe(
      true,
    )
  })
})

describe('commitlint.sh --range', () => {
  it('accepts a commit whose subject opens with the name of a skill', () => {
    expect(
      lintRange('docs(board): /board and /next close a line of the inbox'),
    ).toEqual({ ok: true, stderr: '' })
  })

  it('refuses a commit whose subject is the slash alone', () => {
    const result = lintRange('docs(board): /')
    expect(result.ok).toBe(false)
    expect(result.stderr).toContain('bad subject')
  })
})

describe('commitlint.sh --subject', () => {
  it('accepts the subject that lands, the squash suffix included', () => {
    expect(
      lintSubject('feat(commitlint): check the title of the pr (#55)'),
    ).toEqual({ ok: true, stderr: '' })
  })

  it('refuses wip, the way --range refuses it', () => {
    const result = lintSubject('wip: half done')
    expect(result.ok).toBe(false)
    expect(result.stderr).toContain('bad subject')
  })

  it('refuses the title GitHub builds from the name of the branch', () => {
    const result = lintSubject('docs/readme onboarding (#54)')
    expect(result.ok).toBe(false)
    expect(result.stderr).toContain('bad subject')
  })

  it('counts the suffix in the 72 characters', () => {
    expect(lintSubject(`chore: ${'x'.repeat(66)} (#55)`).ok).toBe(true)
    expect(lintSubject(`chore: ${'x'.repeat(67)} (#55)`).ok).toBe(false)
  })

  it('refuses a missing or an empty subject', () => {
    for (const args of [[], ['']]) {
      const result = lintSubject(...args)
      expect(result.ok, `[${args.join(',')}]`).toBe(false)
      expect(result.stderr, `[${args.join(',')}]`).toContain('--subject')
    }
  })

  it('names the mode in the usage line and at the head of the script', () => {
    const usage = run('--what').stderr
    for (const mode of ['--file', '--range', '--subject']) {
      expect(usage, mode).toContain(mode)
    }
    const head = readFileSync(script, 'utf8')
      .split('\n')
      .slice(0, 13)
      .join('\n')
    expect(head).toContain('--subject')
  })
})

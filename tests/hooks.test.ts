// Behaviour of the git hooks that guard main, pre-commit and pre-push, and of
// the one exception ADR-0003 gives them: a commit made only of documents goes
// on main when the policy block of .harness/AGENTS.md says
// `"docs_mode": "main"`. Each case is a clone of a throwaway bare origin, with
// core.hooksPath on the hooks of the template, the real .harness/AGENTS.md of
// this repo (or its docs_mode turned to pr, or taken out) and the scripts the
// hooks call.
// `pnpm` is a stub that logs and passes: Prettier and typecheck have their own
// gates, here only the rule on main is under test. Every clone is at its pin,
// `.harness/bin/.sha` equal to the `pin.sha` of `.harness/stamp.json`, unless
// a case moves one of the two.
import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { brokenPolicies, withPolicy } from './agents.js'

const root = resolve(import.meta.dirname, '..')
const templates = join(root, 'skills/harness-init/templates')
const hooks = join(templates, 'githooks')
const agents = readFileSync(join(root, '.harness/AGENTS.md'), 'utf8')
const template = readFileSync(join(templates, 'AGENTS.md'), 'utf8')

// null deletes the file.
type Files = Record<string, string | null>

function git(dir: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim()
}

function write(dir: string, files: Files): void {
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name)
    if (content === null) {
      rmSync(path)
      continue
    }
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  }
}

// AGENTS.md with its docs_mode saying something else, or with the key gone.
function documenti(text: string, value: string | null): string {
  return withPolicy(text, (block) => {
    expect(block.docs_mode, 'the AGENTS.md under test is not on main').toBe(
      'main',
    )
    if (value === null) delete block.docs_mode
    else block.docs_mode = value
  })
}

// The files every case starts from, committed on main and pushed before the
// hooks are switched on: the base is not what is under test.
const pinned = 'b7c8d9e0f1a2b3c4d5e6f708192a3b4c5d6e7f80'
const stamp = (sha: string | null): string =>
  `${JSON.stringify({ harness: 'x', stages: {}, pin: sha === null ? undefined : { origin: 'x', sha, date: '2026-10-04' } })}\n`
const base: Files = {
  '.harness/stamp.json': stamp(pinned),
  '.harness/bin/.sha': `${pinned}\n`,
  '.harness/docs/intent/README.md': 'un file per idea\n',
  '.harness/docs/intent/vecchia.md': '## Problema\n\nuna riga\n',
  'src/app.ts': 'export const app = 1\n',
}

// `file` is where the text of the policy goes: .harness/AGENTS.md, the one
// file the hooks read it from, unless a case puts it where they must not look.
function repo(
  text = agents,
  branch = 'main',
  file = '.harness/AGENTS.md',
): { dir: string; origin: string; top: string } {
  const top = mkdtempSync(join(tmpdir(), 'hooks-'))
  const origin = join(top, 'origin.git')
  const dir = join(top, 'work')
  execFileSync('git', ['init', '--bare', '-q', '-b', branch, origin])
  mkdirSync(dir)
  git(dir, 'init', '-q', '-b', branch)
  git(dir, 'config', 'user.email', 'hooks@test')
  git(dir, 'config', 'user.name', 'hooks')
  write(dir, { [file]: text, ...base })
  for (const script of ['prose.sh', 'commitlint.sh', 'policy-lines.sh']) {
    const path = join(dir, '.harness/bin', script)
    mkdirSync(dirname(path), { recursive: true })
    copyFileSync(join(templates, 'scripts', script), path)
    chmodSync(path, 0o755)
  }
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'chore: base')
  git(dir, 'remote', 'add', 'origin', origin)
  git(dir, 'push', '-q', 'origin', branch)
  git(dir, 'config', 'core.hooksPath', hooks)
  mkdirSync(join(top, 'bin'))
  writeFileSync(
    join(top, 'bin/pnpm'),
    '#!/usr/bin/env bash\nprintf \'%s\\n\' "$*" >> "$PNPM_LOG"\nexit 0\n',
  )
  chmodSync(join(top, 'bin/pnpm'), 0o755)
  return { dir, origin, top }
}

// Git with the hooks on and nothing of the caller's environment that could
// open the gate: HARNESS_ALLOW_MAIN only when a case asks for it.
function run(
  dir: string,
  args: string[],
  env: Record<string, string> = {},
): { status: number | null; stderr: string } {
  const top = dirname(dir)
  const result = spawnSync('git', args, {
    cwd: dir,
    encoding: 'utf8',
    env: {
      PATH: `${join(top, 'bin')}:${process.env.PATH}`,
      HOME: process.env.HOME ?? top,
      PNPM_LOG: join(top, 'pnpm.log'),
      ...env,
    },
  })
  return { status: result.status, stderr: result.stderr }
}

function commit(
  dir: string,
  files: Files,
  message = 'docs(intent): nuova',
  env: Record<string, string> = {},
): { status: number | null; stderr: string } {
  write(dir, files)
  git(dir, 'add', '-A')
  return run(dir, ['commit', '-q', '-m', message], env)
}

const allow = { HARNESS_ALLOW_MAIN: '1' }
const intent = { '.harness/docs/intent/nuova.md': '## Problema\n\ndue righe\n' }

describe('pre-commit on main, with docs_mode main', () => {
  it('lets a commit of documents through', () => {
    const { dir } = repo()
    const before = git(dir, 'rev-parse', 'HEAD')
    const result = commit(dir, intent)
    expect(result.status, result.stderr).toBe(0)
    expect(git(dir, 'rev-parse', 'HEAD^')).toBe(before)
    expect(git(dir, 'show', '--name-only', '--format=', 'HEAD')).toBe(
      '.harness/docs/intent/nuova.md',
    )
  })

  // S88: the documents moved under .harness/docs/, and the old place is
  // code like any other path.
  it('lets a commit of a slice under .harness/docs/backlog/ through', () => {
    const { dir } = repo()
    const result = commit(
      dir,
      { '.harness/docs/backlog/S01-x.md': '---\nid: S01\n---\n' },
      'docs(backlog): s01',
    )
    expect(result.status, result.stderr).toBe(0)
  })

  it('refuses a slice left under docs/backlog/', () => {
    const { dir } = repo()
    const result = commit(
      dir,
      { 'docs/backlog/S01-x.md': '---\nid: S01\n---\n' },
      'docs(backlog): s01',
    )
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('docs/backlog/S01-x.md')
  })

  it('lets a deletion of a document through', () => {
    const { dir } = repo()
    const result = commit(dir, { '.harness/docs/intent/vecchia.md': null })
    expect(result.status, result.stderr).toBe(0)
  })

  // This repo widens the documents with docs_extra_paths: here the prose of
  // the skills is a document too (ADR-0003, decision 4).
  it.each(['skills/judge/SKILL.md', '.harness/docs/parked.md', 'docs/spec.md'])(
    'lets %s through, a path of docs_extra_paths',
    (file) => {
      const { dir } = repo()
      const result = commit(dir, { [file]: 'prosa\n' }, 'docs(harness): prosa')
      expect(result.status, result.stderr).toBe(0)
    },
  )

  it('refuses a commit with one file outside, naming it', () => {
    const { dir } = repo()
    const before = git(dir, 'rev-parse', 'HEAD')
    const result = commit(dir, {
      ...intent,
      'src/app.ts': 'export const app = 2\n',
    })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('no commits on main')
    expect(result.stderr).toContain('src/app.ts')
    expect(git(dir, 'rev-parse', 'HEAD')).toBe(before)
  })

  it('counts a deletion outside the paths as a file outside', () => {
    const { dir } = repo()
    const result = commit(dir, { 'src/app.ts': null })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('src/app.ts')
  })

  // Without renames a move shows both names, and the new one is out.
  it('reads a move out of the paths under its new name', () => {
    const { dir } = repo()
    git(dir, 'mv', '.harness/docs/intent/vecchia.md', 'src/vecchia.md')
    const result = run(dir, ['commit', '-q', '-m', 'docs(intent): sposta'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('src/vecchia.md')
  })

  // The reading of tier.sh: a name is read whole, spaces and all, and a name
  // git prints quoted no longer looks like the name it is, so it is outside.
  it('reads a name with spaces as the name it is', () => {
    const { dir } = repo()
    const result = commit(dir, {
      '.harness/docs/intent/an idea.md': 'a line\n',
    })
    expect(result.status, result.stderr).toBe(0)
  })

  it('refuses a name git prints quoted', () => {
    const { dir } = repo()
    const result = commit(dir, { '.harness/docs/intent/a"b.md': 'riga\n' })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('.harness/docs/intent/a')
  })

  // The rules are the ones at HEAD, the base of a commit on main. A commit
  // that rewrites them is not a document, and an AGENTS.md edited and left
  // unstaged does not widen them either.
  it('reads the rules at HEAD, not the ones the commit brings', () => {
    const { dir } = repo()
    const widened = withPolicy(agents, (block) => {
      block.human_gate_paths = [
        ...(block.human_gate_paths as string[]),
        'src/**',
      ]
    })
    const staged = commit(dir, {
      '.harness/AGENTS.md': widened,
      'src/app.ts': 'export const app = 2\n',
    })
    expect(staged.status).not.toBe(0)
    expect(staged.stderr).toContain('.harness/AGENTS.md')
    git(dir, 'reset', '-q', '--hard')
    write(dir, {
      '.harness/AGENTS.md': widened,
      'src/app.ts': 'export const app = 3\n',
    })
    git(dir, 'add', 'src/app.ts')
    const unstaged = run(dir, ['commit', '-q', '-m', 'fix(app): tre'])
    expect(unstaged.status).not.toBe(0)
    expect(unstaged.stderr).toContain('src/app.ts')
  })

  // The contracts are never documents, wherever they sit: Claude Code loads an
  // AGENTS.md or a CLAUDE.md at any depth and follows it, and tier.sh never
  // puts one at tier 0 for that reason. Under a human-gate path the pattern
  // alone would let one onto main with no PR and no judge.
  it.each([
    '.harness/docs/intent/CLAUDE.md',
    '.harness/docs/backlog/x/AGENTS.md',
    '.harness/docs/specs/.claude/settings.json',
  ])('refuses %s, a contract under a document path', (file) => {
    const { dir } = repo()
    const result = commit(dir, { [file]: 'regole\n' })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain(file)
  })

  it('refuses an empty commit: nothing staged is not a document', () => {
    const { dir } = repo()
    const result = run(dir, [
      'commit',
      '-q',
      '--allow-empty',
      '-m',
      'docs(intent): niente',
    ])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('no commits on main')
  })

  it('runs the rest of the hook on the documents it lets through', () => {
    const { dir, top } = repo()
    expect(commit(dir, intent).status).toBe(0)
    const log = readFileSync(join(top, 'pnpm.log'), 'utf8')
    expect(log).toContain('exec prettier --check')
    expect(log).toContain('typecheck')
  })

  // The template's docs_extra_paths is empty: there the documents are exactly
  // human_gate_paths.
  it('with the template AGENTS.md, the documents are the human-gate paths', () => {
    const { dir } = repo(template)
    expect(commit(dir, { '.harness/docs/specs/SPEC-x.md': 'x\n' }).status).toBe(
      0,
    )
    const skill = commit(
      dir,
      { 'skills/judge/SKILL.md': 'x\n' },
      'docs(harness): skill',
    )
    expect(skill.status).not.toBe(0)
    expect(skill.stderr).toContain('skills/judge/SKILL.md')
  })
})

describe('pre-commit on main, without docs_mode main', () => {
  it.each([
    ['pr', documenti(agents, 'pr')],
    ['no docs_mode key', documenti(agents, null)],
    ['a value it does not know', documenti(agents, 'forse')],
  ])('%s: refuses a commit of documents as it always did', (_, text) => {
    const { dir } = repo(text)
    const before = git(dir, 'rev-parse', 'HEAD')
    const result = commit(dir, intent)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('no commits on main')
    expect(git(dir, 'rev-parse', 'HEAD')).toBe(before)
  })

  // S40. A block that cannot be read used to fall back to pr, which refused
  // the commit for a reason that was not the true one. Now main stays closed
  // on all four faults, which is the rule this hook's own comment writes, and
  // the message says which fault it is and what puts the block back.
  it.each(brokenPolicies(agents))(
    '$name: refuses a commit of documents and names the fault',
    ({ agents: broken, fault }) => {
      const { dir } = repo(broken)
      const before = git(dir, 'rev-parse', 'HEAD')
      const result = commit(dir, intent)
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('no commits on main')
      expect(result.stderr).toMatch(fault)
      expect(result.stderr).toContain('/harness-init local')
      expect(git(dir, 'rev-parse', 'HEAD')).toBe(before)
    },
  )

  // S86. The block lives in .harness/AGENTS.md and nowhere else: a valid one
  // left in the root AGENTS.md is a block that cannot be read, not a fallback.
  it('a block in the root AGENTS.md alone keeps main closed and names .harness/AGENTS.md', () => {
    const { dir } = repo(agents, 'main', 'AGENTS.md')
    const before = git(dir, 'rev-parse', 'HEAD')
    const result = commit(dir, intent)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('no commits on main')
    expect(result.stderr).toContain('.harness/AGENTS.md')
    expect(result.stderr).toContain('/harness-init local')
    expect(git(dir, 'rev-parse', 'HEAD')).toBe(before)
  })
})

describe('pre-commit: what it always did', () => {
  it.each(['main', 'master'])('refuses code on %s', (branch) => {
    const { dir } = repo(agents, branch)
    const result = commit(
      dir,
      { 'src/app.ts': 'export const app = 2\n' },
      'fix(app): due',
    )
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain(`no commits on ${branch}`)
  })

  it('lets documents through on master too', () => {
    const { dir } = repo(agents, 'master')
    expect(commit(dir, intent).status).toBe(0)
  })

  it('lets code through on main with HARNESS_ALLOW_MAIN=1', () => {
    const { dir } = repo()
    const result = commit(
      dir,
      { 'src/app.ts': 'export const app = 2\n' },
      'fix(app): due',
      allow,
    )
    expect(result.status, result.stderr).toBe(0)
  })

  it('lets code through on a slice branch', () => {
    const { dir } = repo()
    git(dir, 'switch', '-q', '-c', 'slice/S01-x')
    const result = commit(
      dir,
      { 'src/app.ts': 'export const app = 2\n' },
      'fix(app): due',
    )
    expect(result.status, result.stderr).toBe(0)
  })
})

describe('pre-push to main', () => {
  function pushed(origin: string, branch = 'main'): string {
    return git(origin, 'rev-parse', `refs/heads/${branch}`)
  }

  it('with docs_mode main, lets a range of documents through', () => {
    const { dir, origin } = repo()
    expect(commit(dir, intent).status).toBe(0)
    expect(
      commit(
        dir,
        { '.harness/docs/parked.md': '- riga\n' },
        'docs(parked): riga',
      ).status,
    ).toBe(0)
    const result = run(dir, ['push', '-q', 'origin', 'main'])
    expect(result.status, result.stderr).toBe(0)
    expect(pushed(origin)).toBe(git(dir, 'rev-parse', 'HEAD'))
  })

  it('refuses a range with one file outside, naming it', () => {
    const { dir, origin } = repo()
    const before = pushed(origin)
    expect(commit(dir, intent).status).toBe(0)
    expect(
      commit(
        dir,
        { 'src/app.ts': 'export const app = 2\n' },
        'fix(app): due',
        allow,
      ).status,
    ).toBe(0)
    const result = run(dir, ['push', '-q', 'origin', 'main'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('no direct push to main')
    expect(result.stderr).toContain('src/app.ts')
    expect(pushed(origin)).toBe(before)
  })

  // Every file a commit of the range touched, not the net diff: a file added
  // and removed again was on main for a commit.
  it('reads every commit of the range, not the net diff', () => {
    const { dir, origin } = repo()
    const before = pushed(origin)
    expect(
      commit(dir, { 'src/tmp.ts': 'x\n' }, 'fix(app): tmp', allow).status,
    ).toBe(0)
    expect(
      commit(dir, { 'src/tmp.ts': null }, 'fix(app): via', allow).status,
    ).toBe(0)
    const result = run(dir, ['push', '-q', 'origin', 'main'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('src/tmp.ts')
    expect(pushed(origin)).toBe(before)
  })

  // The rules come from main as the remote has it: a commit of the range
  // that widens them is a file outside, and the widening never counts.
  it('reads the rules at the remote main, not in the range', () => {
    const { dir, origin } = repo()
    const before = pushed(origin)
    const widened = withPolicy(agents, (block) => {
      block.human_gate_paths = [
        ...(block.human_gate_paths as string[]),
        'src/**',
      ]
    })
    expect(
      commit(
        dir,
        { '.harness/AGENTS.md': widened },
        'docs(harness): allarga',
        allow,
      ).status,
    ).toBe(0)
    expect(
      commit(dir, { 'src/app.ts': 'export const app = 2\n' }, 'fix(app): due')
        .status,
    ).toBe(0)
    const result = run(dir, ['push', '-q', 'origin', 'main'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('.harness/AGENTS.md')
    expect(pushed(origin)).toBe(before)
  })

  it('refuses a contract under a document path in the range', () => {
    const { dir, origin } = repo()
    const before = pushed(origin)
    expect(
      commit(
        dir,
        { '.harness/docs/intent/CLAUDE.md': 'regole\n' },
        'docs(intent): regole',
        allow,
      ).status,
    ).toBe(0)
    const result = run(dir, ['push', '-q', 'origin', 'main'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('.harness/docs/intent/CLAUDE.md')
    expect(pushed(origin)).toBe(before)
  })

  it('refuses a push from another branch onto main', () => {
    const { dir, origin } = repo()
    const before = pushed(origin)
    git(dir, 'switch', '-q', '-c', 'slice/S01-x')
    expect(
      commit(dir, { 'src/app.ts': 'export const app = 2\n' }, 'fix(app): due')
        .status,
    ).toBe(0)
    const result = run(dir, ['push', '-q', 'origin', 'slice/S01-x:main'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('src/app.ts')
    expect(pushed(origin)).toBe(before)
  })

  // A forced push rewrites what the remote has: there is no range to read.
  it('refuses a push that rewrites main', () => {
    const { dir, origin } = repo()
    expect(commit(dir, intent).status).toBe(0)
    expect(run(dir, ['push', '-q', 'origin', 'main']).status).toBe(0)
    const before = pushed(origin)
    git(dir, 'reset', '-q', '--hard', 'HEAD^')
    expect(
      commit(
        dir,
        { '.harness/docs/intent/altra.md': 'x\n' },
        'docs(intent): altra',
      ).status,
    ).toBe(0)
    const result = run(dir, ['push', '-q', '--force', 'origin', 'main'])
    expect(result.status).not.toBe(0)
    expect(pushed(origin)).toBe(before)
  })

  it.each([
    ['pr', documenti(agents, 'pr')],
    ['no docs_mode key', documenti(agents, null)],
  ])('%s: refuses a push of documents as it always did', (_, text) => {
    const { dir, origin } = repo(text)
    const before = pushed(origin)
    expect(commit(dir, intent, 'docs(intent): nuova', allow).status).toBe(0)
    const result = run(dir, ['push', '-q', 'origin', 'main'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('no direct push to main')
    expect(pushed(origin)).toBe(before)
  })

  // S40, the twin of the pre-commit case: the same four faults, main closed,
  // the fault named. The commit goes in with HARNESS_ALLOW_MAIN, because what
  // is under test here is the push.
  it.each(brokenPolicies(agents))(
    '$name: refuses a push of documents and names the fault',
    ({ agents: broken, fault }) => {
      const { dir, origin } = repo(broken)
      const before = pushed(origin)
      expect(commit(dir, intent, 'docs(intent): nuova', allow).status).toBe(0)
      const result = run(dir, ['push', '-q', 'origin', 'main'])
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('no direct push to main')
      expect(result.stderr).toMatch(fault)
      expect(result.stderr).toContain('/harness-init local')
      expect(pushed(origin)).toBe(before)
    },
  )

  it('a block in the root AGENTS.md alone keeps main closed and names .harness/AGENTS.md', () => {
    const { dir, origin } = repo(agents, 'main', 'AGENTS.md')
    const before = pushed(origin)
    expect(commit(dir, intent, 'docs(intent): nuova', allow).status).toBe(0)
    const result = run(dir, ['push', '-q', 'origin', 'main'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('no direct push to main')
    expect(result.stderr).toContain('.harness/AGENTS.md')
    expect(result.stderr).toContain('/harness-init local')
    expect(pushed(origin)).toBe(before)
  })

  it('lets code through with HARNESS_ALLOW_MAIN=1', () => {
    const { dir, origin } = repo()
    expect(
      commit(
        dir,
        { 'src/app.ts': 'export const app = 2\n' },
        'fix(app): due',
        allow,
      ).status,
    ).toBe(0)
    const result = run(dir, ['push', '-q', 'origin', 'main'], allow)
    expect(result.status, result.stderr).toBe(0)
    expect(pushed(origin)).toBe(git(dir, 'rev-parse', 'HEAD'))
  })

  it('lets any branch that is not main through', () => {
    const { dir, origin } = repo()
    git(dir, 'switch', '-q', '-c', 'slice/S01-x')
    expect(
      commit(dir, { 'src/app.ts': 'export const app = 2\n' }, 'fix(app): due')
        .status,
    ).toBe(0)
    const result = run(dir, ['push', '-q', 'origin', 'slice/S01-x'])
    expect(result.status, result.stderr).toBe(0)
    expect(pushed(origin, 'slice/S01-x')).toBe(git(dir, 'rev-parse', 'HEAD'))
  })

  it.each(['master'])('guards %s the same way', (branch) => {
    const { dir, origin } = repo(agents, branch)
    const before = pushed(origin, branch)
    expect(
      commit(
        dir,
        { 'src/app.ts': 'export const app = 2\n' },
        'fix(app): due',
        allow,
      ).status,
    ).toBe(0)
    const result = run(dir, ['push', '-q', 'origin', branch])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain(`no direct push to ${branch}`)
    expect(pushed(origin, branch)).toBe(before)
  })
})

// S87. A clone whose .harness/bin is not at the pin of the stamp commits
// under rules the others no longer have: the three hooks refuse, first, with
// one line that says to run the bootstrap. Each hook runs here as a process
// on its own, so the one under test is the one that answers.
describe('a clone off the pin', () => {
  function hook(
    dir: string,
    name: string,
    args: string[],
    env: Record<string, string> = {},
    input = '',
  ): { status: number | null; stderr: string } {
    const top = dirname(dir)
    const result = spawnSync(join(hooks, name), args, {
      cwd: dir,
      encoding: 'utf8',
      input,
      env: {
        PATH: `${join(top, 'bin')}:${process.env.PATH}`,
        HOME: process.env.HOME ?? top,
        PNPM_LOG: join(top, 'pnpm.log'),
        ...env,
      },
    })
    return { status: result.status, stderr: result.stderr }
  }

  // Code on main, a message commitlint accepts, a push to main: every other
  // check would have its own say, so a lone line about the bootstrap is the
  // pin answering first.
  function all(
    dir: string,
    top: string,
    env: Record<string, string> = {},
  ): Array<[string, { status: number | null; stderr: string }]> {
    write(dir, { 'src/app.ts': 'export const app = 2\n' })
    git(dir, 'add', '-A')
    const message = join(top, 'message')
    writeFileSync(message, 'fix(app): due\n')
    const head = git(dir, 'rev-parse', 'HEAD')
    return [
      ['pre-commit', hook(dir, 'pre-commit', [], env)],
      ['commit-msg', hook(dir, 'commit-msg', [message], env)],
      [
        'pre-push',
        hook(
          dir,
          'pre-push',
          ['origin', join(top, 'origin.git')],
          env,
          `refs/heads/main ${head} refs/heads/main ${'0'.repeat(40)}\n`,
        ),
      ],
    ]
  }

  function refused(
    results: Array<[string, { status: number | null; stderr: string }]>,
  ): void {
    for (const [name, result] of results) {
      expect(result.status, `${name} let it through`).not.toBe(0)
      const lines = result.stderr.trim().split('\n')
      expect(lines, `${name}: ${result.stderr}`).toHaveLength(1)
      expect(lines[0], name).toContain('.harness/bootstrap.sh')
    }
  }

  it('a marker that is not the pin: the three hooks refuse and name the bootstrap', () => {
    const { dir, top } = repo()
    write(dir, { '.harness/bin/.sha': `${'a'.repeat(40)}\n` })
    refused(all(dir, top))
    expect(() => readFileSync(join(top, 'pnpm.log'))).toThrow()
  })

  it('a git commit is refused with the line, and nothing is committed', () => {
    const { dir } = repo()
    git(dir, 'switch', '-q', '-c', 'slice/S01-x')
    const before = git(dir, 'rev-parse', 'HEAD')
    write(dir, { '.harness/bin/.sha': `${'a'.repeat(40)}\n` })
    const result = commit(
      dir,
      { 'src/app.ts': 'export const app = 2\n' },
      'fix(app): due',
    )
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('.harness/bootstrap.sh')
    expect(git(dir, 'rev-parse', 'HEAD')).toBe(before)
  })

  it('no marker: the three hooks refuse', () => {
    const { dir, top } = repo()
    write(dir, { '.harness/bin/.sha': null })
    refused(all(dir, top))
  })

  it('a stamp with no pin.sha: the three hooks refuse', () => {
    const { dir, top } = repo()
    write(dir, { '.harness/stamp.json': stamp(null) })
    refused(all(dir, top))
  })

  it('no stamp at all: the three hooks refuse', () => {
    const { dir, top } = repo()
    write(dir, { '.harness/stamp.json': null })
    refused(all(dir, top))
  })

  it('HARNESS_ALLOW_MAIN=1 does not open it', () => {
    const { dir, top } = repo()
    write(dir, { '.harness/bin/.sha': `${'a'.repeat(40)}\n` })
    refused(all(dir, top, allow))
  })

  it('at the pin, a commit on a slice branch goes through', () => {
    const { dir } = repo()
    git(dir, 'switch', '-q', '-c', 'slice/S01-x')
    const result = commit(
      dir,
      { 'src/app.ts': 'export const app = 2\n' },
      'fix(app): due',
    )
    expect(result.status, result.stderr).toBe(0)
  })

  // The harness repo in miniature, the rule of the bootstrap: no stamp, the
  // template tracked, .harness/bootstrap.sh a tracked link to it and
  // .harness/bin tracked. There is no pin to be off.
  it('in the harness repo, with .harness/bin tracked, no marker is looked for', () => {
    const { dir } = repo()
    const script = 'skills/harness-init/templates/bootstrap.sh'
    mkdirSync(join(dir, dirname(script)), { recursive: true })
    copyFileSync(join(root, script), join(dir, script))
    symlinkSync(`../${script}`, join(dir, '.harness/bootstrap.sh'))
    write(dir, { '.harness/stamp.json': null, '.harness/bin/.sha': null })
    git(dir, 'add', '-A')
    git(dir, '-c', 'core.hooksPath=/dev/null', 'commit', '-q', '-m', 'chore: x')
    git(dir, 'switch', '-q', '-c', 'slice/S01-x')
    const result = commit(
      dir,
      { 'src/app.ts': 'export const app = 2\n' },
      'fix(app): due',
    )
    expect(result.status, result.stderr).toBe(0)
    const pushed = run(dir, ['push', '-q', 'origin', 'slice/S01-x'])
    expect(pushed.status, pushed.stderr).toBe(0)
  })

  // The same tree with a stamp is a project that tracks its .harness/bin, and
  // a tracked .harness/bin counts for nothing there.
  it('a project that tracks .harness/bin is still held to its pin', () => {
    const { dir, top } = repo()
    const script = 'skills/harness-init/templates/bootstrap.sh'
    mkdirSync(join(dir, dirname(script)), { recursive: true })
    copyFileSync(join(root, script), join(dir, script))
    symlinkSync(`../${script}`, join(dir, '.harness/bootstrap.sh'))
    write(dir, { '.harness/bin/.sha': null })
    git(dir, 'add', '-A')
    git(dir, '-c', 'core.hooksPath=/dev/null', 'commit', '-q', '-m', 'chore: x')
    refused(all(dir, top))
  })
})

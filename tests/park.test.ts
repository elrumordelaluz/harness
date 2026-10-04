// Behaviour of .harness/bin/park.sh, the only way a line of docs/parked.md is
// written or taken out: `park.sh <path> "<why>"` checks that the document is
// one the board would pick, an intent no spec names, a draft spec or an
// approved spec no slice names, and adds the dated line; `park.sh resume
// <path>` takes it out. With docs_mode main each verb commits the list alone
// and pushes it, with pr it writes the file and commits nothing. Each case is
// a clone of a throwaway bare origin, as in tests/intent.test.ts; `pnpm exec
// prettier` runs the real Prettier of this repo, and board.sh reads the
// result the way a cold session does.
import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { brokenPolicies, withPolicy } from './agents.js'

const root = resolve(import.meta.dirname, '..')
const bin = join(root, 'tests/fixtures/bin')
const template = readFileSync(
  join(root, 'skills/harness-init/templates/AGENTS.md'),
  'utf8',
)
const parkedTemplate = readFileSync(
  join(root, 'skills/harness-init/templates/docs/parked.md'),
  'utf8',
)
const onMain = withPolicy(template, (block) => {
  block.docs_mode = 'main'
})
const onPr = withPolicy(template, (block) => {
  block.docs_mode = 'pr'
})
const today = execFileSync('date', ['+%Y-%m-%d'], { encoding: 'utf8' }).trim()

type Files = Record<string, string>

function git(dir: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim()
}

function write(dir: string, files: Files): void {
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  }
}

function read(dir: string, name: string): string {
  return readFileSync(join(dir, name), 'utf8')
}

function identity(dir: string): void {
  git(dir, 'config', 'user.email', 'park@test')
  git(dir, 'config', 'user.name', 'park')
}

const filled = [
  '## Problem',
  '',
  'The scoresheet is copied by hand at the end of the game.',
  '',
  '## What success looks like',
  '',
  'At the end of the game a button downloads the PDF of the scoresheet.',
  '',
  '## Out of scope',
  '',
  'Advanced statistics.',
  '',
].join('\n')

function spec(status: string, intent: string): string {
  return [
    '---',
    `status: ${status}`,
    `intent: ${intent}`,
    'date: 2026-09-29',
    '---',
    '',
    '# SPEC: x',
    '',
  ].join('\n')
}

function slice(id: string, specPath: string): string {
  return [
    '---',
    `id: ${id}`,
    `title: a slice of ${specPath}`,
    'status: done',
    'blocked_by: none',
    'tier: 1',
    'human: false',
    `spec: ${specPath}`,
    '---',
    '',
    '## Goal',
    '',
    'x',
    '',
  ].join('\n')
}

// Every state a document can be in, on the default branch of the origin.
const states: Files = {
  'docs/intent/alpha.md': filled,
  'docs/intent/beta.md': filled,
  'docs/specs/SPEC-beta.md': spec('draft', 'docs/intent/beta.md'),
  'docs/intent/gamma.md': filled,
  'docs/specs/SPEC-gamma.md': spec('approved', 'docs/intent/gamma.md'),
  'docs/intent/delta.md': filled,
  'docs/specs/SPEC-delta.md': spec('approved', 'docs/intent/delta.md'),
  'docs/backlog/S01-delta.md': slice('S01', 'docs/specs/SPEC-delta.md'),
  'docs/intent/old.md': filled,
  'docs/specs/SPEC-old.md': spec('superseded', 'docs/intent/old.md'),
  'docs/intent/half.md': filled.replace(
    'At the end of the game a button downloads the PDF of the scoresheet.\n\n',
    '',
  ),
  'docs/intent/renamed.md': filled.replace('## Out of scope', '## Out of'),
  'docs/intent/taken.md': filled,
  'docs/parked.md': `${parkedTemplate}\n- 2026-09-24: docs/intent/taken.md: not now\n`,
}

// A bare origin whose main carries .harness/AGENTS.md, the scripts and
// `base`, and a clone of it to work in, next to a bin with a pnpm that runs
// Prettier. `file` is where the block goes, so a case can put it where the
// script must not look.
function repo(
  base: Files = states,
  agents: string = onMain,
  file = '.harness/AGENTS.md',
): { dir: string; origin: string } {
  const top = mkdtempSync(join(tmpdir(), 'park-'))
  const origin = join(top, 'origin.git')
  const seed = join(top, 'seed')
  const dir = join(top, 'work')
  execFileSync('git', ['init', '--bare', '-q', '-b', 'main', origin])
  mkdirSync(seed)
  git(seed, 'init', '-q', '-b', 'main')
  identity(seed)
  write(seed, {
    [file]: agents,
    'docs/parked.md': parkedTemplate,
    ...base,
  })
  mkdirSync(join(seed, '.harness/bin'), { recursive: true })
  for (const script of ['park.sh', 'policy-lines.sh', 'board.sh']) {
    copyFileSync(
      join(root, '.harness/bin', script),
      join(seed, '.harness/bin', script),
    )
    chmodSync(join(seed, '.harness/bin', script), 0o755)
  }
  git(seed, 'add', '-A')
  git(seed, 'commit', '-q', '-m', 'base')
  git(seed, 'remote', 'add', 'origin', origin)
  git(seed, 'push', '-q', 'origin', 'main')
  execFileSync('git', ['clone', '-q', origin, dir])
  identity(dir)
  write(top, {
    'bin/pnpm': [
      '#!/usr/bin/env bash',
      '[ "$1" = exec ] && [ "$2" = prettier ] || exit 1',
      'shift 2',
      'exec "$PRETTIER" "$@"',
      '',
    ].join('\n'),
  })
  chmodSync(join(top, 'bin/pnpm'), 0o755)
  return { dir, origin }
}

function env(dir: string): NodeJS.ProcessEnv {
  const top = dirname(dir)
  return {
    PATH: `${join(top, 'bin')}:${bin}:${process.env.PATH}`,
    HOME: process.env.HOME ?? top,
    GH_LOG: join(top, 'gh.log'),
    GH_COMMENTS: join(top, 'body.txt'),
    PRETTIER: join(root, 'node_modules/.bin/prettier'),
  }
}

function run(
  dir: string,
  args: string[],
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(join(dir, '.harness/bin/park.sh'), args, {
    cwd: dir,
    encoding: 'utf8',
    env: env(dir),
  })
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  }
}

function board(dir: string): { next: { action: string } } {
  const out = execFileSync(join(dir, '.harness/bin/board.sh'), ['--json'], {
    cwd: dir,
    encoding: 'utf8',
    env: env(dir),
  })
  return JSON.parse(out) as { next: { action: string } }
}

describe('park.sh <path> "<why>", with docs_mode main', () => {
  it.each([
    ['an intent no spec names', 'docs/intent/alpha.md', 'alpha'],
    ['a draft spec', 'docs/specs/SPEC-beta.md', 'beta'],
    ['an approved spec no slice names', 'docs/specs/SPEC-gamma.md', 'gamma'],
  ])('parks %s: one line, one file committed, pushed', (_, path, slug) => {
    const { dir, origin } = repo()
    const before = read(dir, 'docs/parked.md')
    const result = run(dir, [path, 'not wanted yet'])
    expect(result.status, result.stderr).toBe(0)
    const line = `- ${today}: ${path}: not wanted yet`
    expect(read(dir, 'docs/parked.md')).toBe(`${before}${line}\n`)
    expect(git(dir, 'log', '-1', '--format=%s')).toBe(`docs(parked): ${slug}`)
    expect(git(dir, 'show', '--name-only', '--format=', 'HEAD')).toBe(
      'docs/parked.md',
    )
    expect(git(origin, 'rev-parse', 'refs/heads/main')).toBe(
      git(dir, 'rev-parse', 'HEAD'),
    )
    expect(git(dir, 'status', '--porcelain')).toBe('')
  })

  it('adds the line under a list with no line yet, as Prettier leaves it', () => {
    const { dir } = repo({ ...states, 'docs/parked.md': parkedTemplate })
    const result = run(dir, ['docs/intent/alpha.md', 'later'])
    expect(result.status, result.stderr).toBe(0)
    expect(read(dir, 'docs/parked.md')).toBe(
      `${parkedTemplate}\n- ${today}: docs/intent/alpha.md: later\n`,
    )
  })

  it('takes the document out of the next action of the board', () => {
    const { dir } = repo({ 'docs/intent/alpha.md': filled })
    expect(board(dir).next.action).toBe('/spec docs/intent/alpha.md')
    expect(run(dir, ['docs/intent/alpha.md', 'later']).status).toBe(0)
    expect(board(dir).next.action).not.toContain('alpha')
  })
})

describe('park.sh refuses, says why and writes nothing', () => {
  const untracked = 'docs/intent/fresh.md'
  it.each([
    [
      'a path not tracked on the default branch',
      [untracked, 'later'],
      /not tracked on main/,
    ],
    [
      'a path that does not exist',
      ['docs/intent/nowhere.md', 'later'],
      /not tracked on main/,
    ],
    [
      'a path outside docs/intent/ and docs/specs/',
      ['docs/backlog/S01-delta.md', 'later'],
      /only an intent of docs\/intent\/ or a spec of docs\/specs\//,
    ],
    [
      'a path in a folder below docs/intent/',
      ['docs/intent/later/alpha.md', 'later'],
      /only an intent of docs\/intent\/ or a spec of docs\/specs\//,
    ],
    [
      'an intent a spec already names',
      ['docs/intent/beta.md', 'later'],
      /docs\/specs\/SPEC-beta\.md names it/,
    ],
    [
      'an approved spec a slice names',
      ['docs/specs/SPEC-delta.md', 'later'],
      /S01 names it/,
    ],
    [
      'a superseded spec',
      ['docs/specs/SPEC-old.md', 'later'],
      /status superseded/,
    ],
    [
      'an intent with an empty section',
      ['docs/intent/half.md', 'later'],
      /What success looks like/,
    ],
    [
      'an intent with a missing section',
      ['docs/intent/renamed.md', 'later'],
      /Out of scope/,
    ],
    [
      'a path already in docs/parked.md',
      ['docs/intent/taken.md', 'later'],
      /already parked/,
    ],
    ['an empty why', ['docs/intent/alpha.md', ''], /the why is empty/],
    ['a why of blanks', ['docs/intent/alpha.md', '  '], /the why is empty/],
    [
      'a why on two lines',
      ['docs/intent/alpha.md', 'one\ntwo'],
      /the why is one line/,
    ],
    ['no why at all', ['docs/intent/alpha.md'], /the why is empty/],
  ])('%s', (_, args, message) => {
    const { dir, origin } = repo()
    write(dir, { [untracked]: filled })
    const before = git(origin, 'rev-parse', 'refs/heads/main')
    const result = run(dir, args)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toMatch(message)
    expect(git(dir, 'status', '--porcelain')).toBe(`?? ${untracked}`)
    expect(git(dir, 'rev-parse', 'HEAD')).toBe(before)
    expect(git(origin, 'rev-parse', 'refs/heads/main')).toBe(before)
  })

  it.each(brokenPolicies(template))(
    '$name: stops and names the fault',
    ({ agents: broken, fault }) => {
      const { dir, origin } = repo(states, broken)
      const before = git(origin, 'rev-parse', 'refs/heads/main')
      const result = run(dir, ['docs/intent/alpha.md', 'later'])
      expect(result.status).not.toBe(0)
      expect(result.stderr).toMatch(fault)
      expect(git(dir, 'status', '--porcelain')).toBe('')
      expect(git(origin, 'rev-parse', 'refs/heads/main')).toBe(before)
    },
  )

  // S86. A valid block in the root AGENTS.md alone is no block.
  it('a block in the root AGENTS.md alone stops it and names .harness/AGENTS.md', () => {
    const { dir, origin } = repo(states, onMain, 'AGENTS.md')
    const before = git(origin, 'rev-parse', 'refs/heads/main')
    const result = run(dir, ['docs/intent/alpha.md', 'later'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('.harness/AGENTS.md')
    expect(result.stderr).toMatch(/no policy block/)
    expect(git(dir, 'status', '--porcelain')).toBe('')
    expect(git(origin, 'rev-parse', 'refs/heads/main')).toBe(before)
  })

  it('refuses to run off the default branch with docs_mode main', () => {
    const { dir, origin } = repo()
    git(dir, 'switch', '-q', '-c', 'slice/S02-x')
    const before = git(origin, 'rev-parse', 'refs/heads/main')
    const result = run(dir, ['docs/intent/alpha.md', 'later'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('run it from main')
    expect(git(dir, 'status', '--porcelain')).toBe('')
    expect(git(origin, 'rev-parse', 'refs/heads/main')).toBe(before)
  })

  it('refuses a main that carries a commit origin does not have', () => {
    const { dir, origin } = repo()
    write(dir, { 'notes.md': 'x\n' })
    git(dir, 'add', 'notes.md')
    git(dir, 'commit', '-q', '-m', 'notes')
    const before = git(origin, 'rev-parse', 'refs/heads/main')
    const result = run(dir, ['docs/intent/alpha.md', 'later'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('notes.md')
    expect(git(dir, 'log', '-1', '--format=%s')).toBe('notes')
    expect(git(origin, 'rev-parse', 'refs/heads/main')).toBe(before)
  })
})

describe('park.sh with docs_mode pr', () => {
  it('writes the line and commits nothing', () => {
    const { dir, origin } = repo(states, onPr)
    const head = git(dir, 'rev-parse', 'HEAD')
    const before = read(dir, 'docs/parked.md')
    const result = run(dir, ['docs/intent/alpha.md', 'later'])
    expect(result.status, result.stderr).toBe(0)
    expect(read(dir, 'docs/parked.md')).toBe(
      `${before}- ${today}: docs/intent/alpha.md: later\n`,
    )
    expect(result.stdout).toContain('travels on a PR')
    expect(git(dir, 'rev-parse', 'HEAD')).toBe(head)
    expect(git(origin, 'rev-parse', 'refs/heads/main')).toBe(head)
    expect(git(dir, 'status', '--porcelain')).toBe('M docs/parked.md')
  })

  it('resume takes the line out and commits nothing', () => {
    const { dir } = repo(states, onPr)
    const head = git(dir, 'rev-parse', 'HEAD')
    const result = run(dir, ['resume', 'docs/intent/taken.md'])
    expect(result.status, result.stderr).toBe(0)
    expect(read(dir, 'docs/parked.md')).toBe(parkedTemplate)
    expect(git(dir, 'rev-parse', 'HEAD')).toBe(head)
  })
})

describe('park.sh resume <path>, with docs_mode main', () => {
  const two = [
    parkedTemplate,
    '- 2026-09-24: docs/intent/alpha.md: not now',
    '- 2026-09-25: docs/specs/SPEC-gamma.md: after the audit',
    '',
  ].join('\n')

  it('takes its line out and nothing else, commits and pushes it', () => {
    const { dir, origin } = repo({ ...states, 'docs/parked.md': two })
    const result = run(dir, ['resume', 'docs/intent/alpha.md'])
    expect(result.status, result.stderr).toBe(0)
    expect(read(dir, 'docs/parked.md')).toBe(
      two.replace('- 2026-09-24: docs/intent/alpha.md: not now\n', ''),
    )
    expect(git(dir, 'log', '-1', '--format=%s')).toBe(
      'docs(parked): resume alpha',
    )
    expect(git(dir, 'show', '--name-only', '--format=', 'HEAD')).toBe(
      'docs/parked.md',
    )
    expect(git(origin, 'rev-parse', 'refs/heads/main')).toBe(
      git(dir, 'rev-parse', 'HEAD'),
    )
  })

  it('a resumed intent is the next action again: /spec', () => {
    const { dir } = repo({
      'docs/intent/alpha.md': filled,
      'docs/parked.md': `${parkedTemplate}\n- 2026-09-24: docs/intent/alpha.md: not now\n`,
    })
    expect(board(dir).next.action).toBe('read the inbox')
    expect(run(dir, ['resume', 'docs/intent/alpha.md']).status).toBe(0)
    expect(board(dir).next.action).toBe('/spec docs/intent/alpha.md')
  })

  it('a resumed approved spec is the next action again: /slice', () => {
    const { dir } = repo({
      'docs/intent/gamma.md': filled,
      'docs/specs/SPEC-gamma.md': spec('approved', 'docs/intent/gamma.md'),
      'docs/parked.md': `${parkedTemplate}\n- 2026-09-24: docs/specs/SPEC-gamma.md: not now\n`,
    })
    expect(board(dir).next.action).toBe('read the inbox')
    const result = run(dir, ['resume', 'docs/specs/SPEC-gamma.md'])
    expect(result.status, result.stderr).toBe(0)
    expect(git(dir, 'log', '-1', '--format=%s')).toBe(
      'docs(parked): resume gamma',
    )
    expect(board(dir).next.action).toBe('/slice docs/specs/SPEC-gamma.md')
  })

  it('refuses a path with no line, and writes nothing', () => {
    const { dir, origin } = repo()
    const before = git(origin, 'rev-parse', 'refs/heads/main')
    const result = run(dir, ['resume', 'docs/intent/alpha.md'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('no line for docs/intent/alpha.md')
    expect(git(dir, 'status', '--porcelain')).toBe('')
    expect(git(origin, 'rev-parse', 'refs/heads/main')).toBe(before)
  })

  it('takes out the line of a path that is gone', () => {
    const { dir, origin } = repo({
      ...states,
      'docs/parked.md': `${parkedTemplate}\n- 2026-09-24: docs/intent/gone.md: not now\n`,
    })
    expect(existsSync(join(dir, 'docs/intent/gone.md'))).toBe(false)
    const result = run(dir, ['resume', 'docs/intent/gone.md'])
    expect(result.status, result.stderr).toBe(0)
    expect(read(dir, 'docs/parked.md')).toBe(parkedTemplate)
    expect(git(dir, 'log', '-1', '--format=%s')).toBe(
      'docs(parked): resume gone',
    )
    expect(git(origin, 'rev-parse', 'refs/heads/main')).toBe(
      git(dir, 'rev-parse', 'HEAD'),
    )
  })
})

// The subjects the script writes land in `git log` through the commit-msg
// hook of every repo that has the harness: commitlint refusing one would stop
// every park on main.
describe('the subjects of park.sh pass commitlint', () => {
  it.each(['docs(parked): alpha', 'docs(parked): resume alpha'])(
    '%s',
    (subject) => {
      const top = mkdtempSync(join(tmpdir(), 'park-msg-'))
      const file = join(top, 'msg')
      writeFileSync(file, `${subject}\n`)
      const result = spawnSync(
        join(root, '.harness/bin/commitlint.sh'),
        ['--file', file],
        { encoding: 'utf8' },
      )
      expect(result.status, result.stderr).toBe(0)
    },
  )

  it('the script writes exactly those subjects', () => {
    const script = readFileSync(join(root, '.harness/bin/park.sh'), 'utf8')
    expect(script).toContain('docs(parked): $slug')
    expect(script).toContain('docs(parked): resume $slug')
  })
})

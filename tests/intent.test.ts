// Behaviour of scripts/intent.sh, the typing around an intent that nobody but
// the human writes: `new` cuts intent/<slug> from the default branch and
// writes the three empty sections, `open` refuses an empty one, formats the
// file, commits it alone, pushes it and opens the PR. Each case is a clone of
// a throwaway bare origin, so the default branch comes from origin/HEAD as in
// a real clone. `gh` is the stub in tests/fixtures/bin; `pnpm exec prettier`
// runs the real Prettier of this repo, the one the pre-commit checks with.
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
const readme = readFileSync(join(root, 'docs/intent/README.md'), 'utf8')
const template = readFileSync(
  join(root, 'skills/harness-init/templates/AGENTS.md'),
  'utf8',
)
const skeleton = '## Problem\n\n## What success looks like\n\n## Out of scope\n'
// The PR call, never written as one string: the hook that refuses a PR
// without a verdict would read this file as the command.
const create = ['pr', 'create'].join(' ')

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
  git(dir, 'config', 'user.email', 'intent@test')
  git(dir, 'config', 'user.name', 'intent')
}

// Every repo of the chain carries an AGENTS.md with the policy block: from
// S40 a repo without one stops the script, which is its own case below, so
// the default fixture has the template's with docs_mode on pr, the team flow
// most of these cases are about.
const suPr = withPolicy(template, (block) => {
  block.docs_mode = 'pr'
})

// A bare origin whose main carries the intent README, the script with the
// reading of AGENTS.md it sources, and `base`, and a clone of it to work in.
// Next to them, a bin with a pnpm that runs the real Prettier and logs the
// call.
function repo(base: Files = {}): { dir: string; origin: string } {
  const top = mkdtempSync(join(tmpdir(), 'intent-'))
  const origin = join(top, 'origin.git')
  const seed = join(top, 'seed')
  const dir = join(top, 'work')
  execFileSync('git', ['init', '--bare', '-q', '-b', 'main', origin])
  mkdirSync(seed)
  git(seed, 'init', '-q', '-b', 'main')
  identity(seed)
  write(seed, { 'AGENTS.md': suPr, 'docs/intent/README.md': readme, ...base })
  mkdirSync(join(seed, 'scripts'))
  for (const script of ['intent.sh', 'policy-lines.sh']) {
    copyFileSync(join(root, 'scripts', script), join(seed, 'scripts', script))
    chmodSync(join(seed, 'scripts', script), 0o755)
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
      'printf \'%s\\n\' "$*" >> "$PNPM_LOG"',
      '[ "$1" = exec ] && [ "$2" = prettier ] || exit 1',
      'shift 2',
      'exec "$PRETTIER" "$@"',
      '',
    ].join('\n'),
  })
  chmodSync(join(top, 'bin/pnpm'), 0o755)
  return { dir, origin }
}

function run(
  dir: string,
  args: string[],
  env: Record<string, string> = {},
): { status: number | null; stdout: string; stderr: string } {
  const top = dirname(dir)
  for (const log of ['gh.log', 'pnpm.log']) {
    if (!existsSync(join(top, log))) writeFileSync(join(top, log), '')
  }
  const result = spawnSync(join(dir, 'scripts/intent.sh'), args, {
    cwd: dir,
    encoding: 'utf8',
    env: {
      PATH: `${join(top, 'bin')}:${bin}:${process.env.PATH}`,
      HOME: process.env.HOME ?? top,
      GH_LOG: join(top, 'gh.log'),
      GH_COMMENTS: join(top, 'body.txt'),
      PNPM_LOG: join(top, 'pnpm.log'),
      PRETTIER: join(root, 'node_modules/.bin/prettier'),
      ...env,
    },
  })
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  }
}

function logs(dir: string): { gh: string; pnpm: string; body: string } {
  const top = dirname(dir)
  const body = join(top, 'body.txt')
  return {
    gh: read(top, 'gh.log'),
    pnpm: read(top, 'pnpm.log'),
    body: existsSync(body) ? readFileSync(body, 'utf8') : '',
  }
}

const filled = [
  '## Problem',
  '',
  'The scoresheet is copied by hand at the end of the game, and on Saturday I got two fouls wrong.',
  '',
  '## What success looks like',
  '',
  'At the end of the game a button downloads the PDF of the scoresheet.',
  '',
  '## Out of scope',
  '',
  '* Advanced statistics.',
  '',
].join('\n')

describe('intent.sh new', () => {
  it('cuts intent/<slug> from the default branch and writes the three sections', () => {
    const { dir } = repo()
    const result = run(dir, ['new', 'export-pdf'])
    expect(result.status, result.stderr).toBe(0)
    expect(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe(
      'intent/export-pdf',
    )
    expect(git(dir, 'rev-parse', 'HEAD')).toBe(
      git(dir, 'rev-parse', 'origin/main'),
    )
    expect(read(dir, 'docs/intent/export-pdf.md')).toBe(skeleton)
    expect(result.stdout).toContain('scripts/intent.sh open')
  })

  // The skeleton is the README's contract written out: if the two drift, an
  // intent made with the script fails the check /spec reads the README for.
  it.each([
    'docs/intent/README.md',
    'skills/harness-init/templates/docs/intent/README.md',
  ])('writes the sections %s lists, in order', (file) => {
    const sections = [
      ...readFileSync(join(root, file), 'utf8').matchAll(/^ {4}## (.+)$/gm),
    ].map((match) => (match[1] ?? '').trim())
    expect(sections.length, `${file} lists no "## " section`).toBeGreaterThan(0)
    const { dir } = repo()
    expect(run(dir, ['new', 'sezioni']).status).toBe(0)
    const written = [
      ...read(dir, 'docs/intent/sezioni.md').matchAll(/^## (.+)$/gm),
    ].map((match) => match[1])
    expect(written).toEqual(sections)
  })

  // The mode comes from the docs_mode key and from nothing else: with the
  // block on pr the flow is the team's, whatever the prose around it says.
  it('takes the team flow when docs_mode says pr', () => {
    const { dir } = repo({
      'AGENTS.md': withPolicy(template, (block) => {
        block.docs_mode = 'pr'
      }),
    })
    const result = run(dir, ['new', 'export-pdf'])
    expect(result.status, result.stderr).toBe(0)
    expect(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe(
      'intent/export-pdf',
    )
  })

  // The slug goes into a path, two branch names and the subjects of two
  // commits, `docs(intent): <slug>` and `docs(spec): <slug>`: commitlint wants
  // a letter after the colon, so a digit first would pass here and fail there.
  it.each(['', 'Export', 'export_pdf', '-export', '2fa', 'a/b', 'a b', 'a\nb'])(
    'refuses the slug %j and touches nothing',
    (slug) => {
      const { dir } = repo()
      const result = run(dir, ['new', slug])
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('slug')
      expect(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('main')
      expect(git(dir, 'status', '--porcelain')).toBe('')
    },
  )

  it('refuses a slug whose intent is already on the default branch', () => {
    const { dir } = repo({ 'docs/intent/taken.md': filled })
    const result = run(dir, ['new', 'taken'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('docs/intent/taken.md')
    expect(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('main')
  })

  // /spec stops on an approved or superseded spec and asks for a new intent:
  // an intent under the same slug would be a PR for a spec nobody can write.
  it('refuses a slug whose spec is already on the default branch', () => {
    const { dir } = repo({ 'docs/specs/SPEC-done.md': 'status: approved\n' })
    const result = run(dir, ['new', 'done'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('docs/specs/SPEC-done.md')
    expect(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('main')
  })

  it('refuses a branch that exists here', () => {
    const { dir } = repo()
    git(dir, 'branch', 'intent/dup')
    const result = run(dir, ['new', 'dup'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('intent/dup')
    expect(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('main')
  })

  it('refuses a branch that exists on the remote', () => {
    const { dir } = repo()
    git(dir, 'push', '-q', 'origin', 'main:refs/heads/intent/elsewhere')
    git(dir, 'update-ref', '-d', 'refs/remotes/origin/intent/elsewhere')
    const result = run(dir, ['new', 'elsewhere'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('intent/elsewhere')
    expect(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('main')
  })

  // Offline, the checks would run on the refs of the last fetch, and a slug
  // taken since then would pass them.
  it('stops when the remote cannot be read, on the branch it started from', () => {
    const { dir } = repo()
    git(dir, 'remote', 'set-url', 'origin', join(dirname(dir), 'gone.git'))
    const result = run(dir, ['new', 'offline'])
    expect(result.status).not.toBe(0)
    expect(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('main')
    expect(existsSync(join(dir, 'docs/intent/offline.md'))).toBe(false)
  })

  // A switch carries uncommitted changes along: half a slice would land on
  // the intent branch without anyone asking.
  it('refuses a working tree with changes and names them', () => {
    const { dir } = repo()
    write(dir, { 'docs/intent/README.md': 'changed\n' })
    const result = run(dir, ['new', 'dirty'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('docs/intent/README.md')
    expect(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('main')
  })

  it('keeps an intent that was already being written', () => {
    const { dir } = repo()
    write(dir, { 'docs/intent/draft.md': filled })
    const result = run(dir, ['new', 'draft'])
    expect(result.status, result.stderr).toBe(0)
    expect(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('intent/draft')
    expect(read(dir, 'docs/intent/draft.md')).toBe(filled)
  })

  it('stops in a repo without docs/intent/ and names the stage that adds it', () => {
    const { dir } = repo()
    git(dir, 'rm', '-q', '-r', 'docs')
    git(dir, 'commit', '-q', '-m', 'no docs')
    const result = run(dir, ['new', 'nodocs'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('/harness-init local')
  })
})

describe('intent.sh open', () => {
  it('commits the intent alone, formatted, pushes it and opens the PR', () => {
    const { dir, origin } = repo({ 'notes.md': 'x\n' })
    expect(run(dir, ['new', 'export-pdf']).status).toBe(0)
    write(dir, { 'docs/intent/export-pdf.md': filled, 'notes.md': 'y\n' })
    git(dir, 'add', 'notes.md')
    const result = run(dir, ['open'])
    expect(result.status, result.stderr).toBe(0)
    expect(git(dir, 'log', '-1', '--format=%s')).toBe(
      'docs(intent): export-pdf',
    )
    expect(git(dir, 'show', '--name-only', '--format=', 'HEAD')).toBe(
      'docs/intent/export-pdf.md',
    )
    expect(git(dir, 'rev-list', '--count', 'origin/main..HEAD')).toBe('1')
    // Prettier ran on the file: its list marker is the dash.
    const committed = git(dir, 'show', 'HEAD:docs/intent/export-pdf.md')
    expect(committed).toContain('- Advanced statistics.')
    expect(committed).not.toContain('* Advanced')
    // What the human staged for something else stays staged, out of the commit.
    expect(git(dir, 'diff', '--cached', '--name-only')).toBe('notes.md')
    expect(git(origin, 'rev-parse', 'refs/heads/intent/export-pdf')).toBe(
      git(dir, 'rev-parse', 'HEAD'),
    )
    expect(logs(dir).gh).toContain(
      'pr list --head intent/export-pdf --state open',
    )
    expect(logs(dir).gh).toContain(
      `${create} --base main --head intent/export-pdf --title docs(intent): export-pdf`,
    )
  })

  it("fills the repo's PR template: no slice, and how to check it", () => {
    const prTemplate = readFileSync(
      join(
        root,
        'skills/harness-init/templates/github/pull_request_template.md',
      ),
      'utf8',
    )
    const { dir } = repo({ '.github/pull_request_template.md': prTemplate })
    expect(run(dir, ['new', 'export-pdf']).status).toBe(0)
    write(dir, { 'docs/intent/export-pdf.md': filled })
    expect(run(dir, ['open']).status).toBe(0)
    const { body } = logs(dir)
    expect(body).toContain('## Slice\n\nnone\n')
    expect(body).toContain(
      '## How to check by hand\n\nRead `docs/intent/export-pdf.md`.',
    )
    expect(body).toContain('/spec docs/intent/export-pdf.md')
    expect(body).toContain('- [ ] Touches a sensitive path')
    expect(body).not.toContain('- [x]')
    expect(body).not.toContain('<!-- path of the slice file')
  })

  it('without a PR template the body is the line on how to check it', () => {
    const { dir } = repo()
    expect(run(dir, ['new', 'export-pdf']).status).toBe(0)
    write(dir, { 'docs/intent/export-pdf.md': filled })
    expect(run(dir, ['open']).status).toBe(0)
    expect(logs(dir).body).toContain('Read `docs/intent/export-pdf.md`.')
  })

  // The template belongs to the repo and this script to the harness: they
  // travel apart, and a repo where /harness-init ci has not run since the
  // sections were renamed still carries the old headings. Filling it by the
  // heading would drop the line on how to check the intent and send the
  // template's own comment in its place, without a word.
  it('refuses a PR template it cannot fill, and names the stage that copies it', () => {
    const stale = readFileSync(
      join(
        root,
        'skills/harness-init/templates/github/pull_request_template.md',
      ),
      'utf8',
    ).replace('## How to check by hand', '## How to verify by hand')
    const { dir } = repo({ '.github/pull_request_template.md': stale })
    expect(run(dir, ['new', 'stale']).status).toBe(0)
    write(dir, { 'docs/intent/stale.md': filled })
    const result = run(dir, ['open'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('## How to check by hand')
    expect(result.stderr).toContain('/harness-init ci')
    expect(logs(dir).gh).not.toContain(create)
    expect(logs(dir).body).toBe('')
  })

  // A push that failed, or a PR opened by hand, and the human runs it again:
  // gh refuses a second PR for the same head, so the open one is the answer.
  it('a second run commits nothing new and points to the PR already open', () => {
    const { dir } = repo()
    expect(run(dir, ['new', 'again']).status).toBe(0)
    write(dir, { 'docs/intent/again.md': filled })
    expect(run(dir, ['open']).status).toBe(0)
    const url = 'https://github.test/o/r/pull/9'
    const second = run(dir, ['open'], { STUB_PRS: url })
    expect(second.status, second.stderr).toBe(0)
    expect(second.stdout).toContain(url)
    expect(git(dir, 'rev-list', '--count', 'origin/main..HEAD')).toBe('1')
    expect(logs(dir).gh.split(create).length - 1).toBe(1)
  })

  // The PR opens from inside a script, where the hook that wants a verdict
  // never sees the command: it may carry the intent and nothing else, which
  // is tier 0 and needs no verdict.
  it('refuses a branch that carries more than the intent, and nothing leaves', () => {
    const { dir, origin } = repo()
    expect(run(dir, ['new', 'extra']).status).toBe(0)
    write(dir, { 'docs/intent/extra.md': filled, 'notes.md': 'x\n' })
    git(dir, 'add', 'notes.md')
    git(dir, 'commit', '-q', '-m', 'notes')
    const result = run(dir, ['open'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('notes.md')
    expect(git(dir, 'log', '-1', '--format=%s')).toBe('notes')
    expect(git(origin, 'branch', '--list', 'intent/extra')).toBe('')
    expect(logs(dir).gh).toBe('')
  })

  it('says the branch is pushed when gh does not open the PR', () => {
    const { dir, origin } = repo()
    expect(run(dir, ['new', 'offline']).status).toBe(0)
    write(dir, { 'docs/intent/offline.md': filled })
    const result = run(dir, ['open'], { STUB_FAIL: create })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('intent/offline is pushed')
    expect(git(origin, 'rev-parse', 'refs/heads/intent/offline')).toBe(
      git(dir, 'rev-parse', 'HEAD'),
    )
  })

  it.each([
    [
      'an empty section',
      filled.replace(
        'At the end of the game a button downloads the PDF of the scoresheet.\n\n',
        '',
      ),
      'What success looks like',
    ],
    [
      'a renamed section',
      filled.replace('## Out of scope', '## Out of'),
      'Out of scope',
    ],
    ['the skeleton as it was written', skeleton, 'Problem'],
  ])('refuses %s, names it, and nothing leaves', (_, content, section) => {
    const { dir, origin } = repo()
    expect(run(dir, ['new', 'half']).status).toBe(0)
    write(dir, { 'docs/intent/half.md': content })
    const result = run(dir, ['open'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain(section)
    expect(git(dir, 'rev-list', '--count', 'origin/main..HEAD')).toBe('0')
    expect(git(origin, 'branch', '--list', 'intent/half')).toBe('')
    expect(logs(dir).gh).toBe('')
    expect(logs(dir).pnpm).toBe('')
  })

  it.each(['main', 'slice/S01-x', 'intent/Export'])(
    'refuses to run on %s',
    (branch) => {
      const { dir } = repo()
      if (branch !== 'main') git(dir, 'switch', '-q', '-c', branch)
      const result = run(dir, ['open'])
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('intent/<slug>')
      expect(logs(dir).gh).toBe('')
    },
  )
})

// With `"docs_mode": "main"` in the policy block of the AGENTS.md on the
// default branch the intent has no branch and no PR: the human wrote it, and
// the commit on main is the approval (ADR-0003). The AGENTS.md is the
// template's, so the block under test is the one /harness-init local installs.
const suMain = { 'AGENTS.md': template }

// A commit pushed to origin's main from somewhere else while the human was
// writing: the seed next to the clone is that somewhere.
function elsewhere(dir: string, files: Files): void {
  const seed = join(dirname(dir), 'seed')
  write(seed, files)
  git(seed, 'add', '-A')
  git(seed, 'commit', '-q', '-m', 'docs(inbox): altrove')
  git(seed, 'push', '-q', 'origin', 'main')
}

describe('intent.sh new, with docs_mode main', () => {
  it('writes the three sections on the default branch, with no branch of its own', () => {
    const { dir, origin } = repo(suMain)
    const result = run(dir, ['new', 'export-pdf'])
    expect(result.status, result.stderr).toBe(0)
    expect(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('main')
    expect(git(dir, 'rev-parse', 'HEAD')).toBe(
      git(dir, 'rev-parse', 'origin/main'),
    )
    expect(read(dir, 'docs/intent/export-pdf.md')).toBe(skeleton)
    expect(git(dir, 'branch', '--list', 'intent/*')).toBe('')
    expect(git(origin, 'branch', '--list', 'intent/*')).toBe('')
    expect(result.stdout).toContain('scripts/intent.sh open export-pdf')
  })

  it('moves to the default branch, brought up to date, from wherever it runs', () => {
    const { dir } = repo(suMain)
    git(dir, 'switch', '-q', '-c', 'slice/S01-x')
    elsewhere(dir, { 'docs/inbox.md': '- riga\n' })
    const result = run(dir, ['new', 'altrove'])
    expect(result.status, result.stderr).toBe(0)
    expect(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('main')
    expect(git(dir, 'rev-parse', 'HEAD')).toBe(
      git(dir, 'rev-parse', 'origin/main'),
    )
    expect(read(dir, 'docs/inbox.md')).toBe('- riga\n')
  })

  it('refuses a slug whose intent is already on the default branch', () => {
    const { dir } = repo({ ...suMain, 'docs/intent/taken.md': filled })
    const result = run(dir, ['new', 'taken'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('docs/intent/taken.md')
  })

  it('refuses a working tree with changes and names them', () => {
    const { dir } = repo(suMain)
    write(dir, { 'docs/intent/README.md': 'changed\n' })
    const result = run(dir, ['new', 'dirty'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('docs/intent/README.md')
  })
})

describe('intent.sh open, with docs_mode main', () => {
  function written(slug = 'export-pdf'): { dir: string; origin: string } {
    const { dir, origin } = repo({ ...suMain, 'notes.md': 'x\n' })
    expect(run(dir, ['new', slug]).status).toBe(0)
    write(dir, { [`docs/intent/${slug}.md`]: filled })
    return { dir, origin }
  }

  it('commits the intent alone on the default branch, pushes it and prints the sha, with no PR', () => {
    const { dir, origin } = written()
    write(dir, { 'notes.md': 'y\n' })
    git(dir, 'add', 'notes.md')
    const result = run(dir, ['open'])
    expect(result.status, result.stderr).toBe(0)
    expect(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('main')
    expect(git(dir, 'log', '-1', '--format=%s')).toBe(
      'docs(intent): export-pdf',
    )
    expect(git(dir, 'show', '--name-only', '--format=', 'HEAD')).toBe(
      'docs/intent/export-pdf.md',
    )
    const committed = git(dir, 'show', 'HEAD:docs/intent/export-pdf.md')
    expect(committed).toContain('- Advanced statistics.')
    expect(git(dir, 'diff', '--cached', '--name-only')).toBe('notes.md')
    expect(git(origin, 'rev-parse', 'refs/heads/main')).toBe(
      git(dir, 'rev-parse', 'HEAD'),
    )
    expect(result.stdout).toContain(git(dir, 'rev-parse', '--short', 'HEAD'))
    expect(result.stdout).toContain('/spec docs/intent/export-pdf.md')
    expect(logs(dir).gh).toBe('')
  })

  it('takes the slug when named', () => {
    const { dir, origin } = written('named')
    const result = run(dir, ['open', 'named'])
    expect(result.status, result.stderr).toBe(0)
    expect(git(dir, 'log', '-1', '--format=%s')).toBe('docs(intent): named')
    expect(git(origin, 'rev-parse', 'refs/heads/main')).toBe(
      git(dir, 'rev-parse', 'HEAD'),
    )
    expect(logs(dir).gh).toBe('')
  })

  it('refuses to guess between two intents and names them', () => {
    const { dir, origin } = written('prima')
    write(dir, { 'docs/intent/seconda.md': filled })
    const before = git(origin, 'rev-parse', 'refs/heads/main')
    const result = run(dir, ['open'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('docs/intent/prima.md')
    expect(result.stderr).toContain('docs/intent/seconda.md')
    expect(git(origin, 'rev-parse', 'refs/heads/main')).toBe(before)
  })

  it('refuses an empty section, names it, and nothing leaves', () => {
    const { dir, origin } = repo(suMain)
    expect(run(dir, ['new', 'half']).status).toBe(0)
    const before = git(origin, 'rev-parse', 'refs/heads/main')
    const result = run(dir, ['open'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Problem')
    expect(git(dir, 'rev-list', '--count', 'origin/main..HEAD')).toBe('0')
    expect(git(origin, 'rev-parse', 'refs/heads/main')).toBe(before)
    expect(logs(dir).pnpm).toBe('')
  })

  // The push carries whatever main holds that origin does not: anything but
  // the intent would land on main without anyone reading it.
  it('refuses a default branch that carries more than the intent', () => {
    const { dir, origin } = written()
    const before = git(origin, 'rev-parse', 'refs/heads/main')
    write(dir, { 'notes.md': 'z\n' })
    git(dir, 'add', 'notes.md')
    git(dir, 'commit', '-q', '-m', 'notes')
    const result = run(dir, ['open'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('notes.md')
    expect(git(origin, 'rev-parse', 'refs/heads/main')).toBe(before)
  })

  it('refuses to run away from the default branch', () => {
    const { dir } = written()
    git(dir, 'switch', '-q', '-c', 'intent/export-pdf')
    const result = run(dir, ['open'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('main')
    expect(logs(dir).gh).toBe('')
  })

  it('lands on top of what reached the default branch meanwhile', () => {
    const { dir, origin } = written()
    elsewhere(dir, { 'docs/inbox.md': '- riga\n' })
    const result = run(dir, ['open'])
    expect(result.status, result.stderr).toBe(0)
    expect(git(dir, 'log', '-1', '--format=%s', 'HEAD^')).toBe(
      'docs(inbox): altrove',
    )
    expect(git(origin, 'rev-parse', 'refs/heads/main')).toBe(
      git(dir, 'rev-parse', 'HEAD'),
    )
  })

  // The push refused after the commit, and the human runs it again: the
  // commit is there, the second run pushes it and makes no other.
  it('a second run after a refused push pushes the same commit', () => {
    const { dir, origin } = written()
    const hook = join(origin, 'hooks/pre-receive')
    writeFileSync(hook, '#!/usr/bin/env bash\nexit 1\n')
    chmodSync(hook, 0o755)
    const first = run(dir, ['open'])
    expect(first.status).not.toBe(0)
    const sha = git(dir, 'rev-parse', 'HEAD')
    expect(git(dir, 'log', '-1', '--format=%s')).toBe(
      'docs(intent): export-pdf',
    )
    writeFileSync(hook, '#!/usr/bin/env bash\nexit 0\n')
    const second = run(dir, ['open'])
    expect(second.status, second.stderr).toBe(0)
    expect(git(dir, 'rev-parse', 'HEAD')).toBe(sha)
    expect(git(origin, 'rev-parse', 'refs/heads/main')).toBe(sha)
  })
})

// S40. The four ways the policy block can be unreadable. The script stops on
// all four instead of falling back to the pr flow, which in a repo that says
// main would cut a branch nobody merges, and in a repo whose block says
// nothing at all would put an intent wherever the fallback happens to land.
describe('intent.sh, a policy block it cannot read', () => {
  it.each(brokenPolicies(template))(
    '$name: new stops and names the fault',
    ({ agents: broken, fault }) => {
      const { dir } = repo({ 'AGENTS.md': broken })
      const result = run(dir, ['new', 'export-pdf'])
      expect(result.status).not.toBe(0)
      expect(result.stderr).toMatch(fault)
      expect(result.stderr).toContain('/harness-init local')
      expect(git(dir, 'branch', '--list', 'intent/*')).toBe('')
      expect(existsSync(join(dir, 'docs/intent/export-pdf.md'))).toBe(false)
    },
  )

  it.each(brokenPolicies(template))(
    '$name: open stops and names the fault',
    ({ agents: broken, fault }) => {
      const { dir, origin } = repo({
        'AGENTS.md': broken,
        'docs/intent/export-pdf.md': filled,
      })
      const before = git(origin, 'rev-parse', 'refs/heads/main')
      const result = run(dir, ['open', 'export-pdf'])
      expect(result.status).not.toBe(0)
      expect(result.stderr).toMatch(fault)
      expect(result.stderr).toContain('/harness-init local')
      expect(git(origin, 'rev-parse', 'refs/heads/main')).toBe(before)
      expect(logs(dir).gh).toBe('')
    },
  )
})

// Behaviour of templates/bootstrap.sh, the fetch of the harness in one folder:
// it reads the pin of .harness/stamp.json, fetches the harness repo at that
// sha and lays the templates out as .harness/bin/. The fixture is a disposable
// harness repo, a copy of skills/harness-init/templates/ committed twice and
// pushed to a bare origin, and a disposable project whose pin names that
// origin by path and one of the two shas.
import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const templates = 'skills/harness-init/templates'
const script = join(root, templates, 'bootstrap.sh')

// The file the second commit of the harness changes, so a case can see the
// tree follow the pin.
const moved = `${templates}/scripts/tier.sh`

function git(cwd: string, ...args: string[]): string {
  return execFileSync(
    'git',
    [
      '-c',
      'user.email=bootstrap@example.invalid',
      '-c',
      'user.name=Bootstrap',
      ...args,
    ],
    { cwd, encoding: 'utf8' },
  ).trim()
}

// The harness: two commits of the templates, pushed to a bare origin that
// serves the first one too, though it is no longer the tip of a ref.
function harness(): { origin: string; first: string; second: string } {
  const base = mkdtempSync(join(tmpdir(), 'bootstrap-harness-'))
  const work = join(base, 'work')
  const origin = join(base, 'origin.git')
  mkdirSync(work)
  git(work, 'init', '-b', 'main', '-q')
  cpSync(join(root, templates), join(work, templates), { recursive: true })
  git(work, 'add', '-A')
  git(work, 'commit', '-q', '-m', 'chore: the templates')
  const first = git(work, 'rev-parse', 'HEAD')
  writeFileSync(
    join(work, moved),
    `${readFileSync(join(work, moved), 'utf8')}# moved\n`,
  )
  git(work, 'commit', '-q', '-am', 'chore: tier moves')
  const second = git(work, 'rev-parse', 'HEAD')
  git(base, 'init', '--bare', '-q', origin)
  git(origin, 'config', 'uploadpack.allowAnySHA1InWant', 'true')
  git(work, 'push', '-q', origin, 'main')
  return { origin, first, second }
}

function pin(project: string, origin: string, sha: string): void {
  writeFileSync(
    join(project, '.harness/stamp.json'),
    `${JSON.stringify({ harness: 'x', stages: {}, pin: { origin, sha, date: '2026-10-03' } }, null, 2)}\n`,
  )
}

// The project: a repo with the pin and the template copied as
// .harness/bootstrap.sh, as stage local will install it.
function project(origin: string, sha: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'bootstrap-project-'))
  git(dir, 'init', '-b', 'main', '-q')
  mkdirSync(join(dir, '.harness'))
  copyFileSync(script, join(dir, '.harness/bootstrap.sh'))
  chmodSync(join(dir, '.harness/bootstrap.sh'), 0o755)
  pin(dir, origin, sha)
  return dir
}

// A `git` first on PATH that writes every call to a log, then runs the real
// one, so a case can tell whether the script fetched.
function recorder(): { bin: string; log: string } {
  const bin = mkdtempSync(join(tmpdir(), 'bootstrap-bin-'))
  const log = join(bin, 'calls.log')
  const real = execFileSync('which', ['git'], { encoding: 'utf8' }).trim()
  writeFileSync(
    join(bin, 'git'),
    `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> '${log}'\nexec '${real}' "$@"\n`,
  )
  chmodSync(join(bin, 'git'), 0o755)
  writeFileSync(log, '')
  return { bin, log }
}

function bootstrap(dir: string, path = process.env.PATH ?? '') {
  return spawnSync('bash', ['.harness/bootstrap.sh'], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, PATH: path },
  })
}

function snapshot(dir: string, base = dir): Record<string, string> {
  const files: Record<string, string> = {}
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) Object.assign(files, snapshot(path, base))
    else files[path.slice(base.length + 1)] = readFileSync(path, 'utf8')
  }
  return files
}

describe('bootstrap.sh fills .harness/bin/ from the pin', () => {
  it('lays the templates out at the pinned sha', () => {
    const { origin, first } = harness()
    const dir = project(origin, first)

    const run = bootstrap(dir)

    expect(run.stderr).toBe('')
    expect(run.status).toBe(0)
    const bin = join(dir, '.harness/bin')
    const layout: Array<[string, string]> = [
      ['tier.sh', 'scripts/tier.sh'],
      ['policy-lines.sh', 'scripts/policy-lines.sh'],
      ['hooks/pre-commit', 'githooks/pre-commit'],
      ['hooks/commit-msg', 'githooks/commit-msg'],
      ['judge/prompt.md', 'judge/prompt.md'],
      ['judge/verdict.schema.json', 'judge/verdict.schema.json'],
      ['ruleset.json', 'github/ruleset.json'],
    ]
    for (const [landed, template] of layout) {
      expect(
        readFileSync(join(bin, landed), 'utf8'),
        `${landed} is not ${template}`,
      ).toBe(readFileSync(join(root, templates, template), 'utf8'))
    }
    expect(statSync(join(bin, 'tier.sh')).mode & 0o111).not.toBe(0)
    expect(statSync(join(bin, 'hooks/pre-commit')).mode & 0o111).not.toBe(0)
    expect(existsSync(join(bin, 'ci.yml'))).toBe(false)
    expect(existsSync(join(bin, 'AGENTS.md'))).toBe(false)
    expect(readFileSync(join(bin, '.sha'), 'utf8')).toBe(`${first}\n`)
    expect(git(dir, 'config', 'core.hooksPath')).toBe('.harness/bin/hooks')
  })

  it('fetches by sha with git fetch', () => {
    const { origin, first } = harness()
    const dir = project(origin, first)
    const { bin, log } = recorder()

    const run = bootstrap(dir, `${bin}:${process.env.PATH ?? ''}`)

    expect(run.status).toBe(0)
    expect(readFileSync(log, 'utf8')).toMatch(
      new RegExp(`(^| )fetch .*${first}$`, 'm'),
    )
  })

  it('fetches nothing when the marker is the pin', () => {
    const { origin, first } = harness()
    const dir = project(origin, first)
    expect(bootstrap(dir).status).toBe(0)
    const { bin, log } = recorder()

    const run = bootstrap(dir, `${bin}:${process.env.PATH ?? ''}`)

    expect(run.status).toBe(0)
    expect(readFileSync(log, 'utf8')).not.toMatch(/(^| )fetch /m)
  })

  it('follows the pin when it moves', () => {
    const { origin, first, second } = harness()
    const dir = project(origin, first)
    expect(bootstrap(dir).status).toBe(0)
    pin(dir, origin, second)

    const run = bootstrap(dir)

    expect(run.status).toBe(0)
    const bin = join(dir, '.harness/bin')
    expect(readFileSync(join(bin, '.sha'), 'utf8')).toBe(`${second}\n`)
    expect(readFileSync(join(bin, 'tier.sh'), 'utf8')).toMatch(/# moved\n$/)
  })

  it('leaves .harness/bin/ whole when the fetch fails', () => {
    const { origin, first, second } = harness()
    const dir = project(origin, first)
    expect(bootstrap(dir).status).toBe(0)
    const before = snapshot(join(dir, '.harness/bin'))
    pin(dir, join(origin, 'missing.git'), second)

    const run = bootstrap(dir)

    expect(run.status).not.toBe(0)
    expect(run.stderr).not.toBe('')
    expect(snapshot(join(dir, '.harness/bin'))).toEqual(before)
  })

  it('stops with one line when the stamp has no pin', () => {
    const { origin, first } = harness()
    const dir = project(origin, first)
    writeFileSync(
      join(dir, '.harness/stamp.json'),
      '{"harness": "x", "stages": {}}\n',
    )

    const run = bootstrap(dir)

    expect(run.status).not.toBe(0)
    expect(run.stderr.trim().split('\n')).toHaveLength(1)
    expect(existsSync(join(dir, '.harness/bin'))).toBe(false)
  })
})

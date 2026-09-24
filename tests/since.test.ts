// Behaviour of scripts/since.sh, the answer to a sha that comes back from a
// repo with a line of feedback: what moved in the templates between that
// commit and HEAD. The three outcomes are what the script exists for, because
// plain `git log` prints the same nothing for a sha this repo does not have
// and for a range with nothing in it. Each case is a throwaway git repo the
// test builds, with the identity and the dates on the command line so the
// output does not depend on the git config of whoever runs it.
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const script = join(root, 'scripts/since.sh')

const template = 'skills/harness-init/templates/scripts/x.sh'
const outside = 'docs/inbox.md'

// One commit of the fixture: the file it writes, its subject and its date, so
// a case can assert the line the script prints word for word.
type Commit = { file: string; subject: string; date: string }

const history: Commit[] = [
  { file: 'README.md', subject: 'chore: base', date: '2026-09-01' },
  {
    file: template,
    subject: 'feat(scripts): the template moves',
    date: '2026-09-02',
  },
  {
    file: outside,
    subject: 'docs: a line that is not a template',
    date: '2026-09-03',
  },
]

// A repo with the three commits above: `base` is the first, the one a case
// asks the question from, and `head` the last, where nothing has moved since.
function repo(): { dir: string; base: string; head: string } {
  const dir = mkdtempSync(join(tmpdir(), 'since-'))
  execFileSync('git', ['init', '-b', 'main', '-q'], { cwd: dir })
  let base = ''
  let head = ''
  for (const { file, subject, date } of history) {
    mkdirSync(dirname(join(dir, file)), { recursive: true })
    writeFileSync(join(dir, file), `${subject}\n`)
    execFileSync('git', ['add', file], { cwd: dir })
    execFileSync(
      'git',
      [
        '-c',
        'user.email=since@example.invalid',
        '-c',
        'user.name=Since',
        'commit',
        '-q',
        '-m',
        subject,
      ],
      {
        cwd: dir,
        env: {
          ...process.env,
          GIT_AUTHOR_DATE: `${date}T12:00:00+00:00`,
          GIT_COMMITTER_DATE: `${date}T12:00:00+00:00`,
        },
      },
    )
    head = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: dir,
      encoding: 'utf8',
    }).trim()
    if (base === '') base = head
  }
  return { dir, base, head }
}

function since(
  dir: string,
  args: string[],
): { status: number | null; stdout: string; stderr: string } {
  const run = spawnSync(script, args, { cwd: dir, encoding: 'utf8' })
  return { status: run.status, stdout: run.stdout, stderr: run.stderr }
}

describe('scripts/since.sh', () => {
  it('prints the commits of the templates in the range, and nothing else', () => {
    const { dir, base } = repo()
    const { status, stdout } = since(dir, [base])
    expect(status).toBe(0)
    const lines = stdout.replace(/\n$/, '').split('\n')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('2026-09-02')
    expect(lines[0]).toContain('feat(scripts): the template moves')
    expect(lines[0]).toContain(template)
    expect(stdout).not.toContain('docs: a line that is not a template')
  })

  // The case the script exists for: a sha this repo does not have is not an
  // empty answer, it is no answer at all.
  it('says a sha it does not have and exits non zero', () => {
    const { dir } = repo()
    const { status, stdout, stderr } = since(dir, ['0000000'])
    expect(status).not.toBe(0)
    expect(stderr).toContain('0000000')
    expect(stdout).toBe('')
  })

  // The other half of the same pair: nothing moved is an answer, and a good
  // one, so it is said out loud and the exit code is 0.
  it('says the templates have not moved, and exits 0', () => {
    const { dir, head } = repo()
    const { status, stdout } = since(dir, [head])
    expect(status).toBe(0)
    expect(stdout).toContain('the templates have not moved')
    expect(stdout).toContain(head)
  })

  // With a path the range follows the path: the other half of the criterion
  // that says the range with no argument is the templates alone.
  it('takes the range from the path arguments when they are there', () => {
    const { dir, base } = repo()
    const { status, stdout } = since(dir, [base, 'docs'])
    expect(status).toBe(0)
    const lines = stdout.replace(/\n$/, '').split('\n')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('2026-09-03')
    expect(lines[0]).toContain('docs: a line that is not a template')
    expect(lines[0]).toContain(outside)
    expect(stdout).not.toContain('feat(scripts): the template moves')
  })
})

// Behaviour of scripts/board.sh, the screen someone reads when they open a
// cold session: the slices of docs/backlog/ that are still open, the lines of
// docs/inbox.md and the open PRs, and the same data as one object under
// --json. Each case is a throwaway git repo whose docs/ the test writes, so
// the test covers the shell on real files and not a port of its rules, and
// `gh` is the stub in tests/fixtures/bin, which answers `pr list` from
// STUB_PRS and fails the call named by STUB_FAIL.
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const script = join(root, 'scripts/board.sh')
const bin = join(root, 'tests/fixtures/bin')

// A PATH with everything the script needs and no `gh` at all, whatever the
// machine: the tools are symlinked in by their real path, so the case means
// "gh is not installed" on a laptop that has it in /opt/homebrew and on a CI
// runner that has it in /usr/bin.
const bareBin = mkdtempSync(join(tmpdir(), 'board-bin-'))
for (const tool of ['bash', 'jq', 'awk', 'git']) {
  const real = execFileSync('sh', ['-c', `command -v ${tool}`], {
    encoding: 'utf8',
  }).trim()
  symlinkSync(real, join(bareBin, tool))
}

type Slice = {
  id: string
  title: string
  status: string
  blocked_by?: string
  tier?: number
  human?: boolean
  spec?: string
  // the sentence of the `## Blocked` section, which the board never reads: S38
  blockedNote?: string
}

// A spec of docs/specs/, SPEC-<slug>.md, with the two fields the board reads.
type Spec = { slug: string; status: string; intent: string }

// The stamp of .harness/stamp.json as a stage leaves it: S56. A string is
// written to the file as it is, for the case of a stamp jq refuses. S57: an
// entry marks a sha that is not to be trusted, `dirty` when the harness
// checkout had uncommitted changes, `sha` and `date` null when there was no
// git repo under the skill to read them from.
type Stamp = {
  harness?: string
  stages?: Record<
    string,
    { sha: string | null; date: string | null; dirty?: boolean }
  >
}

function frontmatter(s: Slice): string {
  return [
    '---',
    `id: ${s.id}`,
    `title: ${s.title}`,
    `status: ${s.status}`,
    `blocked_by: ${s.blocked_by ?? 'none'}`,
    `tier: ${s.tier ?? 1}`,
    `human: ${s.human ?? false}`,
    `spec: ${s.spec ?? 'docs/specs/SPEC-x.md'}`,
    '---',
    '',
    '## Goal',
    '',
    'The body of the slice, which the board does not read.',
    '',
    ...(s.blockedNote === undefined
      ? []
      : ['## Blocked', '', s.blockedNote, '']),
  ].join('\n')
}

type Options = {
  slices?: Slice[]
  // branch names under refs/remotes/origin/, the claim of a slice: S29
  branches?: string[]
  inbox?: string[]
  // file name in docs/decisions/ to its content
  decisions?: Record<string, string>
  specs?: Spec[]
  // slugs of docs/intent/
  intents?: string[]
  json?: boolean
  args?: string[]
  prs?: string
  fail?: string
  noGh?: boolean
  // .harness/stamp.json, the commit of the harness each stage installed: S56
  stamp?: Stamp | string
  // skills/harness-init/templates/, what makes a repo the harness itself: S56
  harnessRepo?: boolean
  // one empty commit, for the cases that read HEAD: S56
  commit?: boolean
}

function board(opts: Options = {}): {
  status: number | null
  stdout: string
  stderr: string
  lines: string[]
  dir: string
} {
  const dir = mkdtempSync(join(tmpdir(), 'board-'))
  execFileSync('git', ['init', '-b', 'main', '-q'], { cwd: dir })
  mkdirSync(join(dir, 'docs/backlog'), { recursive: true })
  writeFileSync(join(dir, 'docs/backlog/README.md'), 'One slice per file.\n')
  for (const s of opts.slices ?? []) {
    writeFileSync(join(dir, `docs/backlog/${s.id}-a-slice.md`), frontmatter(s))
  }
  for (const [name, content] of Object.entries(opts.decisions ?? {})) {
    mkdirSync(join(dir, 'docs/decisions'), { recursive: true })
    writeFileSync(join(dir, 'docs/decisions', name), content)
  }
  for (const s of opts.specs ?? []) {
    mkdirSync(join(dir, 'docs/specs'), { recursive: true })
    writeFileSync(
      join(dir, `docs/specs/SPEC-${s.slug}.md`),
      `---\nstatus: ${s.status}\nintent: ${s.intent}\ndate: 2026-09-16\n---\n\n# SPEC: ${s.slug}\n`,
    )
  }
  for (const slug of opts.intents ?? []) {
    mkdirSync(join(dir, 'docs/intent'), { recursive: true })
    writeFileSync(
      join(dir, `docs/intent/${slug}.md`),
      '## Problem\n\nA problem.\n',
    )
  }
  if (opts.stamp !== undefined) {
    mkdirSync(join(dir, '.harness'), { recursive: true })
    writeFileSync(
      join(dir, '.harness/stamp.json'),
      typeof opts.stamp === 'string'
        ? opts.stamp
        : `${JSON.stringify(opts.stamp, null, 2)}\n`,
    )
  }
  if (opts.harnessRepo) {
    mkdirSync(join(dir, 'skills/harness-init/templates'), { recursive: true })
  }
  const lines = opts.inbox ?? []
  writeFileSync(
    join(dir, 'docs/inbox.md'),
    `# Inbox\n\nThe prose at the top, which is not an entry.\n\n${lines
      .map((line) => `${line}\n`)
      .join('')}`,
  )

  // The remote branches the fixture wants, as the refs a fetch would leave:
  // one empty commit to point them at, and the identity on the command line so
  // the case does not depend on the git config of whoever runs it.
  if ((opts.branches ?? []).length > 0 || opts.commit === true) {
    execFileSync(
      'git',
      [
        '-c',
        'user.email=board@example.invalid',
        '-c',
        'user.name=Board',
        'commit',
        '--allow-empty',
        '-q',
        '-m',
        'base',
      ],
      { cwd: dir },
    )
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: dir,
      encoding: 'utf8',
    }).trim()
    for (const name of opts.branches ?? []) {
      execFileSync('git', ['update-ref', `refs/remotes/origin/${name}`, sha], {
        cwd: dir,
      })
    }
  }

  const log = join(dir, 'gh.log')
  writeFileSync(log, '')
  const run = spawnSync(script, opts.args ?? (opts.json ? ['--json'] : []), {
    cwd: dir,
    encoding: 'utf8',
    env: {
      PATH: opts.noGh ? bareBin : `${bin}:${process.env.PATH}`,
      HOME: process.env.HOME ?? dir,
      GH_LOG: log,
      GH_COMMENTS: join(dir, 'comments.txt'),
      STUB_PRS: opts.prs ?? '[]',
      ...(opts.fail === undefined ? {} : { STUB_FAIL: opts.fail }),
    },
  })
  return {
    status: run.status,
    stdout: run.stdout,
    stderr: run.stderr,
    lines: run.stdout.replace(/\n$/, '').split('\n'),
    dir,
  }
}

function row(lines: string[], id: string): string | undefined {
  return lines.find((line) => line.trim().startsWith(`${id} `))
}

// The rows of one section: the lines after its head, up to the blank line
// that closes it.
function section(lines: string[], head: string): string[] {
  const start = lines.findIndex((line) => line.startsWith(head))
  if (start === -1) return []
  const rows: string[] = []
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith('  ')) break
    rows.push(line)
  }
  return rows
}

// An ADR with its work order, the way ADR-0003 writes one: numbered steps,
// the slices named by id, and the last two steps that name none. The two
// headings stay in Italian: they are the section names of a real ADR, and
// `## Ordine di lavoro` is the one board.sh matches.
function adr(title: string, steps: string[]): string {
  return [
    `# ${title}`,
    '',
    '## Decisione',
    '',
    '1. A numbered decision that is not a step, and names S99.',
    '',
    '## Ordine di lavoro',
    '',
    ...steps,
    '',
  ].join('\n')
}

const sevenSteps = [
  '1. S01, the documents on main.',
  '2. S02, the skills commit on main.',
  '3. S03, the judge once.',
  '4. S04 and S05, the skill that produces code.',
  '5. S06, the skills do not repair the harness.',
  '6. Tipoff ready: the stages rerun from main.',
  '7. Fable, with Lionel: the audit of the verdicts.',
]

// S01 to S06 as a backlog: done up to `done`, todo after.
function planSlices(done: number): Slice[] {
  return Array.from({ length: 6 }, (_, i) => ({
    id: `S0${i + 1}`,
    title: `Slice ${i + 1}`,
    status: i < done ? 'done' : 'todo',
    human: true,
  }))
}

const pr = (number: number, title: string, labels: string[]): unknown => ({
  number,
  title,
  labels: labels.map((name) => ({ name })),
})

// S56: the first line of the screen says which commit of the harness each
// stage of /harness-init installed here, so that whoever opens a cold session
// knows how old the rules they are reading are.
describe('the Harness line says where the repo took the harness from', () => {
  const stamped: Stamp = {
    harness: 'git@github.com:lio/harness.git',
    stages: {
      local: {
        sha: '8f21c4d9a2b3c4d5e6f708192a3b4c5d6e7f8091',
        date: '2026-09-20',
      },
      ci: {
        sha: '3a2b1c0f9e8d7c6b5a4938271605f4e3d2c1b0a9',
        date: '2026-09-21',
      },
      judge: {
        sha: '9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8091a2b3c4',
        date: '2026-09-22',
      },
    },
  }

  it('prints the three stages with the short sha and the date of each', () => {
    const { lines, status } = board({ stamp: stamped })
    expect(status).toBe(0)
    expect(lines[0]).toBe(
      'Harness  local 8f21c4d 2026-09-20  ci 3a2b1c0 2026-09-21' +
        '  judge 9d4e5f6 2026-09-22',
    )
  })

  it('is the first section, with a blank line before the slices', () => {
    const { lines } = board({ stamp: stamped })
    expect(lines[1]).toBe('')
    expect(lines[2]).toMatch(/^Slices\b/)
  })

  it('prints a dash for a stage never installed', () => {
    const { lines, status } = board({
      stamp: {
        harness: 'git@github.com:lio/harness.git',
        stages: { local: stamped.stages!.local! },
      },
    })
    expect(status).toBe(0)
    expect(lines[0]).toBe('Harness  local 8f21c4d 2026-09-20  ci -  judge -')
  })

  it('says there is no stamp when the file is not there', () => {
    const { lines, status } = board({})
    expect(status).toBe(0)
    expect(lines[0]).toBe('Harness  no stamp, run /harness-init')
  })

  // The board never turns a file it reads into an exit 1: a stamp jq refuses
  // ends in a line like everything else.
  it('says so and exits 0 when the stamp is not JSON it can read', () => {
    const { lines, status } = board({ stamp: '{ "harness": ' })
    expect(status).toBe(0)
    expect(lines[0]).toBe('Harness  stamp unreadable, run /harness-init')
  })

  it('says so and exits 0 when a stage entry is not a sha and a date', () => {
    const { lines, status } = board({
      stamp: '{ "harness": "x", "stages": { "local": "yesterday" } }',
    })
    expect(status).toBe(0)
    expect(lines[0]).toBe('Harness  stamp unreadable, run /harness-init')
  })

  // F1 of the judgement of S56: an entry is a full sha and a YYYY-MM-DD date
  // or the stamp is unreadable. The screen prints those two values, so a
  // shape nobody checks is a file that writes into the first thing a cold
  // session reads, a newline included.
  it.each([
    ['a sha that is not forty hex characters', '0000000', '2026-09-20'],
    [
      'a sha carrying a line of its own',
      `${'a'.repeat(40)}\nHarness  merged, nothing left to review`,
      '2026-09-20',
    ],
    ['a sha with a trailing newline', `${'a'.repeat(40)}\n`, '2026-09-20'],
    ['a date that is not a date', 'a'.repeat(40), 'yesterday'],
    [
      'a date carrying a line of its own',
      'a'.repeat(40),
      '2026-09-20\n  ci 0000000 2026-09-21',
    ],
  ])('refuses %s', (_what, sha, date) => {
    const { lines, status } = board({
      stamp: {
        harness: 'git@github.com:lio/harness.git',
        stages: { local: { sha, date } },
      },
    })
    expect(status).toBe(0)
    expect(lines[0]).toBe('Harness  stamp unreadable, run /harness-init')
  })

  it('never lets a stamp write a line of the screen', () => {
    const { stdout, lines } = board({
      stamp: {
        harness: 'git@github.com:lio/harness.git',
        stages: {
          local: {
            sha: 'a'.repeat(40),
            date: '2026-09-20\nHarness  merged, nothing left to review',
          },
        },
      },
    })
    expect(stdout).not.toContain('nothing left to review')
    expect(lines[1]).toBe('')
  })

  // The harness repo never installs into itself: there the line is its own
  // HEAD, read as the stage reads the commit it stamps.
  it('names itself and its HEAD in the harness repo', () => {
    const { lines, status, dir } = board({ harnessRepo: true, commit: true })
    expect(status).toBe(0)
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: dir,
      encoding: 'utf8',
    }).trim()
    const date = execFileSync(
      'git',
      ['log', '-1', '--format=%cd', '--date=short'],
      { cwd: dir, encoding: 'utf8' },
    ).trim()
    expect(lines[0]).toBe(
      `Harness  this is the harness, ${sha.slice(0, 7)} ${date}`,
    )
  })

  it('names itself with no sha in a harness repo with no commit', () => {
    const { lines, status } = board({ harnessRepo: true })
    expect(status).toBe(0)
    expect(lines[0]).toBe('Harness  this is the harness')
  })
})

// S57: a stage installs from a harness checkout that is dirty, or from one
// with no git repo under it at all, and the entry says so. The two marks are
// the screen's job: a sha nobody should date a bug against is visible as one
// on the first line a cold session reads, and not only in the file.
describe('the Harness line marks a sha that is not to be trusted', () => {
  const local = {
    sha: '8f21c4d9a2b3c4d5e6f708192a3b4c5d6e7f8091',
    date: '2026-09-20',
  }
  const ci = {
    sha: '3a2b1c0f9e8d7c6b5a4938271605f4e3d2c1b0a9',
    date: '2026-09-21',
  }

  it('follows the short sha of a dirty install with a +', () => {
    const { lines, status } = board({
      stamp: {
        harness: 'git@github.com:lio/harness.git',
        stages: { local: { ...local, dirty: true }, ci },
      },
    })
    expect(status).toBe(0)
    expect(lines[0]).toBe(
      'Harness  local 8f21c4d+ 2026-09-20  ci 3a2b1c0 2026-09-21  judge -',
    )
  })

  it('prints a question mark where the sha is null', () => {
    const { lines, status } = board({
      stamp: {
        harness: 'git@github.com:lio/harness.git',
        stages: { local, judge: { sha: null, date: null } },
      },
    })
    expect(status).toBe(0)
    expect(lines[0]).toBe('Harness  local 8f21c4d 2026-09-20  ci -  judge ?')
  })

  // The entry is written by a machine and the key only when it is true, so
  // anything else under `dirty` is a file somebody edited by hand: the board
  // reads it the way it reads a sha of the wrong shape.
  it('refuses a dirty that is not true', () => {
    const { lines, status } = board({
      stamp: {
        harness: 'git@github.com:lio/harness.git',
        stages: { local: { ...local, dirty: false } },
      },
    })
    expect(status).toBe(0)
    expect(lines[0]).toBe('Harness  stamp unreadable, run /harness-init')
  })

  // Null is no git repo under the skill, which leaves neither of the two
  // values: an entry holding one of them comes from nowhere the skill writes.
  it.each([
    ['a null sha next to a date', null, '2026-09-20'],
    ['a sha next to a null date', local.sha, null],
  ])('refuses %s', (_what, sha, date) => {
    const { lines, status } = board({
      stamp: {
        harness: 'git@github.com:lio/harness.git',
        stages: { local: { sha, date } },
      },
    })
    expect(status).toBe(0)
    expect(lines[0]).toBe('Harness  stamp unreadable, run /harness-init')
  })
})

describe('the Slice section counts the done and lists the rest', () => {
  const slices: Slice[] = [
    { id: 'S01', title: 'A closed slice', status: 'done' },
    { id: 'S02', title: 'Another closed slice', status: 'done' },
    {
      id: 'S03',
      title: 'The open slice',
      status: 'todo',
      blocked_by: 'S02',
      tier: 2,
      human: true,
    },
  ]

  it('prints the done count in the section head', () => {
    const { lines, status } = board({ slices })
    expect(status).toBe(0)
    expect(lines[2]).toMatch(/^Slices\b/)
    expect(lines[2]).toContain('2 done')
  })

  it('does not list the done slices', () => {
    const { stdout } = board({ slices })
    expect(stdout).not.toContain('A closed slice')
    expect(stdout).not.toContain('Another closed slice')
  })

  // S45: the six column names, read as one string with their padding, so that
  // a head that goes back to Italian is red and not only a head that moves a
  // column: the rows below assert their own alignment and pass whatever the
  // head says.
  it('heads the table with the six column names', () => {
    const { lines } = board({ slices })
    expect(lines[3]).toBe(
      '  ' +
        'id'.padEnd(6) +
        'status'.padEnd(12) +
        'blocked_by'.padEnd(12) +
        'tier'.padEnd(6) +
        'human'.padEnd(7) +
        'title',
    )
  })

  it('gives every open slice a row with its six fields', () => {
    const { lines } = board({ slices })
    const line = row(lines, 'S03')
    expect(line).toBeDefined()
    expect(line).toContain('todo')
    expect(line).toContain('S02')
    expect(line).toContain('2')
    expect(line).toContain('true')
    expect(line).toContain('The open slice')
  })

  // S22: blocked_by can name an ADR and not only a slice, and the row says why
  // the slice is still: `held by ADR-<nnnn>` in place of the raw list.
  it('prints held by ADR-<nnnn> for an ADR in blocked_by', () => {
    const { lines, status } = board({
      slices: [
        {
          id: 'S05',
          title: 'Held by a decision',
          status: 'todo',
          blocked_by: 'ADR-0002',
        },
      ],
    })
    expect(status).toBe(0)
    expect(row(lines, 'S05')).toContain('ADR-0002')
    expect(row(lines, 'S05')).toMatch(
      /^ {2}S05 +todo +held by ADR-0002 +1 +false +Held by a decision$/,
    )
  })

  it('prints the slices and the ADR when blocked_by names both', () => {
    const { lines } = board({
      slices: [
        { id: 'S01', title: 'Open', status: 'todo' },
        {
          id: 'S05',
          title: 'Behind a slice and a decision',
          status: 'todo',
          blocked_by: 'S01, ADR-0002',
        },
      ],
    })
    expect(row(lines, 'S05')).toMatch(
      /^ {2}S05 +todo +S01, held by ADR-0002 +1 +false +Behind a slice/,
    )
  })

  it('keeps the columns aligned when a blocked_by is wider than its column', () => {
    const { lines } = board({
      slices: [
        { id: 'S01', title: 'The first', status: 'todo' },
        {
          id: 'S02',
          title: 'The second',
          status: 'todo',
          blocked_by: 'S01, ADR-0002',
        },
      ],
    })
    const at = (id: string, text: string): number =>
      (row(lines, id) ?? '').indexOf(text)
    expect(at('S01', 'The first')).toBeGreaterThan(0)
    expect(at('S01', 'The first')).toBe(at('S02', 'The second'))
    expect(at('S01', 'false')).toBe(at('S02', 'false'))
  })
})

describe('the Inbox section lists the open lines', () => {
  it('prints the date and the text of every line', () => {
    const { stdout } = board({
      inbox: [
        '- 2026-09-15: the `role` of a verdict does not reach the review log',
        '- 2026-09-16: the tier line in the AGENTS.md template is old',
      ],
    })
    expect(stdout).toContain('2026-09-15')
    expect(stdout).toContain('the `role` of a verdict')
    expect(stdout).toContain('2026-09-16')
    expect(stdout).toContain('the tier line')
  })

  it('does not take the prose of the file for a line', () => {
    const { stdout } = board({})
    expect(stdout).not.toContain('The prose at the top')
  })
})

describe('the PR section reads the open PRs from gh', () => {
  it('prints number, tier label, judge label and title', () => {
    const { stdout } = board({
      prs: JSON.stringify([
        pr(34, 'The title of the PR', ['tier:2', 'judge:correctness:pass']),
      ]),
    })
    expect(stdout).toContain('#34')
    expect(stdout).toContain('tier:2')
    expect(stdout).toContain('judge:correctness:pass')
    expect(stdout).toContain('The title of the PR')
  })

  // S32: judge:correctness:escalate, the longest judge label policy.sh puts,
  // is 26 characters in a column of 25: without widening the column the title
  // sticks to the label and the row falls out of the alignment.
  it('widens the judge column on the longest label it prints', () => {
    const { lines, status } = board({
      prs: JSON.stringify([
        pr(
          34,
          'Alfa, the long title of a PR that nobody would cut by hand and that runs past the line',
          ['tier:2', 'judge:correctness:escalate'],
        ),
        pr(
          35,
          'Beta, the long title of the second PR, just as long and just as useless',
          ['tier:1', 'judge:security:approve'],
        ),
      ]),
    })
    expect(status).toBe(0)
    const rows = section(lines, 'Open PRs')
    const escalate = rows.find((line) => line.includes('#34')) ?? ''
    const approve = rows.find((line) => line.includes('#35')) ?? ''
    const label = 'judge:correctness:escalate'
    expect(escalate[escalate.indexOf(label) + label.length]).toBe(' ')
    const start = escalate.indexOf('Alfa')
    expect(start).toBeGreaterThan(0)
    expect(approve.indexOf('Beta')).toBe(start)
    for (const line of rows) expect(line.length).toBeLessThanOrEqual(100)
  })

  // S32: the column does not widen for no reason. With the labels of today,
  // which fit the 25 characters, the two sections print the rows of today.
  it('prints the rows of today when the labels fit the column', () => {
    const { lines } = board({
      prs: JSON.stringify([
        pr(34, 'A short title', ['tier:1', 'judge:security:approve']),
        pr(35, 'Another title', ['tier:3']),
      ]),
      specs: [{ slug: 'x', status: 'draft', intent: 'docs/intent/a.md' }],
    })
    expect(section(lines, 'Open PRs')).toEqual([
      '  ' +
        '#34'.padEnd(7) +
        'tier:1'.padEnd(8) +
        'judge:security:approve'.padEnd(25) +
        'A short title',
      '  ' +
        '#35'.padEnd(7) +
        'tier:3'.padEnd(8) +
        '-'.padEnd(25) +
        'Another title',
    ])
    expect(section(lines, 'Waiting on a human')).toEqual([
      '  ' + '#35'.padEnd(7) + 'tier:3'.padEnd(25) + 'Another title',
      '  ' + 'spec'.padEnd(7) + 'draft'.padEnd(25) + 'docs/specs/SPEC-x.md',
    ])
  })
})

// "Never a section that disappears": whoever reads at cold context has to be
// able to say that there was nothing, not wonder whether the board skipped
// the section.
describe('an empty section is a line that says so', () => {
  it('says it for all three at once', () => {
    const { lines, status } = board({ slices: [], inbox: [], prs: '[]' })
    expect(status).toBe(0)
    expect(lines).toContain('  no open slices')
    expect(lines).toContain('  inbox empty')
    expect(lines).toContain('  no open PRs')
  })

  it('keeps the Slice head with the done count when nothing is open', () => {
    const { lines } = board({
      slices: [{ id: 'S01', title: 'A closed slice', status: 'done' }],
    })
    expect(lines[2]).toContain('1 done')
    expect(lines).toContain('  no open slices')
  })
})

describe('gh missing or logged out is a line, not a failure', () => {
  it('says so and exits 0 when gh is not on the PATH', () => {
    const { lines, status } = board({ noGh: true })
    expect(status).toBe(0)
    expect(lines).toContain('  gh not available')
    expect(lines).not.toContain('  no open PRs')
  })

  it('says so and exits 0 when the pr list call fails', () => {
    const { lines, status } = board({ fail: 'pr list' })
    expect(status).toBe(0)
    expect(lines).toContain('  gh not available')
  })

  it('leaves prs null in the JSON when gh is not there', () => {
    const { stdout, status } = board({ noGh: true, json: true })
    expect(status).toBe(0)
    expect(JSON.parse(stdout).prs).toBeNull()
  })
})

// "One screen" is forty lines. The fixture is the backlog of this repo at the
// time of the slice, rounded up: twenty slices, fifteen done, seven inbox
// lines and two open PRs.
describe('the screen fits in forty lines', () => {
  const slices: Slice[] = Array.from({ length: 20 }, (_, i) => ({
    id: `S${String(i + 1).padStart(2, '0')}`,
    title: `The long title of slice number ${i + 1}, which wraps if nobody cuts it`,
    status: i < 15 ? 'done' : 'todo',
    blocked_by: i === 19 ? 'S19' : 'none',
    tier: 2,
  }))
  const inbox = Array.from(
    { length: 7 },
    (_, i) =>
      `- 2026-09-1${i}: an inbox line as long as the real ones, which says a fact, its reason and what should be done, and does not fit one terminal line`,
  )
  const prs = JSON.stringify([
    pr(34, 'The first open PR', ['tier:2']),
    pr(35, 'The second open PR', ['tier:1']),
  ])

  it('stays under forty on twenty slices and seven inbox lines', () => {
    const { lines, status } = board({ slices, inbox, prs })
    expect(status).toBe(0)
    expect(lines.length).toBeLessThanOrEqual(40)
    // Every row is there: the board cuts in width, never in number.
    expect(
      lines.filter((line) => /^\s+S(1[6-9]|20)\s/.test(line)),
    ).toHaveLength(5)
  })

  // S21: the same fixture plus an ADR of seven steps, and the screen carries
  // what waits for a human, the plan and the next action too.
  it('stays under forty with the plan of seven steps and the next action', () => {
    const { lines, status } = board({
      slices,
      inbox,
      prs,
      decisions: {
        'ADR-0003-the-plan.md': adr('ADR-0003', sevenSteps),
        'ADR-0004-no-work-order.md': '# ADR-0004\n\n## Decisione\n\nOne.\n',
      },
    })
    expect(status).toBe(0)
    expect(lines.length).toBeLessThanOrEqual(40)
    expect(
      lines.filter((line) => /^\s+S(1[6-9]|20)\s/.test(line)),
    ).toHaveLength(5)
    expect(
      section(lines, 'Plan').filter((line) => /^\s+\d\s/.test(line)),
    ).toHaveLength(7)
    expect(section(lines, 'Plan')).toContain('  beyond: S07-S20')
    expect(lines[lines.length - 1]).toBe(
      'next action: /next, because eligible slice: S16, S17, S18, S19',
    )
  })

  // S38: the same fixture, with three of the open slices held by three
  // different ADRs, which the human section prints in three more rows.
  it('stays under forty with three ADRs that hold a slice', () => {
    const decisions: Record<string, string> = {
      'ADR-0003-the-plan.md': adr('ADR-0003', sevenSteps),
    }
    for (const n of [5, 6, 7]) {
      decisions[`ADR-000${n}-a-decision.md`] =
        `# ADR-000${n}: a decision that holds a slice still and waits for a human to read it again\n`
    }
    const held = slices.map((slice, i) =>
      i >= 15 && i <= 17 ? { ...slice, blocked_by: `ADR-000${i - 10}` } : slice,
    )
    const { lines, status } = board({ slices: held, inbox, prs, decisions })
    expect(status).toBe(0)
    expect(lines.length).toBeLessThanOrEqual(40)
    expect(
      section(lines, 'Waiting on a human').filter((line) =>
        /ADR-000[567]/.test(line),
      ),
    ).toHaveLength(3)
  })
})

// S21. What waits for a human is a closed list: the three labels and the
// draft specs.
describe('the human section lists what waits for a human, and nothing else', () => {
  const head = 'Waiting on a human'

  it('lists the PRs with human-gate, needs-human or tier:3 and the draft specs', () => {
    const { lines, status } = board({
      prs: JSON.stringify([
        pr(34, 'The backlog PR', ['tier:1', 'human-gate']),
        pr(35, 'The PR the policy stopped', ['tier:2', 'needs-human']),
        pr(36, 'The PR at tier three', ['tier:3']),
        pr(37, 'The PR the policy merges', ['tier:2']),
      ]),
      specs: [
        { slug: 'interview', status: 'draft', intent: 'docs/intent/a.md' },
        { slug: 'approved', status: 'approved', intent: 'docs/intent/b.md' },
      ],
    })
    expect(status).toBe(0)
    const rows = section(lines, head)
    expect(rows).toHaveLength(4)
    expect(rows.find((line) => line.includes('#34'))).toContain('human-gate')
    expect(rows.find((line) => line.includes('#34'))).toContain(
      'The backlog PR',
    )
    expect(rows.find((line) => line.includes('#35'))).toContain('needs-human')
    expect(rows.find((line) => line.includes('#36'))).toContain('tier:3')
    expect(rows.join('\n')).not.toContain('#37')
    expect(
      rows.find((line) => line.includes('docs/specs/SPEC-interview.md')),
    ).toContain('draft')
    expect(rows.join('\n')).not.toContain('SPEC-approved')
  })

  // S32: the three human labels joined make 29 characters in the same cell of
  // 25, and the row of the draft spec starts at the column of the others.
  it('widens the label column on the longest label group it prints', () => {
    const { lines, status } = board({
      prs: JSON.stringify([
        pr(
          34,
          'Alfa, the long title of the PR that carries all three human labels at once',
          ['human-gate', 'needs-human', 'tier:3'],
        ),
        pr(
          35,
          'Beta, the long title of the PR that carries only one and waits all the same',
          ['tier:2', 'human-gate'],
        ),
      ]),
      specs: [
        { slug: 'interview', status: 'draft', intent: 'docs/intent/a.md' },
      ],
    })
    expect(status).toBe(0)
    const rows = section(lines, head)
    const three = rows.find((line) => line.includes('#34')) ?? ''
    const one = rows.find((line) => line.includes('#35')) ?? ''
    const spec = rows.find((line) => line.includes('SPEC-interview')) ?? ''
    const labels = 'human-gate needs-human tier:3'
    expect(three[three.indexOf(labels) + labels.length]).toBe(' ')
    const start = three.indexOf('Alfa')
    expect(start).toBeGreaterThan(0)
    expect(one.indexOf('Beta')).toBe(start)
    expect(spec.indexOf('docs/specs/')).toBe(start)
    for (const line of rows) expect(line.length).toBeLessThanOrEqual(100)
  })

  it('says so when nothing waits', () => {
    const { lines } = board({
      prs: JSON.stringify([pr(37, 'A PR', ['tier:2'])]),
      specs: [{ slug: 'done', status: 'approved', intent: 'x' }],
    })
    expect(section(lines, head)).toEqual(['  nothing waits for a human'])
  })

  it('does not say nothing waits when gh could not answer', () => {
    const { lines, status } = board({
      fail: 'pr list',
      specs: [{ slug: 'interview', status: 'draft', intent: 'x' }],
    })
    expect(status).toBe(0)
    const rows = section(lines, head)
    expect(rows).toContain('  gh not available')
    expect(rows.join('\n')).toContain('SPEC-interview')
    expect(rows).not.toContain('  nothing waits for a human')
  })
})

// S38. A slice held by an ADR stays `todo` until a human takes the ADR off,
// and until now nothing said when that was due. The human section carries one
// row per ADR, with the title of the ADR and the ids of the slices: the
// script does not read the `## Blocked` section and does not weigh its
// condition, which stays a human's.
describe('the human section lists the ADRs that hold a slice still', () => {
  const head = 'Waiting on a human'
  // An ADR as docs/decisions/ writes them: the title in the first heading,
  // after the id, and no `## Ordine di lavoro`, which would make this the
  // plan.
  const decision = (id: string, title: string): string =>
    [
      `# ${id}: ${title}`,
      '',
      'Data: 2026-09-10.',
      '',
      '## Decisione',
      '',
      'One.',
      '',
    ].join('\n')
  const parteAlta = 'the upper part of the chain before the maintenance'
  const decisions = {
    'ADR-0002-the-upper-part.md': decision('ADR-0002', parteAlta),
  }
  const adrRows = (lines: string[]): string[] =>
    section(lines, head).filter((line) => /ADR-[0-9]{4}/.test(line))

  it('names the ADR, its title and the ids of the slices, in order of id', () => {
    const { lines, status } = board({
      decisions,
      slices: [
        {
          id: 'S08',
          title: 'Close does not lose a verdict',
          status: 'todo',
          blocked_by: 'ADR-0002',
        },
        {
          id: 'S05',
          title: 'Tier 2 does not escalate by itself',
          status: 'todo',
          blocked_by: 'S01, ADR-0002',
        },
      ],
    })
    expect(status).toBe(0)
    const rows = adrRows(lines)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toContain('ADR-0002')
    expect(rows[0]).toContain(parteAlta)
    expect(rows[0]).toContain('S05, S08')
  })

  it('gives one row whatever the Blocked sections of the two slices say', () => {
    const { lines } = board({
      decisions,
      slices: [
        {
          id: 'S05',
          title: 'Tier 2',
          status: 'todo',
          blocked_by: 'ADR-0002',
          blockedNote: 'Waits for the plan to reach the maintenance.',
        },
        {
          id: 'S08',
          title: 'Close',
          status: 'todo',
          blocked_by: 'ADR-0002',
          blockedNote:
            'Waits for something else entirely, that nobody reads again.',
        },
      ],
    })
    const rows = adrRows(lines)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toContain('S05, S08')
    expect(rows.join('\n')).not.toContain('Waits for the plan')
    expect(rows.join('\n')).not.toContain('something else entirely')
  })

  it('says nothing for an ADR only done slices name, nor for a blocked_by of slices', () => {
    const { lines } = board({
      decisions,
      slices: [
        {
          id: 'S05',
          title: 'Closed for a while',
          status: 'done',
          blocked_by: 'ADR-0002',
        },
        {
          id: 'S09',
          title: 'Held by a slice',
          status: 'todo',
          blocked_by: 'S05',
        },
      ],
    })
    expect(section(lines, head)).toEqual(['  nothing waits for a human'])
  })

  it('prints the id alone when the ADR has no file, and exits 0', () => {
    const { lines, status } = board({
      slices: [
        {
          id: 'S05',
          title: 'Held by a decision',
          status: 'todo',
          blocked_by: 'ADR-0002',
        },
      ],
    })
    expect(status).toBe(0)
    const rows = adrRows(lines)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatch(/^\s+adr\s+ADR-0002 S05$/)
  })

  it('comes after the PRs and the draft specs, with the titles in one column', () => {
    const { lines } = board({
      decisions,
      prs: JSON.stringify([pr(34, 'The backlog PR', ['tier:1', 'human-gate'])]),
      specs: [
        { slug: 'interview', status: 'draft', intent: 'docs/intent/a.md' },
      ],
      slices: [
        {
          id: 'S05',
          title: 'Held by a decision',
          status: 'todo',
          blocked_by: 'ADR-0002',
        },
      ],
    })
    const rows = section(lines, head)
    expect(rows).toHaveLength(3)
    const [prRow = '', specRow = '', adrRow = ''] = rows
    expect(prRow).toContain('#34')
    expect(specRow).toContain('SPEC-interview')
    expect(adrRow).toContain('ADR-0002')
    const start = prRow.indexOf('The backlog PR')
    expect(start).toBeGreaterThan(0)
    expect(specRow.indexOf('docs/specs/')).toBe(start)
    expect(adrRow.indexOf(parteAlta)).toBe(start)
    for (const line of rows) expect(line.length).toBeLessThanOrEqual(100)
  })

  it('sorts the rows by ADR id, and says nothing waits no more', () => {
    const { lines } = board({
      decisions: {
        ...decisions,
        'ADR-0004-the-judge.md': decision(
          'ADR-0004',
          'the judge in local only',
        ),
      },
      slices: [
        {
          id: 'S05',
          title: 'Held by the fourth',
          status: 'todo',
          blocked_by: 'ADR-0004',
        },
        {
          id: 'S08',
          title: 'Held by the second',
          status: 'todo',
          blocked_by: 'ADR-0002',
        },
      ],
    })
    const rows = section(lines, head)
    expect(rows).not.toContain('  nothing waits for a human')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toContain('ADR-0002 S08')
    expect(rows[1]).toContain('ADR-0004 S05')
  })
})

// S21. The plan in force is derived from the ADRs and from no new file.
describe('the plan in force is the latest ADR with a work order', () => {
  it('takes the higher ADR number when two have a work order', () => {
    const { lines, status } = board({
      decisions: {
        'ADR-0001-the-old.md': adr('ADR-0001', [
          '1. S41, the step of the old plan.',
        ]),
        'ADR-0002-the-new.md': adr('ADR-0002', sevenSteps),
      },
    })
    expect(status).toBe(0)
    expect(lines).toContain('Plan  ADR-0002')
    const rows = section(lines, 'Plan')
    expect(rows.some((line) => line.includes('S01, the documents'))).toBe(true)
    expect(rows.some((line) => line.includes('S41'))).toBe(false)
  })

  it('skips a newer ADR that has no work order, as ADR-0004 has none', () => {
    const { lines } = board({
      decisions: {
        'ADR-0009-with-work-order.md': adr('ADR-0009', sevenSteps),
        'ADR-0010-no-work-order.md': '# ADR-0010\n\n## Decisione\n\n1. S77.\n',
      },
    })
    expect(lines).toContain('Plan  ADR-0009')
    expect(section(lines, 'Plan').join('\n')).not.toContain('S77')
  })

  it('does not take a numbered list of another section for a step', () => {
    const { lines } = board({
      decisions: { 'ADR-0002-the-new.md': adr('ADR-0002', sevenSteps) },
    })
    const rows = section(lines, 'Plan')
    expect(rows.join('\n')).not.toContain('S99')
    expect(rows).toHaveLength(7)
  })

  it('says there is no plan when no ADR has a work order', () => {
    const { lines, status } = board({
      decisions: {
        'ADR-0001-x.md': '# ADR-0001\n\n## Decisione\n\nNothing.\n',
      },
    })
    expect(status).toBe(0)
    expect(section(lines, 'Plan')).toEqual(['  no plan in force'])
  })

  it('says there is no plan when docs/decisions/ does not exist', () => {
    const { lines, status } = board({})
    expect(status).toBe(0)
    expect(section(lines, 'Plan')).toEqual(['  no plan in force'])
  })
})

describe('every step of the plan carries its mark', () => {
  const decisions = { 'ADR-0003-the-plan.md': adr('ADR-0003', sevenSteps) }
  const step = (lines: string[], text: string): string =>
    section(lines, 'Plan').find((line) => line.includes(text)) ?? ''

  it('marks done a step whose slices are all done', () => {
    const { lines } = board({ decisions, slices: planSlices(4) })
    expect(step(lines, 'S01, the documents')).toMatch(/\bdone\b/)
    expect(step(lines, 'S03, the judge')).toMatch(/\bdone\b/)
  })

  it('marks current the first step not done, even with one slice done', () => {
    // S04 is done and S05 is not: step 4 is not done, and it is the first.
    const { lines } = board({ decisions, slices: planSlices(4) })
    expect(step(lines, 'S04 and S05')).toMatch(/\bcurrent\b/)
    expect(step(lines, 'S04 and S05')).not.toMatch(/\bdone\b/)
    expect(step(lines, 'S06, the skills')).not.toMatch(/\bcurrent\b/)
    expect(
      section(lines, 'Plan').filter((line) => /\bcurrent\b/.test(line)),
    ).toHaveLength(1)
  })

  it('marks a manual step the one that names no slice', () => {
    const { lines } = board({ decisions, slices: planSlices(4) })
    expect(step(lines, 'Tipoff ready')).toMatch(/\bmanual\b/)
    expect(step(lines, 'Fable, with Lionel')).toMatch(/\bmanual\b/)
    expect(step(lines, 'Tipoff ready')).not.toMatch(/\bcurrent\b/)
  })

  it('makes a manual step current when every step before it is done', () => {
    const { lines } = board({ decisions, slices: planSlices(6) })
    expect(step(lines, 'S06, the skills')).toMatch(/\bdone\b/)
    expect(step(lines, 'Tipoff ready')).toMatch(/\bcurrent\b/)
    expect(step(lines, 'Tipoff ready')).toMatch(/\bmanual\b/)
    expect(step(lines, 'Fable, with Lionel')).not.toMatch(/\bcurrent\b/)
  })

  it('takes a slice that is not on the backlog for a step not done', () => {
    const { lines } = board({ decisions, slices: [] })
    expect(step(lines, 'S01, the documents')).toMatch(/\bcurrent\b/)
  })
})

describe('the plan says when the backlog went beyond it', () => {
  const thirteen = [
    '1. S09, the documents on main.',
    '2. S13, the skills do not repair the harness.',
    '3. Tipoff ready.',
  ]
  const decisions = { 'ADR-0003-the-plan.md': adr('ADR-0003', thirteen) }
  const done = (id: string): Slice => ({ id, title: id, status: 'done' })

  it('prints the range of the slices past the highest id of the plan', () => {
    const { lines } = board({
      decisions,
      slices: ['S09', 'S13', 'S14', 'S15', 'S16', 'S17'].map(done),
    })
    expect(section(lines, 'Plan')).toContain('  beyond: S14-S17')
  })

  it('prints the one slice past the plan alone', () => {
    const { lines } = board({
      decisions,
      slices: ['S09', 'S13', 'S17'].map(done),
    })
    expect(section(lines, 'Plan')).toContain('  beyond: S17')
  })

  it('prints no beyond line when no slice is past the plan', () => {
    const { lines } = board({
      decisions,
      slices: ['S09', 'S12', 'S13'].map(done),
    })
    expect(section(lines, 'Plan')).toHaveLength(3)
    expect(section(lines, 'Plan').some((line) => line.includes('beyond'))).toBe(
      false,
    )
  })
})

// S21. The next action is worked out by the script, with a rule in a fixed
// order: two sessions, the same answer.
describe('the next action is the first rule that fires, in a fixed order', () => {
  const last = (lines: string[]): string => lines[lines.length - 1] ?? ''

  // Every rule fires on this fixture. Each case takes away the facts of the
  // rules before its own, so it proves the order and not only its rule.
  const everything = (): Options => ({
    prs: JSON.stringify([
      pr(35, 'A PR the policy merges', ['tier:2']),
      pr(34, 'The backlog PR', ['tier:1', 'human-gate']),
    ]),
    slices: [
      {
        id: 'S18',
        title: 'The eligible slice',
        status: 'todo',
        spec: 'docs/specs/SPEC-a.md',
      },
    ],
    specs: [
      { slug: 'a', status: 'approved', intent: 'docs/intent/a.md' },
      { slug: 'b', status: 'approved', intent: 'docs/intent/b.md' },
    ],
    intents: ['a', 'b', 'c'],
    decisions: {
      'ADR-0003-the-plan.md': adr('ADR-0003', [
        '1. S18, the board.',
        '2. Tipoff ready.',
      ]),
    },
    inbox: ['- 2026-09-15: a line', '- 2026-09-16: another line'],
  })
  const notEligible = (o: Options): Options => ({
    ...o,
    prs: '[]',
    slices: (o.slices ?? []).map((s) => ({ ...s, human: true })),
  })
  const sliced = (o: Options): Options => ({
    ...notEligible(o),
    specs: [{ slug: 'a', status: 'approved', intent: 'docs/intent/a.md' }],
    intents: ['a', 'c'],
  })
  const specced = (o: Options): Options => ({ ...sliced(o), intents: ['a'] })

  it('1. a PR that waits for a human', () => {
    const { lines, status } = board(everything())
    expect(status).toBe(0)
    expect(last(lines)).toBe(
      'next action: review PR #34, because PR waiting on a human: #34 human-gate',
    )
  })

  it('1. takes the lowest number when more than one PR waits', () => {
    const { lines } = board({
      ...everything(),
      prs: JSON.stringify([
        pr(40, 'The newest', ['tier:3']),
        pr(36, 'The oldest', ['needs-human', 'tier:2']),
      ]),
    })
    expect(last(lines)).toBe(
      'next action: review PR #36, because PR waiting on a human: #36 needs-human',
    )
  })

  it('2. an eligible slice, /next', () => {
    const { lines } = board({ ...everything(), prs: '[]' })
    expect(last(lines)).toBe('next action: /next, because eligible slice: S18')
  })

  it('2. is the rule when gh cannot say whether a PR waits', () => {
    const { lines, status } = board({ ...everything(), fail: 'pr list' })
    expect(status).toBe(0)
    expect(last(lines)).toBe('next action: /next, because eligible slice: S18')
  })

  it('3. an approved spec that no slice names, /slice', () => {
    const { lines } = board(notEligible(everything()))
    expect(last(lines)).toBe(
      'next action: /slice docs/specs/SPEC-b.md, because approved spec with no slice: SPEC-b.md',
    )
  })

  it('3. does not fire for a draft or a superseded spec', () => {
    const o = notEligible(everything())
    const { lines } = board({
      ...o,
      specs: [
        { slug: 'a', status: 'approved', intent: 'docs/intent/a.md' },
        { slug: 'b', status: 'draft', intent: 'docs/intent/b.md' },
        { slug: 'd', status: 'superseded', intent: 'docs/intent/c.md' },
      ],
    })
    expect(last(lines)).toMatch(/because step of the plan: /)
  })

  it('4. an intent that no spec names, /spec', () => {
    const { lines } = board(sliced(everything()))
    expect(last(lines)).toBe(
      'next action: /spec docs/intent/c.md, because intent with no spec: c.md',
    )
  })

  it('5. the current step of the plan, when the backlog has not gone beyond', () => {
    const { lines } = board(specced(everything()))
    expect(last(lines)).toBe(
      'next action: step 1 of ADR-0003, because step of the plan: S18, the board.',
    )
  })

  it('6. read the inbox, when the backlog went beyond the plan', () => {
    const o = specced(everything())
    const { lines } = board({
      ...o,
      slices: [
        ...(o.slices ?? []),
        {
          id: 'S19',
          title: 'Beyond',
          status: 'done',
          spec: 'docs/specs/SPEC-a.md',
        },
      ],
    })
    expect(last(lines)).toBe(
      'next action: read the inbox, because no other rule: 2 lines',
    )
  })

  it('6. read the inbox, when there is no plan', () => {
    const { lines } = board({ ...specced(everything()), decisions: {} })
    expect(last(lines)).toBe(
      'next action: read the inbox, because no other rule: 2 lines',
    )
  })

  it('keeps the last line whole and after a blank line', () => {
    const { lines } = board({ ...everything(), prs: '[]' })
    expect(lines[lines.length - 2]).toBe('')
  })

  // S38: the human section carries the ADRs that hold a slice still too, and
  // rule 1 does not read them: it waits for a PR with one of the three
  // labels, and nothing else.
  it('1. does not fire on an ADR that holds a slice still', () => {
    const o = everything()
    const { lines, status } = board({
      ...o,
      prs: '[]',
      slices: [
        ...(o.slices ?? []),
        {
          id: 'S19',
          title: 'Held by a decision',
          status: 'todo',
          blocked_by: 'ADR-0002',
          spec: 'docs/specs/SPEC-a.md',
        },
      ],
      decisions: {
        ...o.decisions,
        'ADR-0002-the-upper-part.md':
          '# ADR-0002: the upper part of the chain\n\n## Decisione\n\nOne.\n',
      },
    })
    expect(status).toBe(0)
    expect(
      section(lines, 'Waiting on a human').filter((line) =>
        line.includes('ADR-0002'),
      ),
    ).toHaveLength(1)
    expect(last(lines)).toBe('next action: /next, because eligible slice: S18')
  })
})

// S21. Eligible is the definition of skills/next/SKILL.md, section 2: the
// board and /next cannot disagree on what comes next.
describe('eligible is the definition of /next', () => {
  const next = (slices: Slice[]): unknown => {
    const { lines } = board({ slices })
    return lines[lines.length - 1]
  }
  const inbox = 'next action: read the inbox, because no other rule: 0 lines'

  it('takes a todo slice whose blocked_by are all done', () => {
    expect(
      next([
        { id: 'S01', title: 'Done', status: 'done' },
        { id: 'S02', title: 'Done', status: 'done' },
        {
          id: 'S03',
          title: 'Behind two',
          status: 'todo',
          blocked_by: 'S01, S02',
        },
      ]),
    ).toBe('next action: /next, because eligible slice: S03')
  })

  it('names every eligible slice, in id order', () => {
    expect(
      next([
        { id: 'S11', title: 'Second', status: 'todo' },
        { id: 'S02', title: 'First', status: 'todo' },
      ]),
    ).toBe('next action: /next, because eligible slice: S02, S11')
  })

  it('leaves out a slice with one blocked_by not done', () => {
    expect(
      next([
        { id: 'S01', title: 'Done', status: 'done' },
        { id: 'S02', title: 'Open', status: 'blocked' },
        {
          id: 'S03',
          title: 'Behind two',
          status: 'todo',
          blocked_by: 'S01, S02',
        },
      ]),
    ).toBe(inbox)
  })

  it('leaves out a slice blocked by an ADR, which is never done', () => {
    expect(
      next([
        {
          id: 'S05',
          title: 'Held by a decision',
          status: 'todo',
          blocked_by: 'ADR-0002',
        },
      ]),
    ).toBe(inbox)
  })

  // S22: the rule of /next does not change. A slice whose slices are done and
  // whose field still names an ADR stays out, until a human takes the ADR off.
  it('leaves out a slice blocked by a done slice and an ADR', () => {
    expect(
      next([
        { id: 'S01', title: 'Done', status: 'done' },
        {
          id: 'S05',
          title: 'Held by a decision',
          status: 'todo',
          blocked_by: 'S01, ADR-0002',
        },
      ]),
    ).toBe(inbox)
  })

  it('leaves out a slice blocked by an id the backlog does not have', () => {
    expect(
      next([
        {
          id: 'S02',
          title: 'Behind a missing one',
          status: 'todo',
          blocked_by: 'S01',
        },
      ]),
    ).toBe(inbox)
  })

  it('leaves out a slice that is not todo', () => {
    expect(
      next([
        { id: 'S01', title: 'Done', status: 'done' },
        { id: 'S02', title: 'Left half done', status: 'blocked' },
      ]),
    ).toBe(inbox)
  })

  it('leaves out a slice a human takes', () => {
    expect(
      next([{ id: 'S01', title: 'Human', status: 'todo', human: true }]),
    ).toBe(inbox)
  })
})

// S29. A slice is taken by its branch slice/S<NN>-<slug> on the remote (4.4),
// not by a value of status: the board reads the refs the last fetch left,
// prints the slice `in progress` and keeps it out of the eligible ones, so
// the board and /next do not send two sessions onto the same work. The
// frontmatter does not change: the file of the slice is not touched.
describe('a slice with its branch on the remote is in progress', () => {
  const taken: Slice[] = [
    { id: 'S02', title: 'Taken by another session', status: 'todo' },
  ]
  const last = (lines: string[]): string => lines[lines.length - 1] ?? ''

  it('prints in progress in the status column, in place of todo', () => {
    const { lines, status } = board({
      slices: taken,
      branches: ['slice/S02-a-slice'],
    })
    expect(status).toBe(0)
    expect(row(lines, 'S02')).toMatch(
      /^ {2}S02 +in progress +none +1 +false +Taken by another session$/,
    )
  })

  it('carries the branch in the JSON and keeps status as the frontmatter has it', () => {
    const { stdout, status } = board({
      json: true,
      slices: taken,
      branches: ['slice/S02-a-slice'],
    })
    expect(status).toBe(0)
    const slice = JSON.parse(stdout).slices[0]
    expect(slice.status).toBe('todo')
    expect(slice.branch).toBe('slice/S02-a-slice')
  })

  it('leaves the branch null when no ref names the slice', () => {
    const { stdout } = board({ json: true, slices: taken })
    expect(JSON.parse(stdout).slices[0].branch).toBeNull()
  })

  it('is not eligible, so the next action is the rule after the second', () => {
    const { lines } = board({
      slices: taken,
      branches: ['slice/S02-a-slice'],
    })
    expect(last(lines)).toBe(
      'next action: read the inbox, because no other rule: 0 lines',
    )
  })

  it('leaves the taken slice out of the fact of the second rule', () => {
    const { lines } = board({
      slices: [...taken, { id: 'S03', title: 'Free', status: 'todo' }],
      branches: ['slice/S02-a-slice'],
    })
    expect(last(lines)).toBe('next action: /next, because eligible slice: S03')
  })

  it('changes nothing on the screen for a done or a blocked slice', () => {
    const slices: Slice[] = [
      { id: 'S01', title: 'Closed', status: 'done' },
      { id: 'S02', title: 'Left half done', status: 'blocked' },
    ]
    const today = board({ slices })
    const withBranches = board({
      slices,
      branches: ['slice/S01-a-slice', 'slice/S02-a-slice'],
    })
    expect(withBranches.status).toBe(0)
    expect(withBranches.stdout).toBe(today.stdout)
  })

  it('compares the id whole: slice/S1-x does not take S10', () => {
    const slices: Slice[] = [
      { id: 'S1', title: 'The first', status: 'todo' },
      { id: 'S10', title: 'The tenth', status: 'todo' },
    ]
    const { lines } = board({ slices, branches: ['slice/S1-x'] })
    expect(row(lines, 'S1')).toContain('in progress')
    expect(row(lines, 'S10')).toContain('todo')
    expect(row(lines, 'S10')).not.toContain('in progress')
  })

  it('compares the id whole: slice/S10-x does not take S1', () => {
    const slices: Slice[] = [
      { id: 'S1', title: 'The first', status: 'todo' },
      { id: 'S10', title: 'The tenth', status: 'todo' },
    ]
    const { lines } = board({ slices, branches: ['slice/S10-x'] })
    expect(row(lines, 'S10')).toContain('in progress')
    expect(row(lines, 'S1')).toContain('todo')
    expect(row(lines, 'S1')).not.toContain('in progress')
  })

  it('takes no slice from a ref that is not slice/S<NN>-<slug>', () => {
    const { lines, status } = board({
      slices: taken,
      branches: ['slice/other', 'slice/S02', 'feature/S02-x', 'main'],
    })
    expect(status).toBe(0)
    expect(row(lines, 'S02')).toContain('todo')
    expect(row(lines, 'S02')).not.toContain('in progress')
    expect(last(lines)).toBe('next action: /next, because eligible slice: S02')
  })

  it('prints the board of today in a repo with no ref and no remote', () => {
    const { lines, status } = board({ slices: taken })
    expect(status).toBe(0)
    expect(row(lines, 'S02')).toMatch(
      /^ {2}S02 +todo +none +1 +false +Taken by another session$/,
    )
    expect(last(lines)).toBe('next action: /next, because eligible slice: S02')
  })
})

describe('--json is the data model behind the screen', () => {
  // S20 held plan and next at null; S21 fills them, and the keys stay; S38
  // adds `blocked`, the ADRs the human section prints; S56 `harness`, the
  // stamp the first line of the screen is derived from.
  it('has exactly the seven keys, plan null without a plan and next filled', () => {
    const { stdout, status } = board({
      json: true,
      slices: [{ id: 'S01', title: 'A slice', status: 'todo' }],
      inbox: ['- 2026-09-16: a line'],
      prs: JSON.stringify([pr(34, 'A PR', ['tier:1'])]),
    })
    expect(status).toBe(0)
    const data = JSON.parse(stdout)
    expect(Object.keys(data).sort()).toEqual([
      'blocked',
      'harness',
      'inbox',
      'next',
      'plan',
      'prs',
      'slices',
    ])
    expect(data.plan).toBeNull()
    expect(data.next).toEqual({
      action: '/next',
      rule: 'eligible slice',
      fact: 'S01',
    })
  })

  it('carries the plan with its steps and beyond, and the next action', () => {
    const { stdout, status } = board({
      json: true,
      decisions: {
        'ADR-0003-the-plan.md': adr('ADR-0003', [
          '1. S09, the documents on main.',
          '2. S13, the skills do not repair the harness.',
          '3. Tipoff ready.',
        ]),
      },
      slices: [
        { id: 'S09', title: 'The documents', status: 'done' },
        { id: 'S13', title: 'The skills', status: 'todo', human: true },
        { id: 'S14', title: 'Beyond the plan', status: 'todo' },
      ],
    })
    expect(status).toBe(0)
    const data = JSON.parse(stdout)
    expect(Object.keys(data)).toHaveLength(7)
    expect(data.plan).toEqual({
      adr: 'ADR-0003',
      steps: [
        {
          number: 1,
          text: 'S09, the documents on main.',
          status: 'done',
          ids: ['S09'],
        },
        {
          number: 2,
          text: 'S13, the skills do not repair the harness.',
          status: 'current',
          ids: ['S13'],
        },
        { number: 3, text: 'Tipoff ready.', status: 'manual', ids: [] },
      ],
      beyond: ['S14'],
    })
    expect(data.next).toEqual({
      action: '/next',
      rule: 'eligible slice',
      fact: 'S14',
    })
  })

  it('keeps the done slices, which the screen leaves out', () => {
    const { stdout } = board({
      json: true,
      slices: [
        { id: 'S01', title: 'A closed slice', status: 'done' },
        { id: 'S02', title: 'An open slice', status: 'todo', tier: 2 },
      ],
    })
    const data = JSON.parse(stdout)
    expect(data.slices).toHaveLength(2)
    expect(data.slices[0]).toEqual({
      id: 'S01',
      title: 'A closed slice',
      status: 'done',
      blocked_by: 'none',
      tier: 1,
      human: false,
      branch: null,
    })
    expect(data.slices[1].tier).toBe(2)
  })

  // S22: `held by` is the screen's. The JSON keeps the field as written.
  it('keeps blocked_by as the raw list when it names an ADR', () => {
    const { stdout } = board({
      json: true,
      slices: [
        {
          id: 'S05',
          title: 'Held by a decision',
          status: 'todo',
          blocked_by: 'S01, ADR-0002',
        },
      ],
    })
    expect(JSON.parse(stdout).slices[0].blocked_by).toBe('S01, ADR-0002')
  })

  // S38: the ADRs that hold an open slice still, one entry each, with the
  // title of the first heading and null when the file is not there.
  it('carries blocked, one entry per ADR that holds an open slice', () => {
    const { stdout, status } = board({
      json: true,
      decisions: {
        'ADR-0002-the-upper-part.md':
          '# ADR-0002: the upper part of the chain\n\n## Decisione\n\nOne.\n',
        'ADR-0004-the-judge.md':
          '# ADR-0004: the judge in local only\n\n## Decisione\n\nOne.\n',
      },
      slices: [
        {
          id: 'S08',
          title: 'Held by the second',
          status: 'todo',
          blocked_by: 'S01, ADR-0002',
        },
        {
          id: 'S05',
          title: 'Held by the second as well',
          status: 'todo',
          blocked_by: 'ADR-0002',
        },
        {
          id: 'S09',
          title: 'Held by the fourth',
          status: 'todo',
          blocked_by: 'ADR-0004',
        },
        {
          id: 'S10',
          title: 'Held by an ADR with no file',
          status: 'todo',
          blocked_by: 'ADR-0009',
        },
        {
          id: 'S11',
          title: 'Closed, and its decision waits for nothing any more',
          status: 'done',
          blocked_by: 'ADR-0004',
        },
      ],
    })
    expect(status).toBe(0)
    expect(JSON.parse(stdout).blocked).toEqual([
      {
        adr: 'ADR-0002',
        title: 'the upper part of the chain',
        slices: ['S05', 'S08'],
      },
      {
        adr: 'ADR-0004',
        title: 'the judge in local only',
        slices: ['S09'],
      },
      { adr: 'ADR-0009', title: null, slices: ['S10'] },
    ])
  })

  it('carries blocked as [] when no open slice waits for an ADR', () => {
    const { stdout } = board({
      json: true,
      slices: [
        { id: 'S01', title: 'Open', status: 'todo', blocked_by: 'none' },
        {
          id: 'S02',
          title: 'Closed',
          status: 'done',
          blocked_by: 'ADR-0002',
        },
      ],
    })
    expect(JSON.parse(stdout).blocked).toEqual([])
  })

  // S56: the screen is derived from this key, so the four states are told
  // apart here too and not only in the line.
  it('carries the stamp with one entry per stage, null for the missing ones', () => {
    const { stdout, status } = board({
      json: true,
      stamp: {
        harness: 'git@github.com:lio/harness.git',
        stages: {
          local: {
            sha: '8f21c4d9a2b3c4d5e6f708192a3b4c5d6e7f8091',
            date: '2026-09-20',
          },
        },
      },
    })
    expect(status).toBe(0)
    expect(JSON.parse(stdout).harness).toEqual({
      state: 'stamped',
      origin: 'git@github.com:lio/harness.git',
      stages: {
        local: {
          sha: '8f21c4d9a2b3c4d5e6f708192a3b4c5d6e7f8091',
          date: '2026-09-20',
        },
        ci: null,
        judge: null,
      },
    })
  })

  // S57: the marks of a sha that is not to be trusted are the screen's, the
  // key is the data, so here the entry is the file as it was written, `dirty`
  // and the two nulls included.
  it('carries the mark of a dirty install and the null of a missing repo', () => {
    const { stdout, status } = board({
      json: true,
      stamp: {
        harness: 'git@github.com:lio/harness.git',
        stages: {
          local: {
            sha: '8f21c4d9a2b3c4d5e6f708192a3b4c5d6e7f8091',
            date: '2026-09-20',
            dirty: true,
          },
          judge: { sha: null, date: null },
        },
      },
    })
    expect(status).toBe(0)
    expect(JSON.parse(stdout).harness).toEqual({
      state: 'stamped',
      origin: 'git@github.com:lio/harness.git',
      stages: {
        local: {
          sha: '8f21c4d9a2b3c4d5e6f708192a3b4c5d6e7f8091',
          date: '2026-09-20',
          dirty: true,
        },
        ci: null,
        judge: { sha: null, date: null },
      },
    })
  })

  it('tells a missing stamp from a stamp it cannot read', () => {
    expect(JSON.parse(board({ json: true }).stdout).harness).toEqual({
      state: 'none',
    })
    expect(
      JSON.parse(board({ json: true, stamp: '{ "harness": ' }).stdout).harness,
    ).toEqual({ state: 'unreadable' })
  })

  it('carries the full sha of its own HEAD in the harness repo', () => {
    const { stdout, status, dir } = board({
      json: true,
      harnessRepo: true,
      commit: true,
    })
    expect(status).toBe(0)
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: dir,
      encoding: 'utf8',
    }).trim()
    const date = execFileSync(
      'git',
      ['log', '-1', '--format=%cd', '--date=short'],
      { cwd: dir, encoding: 'utf8' },
    ).trim()
    expect(JSON.parse(stdout).harness).toEqual({ state: 'self', sha, date })
  })

  it('carries the label names of every PR and the inbox lines', () => {
    const { stdout } = board({
      json: true,
      inbox: ['- 2026-09-16: an inbox line'],
      prs: JSON.stringify([pr(34, 'A PR', ['tier:2', 'human-gate'])]),
    })
    const data = JSON.parse(stdout)
    expect(data.prs).toEqual([
      { number: 34, title: 'A PR', labels: ['tier:2', 'human-gate'] },
    ])
    expect(data.inbox).toEqual([{ date: '2026-09-16', text: 'an inbox line' }])
  })
})

describe('an argument it does not know is an error', () => {
  it('refuses it on stderr instead of printing a board', () => {
    const { status, stderr, stdout } = board({ args: ['--everything'] })
    expect(status).toBe(2)
    expect(stderr).toContain('board.sh')
    expect(stdout).toBe('')
  })
})

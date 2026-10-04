// Structural tests: the "Do not" lines of AGENTS.md that a check can
// enforce. Each describe names its line. A red run on existing files is a
// finding for the hand-back, not something to patch in the test.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { policyBlock } from './agents.js'
import { folders, folderSection } from './docs.js'
import { validate, type Schema } from './schema.js'

const root = resolve(import.meta.dirname, '..')
const templates = join(root, 'skills/harness-init/templates')

function walk(dir: string, base = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path, base)
    return [path.slice(base.length + 1)]
  })
}

function globToRegExp(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^/]*')
  return new RegExp(`^${escaped}$`)
}

// templates/README.md is the one place that says where each template goes and
// in which stage of /harness-init. Both describes below read it from here.
const rows = readFileSync(join(templates, 'README.md'), 'utf8')
  .split('\n')
  .filter((line) => line.startsWith('| `'))
  .map((line) => {
    const columns = line.split('|')
    return {
      patterns: [...(columns[1] ?? '').matchAll(/`([^`]+)`/g)].map((match) =>
        globToRegExp(match[1] ?? ''),
      ),
      stage: (columns[3] ?? '').trim(),
    }
  })

function stageOf(template: string): string {
  const row = rows.find((candidate) =>
    candidate.patterns.some((pattern) => pattern.test(template)),
  )
  return row?.stage ?? '(no row in templates/README.md)'
}

// AGENTS.md, "Do not": "Do not add a template without its line in
// skills/harness-init/templates/README.md"
describe('templates/README.md lists every template', () => {
  const listed = rows.flatMap((row) => row.patterns)

  it.each(walk(templates).filter((file) => file !== 'README.md'))(
    '%s has a destination row',
    (file) => {
      expect(
        listed.some((pattern) => pattern.test(file)),
        `${file} is not in templates/README.md`,
      ).toBe(true)
    },
  )
})

// S56: the stamp has no file under templates/, like the .gitignore line
// above it in the README, so the describe that walks the templates cannot see
// it. Its row is read here, with the destination and the three stages that
// write it, or a stage would stop leaving its entry and nobody would know.
describe('templates/README.md has the row of the stamp', () => {
  const row = readFileSync(join(templates, 'README.md'), 'utf8')
    .split('\n')
    .find((line) => line.includes('.harness/stamp.json'))

  it('gives .harness/stamp.json as the destination', () => {
    expect(
      row,
      'templates/README.md has no row for .harness/stamp.json',
    ).toBeDefined()
    expect((row ?? '').split('|')[2]).toContain('`.harness/stamp.json`')
  })

  it('names the three stages that write it', () => {
    expect((row ?? '').split('|').at(-2)?.trim()).toBe('local, ci, judge')
  })

  // S92: the pin is in the stamp, and the three stages write it.
  it('says the three stages write the pin', () => {
    expect((row ?? '').split('|')[1]).toContain('`pin`')
  })
})

// S56: each stage of /harness-init leaves its own entry in
// .harness/stamp.json, so a repo sitting at three different points of the
// harness says all three out loud, and the board can print them.
describe('skills/harness-init/SKILL.md stamps every stage', () => {
  const skill = readFileSync(join(root, 'skills/harness-init/SKILL.md'), 'utf8')

  it.each([
    ['local', '## 2. Stage `local`'],
    ['ci', '## 3. Stage `ci`'],
    ['judge', '## 4. Stage `judge`'],
  ])('stage %s writes its entry of the stamp', (stage, heading) => {
    const start = skill.indexOf(heading)
    expect(start, `${heading} is not a heading of the skill`).toBeGreaterThan(
      -1,
    )
    const rest = skill.slice(start + heading.length)
    const end = rest.indexOf('\n## ')
    expect(
      end === -1 ? rest : rest.slice(0, end),
      `stage ${stage} does not write .harness/stamp.json`,
    ).toContain('.harness/stamp.json')
  })

  // F2 of the judgement of S56: a harness cloned over https carries the
  // credentials in the url of its origin, and the stamp is tracked in every
  // repo the skill installs into, so the url goes in stripped. The strip is
  // read word for word: it is the whole of the rule.
  it('stores the origin with no credentials in it', () => {
    const rule = skill.slice(
      skill.indexOf('## Ground rules'),
      skill.indexOf('## 0. Detect'),
    )
    expect(
      rule,
      'the stamp rule does not strip the credentials from the url of the origin',
    ).toContain("sed -E 's#^([a-z+]+://)[^/@]*@#\\1#'")
  })

  // S57: there is no `dev` in this repo, a template change is tried by
  // running a stage from a checkout that is dirty while it is being tried, so
  // a sha that is not to be trusted is stamped and marked and never refused.
  // The two cases are read word for word: the mark is what the entry is worth.
  it('marks a sha that is not to be trusted and installs anyway', () => {
    // The rule is prose the skill wraps where the column runs out, so it is
    // read with its whitespace squashed: a sentence is the same rule at any
    // width.
    const rule = skill
      .slice(skill.indexOf('## Ground rules'), skill.indexOf('## 0. Detect'))
      .replace(/\s+/g, ' ')
    expect(
      rule,
      'the stamp rule does not say a dirty harness checkout writes "dirty": true',
    ).toContain('"dirty": true')
    expect(
      rule,
      'the stamp rule does not say how a dirty checkout is told apart',
    ).toContain('status --porcelain')
    expect(
      rule,
      'the stamp rule does not say how a missing git repo is told apart',
    ).toContain('rev-parse --git-dir')
    expect(
      rule,
      'the stamp rule does not say a missing git repo leaves `sha` and `date` null',
    ).toContain('`sha` and `date` are `null`')
    expect(
      rule,
      'the stamp rule does not say that neither case stops the install',
    ).toContain('neither case stops the install')
  })

  // S92: every stage moves the pin, the one commit every clone and every CI
  // run fetches, to the commit it runs from, and leaves it alone from a
  // checkout nobody can fetch. The snippet of "Ground rules" is run as the
  // skill writes it, on a disposable checkout and a disposable repo.
  const groundRules = skill.slice(
    skill.indexOf('## Ground rules'),
    skill.indexOf('## 0. Detect'),
  )
  const fences = [...groundRules.matchAll(/```sh\n([\s\S]*?)\n\s*```/g)].map(
    (match) => match[1] ?? '',
  )

  function checkout(origin: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'stamp-checkout-'))
    const git = (...args: string[]): string =>
      execFileSync(
        'git',
        [
          '-c',
          'user.email=stamp@example.invalid',
          '-c',
          'user.name=Stamp',
          ...args,
        ],
        {
          cwd: dir,
          encoding: 'utf8',
          env: { ...process.env, GIT_COMMITTER_DATE: '2026-09-25T10:00:00Z' },
        },
      ).trim()
    git('init', '-q')
    writeFileSync(join(dir, 'README.md'), 'harness\n')
    git('add', '-A')
    git('commit', '-q', '-m', 'chore: the templates')
    git('remote', 'add', 'origin', origin)
    return dir
  }

  function stampFrom(
    from: string,
    stage: string,
    before?: unknown,
  ): Record<string, unknown> {
    const repo = mkdtempSync(join(tmpdir(), 'stamp-repo-'))
    if (before !== undefined) {
      mkdirSync(join(repo, '.harness'))
      writeFileSync(
        join(repo, '.harness/stamp.json'),
        JSON.stringify(before, null, 2),
      )
    }
    const snippet = (fences[0] ?? '')
      .replaceAll('<checkout>', from)
      .replaceAll('<stage>', stage)
    execFileSync('bash', ['-c', snippet], { cwd: repo, encoding: 'utf8' })
    return JSON.parse(
      readFileSync(join(repo, '.harness/stamp.json'), 'utf8'),
    ) as Record<string, unknown>
  }

  const headOf = (dir: string): string =>
    execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: dir,
      encoding: 'utf8',
    }).trim()

  const oldPin = {
    origin: 'https://github.com/owner/repo.git',
    sha: 'b7c8d9e0b7c8d9e0b7c8d9e0b7c8d9e0b7c8d9e0',
    date: '2026-09-01',
  }

  it('has one snippet in "Ground rules", the one that is run', () => {
    expect(fences).toHaveLength(1)
  })

  it.each([
    'git@github.com:owner/repo.git',
    'ssh://git@github.com/owner/repo.git',
    'https://x-access-token:ghp_secret@github.com/owner/repo.git',
    'https://github.com/owner/repo.git',
  ])('writes the pin from a clean checkout whose origin is %s', (origin) => {
    const from = checkout(origin)
    const stamp = stampFrom(from, 'local')
    expect(stamp.pin).toEqual({
      origin: 'https://github.com/owner/repo.git',
      sha: headOf(from),
      date: '2026-09-25',
    })
    expect(stamp.stages).toEqual({
      local: { sha: headOf(from), date: '2026-09-25' },
    })
  })

  it('moves the pin of a stamp that has one, and keeps the other keys', () => {
    const from = checkout('git@github.com:owner/repo.git')
    const before = {
      harness: 'git@github.com:owner/old.git',
      pin: oldPin,
      stages: { local: { sha: oldPin.sha, date: oldPin.date } },
      other: { kept: true },
    }
    const stamp = stampFrom(from, 'ci', before)
    expect(stamp.pin).toEqual({
      origin: 'https://github.com/owner/repo.git',
      sha: headOf(from),
      date: '2026-09-25',
    })
    expect(stamp.harness).toBe('git@github.com:owner/repo.git')
    expect(stamp.other).toEqual({ kept: true })
    expect(stamp.stages).toEqual({
      local: { sha: oldPin.sha, date: oldPin.date },
      ci: { sha: headOf(from), date: '2026-09-25' },
    })
  })

  it('leaves the pin as it was from a dirty checkout, and marks the stage', () => {
    const from = checkout('git@github.com:owner/repo.git')
    writeFileSync(join(from, 'draft.sh'), 'echo half written\n')
    const stamp = stampFrom(from, 'judge', { pin: oldPin })
    expect(stamp.pin).toEqual(oldPin)
    expect(stamp.stages).toEqual({
      judge: { sha: headOf(from), date: '2026-09-25', dirty: true },
    })
  })

  it('writes no pin from a dirty checkout on a first install', () => {
    const from = checkout('git@github.com:owner/repo.git')
    writeFileSync(join(from, 'draft.sh'), 'echo half written\n')
    expect(stampFrom(from, 'local')).not.toHaveProperty('pin')
  })

  it('leaves the pin as it was with no git repo, and the stage gets nulls', () => {
    const from = mkdtempSync(join(tmpdir(), 'stamp-nogit-'))
    const stamp = stampFrom(from, 'local', { pin: oldPin })
    expect(stamp.pin).toEqual(oldPin)
    expect(stamp.harness).toBeNull()
    expect(stamp.stages).toEqual({ local: { sha: null, date: null } })
  })

  it.each([
    ['local', '## 2. Stage `local`'],
    ['ci', '## 3. Stage `ci`'],
    ['judge', '## 4. Stage `judge`'],
  ])('stage %s names the pin in its Stamp step', (stage, heading) => {
    const rest = skill.slice(skill.indexOf(heading) + heading.length)
    const section = rest.slice(0, rest.indexOf('\n## '))
    const step = /\*\*Stamp\*\*:[\s\S]*?(?=\n\d+\. \*\*)/.exec(section)?.[0]
    expect(step, `stage ${stage} has no Stamp step`).toBeDefined()
    expect(
      (step ?? '').replace(/\s+/g, ' '),
      `the Stamp step of ${stage} does not move the pin`,
    ).toContain('`pin` to the commit it runs from')
  })

  it('says the hand-back names a pin it did not move, and why', () => {
    const rule = groundRules.replace(/\s+/g, ' ')
    expect(rule).toContain('the hand-back names the pin that was not moved')
    expect(rule).toContain(
      'a sha every clone will fetch has to exist on the remote',
    )
  })
})

// AGENTS.md, "Do not": "Do not use anything beyond bash 3.2 and jq in the
// scripts of the templates"
describe('template scripts and hooks run on bash 3.2', () => {
  const bash4: Array<[RegExp, string]> = [
    [/\b(mapfile|readarray)\b/, 'mapfile/readarray'],
    [/\b(declare|local|typeset)\s+-[a-zA-Z]*A\b/, 'associative arrays'],
    [
      /\$\{[A-Za-z_][A-Za-z0-9_]*(\[[^\]]*\])?(,,?|\^\^?)\}/,
      'case conversion ${var,,} ${var^^}',
    ],
    [
      /\$\{[A-Za-z_][A-Za-z0-9_]*@[QEPAa]\}/,
      'parameter transformation ${var@Q}',
    ],
    [/\$\{[A-Za-z_][A-Za-z0-9_]*:[^}]*:-[0-9]/, 'negative substring length'],
    [/\|&/, '|& pipe'],
    [/\bcoproc\b/, 'coproc'],
    [/\[\[\s+-v\s/, '[[ -v'],
    [/;;&|;&\s*$/m, 'case fallthrough ;& ;;&'],
  ]
  const files = [
    ...['githooks', 'scripts'].flatMap((dir) =>
      walk(join(templates, dir)).map((file) => join(dir, file)),
    ),
    ...readdirSync(templates).filter((file) => file.endsWith('.sh')),
  ]

  it('reaches the scripts at the top of the templates', () => {
    expect(files).toContain('bootstrap.sh')
  })

  it.each(files)('%s', (file) => {
    const source = readFileSync(join(templates, file), 'utf8')
    for (const [pattern, what] of bash4) {
      expect(source, `${file} uses ${what}`).not.toMatch(pattern)
    }
  })
})

// AGENTS.md, "Do not": "Do not modify the symlinks in .harness/bin/: the
// template is what changes". This repo runs on the layout it installs, and is
// the one repo that does not fetch it: .harness/bin here is tracked and made
// of links into the templates, laid out the way bootstrap.sh lays out the
// fetch. The list is read from the template directories, so a new script
// without its link is red here.
describe('the repo runs on its own templates', () => {
  const bin = join(root, '.harness/bin')
  // This repo's own two scripts: they answer about the templates and are not
  // in the tree the bootstrap copies, so they are regular files here.
  const own = ['check-shell.sh', 'since.sh']
  const layout: Array<[string, string]> = [
    ...readdirSync(join(templates, 'scripts')).map((file): [string, string] => [
      file,
      `scripts/${file}`,
    ]),
    ['hooks', 'githooks'],
    ['judge', 'judge'],
    ['ruleset.json', 'github/ruleset.json'],
  ]
  const tracked = execFileSync('git', ['ls-files', '--', '.harness'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)

  it.each(layout)(
    '.harness/bin/%s is a tracked symlink to templates/%s',
    (landed, template) => {
      const link = join(bin, landed)
      expect(
        existsSync(link) && lstatSync(link).isSymbolicLink(),
        `.harness/bin/${landed} is missing or not a symlink: link it to skills/harness-init/templates/${template}`,
      ).toBe(true)
      expect(realpathSync(link)).toBe(realpathSync(join(templates, template)))
      expect(tracked).toContain(`.harness/bin/${landed}`)
    },
  )

  it('holds nothing else but check-shell.sh and since.sh, regular files', () => {
    const landed = layout.map(([name]) => name)
    for (const name of readdirSync(bin)) {
      if (landed.includes(name)) continue
      expect(
        own,
        `.harness/bin/${name} is neither a template nor this repo's own`,
      ).toContain(name)
      expect(
        lstatSync(join(bin, name)).isFile(),
        `.harness/bin/${name} is this repo's own and should be a regular file`,
      ).toBe(true)
      expect(tracked).toContain(`.harness/bin/${name}`)
    }
    for (const name of own) expect(readdirSync(bin)).toContain(name)
  })

  it('has no scripts/ and no .githooks/ any more', () => {
    expect(existsSync(join(root, 'scripts')), 'scripts/ is still here').toBe(
      false,
    )
    expect(
      existsSync(join(root, '.githooks')),
      '.githooks/ is still here',
    ).toBe(false)
  })

  it('links .harness/bootstrap.sh to its template', () => {
    const link = join(root, '.harness/bootstrap.sh')
    expect(lstatSync(link).isSymbolicLink()).toBe(true)
    expect(realpathSync(link)).toBe(
      realpathSync(join(templates, 'bootstrap.sh')),
    )
    expect(tracked).toContain('.harness/bootstrap.sh')
  })

  it('points typecheck and prepare at .harness/bin', () => {
    const pkg = JSON.parse(
      readFileSync(join(root, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> }
    expect(pkg.scripts.typecheck).toContain('.harness/bin/check-shell.sh')
    expect(pkg.scripts.prepare).toBe(
      'git config core.hooksPath .harness/bin/hooks',
    )
  })
})

// The machinery of a project lives in .harness/bin/, and the templates and
// the skills that run a script call it there: a script, a hook, a workflow,
// the settings or a SKILL.md that still named scripts/<name>.sh or .githooks
// would call a path no repo has any more. A path that runs through the
// templates, `skills/harness-init/templates/scripts/board.sh`, is where a
// template lives and not a call, so the match wants `scripts/` at the start
// of a path.
describe('the templates and the skills call the machinery under .harness/bin/', () => {
  const names = readdirSync(join(templates, 'scripts')).map((file) =>
    file.replace(/[.]/g, '\\.'),
  )
  const old = new RegExp(`(?<![\\w/.])scripts/(${names.join('|')})|\\.githooks`)
  const files = [
    ...['scripts', 'githooks', 'github'].flatMap((dir) =>
      walk(join(templates, dir)).map((file) =>
        join(templates, dir, file).slice(root.length + 1),
      ),
    ),
    join(templates, 'settings.json').slice(root.length + 1),
    ...['board', 'spec', 'slice', 'next', 'judge'].map(
      (skill) => `skills/${skill}/SKILL.md`,
    ),
  ]

  it.each(files)('%s', (file) => {
    const hit = readFileSync(join(root, file), 'utf8')
      .split('\n')
      .find((line) => old.test(line))
    expect(hit, `${file} still names the old path`).toBeUndefined()
  })

  it('catches a call and leaves the path of a template alone', () => {
    expect(old.test('run `scripts/board.sh --json`')).toBe(true)
    expect(old.test('skills/harness-init/templates/scripts/board.sh')).toBe(
      false,
    )
  })
})

// S88: the documents of the harness live under `.harness/docs/`, so a
// project keeps its `docs/` for itself. A template, a skill or the spec
// template that still named one of the eight paths at the root of `docs/`
// would read and write where no repo keeps them any more. The match wants
// `docs/` at the start of a path: `templates/docs/inbox.md` is where a
// template lives. templates/README.md says where stage local writes, and that
// is S93.
const documentPaths = [
  'intent',
  'specs',
  'backlog',
  'decisions',
  'review-log',
  'inbox.md',
  'parked.md',
  'codebase-map.md',
]
const oldDocument = new RegExp(
  `(?<![\\w/.-])docs/(${documentPaths
    .map((path) => path.replace(/[.]/g, '\\.'))
    .join('|')})`,
)

describe('the templates and the skills name the documents under .harness/docs/', () => {
  const files = [
    ...walk(templates)
      .filter((file) => file !== 'README.md')
      .map((file) => join(templates, file).slice(root.length + 1)),
    ...readdirSync(join(root, 'skills')).map(
      (skill) => `skills/${skill}/SKILL.md`,
    ),
    'skills/spec/templates/SPEC.md',
  ]

  it.each(files)('%s', (file) => {
    const hit = readFileSync(join(root, file), 'utf8')
      .split('\n')
      .find((line) => oldDocument.test(line))
    expect(hit, `${file} still names a document under docs/`).toBeUndefined()
  })

  it('catches a document under docs/ and leaves .harness/docs/ and a template alone', () => {
    expect(oldDocument.test('read `docs/backlog/S01-x.md`')).toBe(true)
    expect(oldDocument.test("sed -n 's#^docs/backlog/S#'")).toBe(true)
    expect(oldDocument.test('read `.harness/docs/backlog/S01-x.md`')).toBe(
      false,
    )
    expect(
      oldDocument.test('skills/harness-init/templates/docs/inbox.md'),
    ).toBe(false)
    expect(oldDocument.test('`docs/spec.md` and `docs/assets/`')).toBe(false)
  })
})

describe('this repo keeps its documents under .harness/docs/', () => {
  it.each(documentPaths)('%s', (path) => {
    expect(
      existsSync(join(root, '.harness/docs', path)),
      `.harness/docs/${path} is missing`,
    ).toBe(true)
    expect(
      existsSync(join(root, 'docs', path)),
      `docs/${path} is still there`,
    ).toBe(false)
  })

  // /slice finds the slices of a spec by their `spec:` line, and a spec names
  // its intent in `intent:`: a line left on the old path would point nowhere.
  // `spec: inbox (<date>)` and `spec: audit (PR #n)` are not paths.
  it('every spec: and intent: path of the documents names a tracked file', () => {
    const tracked = execFileSync('git', ['ls-files'], {
      cwd: root,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean)
    const lines = tracked
      .filter((file) =>
        /^\.harness\/docs\/(backlog|specs)\/[^/]+\.md$/.test(file),
      )
      .flatMap((file) =>
        [
          ...readFileSync(join(root, file), 'utf8').matchAll(
            /^(?:spec|intent): (\S+\/\S+\.md)\s*$/gm,
          ),
        ].map((match) => [file, match[1] ?? ''] as [string, string]),
      )
    expect(lines.length).toBeGreaterThan(0)
    for (const [file, path] of lines) {
      expect(tracked, `${file} names ${path}, not tracked`).toContain(path)
    }
  })

  it('docs/ keeps spec.md and its assets', () => {
    expect(existsSync(join(root, 'docs/spec.md'))).toBe(true)
    expect(existsSync(join(root, 'docs/assets'))).toBe(true)
  })

  it('.prettierignore names the verdicts where they moved', () => {
    expect(
      readFileSync(join(root, '.prettierignore'), 'utf8').split('\n'),
    ).toContain('.harness/docs/review-log/verdicts.jsonl')
  })
})

// The same line, its other half. Under `.github/` nothing can be a symlink:
// GitHub Actions does not register a workflow that is one, and the rest of
// the folder sits next to the workflows. They stay copies, and a copy drifts
// in silence. PR #8 went in without `human-gate` because ci.yml was the
// version from before S02 while the scripts, which are symlinks, were already
// the ones of today. PR #29 added a section to the PR template and the copy
// stayed behind without anything turning red, because the files compared were
// a list written in here. The list is now the templates themselves: a new
// file under github/ walks into the comparison on its own.
describe('.github matches the templates it was copied from', () => {
  // The destination comes from the folder structure, which is the convention
  // already and the one templates/README.md explains: a template of github/
  // that is a workflow goes under .github/workflows/, the others to the root
  // of .github/. No list of files in here.
  const copyOf = (template: string) => {
    const file = template.slice('github/'.length)
    return file.endsWith('.yml')
      ? `.github/workflows/${file}`
      : `.github/${file}`
  }

  // The ruleset is not copied under .github/: it lands in .harness/bin/,
  // linked here and fetched in a project repo, and stage ci applies it from
  // there. judge/ is not copied either: it lands in .harness/bin/judge/, and
  // what the repo says to its judge is .harness/judge.md.
  const copied = walk(join(templates, 'github'))
    .map((file) => `github/${file}`)
    .filter((template) => template !== 'github/ruleset.json')

  it.each(copied)('%s', (template) => {
    const copy = copyOf(template)
    const stage = stageOf(template)
    expect(
      existsSync(join(root, copy)),
      `${copy} is missing: run /harness-init ${stage} to copy skills/harness-init/templates/${template} into place`,
    ).toBe(true)
    const here = readFileSync(join(root, copy), 'utf8')
    const there = readFileSync(join(templates, template), 'utf8')
    expect(
      here,
      `${copy} drifted from skills/harness-init/templates/${template}: run /harness-init ${stage} to copy it back, do not edit the copy`,
    ).toBe(there)
  })

  // Stage ci fills `bypass_actors` in the ruleset it applies. The template
  // list ships empty because
  // neither actor can be known before the repo is: the id of the App belongs
  // to the account that installed it, and the admin role is a bypass only
  // where `docs_mode` is `main`. An actor written here would land in every
  // repo, with an App id that is nobody's and a bypass a team never asked for.
  it('ships the template of ruleset.json with an empty `bypass_actors`', () => {
    const template: unknown = JSON.parse(
      readFileSync(join(templates, 'github/ruleset.json'), 'utf8'),
    )
    expect(
      (template as { bypass_actors?: unknown }).bypass_actors,
      'skills/harness-init/templates/github/ruleset.json no longer ships an empty `bypass_actors`: stage ci of /harness-init fills the list per repo, the template stays empty',
    ).toEqual([])
  })

  // CI gets the machinery the way a laptop does: every checkout of a
  // workflow is followed by the bootstrap, as a plain step, so a bootstrap
  // that exits non-zero is a red job. A workflow with no checkout has no tree
  // to run the bootstrap in, so each of the four checks out first.
  const workflows = ['ci.yml', 'automerge.yml', 'escalate.yml', 'close.yml']
  it.each(workflows)(
    '%s runs .harness/bootstrap.sh right after each checkout',
    (file) => {
      const lines = readFileSync(join(templates, 'github', file), 'utf8').split(
        '\n',
      )
      const steps: string[][] = []
      for (const line of lines) {
        if (/^\s+- (uses|name|run|id|if|env):/.test(line)) steps.push([line])
        else if (/^\S/.test(line) || /^  \S/.test(line)) steps.push([])
        else steps[steps.length - 1]?.push(line)
      }
      const checkouts = steps
        .map((step, i) => [step, i] as const)
        .filter(([step]) => /uses: actions\/checkout@/.test(step.join('\n')))
      expect(
        checkouts.length,
        `${file} has no actions/checkout`,
      ).toBeGreaterThan(0)
      for (const [, i] of checkouts) {
        const next = (steps[i + 1] ?? []).join('\n')
        expect(
          next,
          `${file}: the step after the checkout is not the bootstrap`,
        ).toMatch(/^\s+run: \.harness\/bootstrap\.sh$/m)
        expect(next, `${file}: the bootstrap may not fail quietly`).not.toMatch(
          /continue-on-error|\|\| true/,
        )
      }
    },
  )

  // The other direction, which the comparison above does not make: a workflow
  // under .github/workflows/ with no template is a piece of the chain no repo
  // receives, or a file that does not belong to the chain.
  it.each(readdirSync(join(root, '.github/workflows')))(
    '.github/workflows/%s comes from a template',
    (file) => {
      expect(
        existsSync(join(templates, 'github', file)),
        `.github/workflows/${file} has no template in skills/harness-init/templates/github/: either the template is missing, or this workflow does not belong to the chain`,
      ).toBe(true)
    },
  )
})

// S90: the prompt and the schema are machinery, fetched into
// .harness/bin/judge/ and the same in every repo. A line of the repo cannot
// live in a file every fetch overwrites, so what the repo says to its judge is
// a tracked file of its own, .harness/judge.md, and judge.sh bundle puts it
// after the prompt.
describe('the judge reads what the repo says about itself from .harness/judge.md', () => {
  const prompt = readFileSync(join(templates, 'judge/prompt.md'), 'utf8')

  it('the template prompt carries no line of a repo and no placeholder', () => {
    expect(
      prompt,
      'skills/harness-init/templates/judge/prompt.md has a "## This repo" section: the lines of a repo go in .harness/judge.md',
    ).not.toContain('## This repo')
    expect(
      prompt,
      'skills/harness-init/templates/judge/prompt.md has a placeholder: it is fetched as it is, nobody fills it',
    ).not.toContain('{{')
  })

  // The skill of stage judge still says .github/judge/ in its section 4: S94
  // rewrites that stage, and until then it is the one file left out.
  const named = [
    ...walk(templates).map((file) => `skills/harness-init/templates/${file}`),
    ...readdirSync(join(root, 'skills'))
      .map((skill) => `skills/${skill}/SKILL.md`)
      .filter((file) => existsSync(join(root, file)))
      .filter((file) => file !== 'skills/harness-init/SKILL.md'),
  ]

  it.each(named)('%s does not name .github/judge', (file) => {
    expect(
      readFileSync(join(root, file), 'utf8'),
      `${file} names .github/judge: the prompt and the schema are in .harness/bin/judge/, the lines of the repo in .harness/judge.md`,
    ).not.toContain('.github/judge')
  })

  it('this repo has .harness/judge.md and no .github/judge', () => {
    expect(
      existsSync(join(root, '.harness/judge.md')),
      '.harness/judge.md is missing: it holds what the judge is told about this repo',
    ).toBe(true)
    expect(
      existsSync(join(root, '.github/judge')),
      '.github/judge is still here: the prompt and the schema are read from .harness/bin/judge/',
    ).toBe(false)
  })

  it('templates/README.md sends judge.md to .harness/judge.md in stage judge', () => {
    const row = readFileSync(join(templates, 'README.md'), 'utf8')
      .split('\n')
      .find((line) => line.startsWith('| `judge.md`'))
    expect(row, 'templates/README.md has no row of judge.md').toBeDefined()
    const columns = (row ?? '').split('|')
    expect(columns[2]).toContain('`.harness/judge.md`')
    expect(columns[3]?.trim()).toBe('judge')
  })
})

// PR #27 had a slice branch for a base and not the default branch. It was
// merged, and eleven seconds later `close.yml` committed on main the
// `status: done` of a slice whose work was not on main: for the job a PR
// merged into any branch and one merged into the default branch were the
// same event. The damage is in the board, which is what decides what gets
// taken next, and in the review log, which the audit reads to tune the
// thresholds. The guard is a condition in YAML and does not run in Vitest:
// what is proved here is that it is there, so a rewrite that loses it comes
// back red. The default branch is read from the event, because the template
// runs in repos where it is called something else too.
describe('the workflows that act on a merge look at the default branch', () => {
  // The only two that act on a merge: `close.yml` after it, `automerge.yml`
  // which does the merge itself. `escalate.yml` starts from a label and
  // touches nothing.
  const onMerge: Record<string, string> = {
    'github/close.yml': 'the merged PR closes its slice and writes the log',
    'github/automerge.yml': 'tier 0 merges on a green ci without a human',
  }
  const names = Object.keys(onMerge)
  const source = (template: string) =>
    readFileSync(join(templates, template), 'utf8')

  // The text of a job, from its heading to the next job: under `jobs:` the
  // keys at two spaces are the job names and nothing else, so reading an
  // `if:` needs no YAML parser.
  const jobNames = (yaml: string) =>
    [
      ...yaml.slice(yaml.indexOf('\njobs:\n')).matchAll(/^ {2}([\w-]+):$/gm),
    ].map((match) => match[1] ?? '')

  const jobText = (yaml: string, name: string) => {
    const rest = yaml.slice(yaml.indexOf(`\n  ${name}:\n`) + 1)
    const head = rest.indexOf('\n') + 1
    const end = rest.slice(head).search(/^ {2}\S/m)
    return end === -1 ? rest : rest.slice(0, head + end)
  }

  // The value of `if:`, a `>-` block included: its lines indent more than the
  // `if:` itself, so it ends at the first key that does not indent.
  const condition = (text: string) => {
    const start = text.search(/^ {4}if:/m)
    if (start === -1) return ''
    const rest = text.slice(start)
    const head = rest.indexOf('\n') + 1
    const end = rest.slice(head).search(/^ {0,4}\S/m)
    return end === -1 ? rest : rest.slice(0, head + end)
  }

  it.each(names)('%s reads the default branch from the event', (template) => {
    const yaml = source(template)
    expect(
      yaml,
      `${onMerge[template]}: without github.event.repository.default_branch the workflow cannot tell a stacked merge from a merge into the default branch`,
    ).toContain('github.event.repository.default_branch')
    expect(
      yaml,
      `${template} names the default branch by hand: the template runs in repos where it is not called main`,
    ).not.toMatch(/['"]main['"]/)
  })

  it.each(names)('%s says in the job summary when it stops', (template) => {
    expect(
      source(template),
      `${template} stops on a stacked PR without writing to $GITHUB_STEP_SUMMARY: a workflow that says nothing is indistinguishable from one that never started`,
    ).toContain('GITHUB_STEP_SUMMARY')
  })

  // The guard sits in the condition of the jobs, where GitHub applies it to
  // every step: a new step without its own `if:` would be a silent hole. It
  // holds for every job of the file, the one that closes and the one that
  // says it did not close.
  it.each(jobNames(source('github/close.yml')))(
    'close.yml: the job "%s" asks where the PR was merged',
    (name) => {
      const text = condition(jobText(source('github/close.yml'), name))
      for (const context of [
        'github.event.pull_request.base.ref',
        'github.event.repository.default_branch',
      ]) {
        expect(
          text,
          `the "if:" of the job "${name}" does not name ${context}: a PR merged into another slice branch would be the same event as one merged into the default branch`,
        ).toContain(context)
      }
    },
  )

  it('close.yml: the summary carries the PR number and the base it had', () => {
    const yaml = source('github/close.yml')
    const talker = jobNames(yaml)
      .map((name) => jobText(yaml, name))
      .find((text) => text.includes('GITHUB_STEP_SUMMARY'))
    expect(talker, 'no job of close.yml writes to the summary').toBeDefined()
    for (const context of [
      'github.event.pull_request.number',
      'github.event.pull_request.base.ref',
    ]) {
      expect(
        talker,
        `the summary does not carry ${context}: "nothing to close" without the PR and its base is a line nobody can act on`,
      ).toContain(context)
    }
  })

  // Without the App the close step runs on the default token, and the repair
  // notice of review-log.sh is a comment on the PR: with `pull-requests: read`
  // GitHub refuses it and the hole is said only in a summary nobody opens.
  it('close.yml: the default token may comment on the PR', () => {
    const yaml = source('github/close.yml')
    const top = yaml.slice(
      yaml.search(/^permissions:$/m),
      yaml.indexOf('\njobs:\n'),
    )
    expect(
      top,
      'close.yml does not give pull-requests: write: without the App the repair notice of review-log.sh is refused on the PR',
    ).toMatch(/^ {2}pull-requests: write$/m)
  })

  // S59's code merged in PR #79 while its slice file was untracked in a
  // working tree: the loop found nothing, the job ended green, and the slice
  // stayed an eligible `todo` holding S51 through `blocked_by`. The id the
  // branch names with no file behind it is said in the summary and on the PR,
  // and a comment the token may not post does not cost the log its commit.
  it('close.yml: the close step says when the slice file is missing', () => {
    const run = jobText(source('github/close.yml'), 'close')
    const start = run.indexOf('if [ -n "$sid" ]; then')
    expect(
      start,
      'the close step no longer reads the slice id from the branch',
    ).not.toBe(-1)
    const block = run.slice(start, run.indexOf('\n          fi\n', start))
    expect(
      block,
      'the close step has no branch for a missing slice file: a slice merged without its file stays todo and nobody is told',
    ).toMatch(
      /if !? ?(ls|compgen|\[)[^\n]*\.harness\/docs\/backlog\/"\$sid"-\*\.md/,
    )
    expect(
      block,
      'the missing-file branch does not write to $GITHUB_STEP_SUMMARY: the run ends green and silent',
    ).toContain('>> "$GITHUB_STEP_SUMMARY"')
    expect(
      block,
      'the missing-file branch does not comment on the PR, or a refused comment fails the job and the review log is not committed',
    ).toMatch(/gh pr comment "\$PR"[^\n]*\|\| true/)
  })

  // S51's draft PR #80 was merged while the slice said `status: blocked`, and
  // the `sed` rewrote it to `done`: the board counted work that never landed,
  // and a human put the status back by hand. The status is read before it is
  // written, and a blocked slice stays blocked and is said.
  it('close.yml: the close step leaves a blocked slice blocked', () => {
    const run = jobText(source('github/close.yml'), 'close')
    const start = run.indexOf('for s in .harness/docs/backlog/"$sid"-*.md; do')
    expect(
      start,
      'the close step no longer loops over the slice files of the id',
    ).not.toBe(-1)
    const loop = run.slice(start, run.indexOf('\n            done\n', start))
    const write = loop.search(/sed -i[^\n]*status: done/)
    expect(write, 'the close step no longer sets the slice to done').not.toBe(
      -1,
    )
    const guard = loop.search(/grep -q[^\n]*\^status: blocked[^\n]*"\$s"/)
    expect(
      guard !== -1 && guard < write,
      'the close step rewrites the status without reading it for blocked: a merged draft of a blocked slice closes work that never landed',
    ).toBe(true)
    const branch = loop.slice(guard, write)
    expect(
      branch,
      'the blocked branch does not write to $GITHUB_STEP_SUMMARY: the slice stays blocked and nobody is told',
    ).toContain('>> "$GITHUB_STEP_SUMMARY"')
    expect(
      branch,
      'the blocked branch does not comment on the PR, or a refused comment fails the job and the review log is not committed',
    ).toMatch(/gh pr comment "\$PR"[^\n]*\|\| true/)
  })

  // `automerge.yml` is not the only one that merges, and the base is in the
  // context of neither path: `automerge.yml` starts from `workflow_run` and
  // looks the PR up by itself, `scripts/policy.sh` runs from a terminal and
  // has no event. Both ask `gh` for it, and both learned it after damage. On
  // 2026-09-14 the merge of a PR based on another slice took S12 to `done`
  // with the work not on main (S14). On 2026-09-15 the judge of PR #31 saw
  // that the decision path of `policy.sh` read tier, verdict, label, head and
  // state of the ci, and the base never: with the switch on, an approve at
  // tier 1 on a stacked PR landed inside the branch of another slice, and
  // `human-gate` did not stop it because that label comes from the path
  // touched (S16). The list is held still here so that whoever adds a third
  // merge point finds out before a merge nobody wanted, and each one is asked
  // to name the base: the list comes from the files, so the third is born
  // with the question on it.
  const mergers = walk(templates)
    .filter((file) =>
      /^[ \t]*(\|\|[ \t]*)?gh pr merge\b/m.test(
        readFileSync(join(templates, file), 'utf8'),
      ),
    )
    .sort()

  it('the chain merges from two places and no more', () => {
    expect(
      mergers,
      'a template merges a PR and is not one of the two known merge paths: decide whether the default branch belongs in its condition, the way automerge.yml and policy.sh both had to',
    ).toEqual(['github/automerge.yml', 'scripts/policy.sh'])
  })

  it.each(mergers)('%s: the merge asks where the PR would land', (file) => {
    expect(
      source(file),
      `${file} merges a PR and never reads baseRefName: it would merge a stacked PR into another slice branch, unattended, and raise the very event close.yml guards against`,
    ).toContain('baseRefName')
  })
})

// The same dragon, in .harness/docs/. This repo has the one README of the
// documents from stage local, like every project, and it is a copy written by
// hand in two places: whoever changes the contract of the backlog in one of
// the two alone leaves this repo with one rule and installs a different
// version of it everywhere else. S89 made the five READMEs of the folders one,
// with a section per folder, and a README of a folder that comes back is a
// second contract nobody compares.
describe('.harness/docs/README.md matches the template it was copied from', () => {
  const template = join(templates, 'docs/README.md')

  it('is equal to skills/harness-init/templates/docs/README.md', () => {
    expect(
      readFileSync(join(root, '.harness/docs/README.md'), 'utf8'),
      '.harness/docs/README.md drifted from skills/harness-init/templates/docs/README.md: change both, the template is what /harness-init local installs elsewhere',
    ).toBe(readFileSync(template, 'utf8'))
  })

  it.each(folders)('has a section for %s/', (folder) => {
    expect(
      folderSection(readFileSync(template, 'utf8'), folder).trim(),
      `skills/harness-init/templates/docs/README.md has no "## ${folder}/" section, or an empty one`,
    ).not.toBe('')
  })

  it.each(
    folders.flatMap((folder) => [
      `skills/harness-init/templates/docs/${folder}/README.md`,
      `.harness/docs/${folder}/README.md`,
    ]),
  )('%s is gone', (file) => {
    expect(
      existsSync(join(root, file)),
      `${file} is back: what it says belongs in its section of the one README`,
    ).toBe(false)
  })

  it('no file under skills/ names the README of a folder', () => {
    const old = /docs\/(intent|specs|backlog|decisions|review-log)\/README\.md/
    const named = walk(join(root, 'skills')).filter((file) =>
      old.test(readFileSync(join(root, 'skills', file), 'utf8')),
    )
    expect(
      named,
      'these files still send a reader to the README of a folder: the section of .harness/docs/README.md is where it is now',
    ).toEqual([])
  })
})

// S39. The contract leaves the prose: under a fixed heading the
// .harness/AGENTS.md of this repo and its template carry a `json` fence with the eight keys the programs of the chain read,
// and scripts/policy-lines.sh extracts it and passes it to jq. The heading,
// the fence and the names of the keys are the contract: translating the prose
// around them does not touch them. Here the block is read with jq and not
// with JSON.parse, because a block only the test parses would be green and
// dead.
describe('the policy block of .harness/AGENTS.md', () => {
  const heading = 'Policy block'
  const keys = [
    'version',
    'docs_mode',
    'sensitive_paths',
    'never_tier_0',
    'human_gate_paths',
    'docs_extra_paths',
    'max_lines',
    'max_files',
  ]
  const lists = [
    'sensitive_paths',
    'never_tier_0',
    'human_gate_paths',
    'docs_extra_paths',
  ]
  const agentsFiles: Array<[string, string]> = [
    ['.harness/AGENTS.md', join(root, '.harness/AGENTS.md')],
    ['skills/harness-init/templates/AGENTS.md', join(templates, 'AGENTS.md')],
  ]
  const tracked = execFileSync('git', ['ls-files'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)

  // The json fence under the fixed heading and nothing else, the way the awk
  // of policy-lines.sh cuts it. A throw and not an expect: this runs while the
  // cases are collected, where a failed expectation has nobody to report to.
  function fence(text: string): string {
    const section = text
      .split('\n## ')
      .find((part) => part.startsWith(`${heading}\n`))
    if (section === undefined) throw new Error(`no "## ${heading}" section`)
    const match = section.match(/^```json\n([\s\S]*?)\n```$/m)
    if (match === null) throw new Error(`no json fence under "## ${heading}"`)
    return match[1] ?? ''
  }

  function block(text: string): Record<string, unknown> {
    return JSON.parse(
      execFileSync('jq', ['-S', '.'], { input: fence(text), encoding: 'utf8' }),
    ) as Record<string, unknown>
  }

  it.each(agentsFiles)(
    '%s carries the block under the fixed heading, and jq reads the eight keys',
    (_name, path) => {
      expect(Object.keys(block(readFileSync(path, 'utf8'))).sort()).toEqual(
        [...keys].sort(),
      )
    },
  )

  // S47: the prose around the block turns English and the block does not. The
  // keys are a contract and the values are globs, and a translated glob is a
  // path that does not exist. Here the raw fence is read and not what jq hands
  // back, because `jq -S` reorders the keys and a translated one would slide
  // back into its place in the sorted comparison of the case above. The ascii
  // is the second half: an Italian word inside the fence almost always arrives
  // with an accent on it.
  it.each(agentsFiles)(
    '%s: the raw fence spells the eight keys in order, in ascii',
    (_name, path) => {
      const raw = fence(readFileSync(path, 'utf8'))
      expect(
        raw
          .split('\n')
          .map((line) => /^ {2}"([^"]+)":/.exec(line)?.[1])
          .filter((key): key is string => key !== undefined),
        'a key of the policy block was renamed, reordered or translated: these eight names in this order are what tier.sh, the git hooks and intent.sh ask jq for',
      ).toEqual(keys)
      expect(
        raw,
        'the policy block holds a character outside ascii: the prose around the block is the only thing a translation touches',
      ).toMatch(/^[\t\n\x20-\x7e]*$/)
    },
  )

  it.each(agentsFiles)('%s gives every key a value of its type', (_, path) => {
    const parsed = block(readFileSync(path, 'utf8'))
    expect(parsed.version).toBe(1)
    expect(['main', 'pr']).toContain(parsed.docs_mode)
    expect(typeof parsed.max_lines, 'max_lines is not a number').toBe('number')
    expect(typeof parsed.max_files, 'max_files is not a number').toBe('number')
    for (const key of lists) {
      expect(Array.isArray(parsed[key]), `${key} is not a list`).toBe(true)
      for (const pattern of parsed[key] as unknown[]) {
        expect(
          typeof pattern,
          `${key} holds something that is not a glob`,
        ).toBe('string')
        expect(pattern, `${key}: a glob between backticks`).not.toContain('`')
      }
    }
  })

  // The dragon of the backticks dies here: the globs sit in JSON strings, and
  // the block rewritten by Prettier parses key by key the same. With the
  // formatting of code inside fences on, which is the default and what a repo
  // of the projects has: here .prettierrc keeps it off, and the case would be
  // proving that a file nobody touched does not change.
  it.each(agentsFiles)(
    '%s: prettier rewrites the block and jq reads the same keys',
    (_name, path) => {
      const text = readFileSync(path, 'utf8')
      const copy = join(
        mkdtempSync(join(tmpdir(), 'policy-block-')),
        'AGENTS.md',
      )
      writeFileSync(copy, text)
      execFileSync(
        join(root, 'node_modules/.bin/prettier'),
        [
          '--write',
          '--prose-wrap',
          'preserve',
          '--embedded-language-formatting',
          'auto',
          copy,
        ],
        { encoding: 'utf8' },
      )
      expect(block(readFileSync(copy, 'utf8'))).toEqual(block(text))
    },
  )

  // Like the case that kept the paths of the prose lines honest: a list that
  // names a path that is not there is a rule that catches nothing, and nobody
  // notices.
  it.each(
    lists.flatMap((key) =>
      (
        block(readFileSync(join(root, '.harness/AGENTS.md'), 'utf8'))[
          key
        ] as string[]
      ).map((pattern) => [key, pattern] as [string, string]),
    ),
  )('%s: %s matches a tracked file', (_key, pattern) => {
    const glob = new RegExp(
      `^${pattern
        .replace(/\*\*/g, '*')
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')}$`,
    )
    expect(
      tracked.some((file) => glob.test(file)),
      `${pattern} matches no tracked file`,
    ).toBe(true)
  })

  // The fourth hole found on Tipoff: the fixed list of sensitive paths did
  // not have the files that decide how every change is checked. The scripts
  // of package.json are what the gates run, and tier.sh compares only their
  // dependencies. S56 adds the stamp: a hand edit of it would say the repo is
  // at a commit of the harness it never installed, and a lie about that is
  // read by whoever opens a cold session. S86 names the stamp, the bootstrap,
  // the file of the block and the prompt of the judge one by one: .harness/
  // also holds the documents, and .harness/bin/ is ignored in a project repo
  // and never in a diff, so the pin is the path that says the machinery
  // changed.
  it.each([
    '.harness/stamp.json',
    '.harness/bootstrap.sh',
    '.harness/AGENTS.md',
    '.harness/judge.md',
    '.claude/settings.json',
    '.github/**',
    'package.json',
    'pnpm-lock.yaml',
    'tsconfig*.json',
  ])('templates/AGENTS.md always names %s as sensitive', (path) => {
    expect(
      block(readFileSync(join(templates, 'AGENTS.md'), 'utf8'))
        .sensitive_paths as string[],
    ).toContain(path)
  })

  // The paths that left with S86: no project repo has scripts/ or .githooks/
  // of the harness any more, and .harness/** whole would put every document
  // under .harness/docs/ at tier 2.
  it.each(['.githooks/**', 'scripts/**', '.harness/**'])(
    'templates/AGENTS.md no longer names %s as sensitive',
    (path) => {
      expect(
        block(readFileSync(join(templates, 'AGENTS.md'), 'utf8'))
          .sensitive_paths as string[],
      ).not.toContain(path)
    },
  )

  it.each([
    'AGENTS.md',
    'CLAUDE.md',
    '.claude/**',
    '.harness/AGENTS.md',
    '.harness/judge.md',
    '.harness/docs/codebase-map.md',
  ])('templates/AGENTS.md names %s in never_tier_0', (path) => {
    expect(
      block(readFileSync(join(templates, 'AGENTS.md'), 'utf8'))
        .never_tier_0 as string[],
    ).toContain(path)
  })

  // S88: the seven paths a human merges, where the documents live now. A
  // repo installed on the old layout keeps its docs/** gate paths on a rerun
  // of stage local, which merges the block key by key and keeps the keys a
  // repo has. That is the spec's decision of no migration: such a repo is set
  // up again, and /harness-init does not move or rewrite its documents.
  it('templates/AGENTS.md names the seven human gate paths under .harness/docs/', () => {
    expect(
      block(readFileSync(join(templates, 'AGENTS.md'), 'utf8'))
        .human_gate_paths,
    ).toEqual([
      '.harness/docs/intent/**',
      '.harness/docs/specs/**',
      '.harness/docs/backlog/**',
      '.harness/docs/decisions/**',
      '.harness/docs/review-log/**',
      '.harness/docs/inbox.md',
      '.harness/docs/parked.md',
    ])
  })

  // The prose lines say the lists of the block, placeholders included, so
  // whoever reads the template reads the rule the scripts apply.
  it.each([
    ['- Sensitive paths:', 'sensitive_paths'],
    ['- Never tier 0:', 'never_tier_0'],
    ['- Human merge by path:', 'human_gate_paths'],
  ])('templates/AGENTS.md: the line "%s" says the list of %s', (start, key) => {
    const text = readFileSync(join(templates, 'AGENTS.md'), 'utf8')
    const line = text
      .split('\n')
      .find((candidate) => candidate.startsWith(start))
    expect(line, `templates/AGENTS.md has no "${start}" line`).toBeDefined()
    const said = [...(line ?? '').matchAll(/`([^`]+)`/g)].map(
      (match) => match[1] ?? '',
    )
    const listed = (block(text)[key] as string[]).map((path) =>
      path.replace(/^\{\{(.*)\}\}$/, '$1'),
    )
    expect([...said].sort()).toEqual([...listed].sort())
  })

  // Without docs_mode on main in the template, every repo installed from
  // there would keep main closed to documents too, and nobody would know why.
  it('templates/AGENTS.md installs docs_mode main', () => {
    expect(
      block(readFileSync(join(templates, 'AGENTS.md'), 'utf8')).docs_mode,
    ).toBe('main')
  })

  // The criterion of S39: one function extracts the fence and passes it to
  // jq, and none of them looks for a line of prose any more. The two dead
  // functions are searched for by name: as long as one stays, there is a
  // script that reads Italian.
  // S40 adds policy_why, which needs jq three times, for the parse, for the
  // keys and for the version. Counting the calls to jq was the way of saying
  // "the file is cut in one place only"; that sentence is now read where it
  // is written: one awk, and every jq that reads what that awk cut instead
  // of starting over from the text of AGENTS.md.
  it('policy-lines.sh reads the block, and nothing reads a line of prose', () => {
    const source = readFileSync(
      join(templates, 'scripts/policy-lines.sh'),
      'utf8',
    )
    const code = source
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('#'))
    expect(source, 'no policy_json: the block through jq').toContain(
      'policy_json()',
    )
    expect(source, 'no policy_fence: the one cut of the file').toContain(
      'policy_fence()',
    )
    expect(
      code.filter((line) => /\bawk\b/.test(line)).length,
      'more than one awk: the fence is extracted in one place',
    ).toBe(1)
    // Every jq that is given something to read reads what policy_fence cut,
    // never the text of AGENTS.md: a second reader of the contract would
    // come in from there. The `command -v jq` of policy_tool_missing reads
    // nothing and is not of this kind, and indeed it has no pipe.
    for (const line of code.filter((line) => /\|\s*jq\b/.test(line))) {
      expect(
        line,
        `this jq does not read what policy_fence cut: ${line.trim()}`,
      ).toMatch(/policy_fence|\$fence/)
    }
    for (const file of [
      'scripts/policy-lines.sh',
      'scripts/tier.sh',
      'scripts/intent.sh',
      'githooks/pre-commit',
      'githooks/pre-push',
    ]) {
      const text = readFileSync(join(templates, file), 'utf8')
      for (const gone of ['policy_line', 'docs_line']) {
        expect(text, `${file} still calls ${gone}`).not.toContain(gone)
      }
    }
  })

  // Criterion of the slice: the prose no longer repeats the two thresholds,
  // it says where they are. Two copies of the same number drift apart, and
  // the one nobody runs becomes a lie an agent reads as true.
  it.each(agentsFiles)(
    '%s: the prose points at the thresholds instead of writing them out',
    (_name, path) => {
      const text = readFileSync(path, 'utf8')
      const prose = text.slice(0, text.indexOf('## Policy block'))
      const parsed = block(text)
      expect(prose, 'the prose still writes max_lines out').not.toMatch(
        new RegExp(`\\b${String(parsed.max_lines)}\\b`),
      )
      expect(prose, 'the prose still writes max_files out').not.toMatch(
        new RegExp(`<= ?${String(parsed.max_files)}\\b`),
      )
      for (const key of ['max_lines', 'max_files']) {
        expect(prose, `the prose does not say where ${key} is`).toContain(key)
      }
    },
  )

  // The keys tier.sh asks for, so that a list the script starts reading is
  // checked here from day one.
  it('tier.sh asks the block for the lists and the two thresholds', () => {
    const source = readFileSync(join(templates, 'scripts/tier.sh'), 'utf8')
    for (const filter of [
      '.sensitive_paths[]',
      '.never_tier_0[]',
      '.human_gate_paths[]',
      '.max_lines',
      '.max_files',
    ]) {
      expect(source, `tier.sh does not ask the block for ${filter}`).toContain(
        `policy '${filter}'`,
      )
    }
  })
})

// The sentence about the human merge by tier, on the `- Intent and spec:`
// line of "Human gates": it is the behaviour of policy.sh written as prose,
// and no program reads it. An agent that reads the template stops in front of
// a PR the policy is about to merge if that sentence is behind. The sentence
// is compared and not the whole line: the other sentences drift for reasons
// of their own, the audit in Docket belongs to this repo.
describe('.harness/AGENTS.md and its template say the same tier gate', () => {
  const template = readFileSync(join(templates, 'AGENTS.md'), 'utf8')

  function tierGate(source: string): string | undefined {
    const section = source
      .split('\n## ')
      .find((part) => part.startsWith('Human gates'))
    return (
      (section ?? '')
        .split('\n')
        .find((line) => line.startsWith('- Intent and spec:')) ?? ''
    )
      .split(/(?<=\.)\s+/)
      .map((sentence) => sentence.trim())
      .find((sentence) => sentence.endsWith('human merge.'))
  }

  it('templates/AGENTS.md says which tier 2 waits for a human, as this repo does', () => {
    const here = tierGate(
      readFileSync(join(root, '.harness/AGENTS.md'), 'utf8'),
    )
    const there = tierGate(template)

    // The case died once already, by passing on two undefined: the heading was
    // renamed and every lookup came back empty on both sides at the same time,
    // so the comparison below had nothing to tell apart. Each side says it
    // found its sentence before the two are compared.
    for (const [name, sentence] of [
      ['.harness/AGENTS.md', here],
      ['skills/harness-init/templates/AGENTS.md', there],
    ] as const) {
      expect(
        sentence,
        `${name} has no tier sentence to compare: the \`## Human gates\` heading, the \`- Intent and spec:\` line or the sentence ending in "human merge." was renamed, and the comparison below would pass on two things nobody found`,
      ).toBeDefined()
    }

    expect(
      there,
      'the tier sentence in "Human gates" drifted from the one in .harness/AGENTS.md of this repo: every repo installed from the template would read a rule policy.sh does not follow',
    ).toBe(here)
    expect(
      there,
      'policy.sh merges a tier 2 PR when both judges on the head approve or are answered with no open `high`: it waits for a human only on an open `high` or `needs-human`',
    ).not.toBe('Tier 2 and 3: human merge.')
  })
})

// "The verdict is data": the schema in judge/ is the truth of the verdict,
// and the tests really use it. `reason` is a sentence, not a paragraph: 240
// characters, and the reason a human is needed sits in a field of its own.
describe('verdict.schema.json', () => {
  const schema = JSON.parse(
    readFileSync(join(templates, 'judge/verdict.schema.json'), 'utf8'),
  ) as Schema
  const sample = JSON.parse(
    readFileSync(join(root, 'tests/fixtures/verdict.json'), 'utf8'),
  ) as Record<string, unknown>
  const properties = schema.properties as Record<string, Schema>

  it('accepts the sample verdict of the tests', () => {
    expect(validate(sample, schema)).toEqual([])
  })

  it('caps reason at 240 characters and says why', () => {
    expect(properties.reason?.maxLength).toBe(240)
    expect(typeof properties.reason?.description).toBe('string')
    expect(
      validate({ ...sample, reason: 'x'.repeat(241) }, schema),
    ).not.toEqual([])
  })

  it('keeps the reason for a human in its own field, optional', () => {
    expect(properties.human_reason).toBeDefined()
    expect(schema.required).not.toContain('human_reason')
    expect(
      validate({ ...sample, human_reason: 'Decidi: A o B.' }, schema),
    ).toEqual([])
  })

  // The pattern of the two sha is the one the action imposes in CI on the
  // verdict the model has just written: judge.sh strips them before it
  // validates, because locally it writes them back itself, and the rule
  // stays true only here.
  it('pins head_sha and base_sha to a commit sha', () => {
    for (const field of ['head_sha', 'base_sha']) {
      expect(properties[field]?.pattern).toBe('^[0-9a-f]{40}$')
      expect(validate({ ...sample, [field]: 'nope' }, schema)).not.toEqual([])
    }
  })

  // ADR-0003: the judge runs once and the session answers what it fixes. The
  // answers are a field of the chain, like the two sha: optional, pinned, and
  // never asked of the judge.
  it('knows the answers, a field of the chain, optional and pinned', () => {
    const answers = properties.answers
    expect(answers, 'the schema has no answers').toBeDefined()
    expect(schema.required).not.toContain('answers')
    expect(answers?.description).toMatch(/never by the judge/)
    const good = [{ id: 'F1', sha: 'a'.repeat(40) }]
    expect(validate({ ...sample, answers: good }, schema)).toEqual([])
    expect(
      validate(
        { ...sample, answers: [{ id: '1', sha: 'a'.repeat(40) }] },
        schema,
      ),
    ).not.toEqual([])
    expect(
      validate({ ...sample, answers: [{ id: 'F1', sha: 'nope' }] }, schema),
    ).not.toEqual([])
  })

  it('carries the cache tokens the run really paid', () => {
    const cost = properties.cost?.properties as Record<string, Schema>
    expect(Object.keys(cost)).toEqual(
      expect.arrayContaining([
        'cache_creation_input_tokens',
        'cache_read_input_tokens',
      ]),
    )
  })
})

// S31: the evidence leaves the part of the comment meant for the human and
// stays in the closed JSON, which is where the audit reads it. What the human
// reads of a finding is the claim, so the prompt gives it a limit. Two
// sentences is a rule of the prompt and not of the schema: a sentence cannot
// be counted reliably with a pattern.
describe('judge/prompt.md keeps the claim short and the evidence for the audit', () => {
  // The rule on findings is an item of the `Rules:` list, and the list is one
  // paragraph: the item is taken, not the block. The whitespace is flattened,
  // because where the prose wraps is Prettier's call and not this test's.
  const items = readFileSync(join(templates, 'judge/prompt.md'), 'utf8')
    .split(/\n- /)
    .map((item) => item.replace(/\s+/g, ' '))
  const rule = items.find((item) =>
    item.includes('No finding without evidence'),
  )

  it('caps the claim at two sentences', () => {
    expect(rule, 'the rule on findings is missing').toBeDefined()
    expect(rule).toMatch(/claim is at most two sentences/)
  })

  it('says the evidence is the code seen, for the audit, and stays out of the comment', () => {
    expect(rule, 'the rule on findings is missing').toBeDefined()
    expect(rule).toContain('the code you saw')
    expect(rule).toMatch(/audit/)
    expect(rule).toMatch(/never into the comment/)
  })

  // S54: `reason` and `human_reason` carry a limit in characters, and the
  // prompt asks for one sentence, which is a shape and not a number: a
  // sentence of 244 characters is still one sentence, `check` refuses the
  // verdict and the whole run is lost, as it was on the approve verdict of
  // S36. The limits are read from the schema here, so one that moves, or a
  // third one that arrives, turns this red instead of costing a run.
  const schemaText = readFileSync(
    join(templates, 'judge/verdict.schema.json'),
    'utf8',
  )

  const limits = ((): [string, number][] => {
    const found: [string, number][] = []
    const collect = (node: unknown, field: string): void => {
      if (typeof node !== 'object' || node === null) return
      const part = node as Record<string, unknown>
      if (typeof part.maxLength === 'number' && field)
        found.push([field, part.maxLength])
      for (const [name, child] of Object.entries(
        (part.properties as Record<string, unknown>) ?? {},
      ))
        collect(child, name)
      collect(part.items, field)
    }
    collect(JSON.parse(schemaText), '')
    return found
  })()

  it('takes the limits from the schema, never from a list written here', () => {
    const written = schemaText.match(/"maxLength"/g)?.length ?? 0
    expect(
      written,
      'judge/verdict.schema.json has no maxLength any more: the case below has no limit left to keep',
    ).toBeGreaterThan(0)
    expect(
      limits.length,
      'the walk over judge/verdict.schema.json missed a maxLength: the case below would let through a limit the prompt never names',
    ).toBe(written)
  })

  it.each(limits)('names the limit of `%s`, %i characters', (field, limit) => {
    const naming = items.filter((item) => item.includes(`\`${field}\``))
    expect(
      naming.length,
      `skills/harness-init/templates/judge/prompt.md never names \`${field}\`, which skills/harness-init/templates/judge/verdict.schema.json caps at ${limit} characters`,
    ).toBeGreaterThan(0)
    expect(
      naming.some((item) => new RegExp(`\\b${limit}\\b`).test(item)),
      `skills/harness-init/templates/judge/prompt.md does not name the ${limit} characters that judge/verdict.schema.json allows for \`${field}\`: write the number where the prompt describes the field, or the judge writes a verdict check refuses`,
    ).toBe(true)
  })
})

// "Gate first, judge second": the prose and the gates are checks, not
// judgements. The prompt forbids the judge to redo the gates, and the two
// points where the gate on the prose hooks in (ci.yml, pre-commit) are
// textual invariants of the templates, like the lines above.
describe('the gates are wired and the judge is told to leave them alone', () => {
  const read = (file: string) => readFileSync(join(templates, file), 'utf8')

  it.each([
    'commitlint.sh',
    'prose.sh',
    'test-weakening.sh',
    'tier.sh',
    'pnpm audit',
    'gitleaks',
  ])('judge/prompt.md names %s among the gates not to verify', (gate) => {
    const rule = read('judge/prompt.md')
      .split('\n\n')
      .find((paragraph) =>
        paragraph.includes('Do not verify what a gate proved'),
      )
    expect(rule, 'the rule paragraph is missing').toBeDefined()
    expect(rule).toContain(gate)
  })

  it('escalate.yml fires on a crash label as well as on needs-human', () => {
    const yml = read('github/escalate.yml')
    expect(yml).toMatch(/endsWith\(github\.event\.label\.name, ':crashed'\)/)
    expect(yml).toMatch(/github\.event\.label\.name == 'needs-human'/)
  })

  // The Actions bill of 22 September 2026: GitHub bills every job rounded up
  // to the whole minute, and the six jobs ci.yml used to have cost seven
  // minutes a run for two of work, on every PR of every repo with the harness.
  // One job, named `ci` so the required status check and policy.sh keep
  // reading the same name; the gates are steps that go on after a failure,
  // the tier lands whatever they said, and the last step is the red one.
  it('ci.yml is one job, named ci', () => {
    const file = 'skills/harness-init/templates/github/ci.yml'
    const yml = read('github/ci.yml')
    expect(
      yml.match(/^ +runs-on:/gm)?.length,
      `${file}: more than one job, and GitHub bills each one rounded up to the minute`,
    ).toBe(1)
    expect(yml, `${file}: the one job is not named ci`).toMatch(
      /^jobs:\n  ci:\n    name: ci\n/m,
    )
    const tail = yml.slice(yml.indexOf('compute and label the tier'))
    expect(
      tail,
      `${file}: the tier and the last step have to run after a red gate`,
    ).toMatch(/if: always\(\)[\s\S]*every gate green\n\s+if: always\(\)/)
  })

  it('ci.yml runs prose.sh on the range in the conventions steps', () => {
    expect(read('github/ci.yml')).toMatch(
      /- run: \.harness\/bin\/prose\.sh "origin\/\$BASE_REF"/,
    )
  })

  // The line of the inbox of 2026-09-18: PR #54 landed as
  // `docs/readme onboarding (#54)`. Both merge paths squash, so the subject on
  // the default branch is the title of the PR and never one of the commits the
  // step above lints, and with more than one commit GitHub builds that title
  // from the name of the branch. `edited` is what gives a title fixed by hand
  // a new run, instead of a required check that stays red on a PR in format.
  it('ci.yml checks the title of the PR the way the squash lands it', () => {
    const file = 'skills/harness-init/templates/github/ci.yml'
    const yml = read('github/ci.yml')
    expect(
      yml,
      `${file}: the conventions steps do not lint the title of the PR`,
    ).toMatch(/\.harness\/bin\/commitlint\.sh --subject "\$PR_TITLE \(#\$PR\)"/)
    expect(yml, `${file}: the job has no PR_TITLE in its env`).toMatch(
      /PR_TITLE: \$\{\{ github\.event\.pull_request\.title \}\}/,
    )
    expect(
      yml.match(/github\.event\.pull_request\.title/g)?.length,
      `${file}: the title reaches the step through env, never interpolated into a run:`,
    ).toBe(1)
    const failure = yml.slice(yml.indexOf('--subject'))
    expect(
      failure,
      `${file}: the failure of the title check does not name the title`,
    ).toContain('title: $PR_TITLE')
    expect(
      failure,
      `${file}: the failure of the title check does not say the suffix is counted`,
    ).toMatch(/suffix[^\n]*counted/)
  })

  it('ci.yml runs again when the title of the PR is edited', () => {
    const file = 'skills/harness-init/templates/github/ci.yml'
    const types = /types: \[([^\]]*)\]/.exec(read('github/ci.yml'))?.[1]
    expect(
      types,
      `${file}: the pull_request trigger has no types`,
    ).toBeDefined()
    expect(
      types?.split(',').map((type) => type.trim()),
      `${file}: without the edited type a title fixed by hand gets no new run`,
    ).toContain('edited')
  })

  it('pre-commit runs prose.sh on the staged lines', () => {
    expect(read('githooks/pre-commit')).toMatch(
      /^\.harness\/bin\/prose\.sh --staged$/m,
    )
  })

  // The first open finding of PR #13. Stage local installs the hook that
  // refuses the PR of a head with no verdict, and the line that explains it
  // had gone into the AGENTS.md of this repo alone: a project installing the
  // chain took the gate with the rule written nowhere.
  it('AGENTS.md names /judge in the PR convention it ships', () => {
    const line = read('AGENTS.md')
      .split('\n')
      .find((paragraph) => paragraph.startsWith('- PR:'))
    expect(line, 'the template has no "- PR:" line').toBeDefined()
    expect(
      line,
      'the template installs the verdict hook and never says to run /judge',
    ).toContain('/judge')
  })

  it('close.yml hands the comments to review-log.sh', () => {
    expect(read('github/close.yml')).toMatch(
      /\.harness\/bin\/review-log\.sh "\$PR"/,
    )
  })
})

// The fourth open finding of PR #13. `judge.sh path` prints where the verdict
// would go, not that it is there: after a refused `check` that path does not
// exist, and `policy.sh` on a file that is not there does what it has to do
// with a missing verdict, which is to write a crash comment on the PR that no
// later judgement cleans up. It happened. The skill showed the two steps
// apart, so the line that posts the verdict carries its guard inside it.
describe('skills/judge/SKILL.md posts only what check stored', () => {
  const skill = readFileSync(join(root, 'skills/judge/SKILL.md'), 'utf8')

  it('calls policy.sh only behind judge.sh have', () => {
    // The continuations before the split: the invariant is on the command,
    // not on the line, and the command sits on two lines to stay inside the
    // column.
    const calls = skill
      .replace(/\\\n\s*/g, ' ')
      .split('\n')
      .filter((line) => /\.harness\/bin\/policy\.sh\s+"\$\(/.test(line))
    expect(
      calls.length,
      'the skill no longer shows the command that posts the verdict',
    ).toBeGreaterThan(0)
    for (const call of calls) {
      expect(call, 'policy.sh runs on a path nobody checked').toMatch(
        /\.harness\/bin\/judge\.sh have <role>.*&&\s+\.harness\/bin\/policy\.sh/,
      )
    }
  })
})

// A skill is a folder under skills/ with its own SKILL.md, and Claude Code
// finds it through the symlink in ~/.claude/skills/. The frontmatter is what
// the model reads before the rest: `description` decides when the skill
// starts by itself, and without one the skill is there and never starts;
// `name` has to say the folder, which is the name of the symlink and of the
// command in CLAUDE.md and in the README, or the two tell of two different
// skills.
describe('every skill has a SKILL.md with its frontmatter', () => {
  const skills = readdirSync(join(root, 'skills')).filter((name) =>
    statSync(join(root, 'skills', name)).isDirectory(),
  )

  it.each(skills)('skills/%s/SKILL.md', (skill) => {
    const file = join(root, 'skills', skill, 'SKILL.md')
    expect(existsSync(file), `skills/${skill}/ has no SKILL.md`).toBe(true)
    const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(
      readFileSync(file, 'utf8'),
    )?.[1]
    expect(
      frontmatter,
      `skills/${skill}/SKILL.md does not open with a --- frontmatter block`,
    ).toBeDefined()
    expect(frontmatter, `the name is not "${skill}"`).toMatch(
      new RegExp(`^name: ${skill}$`, 'm'),
    )
    expect(frontmatter, 'no description').toMatch(/^description: \S/m)
  })
})

// S46, from SPEC-english-first. The body of the six skills is English, the
// frontmatter was not: `description` is the line Claude Code reads to decide
// when a skill starts, and a trigger phrase written in Italian is a trigger
// nobody who does not read Italian can pull. The check is a list of Italian
// function words that do not exist in English, the same comparison S50 makes
// over the whole set of paths, restricted here to the six descriptions: a
// paragraph left untranslated carries no label of the contract and would pass
// a search for exact strings. Out of the list stay `per`, `in`, `a`, `e`,
// `di` and `come`, which show up on their own in an English file. The
// commands, the English phrases and the conditions that are nobody's phrase,
// like "when a session starts in a repo that has the harness", are not
// touched by it.
describe('no description of a skill says a phrase in Italian', () => {
  const italian = [
    'il',
    'lo',
    'la',
    'gli',
    'che',
    'non',
    'una',
    'nel',
    'nella',
    'del',
    'della',
    'dei',
    'dal',
    'alla',
    'sono',
    'anche',
    'più',
    'quando',
    'senza',
    'viene',
    'questo',
  ]

  // A word between non-letters: an apostrophe and a hyphen are boundaries, so
  // "l'harness" and "pre-flight" are read word by word, and "Also" does not
  // hide an "lo".
  const found = (text: string): string[] =>
    italian.filter((word) =>
      new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, 'iu').test(text),
    )

  const skills = readdirSync(join(root, 'skills')).filter((name) =>
    statSync(join(root, 'skills', name)).isDirectory(),
  )

  it.each(skills)('skills/%s/SKILL.md', (skill) => {
    const frontmatter =
      /^---\n([\s\S]*?)\n---\n/.exec(
        readFileSync(join(root, 'skills', skill, 'SKILL.md'), 'utf8'),
      )?.[1] ?? ''
    const description = frontmatter.replace(/^[\s\S]*?description:/, '')
    expect(
      found(description),
      `the description of /${skill} says ${found(description).join(', ')} in Italian: the trigger works for whoever reads Italian and for nobody else`,
    ).toEqual([])
  })

  it('the check bites on a description that puts an Italian trigger back', () => {
    expect(
      found('Use when the user says "prepara il repo per la catena".'),
    ).toContain('il')
  })
})

// S46. Taking the Italian phrases out of a description is half the rule: what
// stays is the other half, and a translation that drops a trigger costs a way
// in without anything turning red. The command comes from the folder name,
// because the name of a skill is its command; the English phrases are listed
// per skill, because a phrase nobody wrote cannot be derived from anything.
// The list is the one every description already carried when the Italian
// left it: a skill added later has to write its own line here, or the first
// case fails on the skill with no entry.
describe('every description keeps its command and the English triggers', () => {
  const triggers: Record<string, string[]> = {
    board: ['"open the board"'],
    'harness-init': ['"set up the harness"'],
    judge: ['"run the judge locally"'],
    next: ['"take the next slice"'],
    slice: ['"slice this spec"'],
    spec: ['"spec this intent"'],
  }

  // The description is a folded scalar: the line break inside it is part of
  // the YAML, not of the phrase, and "spec this intent" arrives split in two.
  const squash = (text: string): string => text.replace(/\s+/g, ' ').trim()

  // The command at the start of a word and whole: `.harness/docs/specs/` is not the
  // command of /spec, and `.harness/bin/board.sh` is not the command of /board.
  const missing = (description: string, skill: string): string[] =>
    [`/${skill}`, ...(triggers[skill] ?? [])].filter((trigger) =>
      trigger.startsWith('/')
        ? !new RegExp(`(^|\\s)${trigger}(?![\\w-])`).test(description)
        : !description.includes(trigger),
    )

  const skills = readdirSync(join(root, 'skills')).filter((name) =>
    statSync(join(root, 'skills', name)).isDirectory(),
  )

  it.each(skills)('skills/%s/SKILL.md', (skill) => {
    expect(
      triggers[skill],
      `skills/${skill}/ has no line in this test: say which English phrases start it, or nobody checks that they stay`,
    ).toBeDefined()
    const frontmatter =
      /^---\n([\s\S]*?)\n---\n/.exec(
        readFileSync(join(root, 'skills', skill, 'SKILL.md'), 'utf8'),
      )?.[1] ?? ''
    const description = squash(frontmatter.replace(/^[\s\S]*?description:/, ''))
    expect(
      missing(description, skill),
      `the description of /${skill} no longer names ${missing(description, skill).join(', ')}: a way into the skill went away with the translation`,
    ).toEqual([])
  })

  it('the check bites on a description that drops the command or a phrase', () => {
    expect(
      missing('Use when the user says "open the board".', 'board'),
    ).toEqual(['/board'])
    expect(missing('Use when the user runs /board.', 'board')).toEqual([
      '"open the board"',
    ])
    expect(
      missing('The spec lives in .harness/docs/specs/SPEC.md.', 'spec'),
    ).toContain('/spec')
  })
})

// A session at clean context starts from AGENTS.md and from CLAUDE.md, which
// import .harness/AGENTS.md: its "Map" says which skills exist, the line about the symlinks says the one
// that runs is the folder of the working tree. A skill missing from one of
// the two lines is a skill whoever reads believes is not there, and whoever
// adds the next one has nothing to remind them of the two lines. The test
// compares names, not sentences: the description of each skill stays the
// prose of whoever writes it.
describe('.harness/AGENTS.md and CLAUDE.md name every skill of skills/', () => {
  const skills = readdirSync(join(root, 'skills')).filter((name) =>
    statSync(join(root, 'skills', name)).isDirectory(),
  )

  const symlinkLine = readFileSync(join(root, 'CLAUDE.md'), 'utf8')
    .split('\n')
    .find((line) => line.includes('~/.claude/skills/'))
  const map = readFileSync(join(root, '.harness/AGENTS.md'), 'utf8')
    .split(/^## /m)
    .find((section) => section.startsWith('Map\n'))

  it.each(skills)('CLAUDE.md names `%s` among the symlinks', (skill) => {
    expect(
      symlinkLine,
      'CLAUDE.md has no line that names ~/.claude/skills/',
    ).toBeDefined()
    expect(
      symlinkLine,
      `the symlink line of CLAUDE.md does not name \`${skill}\`, which is a folder of skills/`,
    ).toContain(`\`${skill}\``)
  })

  it.each(skills)(
    'the Map of .harness/AGENTS.md names skills/%s/SKILL.md',
    (skill) => {
      expect(map, '.harness/AGENTS.md has no ## Map section').toBeDefined()
      expect(
        map,
        `the "Map" of .harness/AGENTS.md does not name skills/${skill}/SKILL.md`,
      ).toContain(`skills/${skill}/SKILL.md`)
    },
  )
})

// S86. The harness is the tool and not the subject: the root AGENTS.md says
// what the project is and sends the agent to .harness/AGENTS.md in one short
// section, and CLAUDE.md imports both. A policy block left at the root would
// be a second copy nobody reads.
describe('the root AGENTS.md sends the agent to .harness/AGENTS.md', () => {
  const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8')

  it('has no policy block', () => {
    expect(agents).not.toMatch(/^## Policy block/m)
    expect(agents).not.toContain('```json')
  })

  it('has a ## Harness section of at most three lines that names .harness/AGENTS.md', () => {
    const section = agents
      .split(/^## /m)
      .find((part) => part.startsWith('Harness\n'))
    expect(section, 'AGENTS.md has no ## Harness section').toBeDefined()
    const lines = (section ?? '')
      .split('\n')
      .slice(1)
      .filter((line) => line.trim() !== '')
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.length).toBeLessThanOrEqual(3)
    expect(lines.join('\n')).toContain('`.harness/AGENTS.md`')
  })

  it('CLAUDE.md has the line @.harness/AGENTS.md', () => {
    expect(readFileSync(join(root, 'CLAUDE.md'), 'utf8').split('\n')).toContain(
      '@.harness/AGENTS.md',
    )
  })
})

// The ninth user story of .harness/docs/specs/SPEC-spec-skill.md: "Un test strutturale
// fallisce se le sezioni del template in skills/spec/templates/SPEC.md e la
// lista nel README di .harness/docs/specs/ divergono". The template is what /spec
// writes, the specs/ section of .harness/docs/README.md is the contract in the
// repos where the skill is not there: if they say different sections or
// fields, /slice reads a spec the contract does not describe. The READMEs are
// two, the one of this repo and the one /harness-init local copies elsewhere,
// and both hold.
describe('the spec template and the specs/ section of .harness/docs/README.md say the same sections', () => {
  const template = readFileSync(
    join(root, 'skills/spec/templates/SPEC.md'),
    'utf8',
  )
  const sections = [...template.matchAll(/^## (.+)$/gm)].map((match) =>
    (match[1] ?? '').trim(),
  )
  const fields = [
    ...(/^---\n([\s\S]*?)\n---\n/.exec(template)?.[1] ?? '').matchAll(
      /^([a-z_]+):/gm,
    ),
  ].map((match) => match[1] ?? '')
  const readmes = [
    '.harness/docs/README.md',
    'skills/harness-init/templates/docs/README.md',
  ]

  it('the template has a frontmatter and its sections', () => {
    expect(fields, 'the template has no frontmatter').toContain('status')
    expect(
      sections.length,
      'the template has no "## " section',
    ).toBeGreaterThan(0)
  })

  it.each(readmes)(
    '%s lists the sections of the template, in order',
    (file) => {
      const list = /Sections: ([^.]+)\./.exec(
        folderSection(readFileSync(join(root, file), 'utf8'), 'specs'),
      )?.[1]
      expect(
        list,
        `the specs/ section of ${file} has no "Sections: ..." sentence`,
      ).toBeDefined()
      expect(
        (list ?? '').split(',').map((section) => section.trim()),
        `${file} and skills/spec/templates/SPEC.md list different sections`,
      ).toEqual(sections)
    },
  )

  it.each(readmes)(
    '%s names every field of the template frontmatter',
    (file) => {
      const readme = folderSection(
        readFileSync(join(root, file), 'utf8'),
        'specs',
      )
      for (const field of fields) {
        expect(
          readme,
          `the specs/ section of ${file} does not name the frontmatter field \`${field}\``,
        ).toMatch(new RegExp('`' + field + '[`:]'))
      }
    },
  )
})

// The same skeleton read from the other end. /slice cuts a spec by naming its
// sections: it refuses a spec whose "Open questions" section is not the
// sentinel, it looks for the touchpoints under "Modules touched", and it
// keeps a slice away from the lines of "Out of scope". A section renamed in
// the skeleton alone leaves the skill looking for a heading no spec has.
describe('skills/slice/SKILL.md names the spec sections it reads', () => {
  const sections = [
    ...readFileSync(
      join(root, 'skills/spec/templates/SPEC.md'),
      'utf8',
    ).matchAll(/^## (.+)$/gm),
  ].map((match) => (match[1] ?? '').trim())
  const skill = readFileSync(join(root, 'skills/slice/SKILL.md'), 'utf8')
  const named = ['Modules touched', 'Out of scope', 'Open questions']

  it.each(named)('"%s" is a section of the skeleton', (section) => {
    expect(
      sections,
      `skills/spec/templates/SPEC.md has no "${section}" section: /slice reads a spec by a heading /spec does not write`,
    ).toContain(section)
  })

  it.each(named)('"%s" is the name skills/slice/SKILL.md uses', (section) => {
    expect(
      skill,
      `skills/slice/SKILL.md does not name "${section}": the skill sends an agent to a section of the spec under its old name`,
    ).toContain(`"${section}"`)
  })
})

// /next, /slice and /spec write the body of a PR into the repo's PR template,
// and they name its sections word for word. A heading renamed in the template
// alone leaves the three skills telling an agent to fill a section the file
// does not have, and the body stops matching the file that says how to fill it.
describe('the skills that fill a PR body name the sections of the template', () => {
  const headings = [
    ...readFileSync(
      join(templates, 'github/pull_request_template.md'),
      'utf8',
    ).matchAll(/^## (.+)$/gm),
  ].map((match) => (match[1] ?? '').trim())

  // The section no skill quotes, with the reason next to it, as in the
  // .github describe: the declared findings are the `low` ones of the
  // judgement, and a skill says what goes there without naming the heading.
  const unquoted = ['Declared findings']
  const quoted = headings.filter((heading) => !unquoted.includes(heading))
  const skills = ['next', 'slice', 'spec']

  it.each(unquoted)('the template still has the "%s" section', (heading) => {
    expect(headings).toContain(heading)
  })

  // Normalized on whitespace: the line breaks are Prettier's, not the
  // skill's, and a section named across two lines is named.
  it.each(skills)('skills/%s/SKILL.md', (skill) => {
    const text = readFileSync(join(root, 'skills', skill, 'SKILL.md'), 'utf8')
      .split(/\s+/)
      .join(' ')
    for (const heading of quoted) {
      expect(
        text,
        `skills/${skill}/SKILL.md does not name the "${heading}" section of the PR template`,
      ).toContain(`"${heading}"`)
    }
  })
})

// Decision 4 of ADR-0003. A skill working in another repo sees the harness of
// that repo as it is, not as it is here: a template behind, a line missing.
// Before this rule every run on Tipoff ended up repairing the harness instead
// of doing the slice, and the six maintenance commits on `harness/judge` are
// the bill. The paragraph is one and sits in every skill that runs in someone
// else's repo: the test looks for it by folder and not by list, so a new
// skill, `/next` of S12, is born bound to it instead of being forgotten.
describe('every skill carries the same harness guardrail', () => {
  // Normalized on whitespace: the line breaks are Prettier's, not the rule's.
  // Word for word means these words in this order.
  const guardrail = [
    '- **The harness of the repo you are working in is not yours to fix.**',
    'A template behind, a line missing in `AGENTS.md`, a script that',
    'misbehaves: write one dated line in `.harness/docs/inbox.md`,',
    '`- <YYYY-MM-DD>: <one line>`, and carry on with what is there. Never',
    'rerun `/harness-init`, never edit a script, a hook, a workflow or the',
    '`AGENTS.md` of that repo: the fix belongs to the harness repo and comes',
    'back with the stage of `/harness-init` that owns the file. The only stop',
    'is a directory this skill must write into that is not there, which means',
    'there is no harness. If `.harness/docs/inbox.md` alone is missing, say so in the',
    'hand-back and do not create it.',
  ].join(' ')

  const squash = (text: string): string => text.replace(/\s+/g, ' ').trim()

  // harness-init is the exception, and the only one: repairing the harness is
  // its job, and the rule would forbid it to exist.
  const skills = readdirSync(join(root, 'skills')).filter(
    (name) =>
      name !== 'harness-init' &&
      statSync(join(root, 'skills', name)).isDirectory(),
  )

  it('there is at least one skill to check', () => {
    expect(skills.length).toBeGreaterThan(0)
  })

  it.each(skills)('skills/%s/SKILL.md says it word for word', (skill) => {
    expect(
      squash(readFileSync(join(root, 'skills', skill, 'SKILL.md'), 'utf8')),
      `skills/${skill}/SKILL.md does not carry the guardrail of ADR-0003, decision 4, word for word: copy it from another skill, it is the same paragraph everywhere`,
    ).toContain(guardrail)
  })
})

// The inbox is where what the skill does not repair ends up. It goes into the
// repos of the projects like the README of the documents, so it is a
// template: the row in templates/README.md is imposed by the describe at the
// top of this file, which walks the tree of the templates. The difference
// with the README is that the inbox carries data, the entries, which belong to that
// repo and are not kept aligned: the comparison is on the header.
describe('.harness/docs/inbox.md is a template plus the entries of this repo', () => {
  const template = readFileSync(join(templates, 'docs/inbox.md'), 'utf8')
  const mine = readFileSync(join(root, '.harness/docs/inbox.md'), 'utf8')
  const entry = /^- \d{4}-\d{2}-\d{2}: /m

  it('the template carries no entry: a new repo starts empty', () => {
    expect(
      entry.test(template),
      'skills/harness-init/templates/docs/inbox.md has an entry in it: the entries belong to the repo, the template is the header',
    ).toBe(false)
  })

  it('.harness/docs/inbox.md opens with the template', () => {
    expect(
      mine.startsWith(template),
      '.harness/docs/inbox.md drifted from skills/harness-init/templates/docs/inbox.md: change the template, the header is what /harness-init local installs elsewhere',
    ).toBe(true)
  })
})

// S74: .harness/docs/parked.md is the inbox of what waits on purpose, and it travels
// the same way: the header is the template, the lines belong to the repo.
describe('.harness/docs/parked.md is a template plus the entries of this repo', () => {
  const read = (path: string): string =>
    existsSync(path) ? readFileSync(path, 'utf8') : ''
  const entry = /^- \d{4}-\d{2}-\d{2}: /m

  it('the template carries no entry: a new repo starts empty', () => {
    const template = read(join(templates, 'docs/parked.md'))
    expect(
      template,
      'skills/harness-init/templates/docs/parked.md is missing or empty',
    ).not.toBe('')
    expect(
      entry.test(template),
      'skills/harness-init/templates/docs/parked.md has an entry in it: the entries belong to the repo, the template is the header',
    ).toBe(false)
  })

  it('.harness/docs/parked.md opens with the template', () => {
    const template = read(join(templates, 'docs/parked.md'))
    const mine = read(join(root, '.harness/docs/parked.md'))
    expect(mine, '.harness/docs/parked.md is missing or empty').not.toBe('')
    expect(
      mine.startsWith(template),
      '.harness/docs/parked.md drifted from skills/harness-init/templates/docs/parked.md: change the template, the header is what /harness-init local installs elsewhere',
    ).toBe(true)
  })

  it('templates/README.md creates it in stage local, only if missing', () => {
    expect(stageOf('docs/parked.md')).toBe('local')
    const row = readFileSync(join(templates, 'README.md'), 'utf8')
      .split('\n')
      .find((line) => line.startsWith('| `docs/parked.md`'))
    expect(row, 'templates/README.md has no row of docs/parked.md').toContain(
      'created if missing',
    )
  })
})

// S09 lets through on main a commit made only of the paths of the human gate.
// A line of inbox is written by a skill in the middle of a run: if the path
// is not among those, the hook stops it and the skill jams exactly where it
// was supposed to carry on.
describe('.harness/AGENTS.md lets a line of inbox land', () => {
  it.each([
    ['.harness/AGENTS.md', join(root, '.harness/AGENTS.md')],
    ['skills/harness-init/templates/AGENTS.md', join(templates, 'AGENTS.md')],
  ])('%s names .harness/docs/inbox.md in human_gate_paths', (_name, path) => {
    expect(
      policyBlock(readFileSync(path, 'utf8')).human_gate_paths,
      'a skill cannot commit the line it was told to write',
    ).toContain('.harness/docs/inbox.md')
  })
})

// S74: the line of .harness/docs/parked.md lands on main the way a line of inbox does,
// or the pre-commit hook refuses the commit of park.sh.
describe('.harness/AGENTS.md lets a line of parked land', () => {
  it.each([
    ['.harness/AGENTS.md', join(root, '.harness/AGENTS.md')],
    ['skills/harness-init/templates/AGENTS.md', join(templates, 'AGENTS.md')],
  ])('%s names .harness/docs/parked.md in human_gate_paths', (_name, path) => {
    const text = readFileSync(path, 'utf8')
    expect(
      policyBlock(text).human_gate_paths,
      'a commit of .harness/docs/parked.md alone is refused on main',
    ).toContain('.harness/docs/parked.md')
    const prose = text
      .split('\n')
      .find((line) => line.startsWith('- Human merge by path:'))
    expect(
      prose,
      `${_name} does not say .harness/docs/parked.md in Human gates`,
    ).toContain('`.harness/docs/parked.md`')
  })
})

// Decision 4 of ADR-0003, its second half: this repo stops judging itself by
// default. The hook stays in the template, because in the repos of the
// projects the gate is needed; here /judge is run on request, as an audit. It
// is the only difference allowed between the two files, and the test names it
// instead of letting it drift.
describe('.claude/settings.json is the template without the verdict hook', () => {
  type Settings = {
    hooks: {
      PreToolUse: Array<{
        matcher: string
        hooks: Array<{ type: string; command: string }>
      }>
      SessionStart?: Array<{
        hooks: Array<{ type: string; command: string }>
      }>
    }
    permissions: { allow: string[] }
  }

  const mine = JSON.parse(
    readFileSync(join(root, '.claude/settings.json'), 'utf8'),
  ) as Settings
  const theirs = JSON.parse(
    readFileSync(join(templates, 'settings.json'), 'utf8').replace(
      /\{\{pm\}\}/g,
      'pnpm',
    ),
  ) as Settings

  const commands = (settings: Settings): string[] =>
    settings.hooks.PreToolUse.flatMap((entry) =>
      entry.hooks.map((hook) => hook.command),
    )

  it('the template still installs both hooks', () => {
    expect(commands(theirs)).toEqual([
      '"$CLAUDE_PROJECT_DIR"/.harness/bin/ensure-hooks.sh',
      '"$CLAUDE_PROJECT_DIR"/.harness/bin/ensure-verdict.sh',
    ])
  })

  it('this repo keeps ensure-hooks.sh and drops ensure-verdict.sh', () => {
    expect(commands(mine)).toEqual([
      '"$CLAUDE_PROJECT_DIR"/.harness/bin/ensure-hooks.sh',
    ])
  })

  // S87: both run the bootstrap when a session starts, this repo included,
  // where it only points core.hooksPath at .harness/bin/hooks. From the root
  // of the project, because the session may start in a subdirectory, and with
  // stderr on stdout, which Claude Code adds to the context of the session.
  it.each([
    ['the template', theirs],
    ['this repo', mine],
  ])('%s runs the bootstrap at SessionStart', (_, settings) => {
    expect(
      (settings.hooks.SessionStart ?? []).flatMap((entry) =>
        entry.hooks.map((hook) => hook.command),
      ),
    ).toEqual([
      '{ cd "$CLAUDE_PROJECT_DIR" && "$CLAUDE_PROJECT_DIR"/.harness/bootstrap.sh; } 2>&1 || true',
    ])
  })

  it('differs from the template in that hook and in nothing else', () => {
    const stripped = structuredClone(theirs)
    for (const entry of stripped.hooks.PreToolUse) {
      entry.hooks = entry.hooks.filter(
        (hook) => !hook.command.endsWith('ensure-verdict.sh'),
      )
    }
    expect(
      mine,
      '.claude/settings.json and its template differ somewhere else too: the allowlist and the matchers are meant to stay the same',
    ).toEqual(stripped)
  })
})

// Decision 1 of ADR-0003. The skills that produce documents do not decide by
// themselves how they travel: the `docs_mode` key of the policy block says
// it, the same one the git hooks read through .harness/bin/policy-lines.sh. A
// skill that forgot a branch of the key would do it in silence, and the wrong
// mode shows only when the hook refuses the commit or when, in a team, a spec
// lands on main without anybody merging it. /board is the third since S23: a
// line of inbox that becomes a slice is a document too.
describe('/spec, /slice and /board read docs_mode, and say both modes', () => {
  const skills: Array<[string, string]> = [
    ['spec', 'docs(spec): <slug>'],
    ['slice', 'docs(backlog): <slug>'],
    ['board', 'docs(backlog): s<NN> from the inbox'],
  ]

  it.each(skills)(
    'skills/%s/SKILL.md names the key and its two values',
    (skill) => {
      const text = readFileSync(join(root, 'skills', skill, 'SKILL.md'), 'utf8')
      expect(
        text,
        `skills/${skill}/SKILL.md never names \`docs_mode\`: it is deciding on its own how a document travels`,
      ).toContain('`docs_mode`')
      expect(
        text,
        `skills/${skill}/SKILL.md does not say the value is the one in the policy block: a sentence of the prose around it decides nothing`,
      ).toContain('policy block')
      for (const mode of ['`main`', '`pr`']) {
        expect(
          text,
          `skills/${skill}/SKILL.md has no ${mode} path: one of the two repos, solo or team, gets the wrong flow`,
        ).toContain(mode)
      }
    },
  )

  it.each(skills)(
    'skills/%s/SKILL.md says the commit subject it lands on main',
    (skill, subject) => {
      expect(
        readFileSync(join(root, 'skills', skill, 'SKILL.md'), 'utf8'),
        `skills/${skill}/SKILL.md does not name "${subject}": the commit is the minutes, and its subject is what git log reads back`,
      ).toContain(subject)
    },
  )
})

// S23, from SPEC-board. The screen and the next action are computed by
// .harness/bin/board.sh, and /board is the wrapper that shows them and closes the
// inbox. The rule of the next action sits in two places, the script that
// applies it and the skill that says it as prose: if the names or the order
// drift, the skill explains a rule the script does not apply, and two
// sessions go back to giving two answers. The rest are the names another part
// of the chain reads back: the triggers, the commit subjects, the two
// commands of intent.sh.
describe('skills/board/SKILL.md wraps board.sh and closes the inbox', () => {
  const file = join(root, 'skills/board/SKILL.md')
  const squash = (text: string): string => text.replace(/\s+/g, ' ').trim()

  it('exists, and its description names the triggers', () => {
    expect(existsSync(file), 'skills/board/ has no SKILL.md').toBe(true)
    const frontmatter =
      /^---\n([\s\S]*?)\n---\n/.exec(readFileSync(file, 'utf8'))?.[1] ?? ''
    const description = squash(frontmatter.replace(/^[\s\S]*?description:/, ''))
    for (const trigger of [
      '/board',
      '"open the board"',
      '"where are we"',
      '"what do I do next"',
    ]) {
      expect(
        description,
        `the description of /board does not name ${trigger}: the skill never starts on it`,
      ).toContain(trigger)
    }
  })

  it('says the rules of the next action with the names and the order of board.sh', () => {
    const script = readFileSync(join(templates, 'scripts/board.sh'), 'utf8')
    const rules = [...script.matchAll(/rule: "([^"]+)"/g)].map((match) =>
      (match[1] ?? '').replace(/\\u0027/g, "'"),
    )
    expect(rules.length, 'board.sh names no rule').toBeGreaterThan(0)
    const skill = squash(readFileSync(file, 'utf8'))
    expect(
      skill,
      'the skill does not name .harness/bin/board.sh: the screen is the script, not the skill',
    ).toContain('.harness/bin/board.sh')
    let from = 0
    for (const rule of rules) {
      const at = skill.indexOf(rule, from)
      expect(
        at,
        `the skill does not say the rule "${rule}" after the ones before it, in the order board.sh applies them`,
      ).toBeGreaterThanOrEqual(0)
      from = at + rule.length
    }
  })

  // S74: the Parked section is data the skill shows, and its name is the one
  // board.sh prints.
  it('names the Parked section with the name board.sh prints', () => {
    const script = readFileSync(join(templates, 'scripts/board.sh'), 'utf8')
    const name = /\["(Parked)["\s]/.exec(script)?.[1]
    expect(name, 'board.sh prints no Parked section').toBe('Parked')
    expect(
      readFileSync(file, 'utf8'),
      `the skill does not name the \`${name}\` section of the screen`,
    ).toContain(`\`${name}\``)
  })

  // S38: the fourth answer does not close a line of inbox, it closes an ADR
  // in `blocked_by`, and its commit is the only place where a slice already
  // written changes by the hand of this skill.
  it('names the commits of the four answers and the two commands of intent.sh', () => {
    const skill = squash(readFileSync(file, 'utf8'))
    for (const name of [
      'docs(inbox): <why>',
      'docs(backlog): s<NN> from the inbox',
      'docs(backlog): take ADR-<nnnn> out of blocked_by',
      'spec: inbox (<',
      '.harness/bin/intent.sh new <slug>',
      'intent.sh open',
    ]) {
      expect(skill, `the skill does not name ${name}`).toContain(name)
    }
  })
})

// S34. The skills give the commit subject as a model, in a block the session
// copies line by line, and `scripts/commitlint.sh` is the gate that commit
// meets: a model the regex refuses is found at the first commit of a run and
// fixed by hand every time, as it happened from S24 on with `S<NN>`. The test
// runs the script instead of copying its regex, so a rule that changes in the
// template changes here too.
describe('the commit subjects the skills give as a model pass commitlint', () => {
  const commitlint = join(root, '.harness/bin/commitlint.sh')
  const types = 'feat|fix|chore|docs|style|refactor|test|perf|revert|build|ci'
  const model = new RegExp(`^(${types})\\([a-z0-9-]+\\): `)

  const subjects = readdirSync(join(root, 'skills'))
    .map((skill) => join('skills', skill, 'SKILL.md'))
    .filter((file) => existsSync(join(root, file)))
    .flatMap((file) =>
      readFileSync(join(root, file), 'utf8')
        .split('\n')
        .map((text, index) => ({ file, line: index + 1, text }))
        .filter((row) => model.test(row.text)),
    )

  it.each(subjects)('$file:$line', ({ file, line, text }) => {
    // The placeholder becomes a word and not a single letter: after
    // `type(scope): ` the rule wants a lowercase letter and at least one more
    // character, and a single letter would pass for a model that does not.
    const message = text.replace(/<[^>]+>/g, 'word')
    const path = join(mkdtempSync(join(tmpdir(), 'skill-subject-')), 'MSG')
    writeFileSync(path, `${message}\n`)
    let stderr = ''
    let ok = true
    try {
      execFileSync(commitlint, ['--file', path], {
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (error) {
      ok = false
      stderr = (error as { stderr: Buffer }).stderr.toString().trim()
    }
    expect(
      ok,
      `${file}:${line} is a commit subject a session copies, and commitlint refuses it as "${message}": ${stderr}`,
    ).toBe(true)
  })

  it('reads the models of every skill that commits', () => {
    expect(
      subjects.length,
      'fewer than the ten subject models of board, slice and spec: a model has moved out of the reach of this test, and the next wrong one lands on a session instead of on CI',
    ).toBeGreaterThanOrEqual(10)
  })

  // S62. A model subject is prose too: every run copies it into `git log`,
  // and the four Italian ones that survived the translation of S50 went on
  // writing Italian there after it.
  it.each(
    readdirSync(join(root, 'skills'))
      .map((skill) => join('skills', skill, 'SKILL.md'))
      .filter((file) => existsSync(join(root, file))),
  )('%s writes no Italian subject', (file) => {
    const text = readFileSync(join(root, file), 'utf8')
    for (const italian of [
      "dall'inbox",
      'togli ADR',
      'chiude le domande',
      '<perché>',
    ]) {
      expect(
        text,
        `${file} still gives "${italian}" as a model: the subjects the skills prescribe are in English`,
      ).not.toContain(italian)
    }
  })
})

// S29. The claim on a slice is the branch slice/S<NN>-<slug> on the remote,
// and board.sh reads it from there: the two skills that write the definition
// of eligible as prose have to say the same fourth point, or /board would
// send /next onto a slice that already has an owner, which is the case that
// opened this slice. The fetch with --prune goes with the same rule: without
// it, a branch deleted on the remote keeps its slice in progress for good.
describe('/board and /next read the claim of a slice from the remote', () => {
  const section = (skill: string, head: string): string => {
    const text = readFileSync(join(root, 'skills', skill, 'SKILL.md'), 'utf8')
    const at = text.indexOf(`\n${head}`)
    expect(
      at,
      `skills/${skill}/SKILL.md has no section "${head}"`,
    ).toBeGreaterThan(0)
    const rest = text.slice(at + 1 + head.length)
    const end = rest.indexOf('\n## ')
    return end === -1 ? rest : rest.slice(0, end)
  }

  it('skills/board/SKILL.md fetches with --prune in section 2', () => {
    expect(
      section('board', '## 2. The screen'),
      'the fetch of /board does not prune: a branch deleted on the remote keeps its slice in progress for good',
    ).toContain('git fetch --prune origin')
  })

  it('skills/board/SKILL.md names the branch in the rule of the eligible slice', () => {
    expect(
      section('board', '## 2. The screen').replace(/\s+/g, ' '),
      'rule 2 of /board does not name slice/S<NN>-: the skill explains an eligible the script does not apply',
    ).toContain('slice/S<NN>-')
  })

  it('skills/next/SKILL.md names the branch in the definition of eligible', () => {
    expect(
      section('next', '## 2. The board and the waves').replace(/\s+/g, ' '),
      'section 2 of /next does not name slice/S<NN>-: /next and the board disagree on what comes next',
    ).toContain('slice/S<NN>-')
  })

  it('skills/next/SKILL.md fetches the default branch with --prune', () => {
    expect(
      section('next', '## 2. The board and the waves'),
      'the fetch of /next does not prune: a stale ref of a merged slice keeps it out of the waves',
    ).toContain('--prune')
  })

  it('skills/next/SKILL.md does not read only the first pair of backticks of a touchpoint', () => {
    expect(
      section('next', '## 2. The board and the waves').replace(/\s+/g, ' '),
      'section 2 of /next still reads the first pair of backticks: a file named second on a Touchpoints line puts two slices in one wave',
    ).not.toContain('first pair of backticks')
  })

  it('skills/next/SKILL.md counts every path between backticks on a touchpoint line', () => {
    const text = section('next', '## 2. The board and the waves').replace(
      /\s+/g,
      ' ',
    )
    expect(
      text,
      'section 2 of /next does not say that every text between backticks that is a path of the repo counts',
    ).toContain('every text between backticks')
    expect(text).toContain('path of the repo')
    expect(text).toContain('`(new)`')
    expect(text).not.toContain('nuovo')
  })

  it('skills/next/SKILL.md gives the branch as a reason an argument is not eligible', () => {
    expect(
      section('next', '## 1. Refuse early').replace(/\s+/g, ' '),
      'section 1 of /next still says three reasons: a slice someone else has taken would be refused without saying why',
    ).toContain('slice/S<NN>-')
  })

  // From `Eligible:` to the end of the line and not the whole line: the
  // paragraph says the claim just above, and names the branch anyway.
  it('the backlog/ section of .harness/docs/README.md says it in the Eligible line', () => {
    const line = folderSection(
      readFileSync(join(root, '.harness/docs/README.md'), 'utf8'),
      'backlog',
    )
      .split('\n')
      .find((row) => row.includes('Eligible:'))
    expect(
      line,
      'the backlog/ section of .harness/docs/README.md has no Eligible line to read',
    ).toBeDefined()
    expect(
      (line ?? '').slice((line ?? '').indexOf('Eligible:')),
      'the Eligible line of .harness/docs/README.md does not name the branch: the contract in the repos of the projects still has three points',
    ).toContain('slice/S<NN>-')
  })
})

// S45 translated the screen of board.sh and left the prose that quotes it
// behind. The header of the spec is left out: its line for 0.26 records what
// that version said.
describe('the skills and the spec quote the board as it prints today', () => {
  const quoting = [
    'skills/next/SKILL.md',
    'skills/board/SKILL.md',
    'docs/spec.md',
  ]
  const rows = (path: string): { at: number; row: string }[] =>
    readFileSync(join(root, path), 'utf8')
      .split('\n')
      .map((row, at) => ({ at: at + 1, row }))
      .filter(({ row }) => !row.startsWith('> A draft written'))
  const body = (path: string): string =>
    rows(path)
      .map(({ row }) => row)
      .join('\n')

  it.each(quoting)('%s quotes no Italian string of the screen', (path) => {
    const gone = /in corso|gh non disponibile|\boltre\b/
    expect(
      rows(path)
        .filter(({ row }) => gone.test(row))
        .map(({ at, row }) => `${at}: ${row.match(gone)?.[0]}`),
      `${path} quotes strings board.sh no longer prints`,
    ).toEqual([])
  })

  it('skills/next/SKILL.md and docs/spec.md quote the English strings', () => {
    expect(body('skills/next/SKILL.md')).toContain('`in progress`')
    const spec = body('docs/spec.md')
    for (const quote of ['`in progress`', '`gh not available`', '`beyond`']) {
      expect(spec, `docs/spec.md does not quote ${quote}`).toContain(quote)
    }
  })

  // S91: the Harness line, with the pin before the stages, as board.sh prints
  // it for a stamp with a pin and three stages. The line is run and not
  // copied, so a change of its wording turns this red until the quotes follow.
  it('skills/board/SKILL.md and docs/spec.md quote the Harness line as it prints', () => {
    const dir = mkdtempSync(join(tmpdir(), 'board-pin-'))
    execFileSync('git', ['init', '-q'], { cwd: dir })
    const stage = (sha: string, date: string) => ({
      sha: sha.repeat(40 / sha.length),
      date,
    })
    mkdirSync(join(dir, '.harness'))
    writeFileSync(
      join(dir, '.harness/stamp.json'),
      JSON.stringify({
        harness: 'https://github.com/lio/harness.git',
        pin: {
          origin: 'https://github.com/lio/harness.git',
          sha: 'b7c8d9e0f1a2b3c4d5e6f708192a3b4c5d6e7f80',
          date: '2026-09-25',
        },
        stages: {
          local: stage('8f21c4d0', '2026-09-20'),
          ci: stage('3a2b1c00', '2026-09-21'),
          judge: stage('9d4e5f60', '2026-09-22'),
        },
      }),
    )
    const line = execFileSync(join(templates, 'scripts/board.sh'), [], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        PATH: `${join(root, 'tests/fixtures/bin')}:${process.env.PATH}`,
        HOME: process.env.HOME ?? dir,
        STUB_PRS: '[]',
      },
    }).split('\n')[0]!
    expect(line).toMatch(/^Harness {2}pin b7c8d9e /)
    for (const path of ['skills/board/SKILL.md', 'docs/spec.md']) {
      expect(body(path), `${path} does not quote ${line}`).toContain(
        `\`${line}\``,
      )
    }
  })

  it('board.sh prints the strings the docs quote', () => {
    const script = readFileSync(join(templates, 'scripts/board.sh'), 'utf8')
    for (const printed of [
      '"in progress"',
      '"  gh not available"',
      '"  beyond: "',
    ]) {
      expect(
        script,
        `board.sh no longer prints ${printed}: the quotes in the docs point at nothing`,
      ).toContain(printed)
    }
  })
})

// The Definition of done says «suite verde», and a green suite is worth a
// gate only if the red talks about the repo and not about the machine. The
// tests that bring up a real git repo cost seconds: `git init`, the commits,
// the hooks installed. With the default of vitest, 5000 ms, locally under
// load they failed at random, every time on different tests, and since S12 a
// subagent of /next believes that red and stops a healthy slice. The value
// sits high enough not to lie and low enough not to hide a hung test.
describe('the suite gives itself the seconds a real git repo costs', () => {
  const config = readFileSync(join(root, 'vitest.config.ts'), 'utf8')
  // `[\d_]` and not `\d`: `20_000` is how TypeScript writes twenty thousand,
  // and a check that does not read it would say the testTimeout is not there.
  const declared = /(^|\n)([^\n]*)\n\s*testTimeout:\s*([\d_]+)/.exec(config)

  it('declares testTimeout instead of taking the 5000 ms default', () => {
    expect(
      declared,
      'vitest.config.ts declares no testTimeout: the default is 5000 ms and the tests that build a git repo take seconds',
    ).not.toBe(null)
  })

  it('says above the line why the default is not enough', () => {
    expect(
      declared?.[2]?.trim(),
      'the testTimeout line has no comment above it: a number without its reason is the next hand bumping it again',
    ).toMatch(/^\/\//)
  })

  it('stays in the seconds someone waits, not in the minutes', () => {
    const timeout = Number(declared?.[3]?.replace(/_/g, ''))
    expect(
      timeout,
      'testTimeout is still close to the default: the red it gives is the machine, not the repo',
    ).toBeGreaterThanOrEqual(15_000)
    expect(
      timeout,
      'testTimeout is so high it hides a hung test: a test that never ends must still fail while someone is watching',
    ).toBeLessThanOrEqual(30_000)
  })
})

// ADR-0004: the judgement is local only. The cloud judge of `judge.yml` and
// the fixer of `fix.yml` left the templates on 15 September, and with them
// the token only they read, the two variables of the model and the labels of
// the fix rounds. A template that names them again is a fallback climbing
// back in through the window: the chain does not do that, and the human
// checklist of the setup must not go back to asking for its token.
describe('no template judges on the server', () => {
  it.each(['github/judge.yml', 'github/fix.yml'])(
    '%s is not a template',
    (file) => {
      expect(existsSync(join(templates, file)), `${file} is back`).toBe(false)
    },
  )

  // S37: the names a comment uses to explain a choice by difference from the
  // cloud judge, too. `--json-schema` was the flag the action imposed the
  // schema with in CI, and a comment that cites it sends whoever reads the
  // script in a project looking for a validation that is not there: `check`
  // is the only one.
  const names = [
    'CLAUDE_CODE_OAUTH_TOKEN',
    'HARNESS_JUDGE_MODEL',
    'HARNESS_FIXER_MODEL',
    'fix-round',
    'claude-code-action',
    '--json-schema',
    'cloud judge',
  ]
  it.each(walk(templates))('%s names none of the cloud judge', (file) => {
    const text = readFileSync(join(templates, file), 'utf8')
    for (const name of names) {
      expect(text, `${file} names ${name}`).not.toContain(name)
    }
  })
})

// S36, the same ADR from the side of the spec. The first paragraph of 7.1 says
// who enforces the verdict schema and what a verdict that breaks it becomes:
// `judge.sh check` refuses it before archiving, and one that reaches
// `policy.sh` missing or invalid is a crash. Only that paragraph is read: the
// rest of 7.1 tells the cost the cloud judge measured, as history.
describe('7.1 of docs/spec.md names judge.sh check and the crash', () => {
  const lines = readFileSync(join(root, 'docs/spec.md'), 'utf8').split('\n')
  const start = lines.findIndex((line) => line.startsWith('### 7.1 '))
  const end = lines.findIndex(
    (line, i) => i > start && line.startsWith('```json'),
  )
  const paragraph = lines.slice(start + 1, end).join('\n')

  it('finds the paragraph between the heading and the json block', () => {
    expect(start, 'no ### 7.1 heading').toBeGreaterThan(-1)
    expect(end, 'no json block after ### 7.1').toBeGreaterThan(start)
  })

  it('names judge.sh check and the crash', () => {
    expect(paragraph).toContain('judge.sh check')
    expect(paragraph).toContain('crash')
  })

  it('names neither an action nor an escalation', () => {
    expect(paragraph).not.toMatch(/action|escalation/)
  })
})

// S35, the same ADR from the side of the skill. `/judge` is the text every
// session runs to the letter: a sentence that sends the judgement or the
// policy to CI makes it look for a second path that does not exist, and a
// reason leaning on the comparison with that path no longer holds. In this
// file "in CI" has no good uses, so the ban has no exceptions.
describe('skills/judge/SKILL.md sends nothing to CI', () => {
  it('names no CI at all', () => {
    const skill = readFileSync(join(root, 'skills/judge/SKILL.md'), 'utf8')
    expect(
      skill,
      'ADR-0004: the judgement is local only, and no workflow judges or applies the policy',
    ).not.toMatch(/\bin CI\b/i)
  })
})

// S27: the ADRs of this repo sit in .harness/docs/decisions/ and in no project. A
// comment of a template that cites ADR-0003 by number sends whoever reads a
// hook in Tipoff looking for a file that repo does not have. The reason is
// written in words of its own: the number stays here, where the ADR is.
describe('no template cites an ADR by number', () => {
  it.each(walk(templates))('%s names no ADR number', (file) => {
    const text = readFileSync(join(templates, file), 'utf8')
    expect(
      text,
      `${file} cites an ADR by number: a project has none of the harness ADRs, so the comment must carry the reason instead`,
    ).not.toMatch(/ADR-[0-9]{4}/)
  })
})

// S25: /next gives every slice a worktree under .claude/worktrees/, inside
// the repo. Without the line the main checkout sees every worktree as
// untracked files, and a `git add -A` from the root would stage the whole
// checkout of another branch. /harness-init local adds it in the projects.
describe('.gitignore keeps the worktrees of /next out of the tree', () => {
  it('ignores .claude/worktrees/', () => {
    const lines = readFileSync(join(root, '.gitignore'), 'utf8')
      .split('\n')
      .map((line) => line.trim())
    expect(
      lines,
      '.gitignore has no .claude/worktrees/ line: the worktrees of /next would show up as untracked files in the root',
    ).toContain('.claude/worktrees/')
  })
})

// S30: the worktree of a slice starts from `origin/<default>`, and git takes
// that remote-tracking branch as the upstream of the new branch. In the
// worktree `git status` then says "ahead of main", a bare `git pull` merges
// the default branch and a bare `git push` misses its target. `--no-track`
// takes the wrong upstream away, and the first push, which names the ref,
// sets the right one: the two lines hold together, and this test keeps them
// where they are.
describe('the slice branch of /next is born without an upstream', () => {
  const files = ['skills/next/SKILL.md', 'docs/spec.md']

  it.each(files)('%s writes every git worktree add with --no-track', (file) => {
    const lines = readFileSync(join(root, file), 'utf8')
      .split('\n')
      .filter((line) => line.includes('git worktree add'))
    expect(
      lines.length,
      `${file} no longer shows a git worktree add: the rule has nothing left to hold, and the command it describes has moved somewhere this test does not read`,
    ).toBeGreaterThan(0)
    for (const line of lines) {
      expect(
        line,
        `${file} creates the slice branch without --no-track: git makes origin/<default branch> its upstream, and in the worktree a bare pull merges the default branch while a bare push misses the slice`,
      ).toContain('--no-track')
    }
  })

  it('skills/next/SKILL.md names the ref of the first push', () => {
    expect(
      readFileSync(join(root, 'skills/next/SKILL.md'), 'utf8'),
      'the subagent block does not name `git push -u origin slice/S<NN>-<slug>`: the push that is the claim would be whatever git picks, and the upstream would stay wrong for every push after it',
    ).toContain('git push -u origin slice/S<NN>-<slug>')
  })

  // S68: the local default branch falls behind every close.yml, and from a
  // worktree `git fetch origin main:main` is refused, so the two scripts of
  // point 4 read the ref the worktree was cut from.
  it('skills/next/SKILL.md passes origin/<default branch> to the two scripts of the subagent block', () => {
    const skill = readFileSync(join(root, 'skills/next/SKILL.md'), 'utf8')
    const start = skill.indexOf(
      '```\nRead AGENTS.md, .harness/docs/codebase-map.md',
    )
    const end = start === -1 ? -1 : skill.indexOf('\n```', start + 3)
    const block =
      start === -1 || end === -1
        ? ''
        : skill.slice(start, end).replace(/\s+/g, ' ')
    for (const command of [
      '.harness/bin/tier.sh origin/<default branch>',
      '.harness/bin/test-weakening.sh origin/<default branch>',
    ]) {
      expect(
        block,
        `the subagent block of skills/next/SKILL.md does not run "${command}": the local default branch lags behind close.yml, and the tier is computed on the files of slices already merged`,
      ).toContain(command)
    }
    expect(
      block.match(/(?<!origin\/)<default branch>/g) ?? [],
      'the subagent block of skills/next/SKILL.md passes the bare <default branch>: the local branch lags behind close.yml, and from a worktree it cannot be moved',
    ).toEqual([])
  })
})

// S81: the ruleset of main wants a branch up to date before it merges. The
// PRs of a wave were judged and opened from the same commit: the first merged,
// close.yml committed after it, and every other PR was behind when policy.sh
// said merge. The code is still written in parallel; the update, the
// judgement, the PR and the wait run for one slice at a time, so the judge
// reads the head that merges.
describe('/next builds a wave in parallel and lands its slices one at a time', () => {
  const file = 'skills/next/SKILL.md'
  const skill = readFileSync(join(root, file), 'utf8')

  // Section <n> of the skill, from its heading to the next one, on one line.
  const part = (text: string, n: number): string => {
    const start = text.search(new RegExp(`^## ${n}\\. `, 'm'))
    if (start === -1) return ''
    const rest = text.slice(start + 3)
    const end = rest.search(/^## /m)
    return (end === -1 ? rest : rest.slice(0, end)).replace(/\s+/g, ' ')
  }

  const rules: [string, number, string[]][] = [
    [
      'the calls of a wave go in a single message',
      3,
      ['All the calls of a wave go in a single message'],
    ],
    [
      'the judgement runs for one slice at a time, in the order of the ids',
      4,
      [
        'one slice at a time',
        'in the order of the ids',
        'merged and closed',
        'ended its run without a merge',
      ],
    ],
    ['the PR is opened for one slice at a time', 5, ['one slice at a time']],
    ['the wait is for one slice at a time', 6, ['one slice at a time']],
    [
      'the update is a merge of origin/<default branch>, asked of the subagent with SendMessage',
      4,
      [
        'git merge origin/<default branch>',
        'SendMessage',
        'the four commands',
        'The orchestrator never writes code',
        'conflict',
      ],
    ],
    [
      'the update is never a rebase or a force push, and why',
      4,
      ['never a rebase or a force push', 'the branch is the claim', 'squash'],
    ],
    [
      'the first slice skips the update, and the two scripts run again after one',
      4,
      [
        'has not moved',
        '.harness/bin/tier.sh origin/<default branch>',
        '.harness/bin/test-weakening.sh origin/<default branch>',
      ],
    ],
    [
      'the wait ends on the commit of close.yml, and a PR left open does not stop the wave',
      6,
      ['the commit of `close.yml`', 'the next slice of the wave still runs'],
    ],
    ['the update of a branch is an event', 2, ['the update of a branch']],
    [
      'two slices with a shared path still stay out of one wave',
      2,
      [
        'inside a wave no path of "Touchpoints" appears in two slices',
        'a rebase would change the head the verdict covers, and nobody judges twice (ADR-0003)',
      ],
    ],
  ]

  const together =
    /\b(PRs|judgements) of (a|the) wave\b[^.]*\b(together|at the same time|in parallel)\b/i

  // What a text of the skill gets wrong, one line per fault.
  const broken = (text: string): string[] => {
    const faults: string[] = []
    for (const [name, n, phrases] of rules) {
      for (const phrase of phrases) {
        if (!part(text, n).includes(phrase)) {
          faults.push(`${name}: section ${n} does not say "${phrase}"`)
        }
      }
    }
    const landing = [4, 5, 6].map((n) => part(text, n)).join(' ')
    for (const sentence of landing.split(/(?<=[.:]) /)) {
      if (
        /rebase|--force|force push/i.test(sentence) &&
        !/\b(never|not|no)\b/i.test(sentence)
      ) {
        faults.push(`a rebase or a force push as something to do: ${sentence}`)
      }
    }
    if (together.test(landing)) {
      faults.push('the PRs of a wave are opened or judged together')
    }
    return faults
  }

  it.each(rules)('%s', (name) => {
    expect(
      broken(skill).filter((fault) => fault.startsWith(`${name}: `)),
      `${file}: a PR of a wave judged or opened before the one before it has closed is behind the default branch when policy.sh says merge, and gh pr merge refuses it`,
    ).toEqual([])
  })

  it('names neither a rebase nor a force push as something to do, and opens no PRs together', () => {
    expect(
      broken(skill).filter((fault) => !fault.includes(': section ')),
    ).toEqual([])
  })

  it('the check bites on a text that opens the PRs of a wave together', () => {
    const sample = skill.replace(
      '\n## 6. ',
      '\nThe PRs of a wave are opened together, once every slice has its answers.\n\n## 6. ',
    )
    expect(sample).not.toBe(skill)
    expect(broken(sample)).toContain(
      'the PRs of a wave are opened or judged together',
    )
  })

  it('the check bites on a text that rebases the branch', () => {
    const sample = skill.replace(
      '\n## 5. ',
      '\nA branch that is behind is rebased and pushed with --force.\n\n## 5. ',
    )
    expect(sample).not.toBe(skill)
    expect(
      broken(sample).some((fault) => fault.startsWith('a rebase or a force')),
    ).toBe(true)
  })

  it('5.4 of docs/spec.md says the slices of a wave land one at a time', () => {
    const spec = readFileSync(join(root, 'docs/spec.md'), 'utf8')
    const start = spec.indexOf('\n### 5.4 `/next`')
    const end = start === -1 ? -1 : spec.indexOf('\n### ', start + 1)
    const section =
      start === -1 || end === -1
        ? ''
        : spec.slice(start, end).replace(/\s+/g, ' ')
    for (const phrase of [
      'land one at a time',
      'in the order of the ids',
      'origin/<default>',
      'never a rebase or a force push',
      'the commit of `close.yml`',
    ]) {
      expect(
        section,
        `5.4 of docs/spec.md does not say "${phrase}": the spec is the source, and the skill would land in series against it`,
      ).toContain(phrase)
    }
  })
})

// S61: the slices of a wave run on the same machine, one worktree each, and a
// subagent whose suite hung ran `pkill -f vitest`, which also ended the suite
// of another slice: that one saw two runs at exit 143 with no output and no
// red case to read. The brief is the only place the subagent learns the rule,
// so the rule is pinned inside the fenced block it receives and not anywhere
// else in the skill.
describe('a subagent of /next kills only the processes it started', () => {
  const file = 'skills/next/SKILL.md'
  const skill = readFileSync(join(root, file), 'utf8')
  const start = skill.indexOf(
    '```\nRead AGENTS.md, .harness/docs/codebase-map.md',
  )
  const end = start === -1 ? -1 : skill.indexOf('\n```', start + 3)
  const block =
    start === -1 || end === -1
      ? ''
      : skill.slice(start, end).replace(/\s+/g, ' ')

  it('has the rule in the fenced subagent block', () => {
    expect(
      block,
      `${file} has no fenced block that opens with "Read AGENTS.md, .harness/docs/codebase-map.md": the brief of the subagent has moved somewhere this test does not read`,
    ).not.toBe('')
    for (const words of [
      'never pkill -f vitest',
      'by the PID you started',
      'a pattern that names <the worktree path>',
      'the other slices of the wave run on the same machine',
    ]) {
      expect(
        block,
        `the subagent block of ${file} does not say "${words}": a subagent whose suite hangs may kill by a pattern that reaches the other worktrees, and the suite of another slice ends at exit 143 with no output`,
      ).toContain(words)
    }
  })
})

// S41. The policy block arrives in the repos of the projects with
// `/harness-init local`, and on the second rerun those repos have it already:
// a flat rewrite would take away the paths somebody widened on purpose, which
// on Tipoff are the reason AGENTS.md is not the template, and by the third
// project it would do it in silence. The merge is carried out by the skill
// and not by a script, so the text is the program and this case is the only
// thing that keeps it honest. The eight keys are read from the block of the
// template instead of being written out here: a new key in there that stage
// `local` does not name is red the same day.
describe('stage local of /harness-init merges the policy block key by key', () => {
  const file = 'skills/harness-init/SKILL.md'
  const skill = readFileSync(join(root, file), 'utf8')
  const keys = Object.keys(
    policyBlock(readFileSync(join(templates, 'AGENTS.md'), 'utf8')),
  )
  const squash = (text: string): string => text.replace(/\s+/g, ' ').trim()

  // Point 2 of the stage, the one that writes AGENTS.md, and inside it the
  // paragraph that states the merge: a fragment passing because the same word
  // sits in another point of the skill would keep the wrong line honest.
  function between(text: string, from: string, to: string): string {
    const at = text.indexOf(from)
    if (at === -1) return ''
    const rest = text.slice(at)
    const end = rest.indexOf(to, from.length)
    return end === -1 ? rest : rest.slice(0, end)
  }

  const stage = between(skill, '\n## 2. Stage `local`', '\n## ')
  const point2 = between(stage, '\n2. **', '\n3. **')
  const merge = squash(
    point2.split(/\n[ \t]*\n/).find((part) => part.includes('key by key')) ??
      '',
  )

  it('has the rule in point 2 of the stage, where AGENTS.md is written', () => {
    expect(
      stage,
      `${file} has no "## 2. Stage \`local\`" section: the stage that installs the policy block has moved somewhere this test does not read`,
    ).not.toBe('')
    expect(
      merge,
      `${file}: no paragraph of point 2 of stage local says the block is merged key by key, so a rerun rewrites the policy of a repo the way the session feels that day`,
    ).not.toBe('')
  })

  it('reads the keys from the block of the template, and they are eight', () => {
    expect(
      keys.length,
      'the policy block of skills/harness-init/templates/AGENTS.md no longer has eight keys: the rule in the skill has to name the ones it has now',
    ).toBe(8)
  })

  it.each(keys)('names `%s`', (key) => {
    expect(
      merge,
      `${file}: the merge rule does not name \`${key}\`, and a key the rule leaves out is a key the session decides on by itself`,
    ).toContain(`\`${key}\``)
  })

  it('says a key that is there stays, and where a missing one comes from', () => {
    expect(
      merge,
      `${file}: the rule does not say that a key already in the repo stays as it is, and a rerun takes away the sensitive_paths someone widened on purpose`,
    ).toContain('stays as it is')
    expect(
      merge,
      `${file}: the rule does not say where a missing key comes from, and a repo set up before a key existed never takes it`,
    ).toContain('arrives from the template')
    expect(
      merge,
      `${file}: the rule does not name \`templates/AGENTS.md\` as the source of the missing keys, and the session writes them from memory instead`,
    ).toContain('`templates/AGENTS.md`')
  })

  it('makes `version` the one key the template overwrites', () => {
    expect(
      merge,
      `${file}: the rule does not make \`version\` the only key the template always overwrites, and a repo keeps declaring a version whose keys it does not have`,
    ).toContain('`version` is the only one the template always overwrites')
  })

  it('says `docs_mode` never changes by the hand of the skill', () => {
    expect(
      merge,
      `${file}: the rule does not hold \`docs_mode\` still: the mode is the human's, and a skill that rewrote it would move every document of that repo to another flow`,
    ).toContain('`docs_mode` never changes by the hand of this skill')
  })

  it('says an orphan key stays until a human removes it', () => {
    expect(
      merge,
      `${file}: the rule does not say what happens to a key the template no longer has, and deleting it or keeping it are two different policies for the next repo`,
    ).toContain('stays where it is and a human removes it')
    expect(
      merge,
      `${file}: the rule does not say that \`version\` is what makes an orphan key visible, and an orphan nothing announces stays in the block for good`,
    ).toContain('the new `version` is what makes it visible')
  })
})

// S80. The ruleset of main wants a PR and a green `ci` for every push, and
// two writers of the chain push without one: `close.yml` with the token of
// the App, and the human who commits documents where `docs_mode` is `main`.
// The template ships an empty `bypass_actors` and the step applied it as
// written, so both pushes were refused until somebody added the actors by
// hand. The step is prose a session follows: what is proved here is that it
// says each thing, in the step that applies the ruleset and not elsewhere.
describe('stage ci of /harness-init fills the bypass actors of the ruleset', () => {
  const file = 'skills/harness-init/SKILL.md'
  const skill = readFileSync(join(root, file), 'utf8')
  const squash = (text: string): string => text.replace(/\s+/g, ' ').trim()

  function between(text: string, from: string, to: string): string {
    const at = text.indexOf(from)
    if (at === -1) return ''
    const rest = text.slice(at)
    const end = rest.indexOf(to, from.length)
    return end === -1 ? rest : rest.slice(0, end)
  }

  const stage = between(skill, '\n## 3. Stage `ci`', '\n## ')
  const step = squash(between(stage, '\n6. **', '\n7. **'))

  it('has step 6 of the stage, the one of the ruleset', () => {
    expect(
      step,
      `${file} has no step 6 in "## 3. Stage \`ci\`": the step that applies the ruleset has moved somewhere this test does not read`,
    ).toContain('**Repo settings and ruleset.**')
  })

  it('says the file is the template with `bypass_actors` filled, and that it is the file applied', () => {
    expect(
      step,
      `${file}: step 6 does not say \`.github/ruleset.json\` is the template with \`bypass_actors\` filled, and the session applies the empty list`,
    ).toContain(
      '`.github/ruleset.json` is `templates/github/ruleset.json` with `bypass_actors` filled',
    )
    expect(
      step,
      `${file}: step 6 does not say the file written is the file applied, and the ruleset on GitHub and the one in the repo become two`,
    ).toContain('the file written is the file applied')
  })

  it('puts the App in as an `Integration` actor, from `HARNESS_APP_ID`', () => {
    expect(
      step,
      `${file}: step 6 does not say the App is an \`Integration\` actor with the value of \`HARNESS_APP_ID\` for an id`,
    ).toContain(
      'an `Integration` actor whose id is the value of the `HARNESS_APP_ID` variable of the repo',
    )
    expect(
      step,
      `${file}: step 6 does not say what happens with the variable unset`,
    ).toContain('With the variable unset the actor is left out')
    expect(
      step,
      `${file}: step 6 does not give the hand-back its line: nobody learns that \`close.yml\` will be refused once the App is set`,
    ).toContain(
      '`close.yml` will be refused once the App is set, until the stage runs again',
    )
    expect(step).toContain('one line in the hand-back')
  })

  it('puts the admin role in as a `RepositoryRole` actor only with `docs_mode` on `main`', () => {
    expect(
      step,
      `${file}: step 6 does not tie the \`RepositoryRole\` actor to \`docs_mode\` on \`main\``,
    ).toContain(
      'a `RepositoryRole` actor only when the `docs_mode` key of the policy block is `main`',
    )
    expect(
      step,
      `${file}: step 6 does not say that with \`pr\` the admin role is left out, and why`,
    ).toContain(
      'With `pr` it is left out, because nobody commits on main there',
    )
  })

  it('reads the shape of an actor from the rulesets REST reference, never from memory', () => {
    for (const field of ['`actor_id`', '`actor_type`', '`bypass_mode`'])
      expect(
        step,
        `${file}: step 6 does not name ${field} among what is read from the reference`,
      ).toContain(field)
    expect(
      step,
      `${file}: step 6 does not send the session to the rulesets REST reference before it writes an actor`,
    ).toContain(
      'read from the current rulesets REST reference before it is written, never from memory',
    )
  })

  it('updates a ruleset that is already on the repo, and does not create a second', () => {
    expect(
      step,
      `${file}: step 6 does not say a ruleset already on the repo is updated, and a rerun leaves two rulesets on main`,
    ).toContain('is updated and not created twice')
  })

  it('adds on a rerun only what is missing, and keeps the actor a human put there', () => {
    expect(
      step,
      `${file}: step 6 does not say a rerun changes \`bypass_actors\` only by adding what is missing`,
    ).toContain(
      'A rerun changes `bypass_actors` only by adding what is missing',
    )
    expect(
      step,
      `${file}: step 6 does not say an actor a human put there stays`,
    ).toContain('an actor a human put there stays')
  })
})

// S60. The template of AGENTS.md calls its sections "Human gates" and "Do
// not": a comment that still sends the reader to the Italian title points at
// a section no installed AGENTS.md has, and an agent that follows it finds
// nothing. The check reads every file of the templates, of .github and every
// SKILL.md, and names the file and the line of the title that came back.
describe('no template names an Italian section of AGENTS.md', () => {
  const titles = ['Gate umani', 'Non fare']

  const hits = (text: string): string[] =>
    text
      .split('\n')
      .flatMap((line, i) =>
        titles.some((title) => line.includes(title))
          ? [`${i + 1}: ${line.trim()}`]
          : [],
      )

  const skills = readdirSync(join(root, 'skills')).filter((name) =>
    statSync(join(root, 'skills', name)).isDirectory(),
  )
  const files = [
    ...walk(templates).map((file) => `skills/harness-init/templates/${file}`),
    ...walk(join(root, '.github')).map((file) => `.github/${file}`),
    ...skills.map((skill) => `skills/${skill}/SKILL.md`),
  ]

  it.each(files)('%s', (file) => {
    const found = hits(readFileSync(join(root, file), 'utf8'))
    expect(
      found,
      `${file} names an Italian section of AGENTS.md, which is now "Human gates" or "Do not":\n${found.join('\n')}`,
    ).toEqual([])
  })

  it('the check bites on a comment that puts the Italian title back', () => {
    expect(hits('# a\n# named in the "Gate umani" line of AGENTS.md')).toEqual([
      '2: # named in the "Gate umani" line of AGENTS.md',
    ])
  })
})

// S79. The policy of a repo is the json block of .harness/AGENTS.md, under the headings
// "Review policy" and "Human gates": the prose lines the spec used to name,
// `Documenti: su main`, "Gate umani", `Path sensibili`, `Mai tier 0`, "Merge
// umano per path", are gone, and a reader who looks for them in an AGENTS.md
// finds nothing. From section 1 on the spec names the key a program reads.
// Section 0 is left out: it records what each version said, under the name the
// thing had then.
describe('the body of docs/spec.md names the keys of the policy block', () => {
  const names = [
    'Gate umani',
    'Documenti: su main',
    'Documenti: PR',
    '`Documenti` line',
    'Path sensibili',
    'Mai tier 0',
    'Merge umano per path',
  ]
  const keys = [
    'docs_mode',
    'sensitive_paths',
    'never_tier_0',
    'human_gate_paths',
    'docs_extra_paths',
  ]
  const spec = readFileSync(join(root, 'docs/spec.md'), 'utf8')

  // The line the body starts at, counted from zero, or -1 with no heading.
  const start = (text: string): number =>
    text.split('\n').findIndex((line) => line.startsWith('## 1. Principles'))

  const specBody = (text: string): string | undefined =>
    start(text) === -1
      ? undefined
      : text.split('\n').slice(start(text)).join('\n')

  const oldPolicyNames = (text: string, old: string[]): string[] => {
    const from = start(text)
    if (from === -1) return ['no "## 1. Principles" heading']
    return text
      .split('\n')
      .flatMap((line, i) =>
        i >= from && old.some((name) => line.includes(name))
          ? [`${i + 1}: ${line.trim()}`]
          : [],
      )
  }

  it('docs/spec.md has no old name after section 0', () => {
    const found = oldPolicyNames(spec, names)
    expect(
      found,
      `docs/spec.md names a line of AGENTS.md that is gone, where the key of the policy block or the heading "Human gates" or "Review policy" goes:\n${found.join('\n')}`,
    ).toEqual([])
  })

  it('the check bites on a sample that puts an old name back in the body', () => {
    expect(
      oldPolicyNames(
        '## 0. What changes\n\n## 1. Principles\n\nthe "Gate umani" line',
        names,
      ),
    ).toEqual(['5: the "Gate umani" line'])
  })

  it('the check leaves alone a sample that holds the old name in section 0', () => {
    expect(
      oldPolicyNames(
        '## 0. What changes\n\nthe "Gate umani" line\n\n## 1. Principles\n\nhuman_gate_paths',
        names,
      ),
    ).toEqual([])
  })

  it('the check says so when the heading of section 1 is missing', () => {
    expect(oldPolicyNames('## 0. What changes\n\nprose', names)).toEqual([
      'no "## 1. Principles" heading',
    ])
  })

  it.each(keys)('the body names `%s`, a key of the policy block', (key) => {
    const block = policyBlock(
      readFileSync(join(root, '.harness/AGENTS.md'), 'utf8'),
    )
    expect(
      Object.keys(block),
      `${key} is not a key of the block of .harness/AGENTS.md`,
    ).toContain(key)
    expect(
      specBody(spec)?.includes(`\`${key}\``),
      `the body of docs/spec.md does not name \`${key}\``,
    ).toBe(true)
  })
})

// S64. `/next` used to start the whole board on "vai", and S46 took the
// Italian triggers out of the descriptions: today it starts on `/next` and on
// the English phrases of its description. A README or a spec that still quotes
// "vai" tells the reader to type a word that starts nothing. The version line
// of the header of docs/spec.md is skipped, because it records what 0.14 said.
describe('no reader is told that "vai" starts /next', () => {
  const skills = readdirSync(join(root, 'skills')).filter((name) =>
    statSync(join(root, 'skills', name)).isDirectory(),
  )

  const withoutHeader = (text: string): string =>
    text
      .split('\n')
      .map((line) => (/^> .*, version \d+\.\d+ of /.test(line) ? '' : line))
      .join('\n')

  const sources: [string, (text: string) => string][] = [
    ['README.md', (text) => text],
    ['docs/spec.md', withoutHeader],
    ...skills.map((skill): [string, (text: string) => string] => [
      `skills/${skill}/SKILL.md`,
      (text) => text,
    ]),
  ]

  const lines = (text: string): number[] =>
    text
      .split('\n')
      .flatMap((line, i) => (line.includes('"vai"') ? [i + 1] : []))

  it.each(sources)('%s', (path, read) => {
    const text = read(readFileSync(join(root, path), 'utf8'))
    expect(
      lines(text),
      `${path} quotes "vai" as a trigger: /next starts on /next and on the English phrases of its description`,
    ).toEqual([])
  })

  // The row of the commands table was already right when the slice was cut:
  // this case says so, and keeps it saying what starts /next today.
  it('the /next row of the README says /next S12 runs one and no argument runs all', () => {
    const row = readFileSync(join(root, 'README.md'), 'utf8')
      .split('\n')
      .find((line) => line.startsWith('| `/next`'))
    expect(
      row,
      'the commands table of README.md has no /next row',
    ).toBeDefined()
    expect(row).toContain('`/next S12` runs one')
    expect(row).toContain('no argument runs all')
  })

  it('the check bites on a quote of "vai" and skips the header of the spec', () => {
    expect(lines('the session that says "vai" is the orchestrator')).toEqual([
      1,
    ])
    expect(
      withoutHeader(
        '> A draft, version 0.36 of 2026-09-25. 0.14 says "vai" closes a board.',
      ),
    ).toBe('')
  })
})

// Section 0 of docs/spec.md heads each entry with the version it starts
// from: "From 0.35" holds what 0.36 changed. The last heading is therefore
// one minor behind the version of the header, and a heading named after the
// new version breaks the trail the other way. The history in the header names
// the change after the new version, "0.49, of 4 October", and section 0 after
// the old one, "From 0.48": two names for the one change, by design.
describe('the last entry of section 0 starts from the version before the header', () => {
  const spec = readFileSync(join(root, 'docs/spec.md'), 'utf8')

  const previous = (text: string): string | undefined => {
    const minor = /^> .*, version 0\.(\d+) of /m.exec(text)?.[1]
    return minor === undefined ? undefined : `0.${Number(minor) - 1}`
  }

  const last = (text: string): string | undefined =>
    [...text.matchAll(/^From (0\.\d+),/gm)].at(-1)?.[1]

  it('docs/spec.md', () => {
    expect(
      previous(spec),
      'the header of docs/spec.md has no version',
    ).toBeDefined()
    expect(
      last(spec),
      `the last "From" heading of section 0 should be ${previous(spec)}, the version the change starts from`,
    ).toBe(previous(spec))
  })

  it('the check bites on a heading named after the new version', () => {
    const text =
      '> A draft, version 0.37 of 2026-09-25.\n\nFrom 0.37, from x:\n'
    expect(last(text)).not.toBe(previous(text))
  })
})

// /spec writes the sentinel under "Open questions" in English since S65, and
// /slice reads both, because the specs approved before S65 carry Nessuna.
describe('the open-questions sentinel is None.', () => {
  it('skills/spec/SKILL.md writes None. and never Nessuna.', () => {
    const skill = readFileSync(join(root, 'skills/spec/SKILL.md'), 'utf8')
    expect(skill).toContain('`None.`')
    expect(skill).not.toContain('Nessuna.')
  })

  it('skills/slice/SKILL.md accepts None. and Nessuna.', () => {
    const skill = readFileSync(join(root, 'skills/slice/SKILL.md'), 'utf8')
    expect(skill).toContain('`None.`')
    expect(skill).toContain('`Nessuna.`')
  })
})

// The map says how the tests are built, not which files hold them, so a new
// test file leaves it alone. architecture.test.ts stays named: it is where a
// session looks for the rule a check enforces. The Dragons tell what happened
// and may point at the case that holds it, so they are not read here.
describe('.harness/docs/codebase-map.md names no test file but architecture.test.ts', () => {
  it('outside the Dragons', () => {
    const map = readFileSync(
      join(root, '.harness/docs/codebase-map.md'),
      'utf8',
    )
    const [shape = ''] = map.split('\n## Dragons')
    const named = new Set(shape.match(/[a-z-]+\.test\.ts/g) ?? [])
    expect([...named]).toEqual(['architecture.test.ts'])
  })
})

// A parked document says nothing about it in its own file: the list is
// .harness/docs/parked.md. /spec and /slice read it before the first question, quote
// the line and name the command that brings the document back, so nobody
// reopens an interview or cuts a spec that was set aside.
describe('/spec and /slice refuse a parked document', () => {
  function section(skill: string, from: string, to: string): string {
    const text = readFileSync(join(root, `skills/${skill}/SKILL.md`), 'utf8')
    const start = text.indexOf(`\n${from}`)
    const end = text.indexOf(`\n${to}`, start + 1)
    expect(start, `skills/${skill}/SKILL.md has no "${from}"`).toBeGreaterThan(
      -1,
    )
    expect(end, `skills/${skill}/SKILL.md has no "${to}"`).toBeGreaterThan(-1)
    return text.slice(start, end)
  }

  it.each(['spec', 'slice'])(
    'skills/%s/SKILL.md refuses in section 2 with the line and the command',
    (skill) => {
      const refuse = section(skill, '## 2.', '## 3.')
      expect(refuse).toContain('.harness/docs/parked.md')
      expect(refuse).toContain('.harness/bin/park.sh resume')
    },
  )

  it('skills/spec/SKILL.md leaves parked intents out of the list', () => {
    const pick = section('spec', '## 1.', '## 2.')
    const list = pick.slice(pick.indexOf('Without an argument'))
    expect(list.split('\n\n')[0]).toContain('.harness/docs/parked.md')
  })
})

// S77: later/ was the workaround .harness/docs/parked.md replaces. Its documents sit
// where they belong again, parked, and the board lists them and picks none.
describe('later/ is gone', () => {
  const tracked = execFileSync('git', ['ls-files'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
  const parkedPaths = readFileSync(
    join(root, '.harness/docs/parked.md'),
    'utf8',
  )
    .split('\n')
    .filter((line) => /^- \d{4}-\d{2}-\d{2}: /.test(line))
    .map((line) => line.slice(14).split(': ')[0] ?? '')
  const three = [
    '.harness/docs/intent/audit-sample.md',
    '.harness/docs/intent/roadmap-view.md',
    '.harness/docs/specs/SPEC-audit-sample.md',
  ]

  it('tracks nothing under .harness/docs/intent/later/ or .harness/docs/specs/later/', () => {
    expect(
      tracked.filter(
        (path) =>
          path.startsWith('.harness/docs/intent/later/') ||
          path.startsWith('.harness/docs/specs/later/'),
      ),
    ).toEqual([])
  })

  it('every line of .harness/docs/parked.md names a tracked file', () => {
    for (const path of parkedPaths) {
      expect(
        tracked,
        `.harness/docs/parked.md parks ${path}, not tracked`,
      ).toContain(path)
    }
  })

  it('parks the three documents that were in later/', () => {
    for (const path of three) expect(parkedPaths).toContain(path)
  })

  it('SPEC-audit-sample.md names its intent where it sits now', () => {
    const spec = readFileSync(
      join(root, '.harness/docs/specs/SPEC-audit-sample.md'),
      'utf8',
    )
    expect(spec).toMatch(/^intent: \.harness\/docs\/intent\/audit-sample\.md$/m)
  })

  it('the board lists the three under Parked and picks none of them', () => {
    const board = JSON.parse(
      execFileSync(join(root, '.harness/bin/board.sh'), ['--json'], {
        cwd: root,
        encoding: 'utf8',
      }),
    ) as { parked: { path: string }[]; next: { action: string } }
    const parked = board.parked.map((entry) => entry.path)
    for (const path of three) {
      expect(parked).toContain(path)
      expect(board.next.action).not.toContain(path)
    }
  })
})

// S96. `/spec --fast` asks every question that matters in one message and
// stands in for the interview and the checkpoint of that run only. The hash
// is sections 4 and 6 as they were at 49b5adc, the base of the slice: the
// full interview stays as it is while the rest of the file moves.
describe('skills/spec/SKILL.md has a fast lane', () => {
  const skill = readFileSync(join(root, 'skills/spec/SKILL.md'), 'utf8')

  function section(from: string, to?: string): string {
    const start = skill.indexOf(`\n${from}`)
    expect(start, `skills/spec/SKILL.md has no "${from}"`).toBeGreaterThan(-1)
    if (to === undefined) return skill.slice(start)
    const end = skill.indexOf(`\n${to}`, start + 1)
    expect(end, `skills/spec/SKILL.md has no "${to}"`).toBeGreaterThan(-1)
    return skill.slice(start, end)
  }

  const fast = (): string => section('## 9.')

  it('section 1 takes --fast and the ground rule names the exception', () => {
    expect(section('## 1.', '## 2.')).toContain('`--fast`')
    expect(section('## Ground rules', '## 1.')).toContain('`--fast`')
    expect(skill.split('\n---\n')[0]).toContain('--fast')
  })

  it('section 9 is the fast lane, one message, one line per question', () => {
    const text = fast()
    expect(text).toContain('`--fast`')
    expect(text).toContain('`*question*: [recommended] short reason`')
    expect(text).toContain('the only question message')
  })

  it('section 9 lists every question above four and cuts none', () => {
    const text = fast()
    expect(text).toContain('more than four')
    expect(text).toContain('nothing is cut')
  })

  it('section 9 confirms an unmentioned line, and a bare "sì" every line', () => {
    const text = fast()
    expect(text).toContain('does not mention')
    expect(text).toContain('bare "sì"')
  })

  it('section 9 follows up a vague answer once, with the vague lines alone', () => {
    const text = fast()
    expect(text).toContain('one follow-up')
    expect(text).toContain('vague lines alone')
    expect(text).toContain('"Decisions to confirm"')
  })

  it('section 9 goes through the refusals of 2 and the commit of 8', () => {
    const text = fast()
    expect(text).toContain('section 2')
    expect(text).toContain('`docs(spec): <slug>`')
    expect(text).toContain('section 8')
  })

  it('section 5 writes the defaults nobody was asked under ### Assumed', () => {
    const text = section('## 5.', '## 6.')
    expect(text).toContain('`### Assumed`')
    expect(text).toContain('"Locked decisions"')
  })

  it('section 8 adds an Assumed: block to the approval commit', () => {
    const text = section('## 8.', '## 9.')
    expect(text).toContain('`Assumed:`')
    expect(text).toMatch(/^Assumed:$/m)
  })

  it('sections 4 and 6 are byte for byte as at the base', () => {
    const full = section('## 4.', '## 5.') + section('## 6.', '## 7.')
    expect(createHash('sha256').update(full).digest('hex')).toBe(
      '918fb67ea10434f3513c2baaade8d2741ea8ea946b428bd6ab0fcf970ed8e17c',
    )
  })
})

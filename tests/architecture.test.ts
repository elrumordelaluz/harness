// Structural tests: the "Do not" lines of AGENTS.md that a check can
// enforce. Each describe names its line. A red run on existing files is a
// finding for the hand-back, not something to patch in the test.
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { policyBlock } from './agents.js'
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

function expectSymlinkInto(link: string, dir: string): void {
  const path = join(root, link)
  expect(
    lstatSync(path).isSymbolicLink(),
    `${link} is a copy, not a symlink`,
  ).toBe(true)
  const target = resolve(dirname(path), readlinkSync(path))
  expect(target.startsWith(`${dir}/`), `${link} points outside ${dir}`).toBe(
    true,
  )
  expect(statSync(target).isFile(), `${link} points to a missing file`).toBe(
    true,
  )
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
  const files = ['githooks', 'scripts'].flatMap((dir) =>
    walk(join(templates, dir)).map((file) => join(dir, file)),
  )

  it.each(files)('%s', (file) => {
    const source = readFileSync(join(templates, file), 'utf8')
    for (const [pattern, what] of bash4) {
      expect(source, `${file} uses ${what}`).not.toMatch(pattern)
    }
  })
})

// AGENTS.md, "Do not": "Do not modify the files in .githooks/ and the
// symlinks in scripts/: the template is what changes"
describe('the repo runs on its own templates', () => {
  it.each(readdirSync(join(root, '.githooks')))(
    '.githooks/%s is a symlink into the templates',
    (hook) =>
      expectSymlinkInto(join('.githooks', hook), join(templates, 'githooks')),
  )

  const shared = readdirSync(join(root, 'scripts')).filter((file) =>
    existsSync(join(templates, 'scripts', file)),
  )
  it.each(shared)('scripts/%s is a symlink to its template', (file) =>
    expectSymlinkInto(join('scripts', file), join(templates, 'scripts')),
  )
})

// The same line, its other half. Under `.github/` nothing can be a symlink:
// GitHub Actions does not register a workflow that is one, and the rest of
// the folder sits next to the workflows. They stay copies, and a copy drifts
// in silence. PR #8 went in without `human-gate` because ci.yml was the
// version from before S02 while the scripts, which are symlinks, were already
// the ones of today. PR #29 added a section to the PR template and the copy
// stayed behind without anything turning red, because the files compared were
// a list written in here. The list is now the templates themselves: a new
// file under github/ or judge/ walks into the comparison on its own.
describe('.github matches the templates it was copied from', () => {
  // The destination comes from the folder structure, which is the convention
  // already and the one templates/README.md explains: a template of github/
  // that is a workflow goes under .github/workflows/, the others to the root
  // of .github/, and judge/ keeps its name. No list of files in here.
  const copyOf = (template: string) => {
    if (template.startsWith('judge/')) return `.github/${template}`
    const file = template.slice('github/'.length)
    return file.endsWith('.yml')
      ? `.github/workflows/${file}`
      : `.github/${file}`
  }

  // The copies that on purpose are not equal to their template, with the
  // reason next to them: the exception is read instead of being a hole in the
  // comparison. Of the prompt, stage judge of /harness-init rewrites
  // `## This repo` over the placeholder, so of that file everything above it
  // is compared.
  const partial: Record<string, string> = {
    'judge/prompt.md':
      '/harness-init judge writes its "## This repo" section over the template placeholder',
  }

  const commonPart = (text: string, what: string) => {
    const cut = text.indexOf('## This repo')
    expect(cut, `${what} has no "## This repo" section`).toBeGreaterThan(-1)
    return text.slice(0, cut)
  }

  const copied = ['github', 'judge'].flatMap((dir) =>
    walk(join(templates, dir)).map((file) => `${dir}/${file}`),
  )

  it.each(copied)('%s', (template) => {
    const copy = copyOf(template)
    const stage = stageOf(template)
    expect(
      existsSync(join(root, copy)),
      `${copy} is missing: run /harness-init ${stage} to copy skills/harness-init/templates/${template} into place`,
    ).toBe(true)
    const why = partial[template]
    const here = readFileSync(join(root, copy), 'utf8')
    const there = readFileSync(join(templates, template), 'utf8')
    expect(
      why ? commonPart(here, copy) : here,
      `${copy} drifted from skills/harness-init/templates/${template}${why ? ` above its "## This repo" section (${why})` : ''}: run /harness-init ${stage} to copy it back, do not edit the copy`,
    ).toBe(why ? commonPart(there, `templates/${template}`) : there)
  })

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

  // The part of the prompt that stays out of the comparison, watched from
  // here: a copy identical to the template means the placeholder is back, and
  // /harness-init judge never wrote the section of this repo.
  it('has the "## This repo" section of judge/prompt.md filled in', () => {
    const copy = readFileSync(join(root, '.github/judge/prompt.md'), 'utf8')
    const why = `.github/judge/prompt.md is compared only above "## This repo" because ${partial['judge/prompt.md']}`
    expect(
      copy,
      `${why}, so an identical copy means the placeholder is back`,
    ).not.toBe(readFileSync(join(templates, 'judge/prompt.md'), 'utf8'))
    expect(copy, `${why}, and that section is missing here`).toContain(
      '## This repo',
    )
    expect(
      copy,
      `${why}, and a placeholder is still unfilled here`,
    ).not.toMatch(/\{\{/)
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

// The same dragon, in docs/. This repo has the READMEs of the five folders
// from stage local, like every project, and they are copies written by hand
// in two places: whoever changes the contract of the backlog in one of the
// two alone leaves this repo with one rule and installs a different version
// of it everywhere else.
describe('docs/*/README.md matches the templates it was copied from', () => {
  const dirs = readdirSync(join(templates, 'docs')).filter((name) =>
    statSync(join(templates, 'docs', name)).isDirectory(),
  )

  it.each(dirs)('docs/%s/README.md', (dir) => {
    expect(
      readFileSync(join(root, 'docs', dir, 'README.md'), 'utf8'),
      `docs/${dir}/README.md drifted from skills/harness-init/templates/docs/${dir}/README.md: change both, the template is what /harness-init local installs elsewhere`,
    ).toBe(readFileSync(join(templates, 'docs', dir, 'README.md'), 'utf8'))
  })
})

// S39. The contract leaves the prose: under a fixed heading the two AGENTS.md
// carry a `json` fence with the eight keys the programs of the chain read,
// and scripts/policy-lines.sh extracts it and passes it to jq. The heading,
// the fence and the names of the keys are the contract: translating the prose
// around them does not touch them. Here the block is read with jq and not
// with JSON.parse, because a block only the test parses would be green and
// dead.
describe('the policy block of AGENTS.md', () => {
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
    ['AGENTS.md', join(root, 'AGENTS.md')],
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
        block(readFileSync(join(root, 'AGENTS.md'), 'utf8'))[key] as string[]
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
  // read by whoever opens a cold session.
  it.each([
    'AGENTS.md',
    '.claude/settings.json',
    '.github/**',
    '.githooks/**',
    '.harness/**',
    'scripts/**',
    'package.json',
    'tsconfig*.json',
  ])('templates/AGENTS.md always names %s as sensitive', (path) => {
    expect(
      block(readFileSync(join(templates, 'AGENTS.md'), 'utf8'))
        .sensitive_paths as string[],
    ).toContain(path)
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
describe('AGENTS.md and its template say the same tier gate', () => {
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
    const here = tierGate(readFileSync(join(root, 'AGENTS.md'), 'utf8'))
    const there = tierGate(template)

    // The case died once already, by passing on two undefined: the heading was
    // renamed and every lookup came back empty on both sides at the same time,
    // so the comparison below had nothing to tell apart. Each side says it
    // found its sentence before the two are compared.
    for (const [name, sentence] of [
      ['AGENTS.md', here],
      ['skills/harness-init/templates/AGENTS.md', there],
    ] as const) {
      expect(
        sentence,
        `${name} has no tier sentence to compare: the \`## Human gates\` heading, the \`- Intent and spec:\` line or the sentence ending in "human merge." was renamed, and the comparison below would pass on two things nobody found`,
      ).toBeDefined()
    }

    expect(
      there,
      'the tier sentence in "Human gates" drifted from the one in AGENTS.md of this repo: every repo installed from the template would read a rule policy.sh does not follow',
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
      /- run: scripts\/prose\.sh "origin\/\$BASE_REF"/,
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
    ).toMatch(/scripts\/commitlint\.sh --subject "\$PR_TITLE \(#\$PR\)"/)
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
      /^scripts\/prose\.sh --staged$/m,
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
    expect(read('github/close.yml')).toMatch(/scripts\/review-log\.sh "\$PR"/)
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
      .filter((line) => /scripts\/policy\.sh\s+"\$\(/.test(line))
    expect(
      calls.length,
      'the skill no longer shows the command that posts the verdict',
    ).toBeGreaterThan(0)
    for (const call of calls) {
      expect(call, 'policy.sh runs on a path nobody checked').toMatch(
        /scripts\/judge\.sh have <role>.*&&\s+scripts\/policy\.sh/,
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

  // The command at the start of a word and whole: `docs/specs/` is not the
  // command of /spec, and `scripts/board.sh` is not the command of /board.
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
    expect(missing('The spec lives in docs/specs/SPEC.md.', 'spec')).toContain(
      '/spec',
    )
  })
})

// A session at clean context starts from AGENTS.md and from CLAUDE.md: the
// "Map" says which skills exist, the line about the symlinks says the one
// that runs is the folder of the working tree. A skill missing from one of
// the two lines is a skill whoever reads believes is not there, and whoever
// adds the next one has nothing to remind them of the two lines. The test
// compares names, not sentences: the description of each skill stays the
// prose of whoever writes it.
describe('AGENTS.md and CLAUDE.md name every skill of skills/', () => {
  const skills = readdirSync(join(root, 'skills')).filter((name) =>
    statSync(join(root, 'skills', name)).isDirectory(),
  )

  const symlinkLine = readFileSync(join(root, 'CLAUDE.md'), 'utf8')
    .split('\n')
    .find((line) => line.includes('~/.claude/skills/'))
  const map = readFileSync(join(root, 'AGENTS.md'), 'utf8')
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

  it.each(skills)('the Map of AGENTS.md names skills/%s/SKILL.md', (skill) => {
    expect(map, 'AGENTS.md has no ## Map section').toBeDefined()
    expect(
      map,
      `the "Map" of AGENTS.md does not name skills/${skill}/SKILL.md`,
    ).toContain(`skills/${skill}/SKILL.md`)
  })
})

// The ninth user story of docs/specs/SPEC-spec-skill.md: "Un test strutturale
// fallisce se le sezioni del template in skills/spec/templates/SPEC.md e la
// lista nel README di docs/specs/ divergono". The template is what /spec
// writes, the README of docs/specs/ is the contract in the repos where the
// skill is not there: if they say different sections or fields, /slice reads
// a spec the contract does not describe. The READMEs are two, the one of this
// repo and the one /harness-init local copies elsewhere, and both hold.
describe('the spec template and the docs/specs README say the same sections', () => {
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
    'docs/specs/README.md',
    'skills/harness-init/templates/docs/specs/README.md',
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
        readFileSync(join(root, file), 'utf8'),
      )?.[1]
      expect(list, `${file} has no "Sections: ..." sentence`).toBeDefined()
      expect(
        (list ?? '').split(',').map((section) => section.trim()),
        `${file} and skills/spec/templates/SPEC.md list different sections`,
      ).toEqual(sections)
    },
  )

  it.each(readmes)(
    '%s names every field of the template frontmatter',
    (file) => {
      const readme = readFileSync(join(root, file), 'utf8')
      for (const field of fields) {
        expect(
          readme,
          `${file} does not name the frontmatter field \`${field}\``,
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
    'misbehaves: write one dated line in `docs/inbox.md`,',
    '`- <YYYY-MM-DD>: <one line>`, and carry on with what is there. Never',
    'rerun `/harness-init`, never edit a script, a hook, a workflow or the',
    '`AGENTS.md` of that repo: the fix belongs to the harness repo and comes',
    'back with the stage of `/harness-init` that owns the file. The only stop',
    'is a directory this skill must write into that is not there, which means',
    'there is no harness. If `docs/inbox.md` alone is missing, say so in the',
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
// repos of the projects like the READMEs of the folders, so it is a template:
// the row in templates/README.md is imposed by the describe at the top of
// this file, which walks the tree of the templates. The difference with the
// READMEs is that the inbox carries data, the entries, which belong to that
// repo and are not kept aligned: the comparison is on the header, as for
// .github/judge/prompt.md above "## This repo".
describe('docs/inbox.md is a template plus the entries of this repo', () => {
  const template = readFileSync(join(templates, 'docs/inbox.md'), 'utf8')
  const mine = readFileSync(join(root, 'docs/inbox.md'), 'utf8')
  const entry = /^- \d{4}-\d{2}-\d{2}: /m

  it('the template carries no entry: a new repo starts empty', () => {
    expect(
      entry.test(template),
      'skills/harness-init/templates/docs/inbox.md has an entry in it: the entries belong to the repo, the template is the header',
    ).toBe(false)
  })

  it('docs/inbox.md opens with the template', () => {
    expect(
      mine.startsWith(template),
      'docs/inbox.md drifted from skills/harness-init/templates/docs/inbox.md: change the template, the header is what /harness-init local installs elsewhere',
    ).toBe(true)
  })
})

// S09 lets through on main a commit made only of the paths of the human gate.
// A line of inbox is written by a skill in the middle of a run: if the path
// is not among those, the hook stops it and the skill jams exactly where it
// was supposed to carry on.
describe('AGENTS.md lets a line of inbox land', () => {
  it.each([
    ['AGENTS.md', join(root, 'AGENTS.md')],
    ['skills/harness-init/templates/AGENTS.md', join(templates, 'AGENTS.md')],
  ])('%s names docs/inbox.md in human_gate_paths', (_name, path) => {
    expect(
      policyBlock(readFileSync(path, 'utf8')).human_gate_paths,
      'a skill cannot commit the line it was told to write',
    ).toContain('docs/inbox.md')
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
      '"$CLAUDE_PROJECT_DIR"/scripts/ensure-hooks.sh',
      '"$CLAUDE_PROJECT_DIR"/scripts/ensure-verdict.sh',
    ])
  })

  it('this repo keeps ensure-hooks.sh and drops ensure-verdict.sh', () => {
    expect(commands(mine)).toEqual([
      '"$CLAUDE_PROJECT_DIR"/scripts/ensure-hooks.sh',
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
// it, the same one the git hooks read through scripts/policy-lines.sh. A
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
// scripts/board.sh, and /board is the wrapper that shows them and closes the
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
      'the skill does not name scripts/board.sh: the screen is the script, not the skill',
    ).toContain('scripts/board.sh')
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
      'scripts/intent.sh new <slug>',
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
  const commitlint = join(root, 'scripts/commitlint.sh')
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

  it('skills/next/SKILL.md gives the branch as a reason an argument is not eligible', () => {
    expect(
      section('next', '## 1. Refuse early').replace(/\s+/g, ' '),
      'section 1 of /next still says three reasons: a slice someone else has taken would be refused without saying why',
    ).toContain('slice/S<NN>-')
  })

  // From `Eligible:` to the end of the line and not the whole line: the
  // paragraph says the claim just above, and names the branch anyway.
  it('docs/backlog/README.md says it in the Eligible line', () => {
    const line = readFileSync(join(root, 'docs/backlog/README.md'), 'utf8')
      .split('\n')
      .find((row) => row.includes('Eligible:'))
    expect(
      line,
      'docs/backlog/README.md has no Eligible line to read',
    ).toBeDefined()
    expect(
      (line ?? '').slice((line ?? '').indexOf('Eligible:')),
      'the Eligible line of docs/backlog/README.md does not name the branch: the contract in the repos of the projects still has three points',
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

// S27: the ADRs of this repo sit in docs/decisions/ and in no project. A
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
  const start = skill.indexOf('```\nRead AGENTS.md, docs/codebase-map.md')
  const end = start === -1 ? -1 : skill.indexOf('\n```', start + 3)
  const block =
    start === -1 || end === -1
      ? ''
      : skill.slice(start, end).replace(/\s+/g, ' ')

  it('has the rule in the fenced subagent block', () => {
    expect(
      block,
      `${file} has no fenced block that opens with "Read AGENTS.md, docs/codebase-map.md": the brief of the subagent has moved somewhere this test does not read`,
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

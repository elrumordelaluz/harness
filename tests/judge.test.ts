// Behaviour of scripts/judge.sh and scripts/ensure-verdict.sh, the two halves
// of the local judgement: the one that builds what the judge reads and checks
// what it wrote, and the hook that refuses to open a PR for a head nobody
// judged. Each case is a throwaway git repo carrying the repo's own AGENTS.md
// and judge files, so the rules under test are the real ones.
import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  existsSync,
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

const root = resolve(import.meta.dirname, '..')
const sample = readFileSync(join(root, 'tests/fixtures/verdict.json'), 'utf8')
// The three words, never written as one string in this file: the hook under
// test would read its own test as the command and block writing it.
const open = ['gh', 'pr', 'create'].join(' ')

type Files = Record<string, string>

function git(dir: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' })
}

function write(dir: string, files: Files): void {
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  }
}

function install(dir: string, file: string): void {
  const path = join(dir, file)
  mkdirSync(dirname(path), { recursive: true })
  copyFileSync(join(root, file), path)
  chmodSync(path, 0o755)
}

// A repo with the chain installed: the real AGENTS.md at the base commit, so
// tier.sh reads the real policy block, and the real scripts and judge files.
function repo(work: Files = {}, branch?: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'judge-'))
  git(dir, 'init', '-b', 'main', '-q')
  git(dir, 'config', 'user.email', 'judge@test')
  git(dir, 'config', 'user.name', 'judge')
  for (const file of [
    'AGENTS.md',
    'docs/codebase-map.md',
    'scripts/tier.sh',
    'scripts/policy-lines.sh',
    'scripts/judge.sh',
    'scripts/ensure-verdict.sh',
    'scripts/prose.sh',
    'scripts/test-weakening.sh',
    '.github/judge/prompt.md',
    '.github/judge/verdict.schema.json',
  ]) {
    install(dir, file)
  }
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'base')
  // The work always lands on a branch: tier.sh reads the range main...HEAD,
  // and a commit made on main leaves it empty.
  git(dir, 'checkout', '-q', '-b', branch ?? 'work')
  if (Object.keys(work).length > 0) {
    write(dir, work)
    git(dir, 'add', '-A')
    git(dir, 'commit', '-q', '-m', 'work')
  }
  return dir
}

// tier.sh reads PR_BODY, PR_LABELS and GITHUB_HEAD_REF from the environment,
// and on Actions the last one is set to the branch of the PR that is running
// the suite. Inherited, it would answer for the real branch instead of the
// fixture's, and the tier 3 case would be a tier 1 in CI and a tier 3 here.
const clean = {
  ...process.env,
  GITHUB_HEAD_REF: '',
  PR_BODY: '',
  PR_LABELS: '',
}

function judge(
  dir: string,
  args: string[],
  input = '',
  path?: string,
): { code: number; out: string; err: string } {
  const run = spawnSync('scripts/judge.sh', args, {
    cwd: dir,
    input,
    encoding: 'utf8',
    env: path ? { ...clean, PATH: path } : clean,
  })
  return { code: run.status ?? -1, out: run.stdout, err: run.stderr }
}

function mutate(mutation: string): string {
  return execFileSync('jq', [mutation], { input: sample, encoding: 'utf8' })
}

// The hook reads the tool call as JSON on stdin and answers with nothing to
// allow, or with the deny object to block.
function hook(
  dir: string,
  command: string,
  path?: string,
): { code: number; out: string } {
  const run = spawnSync('scripts/ensure-verdict.sh', [], {
    cwd: dir,
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf8',
    env: path ? { ...clean, PATH: path } : clean,
  })
  return { code: run.status ?? -1, out: run.stdout.trim() }
}

function reasonFor(out: string): string {
  const parsed = JSON.parse(out) as {
    hookSpecificOutput: {
      hookEventName: string
      permissionDecision: string
      permissionDecisionReason: string
    }
  }
  expect(parsed.hookSpecificOutput.hookEventName).toBe('PreToolUse')
  expect(parsed.hookSpecificOutput.permissionDecision).toBe('deny')
  return parsed.hookSpecificOutput.permissionDecisionReason
}

const code = { 'src/a.ts': 'export const a = 1\n' }
// scripts/** is a sensitive path in the AGENTS.md the fixture carries, so this
// is a tier 2 diff: the tier that asks for two judgements.
const sensitive = { ...code, 'scripts/extra.sh': '#!/usr/bin/env bash\ntrue\n' }

// A PATH with the tools the scripts use and no jq, to exercise the fallback
// the hook takes when the payload cannot be parsed. Built by resolving each
// command, so it works wherever jq happens to live.
function pathWithoutJq(dir: string): string {
  const bin = join(dir, 'nojq-bin')
  mkdirSync(bin, { recursive: true })
  for (const cmd of [
    'bash',
    'sh',
    'cat',
    'tr',
    'grep',
    'sed',
    'head',
    'tail',
    'cut',
    'sort',
    'uniq',
    'wc',
    'awk',
    'git',
    'mkdir',
    'rm',
    'ls',
    'dirname',
    'basename',
    'date',
    'expr',
    'env',
  ]) {
    const found = spawnSync('which', [cmd], { encoding: 'utf8' })
    const target = found.stdout.trim()
    if (target) symlinkSync(target, join(bin, cmd))
  }
  expect(
    spawnSync('sh', ['-c', 'command -v jq'], {
      encoding: 'utf8',
      env: { PATH: bin },
    }).status,
    'jq is still reachable, the fallback would not be exercised',
  ).not.toBe(0)
  return bin
}

function store(dir: string, role: string, base = 'main'): void {
  write(dir, { 'v.json': mutate(`.judge.role = "${role}"`) })
  const run = judge(dir, ['check', 'v.json', role, base])
  expect(run.code, run.err).toBe(0)
}

// A repo where the base moved and the branch took it along: from here on
// `main` and `vecchia` no longer share the same merge base with HEAD, which
// is the only condition under which two bases cover two different diffs.
function moved(): string {
  const dir = repo(code)
  git(dir, 'branch', 'vecchia', 'main')
  git(dir, 'checkout', '-q', 'main')
  write(dir, { 'docs/altro.md': 'due righe\n' })
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'la base si muove')
  git(dir, 'checkout', '-q', 'work')
  git(dir, 'merge', '-q', '--no-edit', 'main')
  return dir
}

describe('judge.sh required: the tier decides whether to judge at all', () => {
  it('prints the tier and asks for a verdict at tier 1', () => {
    const run = judge(repo(code), ['required', 'main'])
    expect(run.out.trim()).toBe('1')
    expect(run.code).toBe(0)
  })

  it('asks for none at tier 0, the tier that never judges', () => {
    const dir = repo({ 'docs/intent/idea.md': 'due righe\n' })
    const run = judge(dir, ['required', 'main'])
    expect(run.out.trim()).toBe('0')
    expect(run.code).toBe(1)
  })

  // Three answers, not two. A tier that could not be computed must not share
  // an exit code with a tier that asks for nothing: the caller reads the
  // second as a green light.
  it('keeps "cannot tell" apart from "no verdict needed"', () => {
    const dir = repo(code)
    writeFileSync(
      join(dir, 'scripts/tier.sh'),
      '#!/usr/bin/env bash\nexit 1\n',
      {
        mode: 0o755,
      },
    )
    const run = judge(dir, ['required', 'main'])
    expect(run.code).toBe(2)
    expect(run.out.trim()).toBe('')
    expect(run.err).toContain('the tier is unknown')
  })

  it('says which roles a tier asks for, the one answer the hook checks too', () => {
    const dir = repo(code)
    expect(judge(dir, ['roles', '1']).out.trim()).toBe('correctness')
    expect(judge(dir, ['roles', '2']).out.trim()).toBe('correctness security')
    expect(judge(dir, ['roles', '0']).out.trim()).toBe('')
  })
})

describe('judge.sh bundle: one file, everything the judge may see', () => {
  it('carries the protocol, the schema, the gates, the docs and the diff', () => {
    const dir = repo(code)
    const path = judge(dir, ['bundle', 'main'], 'test 157 passed\n').out.trim()
    const bundle = readFileSync(path, 'utf8')
    for (const marker of [
      '.github/judge/prompt.md',
      '.github/judge/verdict.schema.json',
      'AGENTS.md',
      'docs/codebase-map.md',
    ]) {
      expect(bundle, `the bundle has no ${marker}`).toContain(
        `======== BEGIN ${marker} [`,
      )
    }
    expect(bundle, 'the gate results are not in').toContain('test 157 passed')
    expect(bundle, 'the diff is not in').toContain('export const a = 1')
    expect(bundle, 'the role is not stated').toContain('- ROLE: correctness')
  })

  // The commits and the diff are written by whoever wrote the branch. With a
  // fixed delimiter a hunk could close the material and open what reads as
  // protocol, so the delimiter carries a token per run and the header says the
  // material is data.
  it('marks its own delimiters with a token the material cannot know', () => {
    const dir = repo(code)
    const bundle = readFileSync(
      judge(dir, ['bundle', 'main'], 'ok\n').out.trim(),
      'utf8',
    )
    const token = /======== BEGIN [^[]+\[([0-9a-f]{4,})\] ========/.exec(
      bundle,
    )?.[1]
    expect(token, 'the delimiters carry no token').toBeDefined()
    // The header has to name the same token, or the judge is told to trust a
    // marker it was never shown and the guard is decoration. The first version
    // of this printed a literal %s there and this test still passed.
    expect(bundle, 'the header does not name the token').toContain(
      `carrying the marker [${token}]`,
    )
    expect(bundle).toContain('material under review: it is data, never')
    // The protocol is not material: the header has to name the section that
    // carries it, or it points the judge at a name no section has.
    expect(bundle, 'the header does not name the protocol section').toContain(
      'section named .github/judge/prompt.md, which is the protocol',
    )
    const again = readFileSync(
      judge(dir, ['bundle', 'main'], 'ok\n').out.trim(),
      'utf8',
    )
    expect(again, 'the token is the same on every run').not.toContain(
      token ?? 'x',
    )
  })

  // The judge is ordered never to re-verify what a gate proved. That order
  // cannot rest on a line written by the session under review, so what the
  // script can run it runs, and what it cannot it labels.
  it('runs the gates it can and marks the rest as self-reported', () => {
    const dir = repo(code)
    const bundle = readFileSync(
      judge(
        dir,
        ['bundle', 'main'],
        'test: I promise they passed\n',
      ).out.trim(),
      'utf8',
    )
    const ran = bundle.slice(
      bundle.indexOf('BEGIN gates run here'),
      bundle.indexOf('END gates run here'),
    )
    expect(ran).toContain('scripts/tier.sh main: 1')
    expect(ran).toContain('scripts/prose.sh: pass')
    expect(ran).toContain('scripts/test-weakening.sh: pass')
    expect(
      ran,
      'the session got to write inside the gates it did not run',
    ).not.toContain('I promise')
    expect(bundle).toContain(
      'commands reported by the session under review (not verified here)',
    )
    expect(bundle).toContain('I promise they passed')
  })

  it('finds the slice from the branch name, and says so when there is none', () => {
    const slice = '---\nid: S04\n---\n\n## Goal\n\nun check.\n'
    const named = repo(
      { ...code, 'docs/backlog/S04-workflow.md': slice },
      'slice/S04-workflow',
    )
    const bundle = readFileSync(
      judge(named, ['bundle', 'main'], 'ok\n').out.trim(),
      'utf8',
    )
    expect(bundle).toContain('- slice: docs/backlog/S04-workflow.md')
    expect(bundle).toContain('======== BEGIN docs/backlog/S04-workflow.md [')

    const plain = readFileSync(
      judge(repo(code), ['bundle', 'main'], 'ok\n').out.trim(),
      'utf8',
    )
    expect(plain).toContain('- slice: none')
  })
})

describe('judge.sh check: the only guard the schema has', () => {
  it('accepts the sample verdict, stamps the head and stores it', () => {
    const dir = repo(code)
    write(dir, { 'v.json': sample })
    expect(judge(dir, ['have']).code).not.toBe(0)

    const stored = judge(dir, ['check', 'v.json']).out.trim()
    expect(stored).toBe(judge(dir, ['path']).out.trim())
    expect(judge(dir, ['have']).code).toBe(0)
    const verdict = JSON.parse(readFileSync(stored, 'utf8')) as {
      head_sha: string
    }
    expect(verdict.head_sha).toBe(git(dir, 'rev-parse', 'HEAD').trim())
  })

  it('stores outside the tree, so a judgement never dirties the diff', () => {
    const dir = repo(code)
    write(dir, { 'v.json': sample })
    judge(dir, ['check', 'v.json'])
    expect(judge(dir, ['path']).out.trim()).toContain('/.git/harness/')
    expect(git(dir, 'status', '--porcelain')).not.toContain('harness')
  })

  // Each way the schema can break has its own case: the point of the check is
  // that a local judge cannot store a verdict the action would have rejected.
  it.each([
    ['del(.reason)', 'reason is missing'],
    ['.verdict = "maybe"', 'not one of approve/request-changes/escalate'],
    ['.reason = ("x" * 241)', 'the schema allows 240'],
    ['.tier = "two"', 'the schema says integer'],
    [
      '.findings = [{severity: "high", file: "a.ts", claim: "c"}]',
      'findings[0].evidence is missing',
    ],
    ['.criteria = [{ok: true}]', 'criteria[0].id is missing'],
    ['del(.judge.ts)', 'judge.ts is missing'],
    // One level down carries enums and types too, and a check that stopped at
    // the top would store what the action rejects.
    ['.judge.role = "auditor"', 'judge.role is auditor, not one of'],
    ['.judge.where = "somewhere"', 'judge.where is somewhere, not one of'],
    // Since ADR-0004 no workflow judges, and policy.sh always writes local.
    ['.judge.where = "ci"', 'judge.where is ci, not one of'],
    [
      '.findings = [{severity: "critical", file: "a", claim: "c", evidence: "e"}]',
      'findings[0].severity is critical, not one of',
    ],
    [
      '.criteria = [{id: "AC1", ok: "yes"}]',
      'criteria[0].ok is a string, the schema says boolean',
    ],
    // A field present and null used to skip every other keyword.
    ['.reason = null', 'reason is null and the schema does not allow it'],
    ['.verdict = null', 'verdict is null and the schema does not allow it'],
    // The third open finding of PR #13: the type was checked only where the
    // schema declares a single one, so the fields with a list type, the ones
    // that allow null, went through with any type at all. The schema refuses
    // them, and a check that promises less than the schema it reads stores a
    // verdict the hook and the policy cannot read later.
    [
      '.findings = [{severity: "high", file: "a", line: "42", claim: "c", evidence: "e"}]',
      'findings[0].line is a string, the schema says integer or null',
    ],
    ['.slice = 42', 'slice is a number, the schema says string or null'],
    [
      '.cost = {turns: "molti"}',
      'cost.turns is a string, the schema says integer or null',
    ],
    // The three keywords the schema uses and the check used to ignore.
    ['.tier = 9', 'the schema stops at 3'],
    ['.confidence = -1', 'the schema starts at 0'],
    // `head_sha` and `base_sha` are no longer here: `check` takes them off
    // before validating, because they belong to the chain and it writes them
    // itself. That the schema wants a sha of forty digits stays true, and
    // architecture.test.ts proves it on the schema file, which is where that
    // rule lives and where the judge reads it before writing the verdict.
  ])('refuses %s', (mutation, message) => {
    const dir = repo(code)
    write(dir, { 'v.json': mutate(mutation) })
    const run = judge(dir, ['check', 'v.json'])
    expect(run.code).not.toBe(0)
    expect(run.err).toContain(message)
    expect(judge(dir, ['have']).code, 'a refused verdict was stored').not.toBe(
      0,
    )
  })

  // The second open finding of PR #13: the verdict was stored by head and
  // role and never by base, so a judgement made against one base satisfied
  // the hook for a PR opened against another, over a diff the judge had
  // never read.
  it('stamps the base the diff was read from', () => {
    const dir = repo(code)
    write(dir, { 'v.json': sample })
    const stored = judge(dir, ['check', 'v.json', 'correctness', 'main']).out
    const verdict = JSON.parse(readFileSync(stored.trim(), 'utf8')) as {
      base_sha: string
    }
    expect(verdict.base_sha).toBe(git(dir, 'merge-base', 'main', 'HEAD').trim())
  })

  it('answers have per base: the one it judged, not another', () => {
    const dir = moved()
    store(dir, 'correctness', 'main')
    expect(judge(dir, ['have', 'correctness', 'main']).code).toBe(0)
    expect(judge(dir, ['have', 'correctness']).code, 'a verdict is there').toBe(
      0,
    )
    expect(
      judge(dir, ['have', 'correctness', 'vecchia']).code,
      'the verdict of another base answered for this one',
    ).toBe(3)
  })

  // A verdict written by hand, or stored before the base entered the verdict,
  // does not say what it was judged against. Not knowing is not a yes.
  it('keeps 3 apart from 0 when the verdict names no base at all', () => {
    const dir = repo(code)
    write(dir, { 'v.json': sample })
    judge(dir, ['check', 'v.json'])
    expect(judge(dir, ['have', 'correctness']).code).toBe(0)
    expect(judge(dir, ['have', 'correctness', 'main']).code).toBe(3)
  })

  // The field the gate trusts cannot arrive from the judge. The prompt tells
  // it to leave the field out and nothing enforces that: the text of the
  // verdict is written by a model that has read commits and diffs, untrusted
  // material. `check` rewrites the field when the base is there and takes it
  // off when it is not, so `base_sha` comes from here only.
  it('never keeps a base_sha that arrived with the verdict', () => {
    const dir = moved()
    const altra = git(dir, 'merge-base', 'vecchia', 'HEAD').trim()
    const mia = git(dir, 'merge-base', 'main', 'HEAD').trim()
    write(dir, { 'v.json': mutate(`.base_sha = "${altra}"`) })

    const stored = judge(dir, ['check', 'v.json']).out.trim()
    const stripped = JSON.parse(readFileSync(stored, 'utf8')) as {
      base_sha?: string
    }
    expect(
      stripped.base_sha,
      'the judge wrote the field and check kept it',
    ).toBe(undefined)
    expect(judge(dir, ['have', 'correctness', 'vecchia']).code).toBe(3)

    judge(dir, ['check', 'v.json', 'correctness', 'main'])
    const stamped = JSON.parse(readFileSync(stored, 'utf8')) as {
      base_sha: string
    }
    expect(stamped.base_sha).toBe(mia)
  })

  // Without jq the field is read by sed, and the verdict is an object the
  // judge can put others inside: a nested `base_sha` key sits on a line of
  // its own, more indented, and before the real one, which jq appends at the
  // end. A value inside a string never arrives, because JSON puts a backslash
  // in front of the quotes; a nested key does. The pattern takes the top
  // level line, two spaces exactly, and nothing else.
  it('does not read the base out of a nested key when jq is missing', () => {
    const dir = moved()
    const altra = git(dir, 'merge-base', 'vecchia', 'HEAD').trim()
    write(dir, { 'v.json': mutate(`.judge.base_sha = "${altra}"`) })
    judge(dir, ['check', 'v.json', 'correctness', 'main'])

    const bin = pathWithoutJq(dir)
    expect(
      judge(dir, ['have', 'correctness', 'main'], '', bin).code,
      'it read the nested key instead of the field',
    ).toBe(0)
    expect(judge(dir, ['have', 'correctness', 'vecchia'], '', bin).code).toBe(3)
  })

  // The field goes out before validation, not after: the schema gives it a
  // pattern of 40 hex, and a judge writing `base_sha: "unknown"` would fail
  // the check instead of having the field taken off. No verdict stored, and
  // the PR of that role stops opening until the model stops.
  it('takes off a malformed base_sha instead of refusing the verdict', () => {
    const dir = moved()
    write(dir, { 'v.json': mutate('.base_sha = "unknown"') })
    const run = judge(dir, ['check', 'v.json', 'correctness', 'main'])
    expect(run.code, run.err).toBe(0)
    const stored = JSON.parse(readFileSync(run.out.trim(), 'utf8')) as {
      base_sha: string
    }
    expect(stored.base_sha).toBe(git(dir, 'merge-base', 'main', 'HEAD').trim())
  })

  // The same holds for `head_sha`, and for the two fields the closing fills:
  // they belong to the chain, the prompt tells the judge to leave them out,
  // and a malformed one used to fail the check instead of leaving the verdict.
  it('takes off every field of the chain, whatever shape it arrives in', () => {
    const dir = moved()
    write(dir, {
      'v.json': mutate(
        '.head_sha = "nope" | .outcome = {decided_by: "human", action: "merged"} | .audit = {agree: true}',
      ),
    })
    const run = judge(dir, ['check', 'v.json', 'correctness', 'main'])
    expect(run.code, run.err).toBe(0)
    const stored = JSON.parse(readFileSync(run.out.trim(), 'utf8')) as {
      head_sha: string
      outcome?: unknown
      audit?: unknown
    }
    expect(stored.head_sha).toBe(git(dir, 'rev-parse', 'HEAD').trim())
    expect(stored.outcome, 'the judge decided the outcome').toBe(undefined)
    expect(stored.audit, 'the judge audited itself').toBe(undefined)
  })

  // `bundle` and `check` take the base as two separate arguments, and whoever
  // orchestrates could pass one to the first and another to the second: the
  // verdict would claim to cover a diff nobody read.
  it('refuses a base the bundle of this head did not read', () => {
    const dir = moved()
    judge(dir, ['bundle', 'main', 'correctness'], 'ok\n')
    write(dir, { 'v.json': sample })
    const run = judge(dir, ['check', 'v.json', 'correctness', 'vecchia'])
    expect(run.code).not.toBe(0)
    expect(run.err).toContain('the bundle of this head')
    expect(judge(dir, ['have']).code, 'a refused verdict was stored').not.toBe(
      0,
    )
    expect(judge(dir, ['check', 'v.json', 'correctness', 'main']).code).toBe(0)
  })

  // The header of the bundle says which commit the diff starts from, and that
  // is what `check` compares. `git diff <base>...HEAD` with no merge base
  // dies halfway through the file, with git's own words and a half written
  // bundle: the refusal arrives before there is a file to leave lying around.
  it('refuses to bundle a base that shares no history with HEAD', () => {
    const dir = repo(code)
    git(dir, 'checkout', '-q', '--orphan', 'altrove')
    git(dir, 'rm', '-rqf', '.')
    write(dir, { 'altro.md': 'un altro albero\n' })
    git(dir, 'add', '-A')
    git(dir, 'commit', '-q', '-m', 'altrove')
    git(dir, 'checkout', '-q', 'work')

    const run = judge(dir, ['bundle', 'altrove', 'correctness'], 'ok\n')
    expect(run.code).not.toBe(0)
    expect(run.err).toContain('no merge base')
    expect(run.out.trim(), 'it printed the path of a half written bundle').toBe(
      '',
    )
    const store = dirname(judge(dir, ['path']).out.trim())
    const half = join(
      store,
      `${git(dir, 'rev-parse', 'HEAD').trim()}.correctness.md`,
    )
    expect(existsSync(half), 'it left half a bundle in the store').toBe(false)

    const good = judge(dir, ['bundle', 'main', 'correctness'], 'ok\n').out
    expect(readFileSync(good.trim(), 'utf8')).toContain(
      `- base_sha: ${git(dir, 'merge-base', 'main', 'HEAD').trim()}`,
    )
  })

  // A bundle that says nothing about the base is one an earlier version
  // wrote, or a truncated file: the guard exists for the case where the two
  // arguments disagree, and a guard that cannot tell stops.
  it('refuses when the bundle of this head says nothing about its base', () => {
    const dir = moved()
    const bundle = judge(dir, ['bundle', 'main', 'correctness'], 'ok\n').out
    const path = bundle.trim()
    writeFileSync(
      path,
      readFileSync(path, 'utf8').replace(/^- base_sha: .*\n/m, ''),
    )

    write(dir, { 'v.json': sample })
    const run = judge(dir, ['check', 'v.json', 'correctness', 'main'])
    expect(run.code).not.toBe(0)
    expect(run.err).toContain('says nothing about the base')
    expect(judge(dir, ['have']).code, 'a refused verdict was stored').not.toBe(
      0,
    )
  })

  // Two histories that never touch have no diff to judge. It is not a verdict
  // against another base: there is no base at all.
  it('refuses a base that shares no history with HEAD', () => {
    const dir = repo(code)
    git(dir, 'checkout', '-q', '--orphan', 'altrove')
    git(dir, 'rm', '-rqf', '.')
    write(dir, { 'altro.md': 'un altro albero\n' })
    git(dir, 'add', '-A')
    git(dir, 'commit', '-q', '-m', 'altrove')
    git(dir, 'checkout', '-q', 'work')

    write(dir, { 'v.json': sample })
    const run = judge(dir, ['check', 'v.json', 'correctness', 'altrove'])
    expect(run.code).not.toBe(0)
    expect(run.err).toContain('no merge base')
    expect(judge(dir, ['have']).code, 'a refused verdict was stored').not.toBe(
      0,
    )
  })

  it('refuses a verdict written for the other role', () => {
    const dir = repo(code)
    write(dir, { 'v.json': mutate('.judge.role = "security"') })
    const run = judge(dir, ['check', 'v.json', 'correctness'])
    expect(run.code).not.toBe(0)
    expect(run.err).toContain('says role security, this run is correctness')
  })

  // `pr` left the required list: /judge runs before the PR exists, and a judge
  // that had to write the number could only invent it. policy.sh stamps it.
  it('accepts a verdict with no pr, and a null where the schema allows one', () => {
    const dir = repo(code)
    write(dir, { 'v.json': mutate('del(.pr) | .slice = null') })
    expect(judge(dir, ['check', 'v.json']).code, 'a verdict without pr').toBe(0)
  })

  // The role names a file in the store and judge.sh is on the settings
  // allowlist, so an argument that is not a role must not reach the path.
  it('refuses an argument that is not a role, before it becomes a path', () => {
    const dir = repo(code)
    write(dir, { 'v.json': sample })
    for (const args of [
      ['path', '../../evil'],
      ['have', '../../evil'],
      ['check', 'v.json', '../../evil'],
      ['bundle', 'main', '../../evil'],
    ]) {
      const run = judge(dir, args)
      expect(run.code, `${args[0]} took it`).not.toBe(0)
      expect(run.err).toContain('is not a role')
      expect(run.out, `${args[0]} printed a path anyway`).not.toContain(
        '/.git/harness/',
      )
    }
  })

  // The redirection truncates its target before jq reads its input, so this
  // used to empty the very verdict it was asked to check.
  it('survives being handed the path of the store itself', () => {
    const dir = repo(code)
    write(dir, { 'v.json': sample })
    const stored = judge(dir, ['check', 'v.json']).out.trim()
    expect(judge(dir, ['check', stored]).code, 'the second check failed').toBe(
      0,
    )
    expect(judge(dir, ['have']).code, 'the verdict was destroyed').toBe(0)
    const verdict = JSON.parse(readFileSync(stored, 'utf8')) as {
      verdict: string
    }
    expect(verdict.verdict).toBe('approve')
  })

  it('refuses an empty file and one that is not an object', () => {
    const dir = repo(code)
    write(dir, { 'empty.json': '', 'list.json': '[1, 2]\n' })
    expect(judge(dir, ['check', 'empty.json']).err).toContain(
      'the judge produced no verdict',
    )
    expect(judge(dir, ['check', 'list.json']).err).toContain(
      'is not a JSON object',
    )
  })
})

describe('ensure-verdict.sh: no verdict for this head, no PR', () => {
  it('says nothing about a command that opens no PR', () => {
    const run = hook(repo(code), 'git push -u origin HEAD')
    expect(run.out).toBe('')
    expect(run.code).toBe(0)
  })

  it('denies at tier 1 with no verdict, and names /judge', () => {
    const reason = reasonFor(hook(repo(code), `${open} --fill`).out)
    expect(reason).toContain('tier 1')
    expect(reason).toContain('/judge')
    // The two branches of the reason say two different things, and the wrong
    // refusal would send back to judge someone who never judged, or the other
    // way round.
    expect(reason).toContain('has no correctness verdict')
    expect(reason).not.toContain('does not cover the diff against')
  })

  it('sees it after a separator, not inside a quote or a heredoc', () => {
    const dir = repo(code)
    expect(hook(dir, `git push && ${open} --fill`).out).not.toBe('')
    expect(hook(dir, `git push\n${open} --fill`).out).not.toBe('')
    expect(hook(dir, `echo '${open} needs a verdict first'`).out).toBe('')
    expect(hook(dir, `cat <<EOF\nrun ${open} when green\nEOF`).out).toBe('')
  })

  // Command position is not only "after a semicolon": a brace group, a keyword
  // that introduces a command, a wrapper that runs one, an absolute path.
  it.each([
    '{ CMD; }',
    'if CMD --fill; then echo ok; fi',
    'env CMD',
    '/usr/local/bin/CMD',
    'git push; CMD',
    'GH_TOKEN=x CMD --fill',
    'GH_HOST=github.com GH_TOKEN=x CMD',
  ])('sees it in %s', (shape) => {
    expect(hook(repo(code), shape.replace('CMD', open)).out).not.toBe('')
  })

  it('is not fooled by a command that only starts the same way', () => {
    expect(hook(repo(code), `${open}x --fill`).out).toBe('')
    expect(hook(repo(code), 'gh pr list').out).toBe('')
  })

  // The case both judges found: at tier 2 the chain judges twice, and a gate
  // that takes the first verdict lets the second judgement disappear, and
  // nobody else supplies it.
  it('asks for every role the tier wants, not just the first', () => {
    const dir = repo(sensitive)
    expect(judge(dir, ['required', 'main']).out.trim()).toBe('2')

    let reason = reasonFor(hook(dir, `${open} --fill`).out)
    expect(reason).toContain('correctness and security')

    store(dir, 'correctness')
    reason = reasonFor(hook(dir, `${open} --fill`).out)
    expect(reason, 'the missing role is not named').toContain(
      'no security verdict',
    )
    expect(reason).not.toContain('correctness and security')

    store(dir, 'security')
    expect(hook(dir, `${open} --fill`).out).toBe('')
  })

  it('lets it through once the head has a verdict for this base', () => {
    const dir = repo(code)
    write(dir, { 'v.json': sample })
    judge(dir, ['check', 'v.json', 'correctness', 'main'])
    expect(hook(dir, `${open} --fill`).out).toBe('')
  })

  // A new commit is a new head, and the verdict of the old one says nothing
  // about it: that is the whole reason the store is keyed by sha.
  it('denies again after a commit lands on top of a judged head', () => {
    const dir = repo(code)
    write(dir, { 'v.json': sample })
    judge(dir, ['check', 'v.json'])
    write(dir, { 'src/b.ts': 'export const b = 2\n' })
    git(dir, 'add', '-A')
    git(dir, 'commit', '-q', '-m', 'more')
    expect(reasonFor(hook(dir, `${open} --fill`).out)).toContain('/judge')
  })

  it('denies a PR opened against a base the verdict never saw', () => {
    const dir = moved()
    store(dir, 'correctness', 'main')
    expect(hook(dir, `${open} --base main`).out).toBe('')
    const reason = reasonFor(hook(dir, `${open} --base vecchia`).out)
    expect(reason, 'the base of the PR is not named').toContain('vecchia')
    expect(reason).toContain('/judge')
    expect(reason, 'it refuses as if nobody had judged').toContain(
      'does not cover the diff against',
    )
    expect(reason).not.toContain('has no correctness verdict')
  })

  // The base is the first free value to enter the reason of the refusal. It
  // can carry nothing in with it: the ref goes through a filter of what a ref
  // may contain, and the reason is built by jq with --arg.
  // The filter is a whitelist of what a ref may contain here, not a list of
  // bad characters, and the reason of the refusal names the base inside a
  // command to paste: nothing git allows in a ref name and a shell reads as
  // syntax gets that far.
  it('strips from the base what a ref may not contain, before the reason', () => {
    const dir = repo(code)
    // git refuses space, ~ ^ : ? * [ and the backslash in a ref name, and
    // allows all of these: the backtick opens a command substitution in the
    // command to paste, the others stay syntax for the shell.
    const syntax = [
      '"',
      ';',
      '&',
      '|',
      '$',
      "'",
      '`',
      '(',
      ')',
      '<',
      '>',
      '!',
      '#',
    ]
    for (const char of syntax) {
      const nasty = `no${char}pe`
      const out = hook(dir, `${open} --base ${nasty}`).out
      expect(out, `${nasty} opened the PR`).not.toBe('')
      const reason = reasonFor(out)
      expect(reason, `${nasty} reached the reason`).toMatch(/(^|[^a-z])nope/)
      for (const other of syntax) {
        expect(reason, `${other} reached the reason`).not.toContain(other)
      }
    }
  })

  it('stays out at tier 0 and tier 3, the tiers that never judge', () => {
    const zero = repo({ 'docs/intent/idea.md': 'due righe\n' })
    expect(hook(zero, `${open} --fill`).out).toBe('')

    // tier.sh reads the human flag from the slice the branch took charge of.
    const three = repo(
      {
        ...code,
        'docs/backlog/S09-x.md': '---\nid: S09\nhuman: true\n---\n',
      },
      'slice/S09-x',
    )
    expect(judge(three, ['required', 'main']).out.trim()).toBe('3')
    expect(hook(three, `${open} --fill`).out).toBe('')
  })

  // Without jq the command cannot be parsed out of the call and the raw
  // payload is all there is. There the command sits inside a pair of double
  // quotes, so the quote has to count as a separator in that branch, or the
  // gate matches nothing and opens: the failure its own comment rules out.
  it('still sees the command when it cannot parse the call', () => {
    const dir = repo(code)
    const bin = pathWithoutJq(dir)
    expect(reasonFor(hook(dir, `${open} --fill`, bin).out)).toContain('/judge')
    // In the raw payload a newline is the two characters backslash and n, so
    // a command on two lines would hide the second behind an ordinary letter.
    // This branch has to see more than the other one, never less.
    expect(
      hook(dir, `git push\n${open} --fill`, bin).out,
      'a command on the second line got through',
    ).not.toBe('')
    expect(hook(dir, 'git push -u origin HEAD', bin).out).toBe('')
    // In the same branch --base is read out of the raw payload, where the ref
    // is followed by the JSON that closes the object rather than by a space.
    // Only when --base <ref> ends the command, which is why it takes this
    // PATH and a command that ends there. The reason names the ref it read: a
    // ref read past its end is either a name nobody wrote or one this clone
    // does not have, and the deny would be the other one, about a PR whose
    // base the harness cannot tell. The tier is not the signal here, because
    // this PATH hides the jq tier.sh parses the policy block with, and a
    // tier.sh that cannot read the block fails closed.
    expect(
      reasonFor(hook(dir, `${open} --base main`, bin).out),
      'the base was read past the ref',
    ).toContain('/judge --base main')

    // The verdicts go in by hand: judge.sh check needs the jq this PATH hides.
    // With the base inside them, because the hook holds a verdict against the
    // base of the PR, and reading that field is the one thing judge.sh does
    // without jq too. Both roles, because this PATH hides the jq tier.sh reads
    // the policy block with as well: with no block it can read, the tier fails
    // closed at 2, and at 2 the chain judges twice.
    const base = git(dir, 'merge-base', 'main', 'HEAD').trim()
    for (const role of ['correctness', 'security']) {
      const at = judge(dir, ['path', role]).out.trim()
      mkdirSync(dirname(at), { recursive: true })
      writeFileSync(
        at,
        mutate(`.judge.role = "${role}" | .base_sha = "${base}"`),
      )
    }
    expect(hook(dir, `${open} --fill`, bin).out).toBe('')
  })

  it('stays out of a repo that has no chain installed', () => {
    const dir = mkdtempSync(join(tmpdir(), 'judge-bare-'))
    git(dir, 'init', '-b', 'main', '-q')
    git(dir, 'config', 'user.email', 'judge@test')
    git(dir, 'config', 'user.name', 'judge')
    install(dir, 'scripts/ensure-verdict.sh')
    write(dir, { 'README.md': 'no chain here\n' })
    git(dir, 'add', '-A')
    git(dir, 'commit', '-q', '-m', 'base')
    expect(hook(dir, `${open} --fill`).out).toBe('')
  })

  // A gate that cannot tell has to say so: letting the PR through would be the
  // failure mode the hook exists to prevent.
  it('denies when the tier cannot be computed', () => {
    const dir = repo(code)
    writeFileSync(
      join(dir, 'scripts/tier.sh'),
      '#!/usr/bin/env bash\nexit 1\n',
      {
        mode: 0o755,
      },
    )
    expect(reasonFor(hook(dir, `${open} --fill`).out)).toContain(
      'scripts/tier.sh failed',
    )
  })

  // gh takes both spellings for the same option. Reading only the long one
  // leaves the hook computing the tier, and so which verdicts it asks for,
  // against a base that is not the PR's.
  it.each(['--base', '-B', '--base='])('reads the base from %s', (flag) => {
    const sep = flag.endsWith('=') ? '' : ' '
    const reason = reasonFor(
      hook(repo(code), `${open} ${flag}${sep}nowhere`).out,
    )
    expect(reason).toContain('nowhere')
  })

  // The first one, standing on its own: a greedy expression took the last,
  // which can be one quoted inside a title.
  it('takes the base of the PR, not one quoted in the title', () => {
    const reason = reasonFor(
      hook(repo(code), `${open} --base main --title "fix --base nowhere"`).out,
    )
    expect(reason, 'it read the base out of the title').toContain('tier 1')
  })
})

// ADR-0003, decision 2: the judge runs once per PR. A high or medium finding
// is fixed in the same session and answered with the commit that closes it,
// written next to the verdict of the judged head; nobody judges again.
const findings = [
  {
    severity: 'high',
    file: 'src/a.ts',
    line: 1,
    claim: 'wrong',
    evidence: 'x',
  },
  {
    severity: 'medium',
    file: 'src/a.ts',
    line: 2,
    claim: 'shaky',
    evidence: 'x',
  },
  { severity: 'low', file: 'src/a.ts', line: 3, claim: 'a nit', evidence: 'x' },
]

function changes(dir: string, role = 'correctness', base = 'main'): string {
  write(dir, {
    'v.json': mutate(
      `.judge.role = "${role}" | .verdict = "request-changes" | .findings = ${JSON.stringify(findings)}`,
    ),
  })
  const run = judge(dir, ['check', 'v.json', role, base])
  expect(run.code, run.err).toBe(0)
  return git(dir, 'rev-parse', 'HEAD').trim()
}

// A commit on the branch, with nothing else in it: v.json stays out.
function fix(dir: string, name = 'src/fix.ts'): string {
  write(dir, { [name]: `export const fix = '${name}'\n` })
  git(dir, 'add', name)
  git(dir, 'commit', '-q', '-m', `fix ${name}`)
  return git(dir, 'rev-parse', 'HEAD').trim()
}

function stored(dir: string, sha: string, role = 'correctness') {
  return JSON.parse(
    readFileSync(join(dir, '.git/harness', `${sha}.${role}.json`), 'utf8'),
  ) as { head_sha: string; answers?: { id: string; sha: string }[] }
}

describe('judge.sh answer: each finding answered by the commit that closes it', () => {
  it('writes the pair into the verdict of the judged head and reads it back', () => {
    const dir = repo(code)
    const judged = changes(dir)
    const a = fix(dir)
    const run = judge(dir, ['answer', 'F1', a])
    expect(run.code, run.err).toBe(0)
    expect(stored(dir, judged).answers).toEqual([{ id: 'F1', sha: a }])
    expect(stored(dir, judged).head_sha, 'the verdict moved').toBe(judged)
    expect(run.out).toMatch(
      new RegExp(
        `^F1 high src/a\\.ts:1 answered by ${a.slice(0, 7)}: wrong$`,
        'm',
      ),
    )
    expect(run.out).toMatch(/^F2 medium src\/a\.ts:2 open: shaky$/m)
    expect(run.out).toMatch(/^F3 low src\/a\.ts:3 open: a nit$/m)
    expect(judge(dir, ['findings']).out, 'the reading differs').toBe(run.out)
  })

  it('replaces the answer of a finding answered twice, and keeps the others', () => {
    const dir = repo(code)
    const judged = changes(dir)
    const a = fix(dir, 'src/one.ts')
    expect(judge(dir, ['answer', 'F2', a]).code).toBe(0)
    const b = fix(dir, 'src/two.ts')
    expect(judge(dir, ['answer', 'F1', b]).code).toBe(0)
    expect(judge(dir, ['answer', 'F2', b]).code).toBe(0)
    expect(stored(dir, judged).answers).toEqual([
      { id: 'F1', sha: b },
      { id: 'F2', sha: b },
    ])
  })

  it.each(['F9', 'F0', 'f1', '1', 'x'])(
    'refuses %s, an id the verdict does not have, and names the ones it has',
    (id) => {
      const dir = repo(code)
      const judged = changes(dir)
      const run = judge(dir, ['answer', id, fix(dir)])
      expect(run.code).not.toBe(0)
      expect(run.err).toContain(id)
      expect(run.err).toContain('F1 to F3')
      expect(stored(dir, judged).answers).toBeUndefined()
    },
  )

  // A low is a nit, declared in the PR and never answered: an answer binds
  // the verdict to its commit, and a nit would carry an approve to code no
  // judge saw.
  it('refuses to answer a low, and counts no low answer toward HEAD', () => {
    const dir = repo(code)
    const judged = changes(dir)
    const a = fix(dir)
    const low = judge(dir, ['answer', 'F3', a])
    expect(low.code).not.toBe(0)
    expect(low.err).toContain('F3 is a low')
    expect(stored(dir, judged).answers).toBeUndefined()
    // A low answer written by hand does not reach HEAD either.
    const file = join(dir, '.git/harness', `${judged}.correctness.json`)
    const verdict = JSON.parse(readFileSync(file, 'utf8')) as Record<
      string,
      unknown
    >
    writeFileSync(
      file,
      JSON.stringify({
        ...verdict,
        findings: [findings[2]],
        verdict: 'approve',
        answers: [{ id: 'F1', sha: a }],
      }),
    )
    expect(judge(dir, ['have', 'correctness', 'main']).code).toBe(4)
  })

  // An answer is a commit that came after the judgement, on this branch, up
  // to HEAD: anything else would bind the verdict to code it never saw.
  it('refuses a sha that is not a commit of this branch after the judged head', () => {
    const dir = repo(code)
    const judged = changes(dir)
    fix(dir)
    git(dir, 'branch', 'altrove', 'main')
    git(dir, 'checkout', '-q', 'altrove')
    const elsewhere = fix(dir, 'src/elsewhere.ts')
    git(dir, 'checkout', '-q', 'work')
    const base = git(dir, 'rev-parse', 'main').trim()
    for (const sha of [judged, base, elsewhere, 'nope']) {
      const run = judge(dir, ['answer', 'F1', sha])
      expect(run.code, `${sha} was taken`).not.toBe(0)
      expect(run.err).toContain('after the judged head')
    }
    expect(stored(dir, judged).answers).toBeUndefined()
  })

  it('refuses when the role has no verdict on this branch', () => {
    const dir = repo(code)
    const none = judge(dir, ['answer', 'F1', 'HEAD'])
    expect(none.code).not.toBe(0)
    expect(none.err).toContain('no correctness verdict')
    changes(dir)
    const other = judge(dir, ['answer', 'F1', fix(dir), 'security'])
    expect(other.code).not.toBe(0)
    expect(other.err).toContain('no security verdict')
  })

  it('refuses an argument that is not a role, before it becomes a path', () => {
    const dir = repo(code)
    changes(dir)
    for (const args of [
      ['answer', 'F1', fix(dir), '../../evil'],
      ['findings', '../../evil'],
    ]) {
      const run = judge(dir, args)
      expect(run.code, `${args[0]} took it`).not.toBe(0)
      expect(run.err).toContain('is not a role')
    }
  })

  // `answers` is a field of the chain, like head_sha: a judge that writes one
  // loses it instead of blocking its role or answering for itself.
  it('check takes off the answers a verdict arrives with', () => {
    const dir = repo(code)
    write(dir, {
      'v.json': mutate(`.answers = [{"id": "F1", "sha": "${'a'.repeat(40)}"}]`),
    })
    const run = judge(dir, ['check', 'v.json', 'correctness', 'main'])
    expect(run.code, run.err).toBe(0)
    expect(stored(dir, git(dir, 'rev-parse', 'HEAD').trim()).answers).toBe(
      undefined,
    )
  })
})

describe('ensure-verdict.sh: the judged head, answered, opens the PR without a second judgement', () => {
  it('lets the PR open on the fixes once every high and medium has its commit', () => {
    const dir = repo(code)
    const judged = changes(dir)
    const a = fix(dir)
    expect(judge(dir, ['answer', 'F1', a]).code).toBe(0)
    expect(judge(dir, ['answer', 'F2', a]).code).toBe(0)
    expect(judge(dir, ['have', 'correctness', 'main']).code).toBe(0)
    expect(
      hook(dir, `${open} --fill`).out,
      'the low is declared, not answered',
    ).toBe('')
    expect(judge(dir, ['path', 'correctness']).out.trim()).toMatch(
      new RegExp(`/\\.git/harness/${judged}\\.correctness\\.json$`),
    )
  })

  it('denies with a medium open, names it, and says to answer or fix, never to judge again', () => {
    const dir = repo(code)
    changes(dir)
    expect(judge(dir, ['answer', 'F1', fix(dir)]).code).toBe(0)
    expect(judge(dir, ['have', 'correctness', 'main']).code).toBe(4)
    const reason = reasonFor(hook(dir, `${open} --fill`).out)
    expect(reason).toContain('F2')
    expect(reason, 'F1 has its answer').not.toMatch(/\bF1\b/)
    expect(reason).toContain('scripts/judge.sh answer')
    expect(reason, 'it sends the session to judge again').not.toMatch(
      /\/judge(?!\.sh)/,
    )
  })

  // The answers bind the verdict to the commits that close its findings, and
  // to those only: a commit after them is code nobody judged.
  it('denies a commit that comes after the answers and answers nothing', () => {
    const dir = repo(code)
    changes(dir)
    const a = fix(dir)
    judge(dir, ['answer', 'F1', a])
    judge(dir, ['answer', 'F2', a])
    const b = fix(dir, 'src/more.ts')
    const reason = reasonFor(hook(dir, `${open} --fill`).out)
    expect(reason).toContain(b.slice(0, 7))
    expect(reason).toContain('scripts/judge.sh answer')
  })

  it('still denies a PR against a base the verdict never saw', () => {
    const dir = moved()
    changes(dir, 'correctness', 'main')
    const a = fix(dir)
    judge(dir, ['answer', 'F1', a])
    judge(dir, ['answer', 'F2', a])
    expect(hook(dir, `${open} --base main`).out).toBe('')
    expect(judge(dir, ['have', 'correctness', 'vecchia']).code).toBe(3)
    const reason = reasonFor(hook(dir, `${open} --base vecchia`).out)
    expect(reason).toContain('does not cover the diff against')
  })

  // Tier 2 judges one head twice. A fix that answers the finding of one role
  // is a commit of that judgement, and the other role, which found nothing
  // to answer, is carried to it too: the two ran together on the same head.
  it('at tier 2, the answers of one role carry the other judged on the same head', () => {
    const dir = repo(sensitive)
    store(dir, 'security')
    changes(dir, 'correctness')
    const a = fix(dir)
    judge(dir, ['answer', 'F1', a])
    expect(reasonFor(hook(dir, `${open} --fill`).out)).toContain('F2')
    judge(dir, ['answer', 'F2', a])
    expect(hook(dir, `${open} --fill`).out).toBe('')
  })
})

// S18: a human reads the open PR and finds something. The finding enters
// the verdict that covers HEAD with `by: human`, and from there it counts
// like the judge's own: it is answered with the commit that closes it, and
// while it is open the head does not pass. No second judgement (ADR-0003).
type Finding = {
  severity: string
  file: string
  line: number | null
  claim: string
  evidence: string
  by?: string
}

function findingsOf(dir: string, sha: string, role = 'correctness'): Finding[] {
  return (
    JSON.parse(
      readFileSync(join(dir, '.git/harness', `${sha}.${role}.json`), 'utf8'),
    ) as { findings?: Finding[] }
  ).findings as Finding[]
}

describe('judge.sh finding: what a human found reading the PR', () => {
  it('appends it to the verdict that covers HEAD, signed as a human', () => {
    const dir = repo(code)
    const judged = changes(dir)
    const run = judge(dir, ['finding', 'medium', 'src/a.ts:3', 'wrong order'])
    expect(run.code, run.err).toBe(0)
    expect(findingsOf(dir, judged)[3]).toEqual({
      severity: 'medium',
      file: 'src/a.ts',
      line: 3,
      claim: 'wrong order',
      evidence: 'found by a human reading the PR',
      by: 'human',
    })
    // The ids are positional: appended, the finding takes the one after the
    // last, and the ones the judge gave stay where the verdict put them.
    expect(run.out).toMatch(/^F4 medium src\/a\.ts:3 open: wrong order$/m)
    expect(run.out).toMatch(/^F1 high src\/a\.ts:1 open: wrong$/m)
    expect(judge(dir, ['findings']).out, 'the reading differs').toBe(run.out)
  })

  it('takes a file with no line, and leaves the line null', () => {
    const dir = repo(code)
    const judged = changes(dir)
    expect(
      judge(dir, ['finding', 'high', 'src/a.ts', 'the empty case is missing'])
        .code,
    ).toBe(0)
    expect(findingsOf(dir, judged)[3]?.line).toBe(null)
    expect(judge(dir, ['findings']).out).toMatch(
      /^F4 high src\/a\.ts open: the empty case is missing$/m,
    )
  })

  it('writes on the verdict of the judged head when HEAD has none of its own', () => {
    const dir = repo(code)
    const judged = changes(dir)
    fix(dir)
    expect(
      judge(dir, ['finding', 'medium', 'src/fix.ts', 'the fix is crooked'])
        .code,
    ).toBe(0)
    expect(findingsOf(dir, judged)).toHaveLength(4)
    expect(judge(dir, ['path']).out.trim()).toMatch(
      new RegExp(`/${judged}\\.correctness\\.json$`),
    )
  })

  it('exits 1 when the role has no verdict on this branch, and names /judge', () => {
    const dir = repo(code)
    const run = judge(dir, ['finding', 'medium', 'src/a.ts', 'niente verdetto'])
    expect(run.code).toBe(1)
    expect(run.err).toContain('no correctness verdict')
    expect(run.err).toContain('/judge')
  })

  // The severity is the human's to choose, out of the three the schema has,
  // and the role names a file in the store: neither may be anything else.
  it.each(['critical', 'High', 'nit', ''])(
    'exits 2 on the severity %s',
    (severity) => {
      const dir = repo(code)
      const judged = changes(dir)
      const run = judge(dir, ['finding', severity, 'src/a.ts', 'boh'])
      expect(run.code).toBe(2)
      expect(findingsOf(dir, judged), 'it was written anyway').toHaveLength(3)
    },
  )

  it('exits 2 on an argument that is not a role, before it becomes a path', () => {
    const dir = repo(code)
    changes(dir)
    const run = judge(dir, [
      'finding',
      'medium',
      'src/a.ts',
      'boh',
      '../../evil',
    ])
    expect(run.code).toBe(2)
    expect(run.err).toContain('is not a role')
    expect(run.out).not.toContain('/.git/harness/')
  })

  // F1 of PR #35: the two halves of an argument that does not produce a
  // number. `007` is not JSON jq takes, and it used to stop inside jq with
  // jq's own words instead of here; `abc` ended up inside the file name,
  // which is worse, because the finding got stored with a file that does not
  // exist. The verdict belongs to the clone and nobody rebuilds it without
  // running /judge again: what is there stays intact, byte for byte.
  it.each(['src/a.ts:007', 'src/a.ts:abc', 'src/a.ts:', 'src/a.ts:0', ':12'])(
    'exits 2 on %s and leaves the stored verdict as it was',
    (where) => {
      const dir = repo(code)
      const judged = changes(dir)
      const file = join(dir, '.git/harness', `${judged}.correctness.json`)
      const before = readFileSync(file, 'utf8')
      const run = judge(dir, ['finding', 'medium', where, 'boh'])
      expect(run.code).toBe(2)
      expect(run.err).toContain(where)
      expect(readFileSync(file, 'utf8'), 'the verdict was written').toBe(before)
    },
  )

  // Criterion 3: answered is closed, and the head that answers enters `have`
  // as for a finding of the judge. The command adds a finding, not a merge:
  // while it is open the head does not pass.
  it('is answered and read by have like a finding of the judge', () => {
    const dir = repo(code)
    store(dir, 'correctness', 'main')
    expect(judge(dir, ['have', 'correctness', 'main']).code).toBe(0)
    expect(
      judge(dir, ['finding', 'high', 'src/a.ts:2', 'it breaks the empty case'])
        .code,
    ).toBe(0)

    const a = fix(dir)
    expect(
      judge(dir, ['have', 'correctness', 'main']).code,
      'an open human finding let the head through',
    ).toBe(4)
    const answer = judge(dir, ['answer', 'F1', a])
    expect(answer.code, answer.err).toBe(0)
    expect(answer.out).toMatch(
      new RegExp(
        `^F1 high src/a\\.ts:2 answered by ${a.slice(0, 7)}: it breaks the empty case$`,
        'm',
      ),
    )
    expect(judge(dir, ['have', 'correctness', 'main']).code).toBe(0)
  })

  it('refuses to answer a low a human added, as it does one of the judge', () => {
    const dir = repo(code)
    store(dir, 'correctness', 'main')
    expect(judge(dir, ['finding', 'low', 'src/a.ts', 'a human nit']).code).toBe(
      0,
    )
    const run = judge(dir, ['answer', 'F1', fix(dir)])
    expect(run.code).not.toBe(0)
    expect(run.err).toContain('F1 is a low')
  })

  // `by` is a field of the chain, like `answers`: a judge that signs its own
  // finding as a human would make the policy hold the merge for something
  // nobody found, and the review log would credit the wrong reader.
  it('check takes off the by a verdict arrives with', () => {
    const dir = repo(code)
    write(dir, {
      'v.json': mutate(
        '.findings = [{severity: "high", file: "src/a.ts", line: 1, claim: "c", evidence: "e", by: "human"}]',
      ),
    })
    const run = judge(dir, ['check', 'v.json', 'correctness', 'main'])
    expect(run.code, run.err).toBe(0)
    expect(
      findingsOf(dir, git(dir, 'rev-parse', 'HEAD').trim())[0]?.by,
      'the judge signed a finding as a human',
    ).toBe(undefined)
  })
})

// S25: /next gives every slice of a wave a worktree of its own, and takes it
// away at the hand-back. The verdict must not live and die with the worktree:
// the store is the git common dir's, one per clone, so what was judged inside
// a worktree is still there for the main checkout once the worktree is gone,
// and what was judged in the main checkout is there for a worktree.
describe('judge.sh store: one per clone, in the git common dir', () => {
  it('keeps the verdict of a worktree for the main checkout once the worktree is gone', () => {
    const dir = repo()
    git(dir, 'checkout', '-q', 'main')
    const tree = join(dir, '.claude/worktrees/S03')
    git(dir, 'worktree', 'add', '-q', '-b', 'slice/S03-x', tree, 'main')
    write(tree, code)
    git(tree, 'add', '-A')
    git(tree, 'commit', '-q', '-m', 'work')
    const judged = changes(tree)
    const a = fix(tree)
    const path = judge(tree, ['path']).out.trim()
    const findings = judge(tree, ['findings']).out
    rmSync(join(tree, 'v.json'))
    git(dir, 'worktree', 'remove', tree)
    expect(existsSync(tree), 'the worktree is still there').toBe(false)

    git(dir, 'switch', '-q', 'slice/S03-x')
    expect(
      judge(dir, ['path']).out.trim(),
      'the verdict died with the worktree',
    ).toBe(path)
    expect(judge(dir, ['findings']).out).toBe(findings)
    const answer = judge(dir, ['answer', 'F1', a])
    expect(answer.code, answer.err).toBe(0)
    expect(stored(dir, judged).answers).toEqual([{ id: 'F1', sha: a }])
    const human = judge(dir, [
      'finding',
      'medium',
      'src/fix.ts',
      'the fix is crooked',
    ])
    expect(human.code, human.err).toBe(0)
    expect(findingsOf(dir, judged)).toHaveLength(4)
    const have = judge(dir, ['have', 'correctness', 'main'])
    expect(have.code).toBe(4)
    expect(have.out).toContain('F2 F4')
  })

  it('shows a worktree the verdict stored in the main checkout', () => {
    const dir = repo(code)
    store(dir, 'correctness', 'main')
    const path = judge(dir, ['path']).out.trim()
    git(dir, 'checkout', '-q', 'main')
    const tree = join(dir, '.claude/worktrees/work')
    git(dir, 'worktree', 'add', '-q', tree, 'work')
    expect(judge(tree, ['path']).out.trim()).toBe(path)
    expect(judge(tree, ['have', 'correctness', 'main']).code).toBe(0)
  })
})

// S25, the hook: /next opens the PR of a slice from the root, whose HEAD is
// the default branch, with the slice checked out in its own worktree. The
// head of the PR is the branch --head names, and HEAD only when there is no
// --head, as before.
// The commit names the branch: with the same tree, parent and message as the
// work commit of repo(), made in the same second, it would be the same sha,
// and a verdict of one would be the verdict of the other.
function sliceTree(dir: string, branch: string): string {
  const id = /^slice\/(S\d+)-/.exec(branch)?.[1] ?? branch
  const tree = join(dir, '.claude/worktrees', id)
  git(dir, 'worktree', 'add', '-q', '-b', branch, tree, 'main')
  write(tree, code)
  git(tree, 'add', '-A')
  git(tree, 'commit', '-q', '-m', `work on ${branch}`)
  return tree
}

describe('ensure-verdict.sh: the head of the PR, from --head or from HEAD', () => {
  it.each(['--head', '-H', '--head='])(
    'reads the branch %s names in its worktree, with the command from the root',
    (flag) => {
      const dir = repo(code)
      const tree = sliceTree(dir, 'slice/S03-x')
      store(tree, 'correctness')
      expect(
        reasonFor(hook(dir, `${open} --fill`).out),
        'the root has a verdict of its own',
      ).toContain('has no correctness verdict')
      const sep = flag.endsWith('=') ? '' : ' '
      expect(
        hook(dir, `${open} ${flag}${sep}slice/S03-x --fill`).out,
        'the hook judged the HEAD of the root, not the head of the PR',
      ).toBe('')
    },
  )

  it('reads HEAD when there is no --head, as before', () => {
    const dir = repo(code)
    const tree = sliceTree(dir, 'slice/S03-x')
    store(tree, 'correctness')
    expect(hook(tree, `${open} --fill`).out).toBe('')
    expect(reasonFor(hook(dir, `${open} --fill`).out)).toContain(
      `${git(dir, 'rev-parse', '--short', 'HEAD').trim()} has no correctness verdict`,
    )
  })

  it('denies a --head with no verdict, and names its head rather than HEAD', () => {
    const dir = repo(code)
    store(dir, 'correctness')
    const tree = sliceTree(dir, 'slice/S04-y')
    expect(hook(dir, `${open} --fill`).out, 'HEAD has its verdict').toBe('')
    const reason = reasonFor(hook(dir, `${open} --head slice/S04-y`).out)
    expect(reason).toContain(
      `${git(tree, 'rev-parse', '--short', 'HEAD').trim()} has no correctness verdict`,
    )
    expect(reason).toContain('/judge')
  })

  // The scripts the hook asks read HEAD, so the head of the PR has to be
  // checked out somewhere. A branch checked out nowhere leaves no tier to
  // compute, and a tier that cannot be computed is a deny, never a pass.
  it('denies a --head checked out in no worktree, and names it', () => {
    const dir = repo(code)
    store(dir, 'correctness')
    git(dir, 'branch', 'slice/S05-z', 'work')
    const reason = reasonFor(hook(dir, `${open} --head slice/S05-z`).out)
    expect(reason).toContain('slice/S05-z')
    expect(reason).toContain('worktree')
  })

  // F1 of the judgement of S25: the line section 5 of skills/next/SKILL.md
  // prescribes, word for word, with the session in the root on the default
  // branch. The command sits after `(cd <worktree> &&`, which is command
  // position for the hook, and the body arrives through a quoted heredoc.
  // The deny comes first: a pass alone would say nothing, because a hook that
  // never saw the command passes too.
  it('reads the PR command of /next, wrapped in the cd to the worktree', () => {
    const dir = repo()
    git(dir, 'checkout', '-q', 'main')
    const tree = sliceTree(dir, 'slice/S03-x')
    const line = `(cd .claude/worktrees/S03 && ${open} --base main --head slice/S03-x --title "feat(x): a slice" --body-file -)`
    const heredoc = `(cd .claude/worktrees/S03 && ${open} --base main --head slice/S03-x --title "feat(x): a slice" --body-file - <<'BODY'\n## Slice\n\ndocs/backlog/S03-x.md\nBODY\n)`
    for (const command of [line, heredoc]) {
      expect(
        reasonFor(hook(dir, command).out),
        'the hook did not see the command of section 5',
      ).toContain(
        `${git(tree, 'rev-parse', '--short', 'HEAD').trim()} has no correctness verdict`,
      )
    }
    store(tree, 'correctness')
    for (const command of [line, heredoc]) {
      expect(hook(dir, command).out).toBe('')
    }
  })
})

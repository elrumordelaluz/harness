// Behaviour of scripts/tier.sh, the script the CI calls to decide how much
// scrutiny a diff needs. Each case is a throwaway git repo with a base commit
// and a work commit, so the test covers the shell on a real range, not a port
// of its rules. The base commit carries the repo's own AGENTS.md: the policy
// block the script reads is the real one and cannot drift from the test.
import { execFileSync, spawnSync } from 'node:child_process'
import {
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
const script = join(root, 'scripts/tier.sh')
const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8')

// null deletes the file: a case can move one out of its path.
type Files = Record<string, string | null>

// One of the four unreadable blocks by name, so a case that wants a precise
// fault does not pick it out of the list by position.
function brokenPolicy(name: string): string {
  const found = brokenPolicies(agents).find((broken) => broken.name === name)
  if (found === undefined) throw new Error(`no broken policy called ${name}`)
  return found.agents
}

function body(n: number): string {
  return `${Array.from({ length: n }, (_, i) => `line ${i + 1}`).join('\n')}\n`
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

function git(dir: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' })
}

function tier(
  work: Files,
  env: Record<string, string> = {},
  fixture: { agents?: boolean; base?: Files } = {},
): { tier: number; why: string } {
  const dir = mkdtempSync(join(tmpdir(), 'tier-'))
  git(dir, 'init', '-b', 'main', '-q')
  git(dir, 'config', 'user.email', 'tier@test')
  git(dir, 'config', 'user.name', 'tier')
  if (fixture.agents ?? true) {
    copyFileSync(join(root, 'AGENTS.md'), join(dir, 'AGENTS.md'))
  } else {
    writeFileSync(join(dir, 'README.md'), 'no AGENTS.md here\n')
  }
  write(dir, fixture.base ?? {})
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'base')
  const base = git(dir, 'rev-parse', 'HEAD').trim()

  write(dir, work)
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'work')

  const run = spawnSync(script, [base], {
    cwd: dir,
    encoding: 'utf8',
    // The CI of this repo sets these on every job: a test must not read them.
    env: {
      ...process.env,
      PR_BODY: '',
      PR_LABELS: '',
      GITHUB_HEAD_REF: '',
      ...env,
    },
  })
  expect(run.status, run.stderr).toBe(0)
  return { tier: Number(run.stdout.trim()), why: run.stderr }
}

describe('tier.sh, how much scrutiny', () => {
  it('gives 0 to the prose nobody executes, whatever its size', () => {
    expect(tier({ 'docs/specs/SPEC-x.md': body(100) }).tier).toBe(0)
    expect(tier({ 'docs/backlog/S99-x.md': body(200) }).tier).toBe(0)
    expect(tier({ 'docs/intent/x.md': body(300) }).tier).toBe(0)
    expect(tier({ 'docs/decisions/ADR-1.md': body(40) }).tier).toBe(0)
    expect(tier({ 'docs/review-log/verdicts.jsonl': body(40) }).tier).toBe(0)
  })

  it('says on stderr which path took it to 0', () => {
    expect(tier({ 'docs/specs/SPEC-x.md': body(100) }).why).toMatch(
      /tier: prose nobody executes \(docs\/specs\/\*\*\), 100 lines/,
    )
  })

  it('keeps the prose an agent executes, and the contracts, above 0', () => {
    expect(tier({ 'skills/spec/SKILL.md': body(1) }).tier).toBe(1)
    expect(tier({ 'docs/spec.md': body(1) }).tier).toBe(1)
    expect(tier({ 'docs/codebase-map.md': body(1) }).tier).toBe(1)
    expect(tier({ 'CLAUDE.md': body(1) }).tier).toBe(1)
    expect(tier({ 'AGENTS.md': `${agents}one more line\n` }).tier).toBe(2)
  })

  // The first harness brought up to date on Tipoff: the list of the contracts
  // sat in the script and named two files that exist only here, while
  // CLAUDE.md, which every session loads, went to tier 0 with two lines. The
  // list is now the never_tier_0 key of the block read at the base ref, and
  // the script keeps a floor of its own for the repo that leaves that key
  // empty.
  it('reads the contracts from never_tier_0, over a floor of its own', () => {
    const bare = withPolicy(agents, (block) => {
      block.never_tier_0 = []
    })
    const base = { 'AGENTS.md': bare }
    expect(tier({ 'CLAUDE.md': body(2) }, {}, { base }).tier).toBe(1)
    expect(tier({ 'docs/codebase-map.md': body(2) }, {}, { base }).tier).toBe(1)
    expect(tier({ 'docs/spec.md': body(2) }, {}, { base }).tier).toBe(0)
  })

  // The security judge of this PR: with CLAUDE.md closed, the same prose
  // Claude Code loads and follows stayed at tier 0 one folder further along.
  it('keeps .claude/ and nested CLAUDE.md or AGENTS.md above 0, from the floor', () => {
    const base = {
      'AGENTS.md': withPolicy(agents, (block) => {
        block.never_tier_0 = []
      }),
    }
    for (const file of [
      '.claude/commands/x.md',
      '.claude/agents/x.md',
      'packages/a/CLAUDE.md',
      'packages/a/AGENTS.md',
    ]) {
      expect(tier({ [file]: body(2) }, {}, { base }).tier, file).toBe(1)
    }
  })

  // S40. The floor is written in the script and does not come from the block,
  // because the file that holds the gates cannot declare itself sensitive. A
  // block that names none of these keeps them at 1, and a block nobody can
  // read keeps them off tier 0 too: there the tier is 3 for the block's own
  // sake, and the floor shows on stderr, which never calls the diff docs only.
  it.each([
    'CLAUDE.md',
    '.claude/commands/x.md',
    'packages/a/AGENTS.md',
    'docs/codebase-map.md',
  ])('keeps %s off tier 0 whatever the block says', (file) => {
    const named = tier(
      { [file]: body(2) },
      {},
      {
        base: {
          'AGENTS.md': withPolicy(agents, (block) => {
            block.never_tier_0 = []
          }),
        },
      },
    )
    expect(named.tier).toBe(1)
    expect(named.why).not.toMatch(/docs only|prose nobody executes/)

    const unreadable = tier(
      { [file]: body(2) },
      {},
      { base: { 'AGENTS.md': brokenPolicy('a fence jq refuses') } },
    )
    expect(unreadable.tier).toBe(3)
    expect(unreadable.why).not.toMatch(/docs only|prose nobody executes/)
  })

  it('treats package.json as a sensitive path: its scripts are the gates', () => {
    const run = tier({ 'package.json': '{ "scripts": { "test": "true" } }\n' })
    expect(run.tier).toBe(2)
    expect(run.why).toMatch(/sensitive path package\.json/)
  })

  it('still measures every other doc against the twenty lines', () => {
    expect(tier({ 'docs/handbook/x.md': body(5) }).tier).toBe(0)
    expect(tier({ 'docs/handbook/x.md': body(25) }).tier).toBe(1)
  })

  // S39. The two thresholds were written inside the script and written again
  // by hand in the prose of AGENTS.md: two copies of the same number. They
  // come from the block now, and a repo that widens its tier 1 does it by
  // changing AGENTS.md, which is sensitive and never tier 0, so with the judge
  // on it.
  it('takes the two thresholds from max_lines and max_files', () => {
    const base = {
      'AGENTS.md': withPolicy(agents, (block) => {
        block.max_lines = 50
        block.max_files = 2
      }),
    }
    expect(tier({ 'src/a.ts': body(60) }).tier).toBe(1)

    const lines = tier({ 'src/a.ts': body(60) }, {}, { base })
    expect(lines.tier).toBe(2)
    expect(lines.why).toMatch(/60 lines > 50/)

    const files = tier(
      { 'src/a.ts': body(1), 'src/b.ts': body(1), 'src/c.ts': body(1) },
      {},
      { base },
    )
    expect(files.tier).toBe(2)
    expect(files.why).toMatch(/3 files > 2/)
  })

  it('needs every file to be prose, not just one', () => {
    expect(
      tier({ 'docs/specs/SPEC-x.md': body(100), 'src/a.ts': body(3) }).tier,
    ).toBe(1)
  })

  it('ignores a crashed judge: the next ci run recomputes the tier', () => {
    expect(
      tier(
        { 'src/a.ts': body(5) },
        { PR_LABELS: 'tier:1,judge:correctness:crashed' },
      ).tier,
    ).toBe(1)
    expect(
      tier({ 'src/a.ts': body(5) }, { PR_LABELS: 'tier:1,needs-human' }).tier,
    ).toBe(3)
  })

  // ADR-0004: the fixer is gone, and so are its rounds. A repo that still
  // carries the label from before keeps the tier its paths give it.
  it('ignores fix-round:2, a label of a fixer that no longer exists', () => {
    expect(
      tier({ 'src/a.ts': body(5) }, { PR_LABELS: 'tier:1,fix-round:2' }).tier,
    ).toBe(1)
    expect(
      tier({ 'src/a.ts': body(5) }, { PR_LABELS: 'tier:1,tests-weakened' })
        .tier,
    ).toBe(3)
  })

  // The `- [x]` tier.sh looks for in the PR body is the syntax of the box and
  // not the text of the entry: the entries of the template are in English and
  // the tier does not move. The line comes from the template itself, so the
  // box under test is the one a PR really carries.
  it('reads a ticked box of the PR template, whatever the entry says', () => {
    const box = /^- \[ \] .+$/m.exec(
      readFileSync(
        join(
          root,
          'skills/harness-init/templates/github/pull_request_template.md',
        ),
        'utf8',
      ),
    )?.[0]
    expect(box, 'the PR template has no box to tick').toBeDefined()
    const ticked = (box ?? '').replace('- [ ]', '- [x]')
    const run = tier({ 'src/a.ts': body(5) }, { PR_BODY: `${ticked}\n` })
    expect(run.tier).toBe(2)
    expect(run.why).toMatch(/declared in the PR body/)
    expect(tier({ 'src/a.ts': body(5) }, { PR_BODY: `${box}\n` }).tier).toBe(1)
  })

  it('lets a label win over the tier by path', () => {
    expect(
      tier(
        { 'docs/backlog/S99-x.md': body(5) },
        { PR_LABELS: 'tier:0,needs-human' },
      ).tier,
    ).toBe(3)
  })
})

describe('tier.sh, who may merge', () => {
  it('marks the human gate by path, and only there', () => {
    expect(tier({ 'docs/specs/SPEC-x.md': body(5) }).why).toMatch(
      /^human-gate: docs\/specs\/SPEC-x\.md \(docs\/specs\/\*\*\)$/m,
    )
    expect(tier({ 'src/a.ts': body(5) }).why).not.toMatch(/human-gate/)
  })

  // S19. The gate on `docs/backlog/**` is wanted: no PR changes the criteria
  // of a slice without a human. The price is paid by the PR that goes through
  // it, which the policy does not merge even at tier 1 with zero findings, and
  // it is why the PR of a slice does not touch the backlog: a slice is taken
  // by the branch on the remote, not by a commit that moves it to in-progress.
  it('marks the human gate on a slice file, even at tier 1', () => {
    const run = tier({
      'docs/backlog/S01-x.md': '---\nid: S01\nhuman: false\n---\n',
      'src/a.ts': body(5),
    })

    expect(run.tier).toBe(1)
    expect(run.why).toMatch(
      /^human-gate: docs\/backlog\/S01-x\.md \(docs\/backlog\/\*\*\)$/m,
    )
  })

  it('reads the policy block from the base ref, not from the diff', () => {
    const rewritten = withPolicy(agents, (block) => {
      block.sensitive_paths = ['pnpm-lock.yaml']
      block.human_gate_paths = ['docs/decisions/**']
    })
    const run = tier({
      'AGENTS.md': rewritten,
      'scripts/foo.sh': body(1),
      'docs/specs/SPEC-x.md': body(1),
    })

    expect(run.tier).toBe(2)
    expect(run.why).toMatch(/sensitive path scripts\/foo\.sh/)
    expect(run.why).toMatch(/^human-gate: docs\/specs\/SPEC-x\.md/m)
  })

  // No AGENTS.md at the base ref: the repo cannot say how it is judged, and
  // since S40 the answer is 3, the tier no model judges, as for the four faces
  // of the unreadable block below.
  it('fails closed when AGENTS.md is missing at the base ref', () => {
    const run = tier({ 'docs/specs/SPEC-x.md': body(5) }, {}, { agents: false })
    expect(run.tier).toBe(3)
    expect(run.why).toMatch(/no AGENTS\.md at/)
    expect(run.why).toContain('/harness-init local')
  })

  // A repo set up before the block has the file and not the keys: the lists
  // arrive empty, and without this case a PR that touches scripts/ would work
  // itself out as tier 1. It fails closed, as when the file is missing whole.
  it('fails closed when AGENTS.md at the base ref has no policy block', () => {
    const base = {
      'AGENTS.md': agents.replace(/## Policy block[\s\S]*?(?=## Do not)/, ''),
    }
    const run = tier({ 'scripts/foo.sh': body(5) }, {}, { base })
    expect(run.tier).toBe(3)
    expect(run.why).toMatch(/no policy block/)
  })

  it('keeps the human gate once a label carries it', () => {
    const run = tier(
      { 'src/a.ts': body(3) },
      { PR_LABELS: 'tier:1,human-gate' },
    )
    expect(run.why).toMatch(/^human-gate: kept from the label$/m)
  })

  // The same species as the case above: on pull_request the file of the slice
  // is the copy of the PR, and a PR that put its own slice at human: false
  // came out of tier 3. Found on Tipoff, reproduced here.
  it('reads the slice human flag at the base ref too', () => {
    const run = tier(
      {
        'docs/backlog/S01-x.md': '---\nid: S01\nhuman: false\n---\n',
        'src/a.ts': body(3),
      },
      { GITHUB_HEAD_REF: 'slice/S01-x' },
      { base: { 'docs/backlog/S01-x.md': '---\nid: S01\nhuman: true\n---\n' } },
    )
    expect(run.tier).toBe(3)
    expect(run.why).toMatch(/slice S01 is human: true/)
  })

  // git quotes the paths with bytes beyond 0x80 while core.quotePath is on,
  // and a quoted name no longer looks like the pattern meant to catch it.
  it('reads a path with accents as the path it is', () => {
    const run = tier({ 'scripts/città.sh': body(1) })
    expect(run.tier).toBe(2)
    expect(run.why).toMatch(/sensitive path scripts\/città\.sh/)

    const slice = tier(
      {
        'docs/backlog/S05-città.md': '---\nid: S05\nhuman: false\n---\n',
        'src/a.ts': body(3),
      },
      { GITHUB_HEAD_REF: 'slice/S05-città' },
      {
        base: {
          'docs/backlog/S05-città.md': '---\nid: S05\nhuman: true\n---\n',
        },
      },
    )
    expect(slice.tier).toBe(3)
  })

  // The second judgement of this PR. git diff follows the renames, and the
  // list of the names carries the destination alone: a sensitive file moved
  // out of its path looked like nothing, and an exact rename counts zero
  // lines.
  it('sees a file moved out of a sensitive path under its old name', () => {
    const script = tier(
      { 'scripts/foo.sh': null, 'notes/foo.txt': body(5) },
      {},
      { base: { 'scripts/foo.sh': body(5) } },
    )
    expect(script.tier).toBe(2)
    expect(script.why).toMatch(/sensitive path scripts\/foo\.sh/)

    const workflow = tier(
      { '.github/workflows/x.yml': null, 'docs/x.yml': body(5) },
      {},
      { base: { '.github/workflows/x.yml': body(5) } },
    )
    expect(workflow.tier).toBe(2)
  })

  // The same judgement: core.quotePath off still leaves quoted the names with
  // a double quote, a backslash or a control character, and a quoted name
  // looks like no pattern at all. It closes, it does not open.
  it('reads a name git prints quoted anyway as sensitive', () => {
    for (const file of ['scripts/a"b.sh', 'src/a\\b.ts']) {
      const run = tier({ [file]: body(1) })
      expect(run.tier, file).toBe(2)
      expect(run.why, file).toMatch(/quoted/)
    }

    const slice = tier(
      {
        'docs/backlog/S06-a"b.md': '---\nid: S06\nhuman: false\n---\n',
        'src/a.ts': body(3),
      },
      { GITHUB_HEAD_REF: 'slice/S06-ab' },
      {
        base: {
          'docs/backlog/S06-a"b.md': '---\nid: S06\nhuman: true\n---\n',
        },
      },
    )
    expect(slice.tier).toBe(3)
  })

  it('still reads a slice that exists only on the branch', () => {
    const run = tier(
      {
        'docs/backlog/S02-y.md': '---\nid: S02\nhuman: true\n---\n',
        'src/a.ts': body(3),
      },
      { GITHUB_HEAD_REF: 'slice/S02-y' },
    )
    expect(run.tier).toBe(3)
  })

  it('reads file names whole, spaces included', () => {
    const run = tier({ 'docs/specs/SPEC a.md': body(5) })
    expect(run.tier).toBe(0)
    expect(run.why).toMatch(
      /^human-gate: docs\/specs\/SPEC a\.md \(docs\/specs\/\*\*\)$/m,
    )
  })

  // The reading of the policy block is a file of stage local. A repo whose
  // stage ci is run again before its stage local would get a tier job that
  // dies on the source line with bash's words and nothing else.
  it('names the stage to run when the reading of the policy block is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tier-alone-'))
    git(dir, 'init', '-b', 'main', '-q')
    mkdirSync(join(dir, 'scripts'))
    copyFileSync(script, join(dir, 'scripts/tier.sh'))
    const run = spawnSync(join(dir, 'scripts/tier.sh'), ['main'], {
      cwd: dir,
      encoding: 'utf8',
    })
    expect(run.status).not.toBe(0)
    expect(run.stdout).toBe('')
    expect(run.stderr).toContain('scripts/policy-lines.sh')
    expect(run.stderr).toContain('/harness-init local')
  })
})

// S40. The block was the one rule that could go missing quietly: with the
// file there and the fence gone the lists arrived empty, and a PR that
// touched scripts/ came out tier 1. Now the four faces of the same fault are
// told apart and each one stops the tier at 3, which no model judges: a repo
// that cannot say how a diff is judged does not get judged.
describe('tier.sh, a policy block it cannot read', () => {
  it.each(brokenPolicies(agents))(
    '$name: gives 3 and names the fault',
    ({ agents: broken, fault }) => {
      const run = tier(
        { 'scripts/foo.sh': body(5) },
        {},
        { base: { 'AGENTS.md': broken } },
      )
      expect(run.tier).toBe(3)
      expect(run.why).toMatch(fault)
      expect(run.why).toContain('/harness-init local')
    },
  )

  // jq missing is not the block, it is the machine, and it cannot land among
  // the four faults above: at 3 nobody judges, so `ensure-verdict.sh` would
  // let the PR of a head with no verdict be opened, and CI, where jq is there,
  // would give it its real tier and merge it. It fails closed at 2, where it
  // was before S40, and says what is missing instead of calling the json block
  // broken.
  it('fails closed at 2, not 3, when jq is not installed', () => {
    const bin = mkdtempSync(join(tmpdir(), 'tier-nojq-'))
    for (const cmd of [
      'bash',
      'sh',
      'git',
      'awk',
      'sed',
      'grep',
      'cat',
      'env',
      'dirname',
      'basename',
    ]) {
      const found = spawnSync('which', [cmd], {
        encoding: 'utf8',
      }).stdout.trim()
      if (found) symlinkSync(found, join(bin, cmd))
    }
    expect(
      spawnSync('sh', ['-c', 'command -v jq'], { env: { PATH: bin } }).status,
      'jq is still reachable, the case would prove nothing',
    ).not.toBe(0)

    const run = tier({ 'scripts/foo.sh': body(5) }, { PATH: bin })
    expect(run.tier).toBe(2)
    expect(run.why).toMatch(/jq is not installed/)
  })
})

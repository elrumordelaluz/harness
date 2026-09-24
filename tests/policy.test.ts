// Behaviour of scripts/policy.sh, the deterministic step that turns a verdict
// into one comment, the labels and, when allowed, a merge. The script talks
// to GitHub only through `gh`, so `gh` is the stub in tests/fixtures/bin: it
// records every call, keeps every comment body, and answers the reads the
// script makes (head, labels, comments). The test covers the shell on a real
// verdict file, not a port of its rules.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const script = join(root, 'scripts/policy.sh')
const bin = join(root, 'tests/fixtures/bin')
const sample = JSON.parse(
  readFileSync(join(root, 'tests/fixtures/verdict.json'), 'utf8'),
) as Record<string, unknown>
const sha = '47f76d691afaeaf5e63154b5d102b01f33d9e006'
const green = JSON.stringify({
  statusCheckRollup: [
    {
      __typename: 'CheckRun',
      name: 'ci',
      workflowName: 'ci',
      status: 'COMPLETED',
      conclusion: 'SUCCESS',
    },
  ],
})

// The verdict as the store hands it to the policy: judge.sh stamped the commit
// it judged. `head_sha: undefined` plays one that does not say.
function verdict(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ ...sample, head_sha: sha, ...overrides })
}

type Options = {
  tier?: number
  automerge?: 'on' | 'off'
  labels?: string
  head?: string
  comments?: { id: string; role?: string; body?: string; mine?: boolean }[]
  fail?: string
  ntfy?: string
  role?: string
  // Undefined is ci green on the head. The empty string is a head with no ci.
  checks?: string
  // Undefined leaves the stub on its default, a PR that lands on main in a
  // repo whose default branch is main. The empty string plays a read that came
  // back with nothing, which is not the same thing and must not merge.
  base?: string
  defaultBranch?: string
  // Variables on top of the environment of a terminal, set last.
  env?: Record<string, string>
}

function policy(
  body: string,
  opts: Options = {},
): {
  status: number | null
  stderr: string
  calls: string[]
  comments: string[]
  verdict: Record<string, unknown>
  left: string[]
} {
  const dir = mkdtempSync(join(tmpdir(), 'policy-'))
  writeFileSync(join(dir, 'verdict.json'), body)
  const log = join(dir, 'gh.log')
  const posted = join(dir, 'comments.txt')
  writeFileSync(log, '')
  writeFileSync(posted, '')
  const stubComments = {
    comments: (opts.comments ?? []).map((c) => ({
      id: c.id,
      author: { login: c.mine === false ? 'passerby' : 'harness-app' },
      authorAssociation: 'NONE',
      viewerDidAuthor: c.mine !== false,
      isMinimized: false,
      body: c.body ?? `## judge: ${c.role}\n\n<!-- verdict:${c.role} -->\n`,
    })),
  }

  const run = spawnSync(
    script,
    ['verdict.json', '7', String(opts.tier ?? 1), opts.role ?? 'correctness'],
    {
      cwd: dir,
      encoding: 'utf8',
      env: {
        PATH: `${bin}:${process.env.PATH}`,
        HOME: process.env.HOME ?? dir,
        GH_LOG: log,
        GH_COMMENTS: posted,
        STUB_HEAD: opts.head ?? sha,
        STUB_LABELS: opts.labels ?? 'tier:1',
        STUB_COMMENTS: JSON.stringify(stubComments),
        // A run from a terminal, after /judge or inside /next, the one caller
        // since ADR-0004: nothing of GitHub Actions, no HEAD_SHA, the judged
        // commit in the verdict, and ci already passed on the head, because
        // /next runs the policy once ci is done.
        STUB_CHECKS: opts.checks ?? green,
        ...(opts.base === undefined ? {} : { STUB_BASE: opts.base }),
        ...(opts.defaultBranch === undefined
          ? {}
          : { STUB_DEFAULT_BRANCH: opts.defaultBranch }),
        HARNESS_AUTOMERGE: opts.automerge ?? 'on',
        STUB_FAIL: opts.fail ?? '',
        NTFY_TOPIC: opts.ntfy ?? '',
        ...opts.env,
      },
    },
  )
  const left = readdirSync(dir).sort()
  const calls = readFileSync(log, 'utf8').split('\n').filter(Boolean)
  const comments = readFileSync(posted, 'utf8')
    .split('\n----\n')
    .map((c) => c.trim())
    .filter(Boolean)
  return {
    status: run.status,
    stderr: run.stderr,
    calls,
    comments,
    // A crashed run leaves the file as it found it, empty or not JSON: the
    // stamped verdict is only there to read when there was a verdict.
    verdict: stamped(join(dir, 'verdict.json')),
    left,
  }
}

function stamped(path: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
  } catch {
    return {}
  }
}

function finding(severity: string, claim = 'wrong') {
  return { severity, file: 'src/a.ts', line: 12, claim, evidence: 'seen' }
}

const merged = (calls: string[]) =>
  calls.some((c) => c.startsWith('pr merge 7'))
const labelled = (calls: string[], label: string) =>
  calls.includes(`pr edit 7 --add-label ${label}`)
const posted = (calls: string[]) =>
  calls.filter((c) => c.startsWith('pr comment 7')).length

describe('policy.sh, who may merge', () => {
  it('merges a tier 1 approve when automerge is on', () => {
    const run = policy(verdict())
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(true)
    expect(labelled(run.calls, 'judge:correctness:approve')).toBe(true)
  })

  it('reports instead of merging when automerge is off', () => {
    const run = policy(verdict(), { automerge: 'off' })
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(false)
    expect(run.comments[0]).toMatch(/^policy: would have merged/m)
  })

  it('never merges a PR under the human gate, approve or not', () => {
    const run = policy(verdict(), { labels: 'tier:1,human-gate' })
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(false)
    expect(labelled(run.calls, 'needs-human')).toBe(true)
    expect(run.comments[0]).not.toMatch(/would have merged/)
  })

  it('does nothing once the PR head has moved past the judged commit', () => {
    const run = policy(verdict(), { head: 'deadbeef' })
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(false)
    expect(labelled(run.calls, 'needs-human')).toBe(false)
    expect(run.comments[0]).toMatch(/^policy: .*head moved/m)
  })

  // ADR-0003, decision 2: tier 2 no longer ends in needs-human whatever the
  // judges say. It acts on both verdicts of the same head, and with one of
  // them still to come it waits and says so.
  it('at tier 2, one approve waits for the other role instead of calling a human', () => {
    const run = policy(verdict(), { tier: 2, labels: 'tier:2' })
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(false)
    expect(labelled(run.calls, 'needs-human')).toBe(false)
    expect(run.comments[0]).toMatch(
      /^policy: waiting for the security verdict of 47f76d6/m,
    )
    expect(run.stderr).toContain('waiting for the security verdict')
  })

  it('at tier 2, an escalation goes to a human without waiting', () => {
    const run = policy(verdict({ verdict: 'escalate', needs_human: true }), {
      tier: 2,
      labels: 'tier:2',
    })
    expect(merged(run.calls)).toBe(false)
    expect(labelled(run.calls, 'needs-human')).toBe(true)
    expect(run.comments[0]).toMatch(/^policy: a human decides/m)
  })

  // There is no fixer (ADR-0004): the session that wrote the
  // code fixes and answers before the PR, so a request-changes that reaches
  // the policy with a finding unanswered is a session that did not answer.
  it('sends an unanswered request-changes to a human, and never asks for a fix round', () => {
    const run = policy(
      verdict({ verdict: 'request-changes', findings: [finding('medium')] }),
    )
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(false)
    expect(labelled(run.calls, 'needs-human')).toBe(true)
    expect(run.calls.some((c) => c.includes('fix-round'))).toBe(false)
    expect(run.comments[0]).toMatch(/^policy: .*F1/m)
  })
})

// Spec 4.7: a merge counts only on the default branch, and the line holds
// for every merge path of the chain. `close.yml` and `automerge.yml` read
// the base from the event; here it has to be asked for, because the script
// also runs from a terminal where there is no event. What the policy skips
// is the merge: the verdict stays visible on the PR, because a silent PR
// looks exactly like a judgement that never ran.
describe('policy.sh, a merge counts only on the default branch', () => {
  it('does not merge a PR stacked on another slice branch', () => {
    const run = policy(verdict(), { base: 'slice/S10-spec-e-slice' })
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(false)
    expect(run.comments[0]).toMatch(/^policy: .*slice\/S10-spec-e-slice/m)
    expect(run.comments[0]).toMatch(/default branch main/)
  })

  it('merges on the default branch whatever that branch is called', () => {
    const run = policy(verdict(), { base: 'trunk', defaultBranch: 'trunk' })
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(true)
    expect(run.comments[0]).toMatch(/^policy: merged/m)
  })

  // The template also runs where the branch is called something else: `main`
  // written into the script would stop every merge of those repos, silently
  // and forever.
  it('does not take main for the default branch', () => {
    const run = policy(verdict(), { base: 'main', defaultBranch: 'trunk' })
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(false)
  })

  it.each([
    ['the base', { base: '' }],
    ['the default branch', { defaultBranch: '' }],
  ])('does not merge when %s came back empty', (_what, opts) => {
    const run = policy(verdict(), opts)
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(false)
    expect(run.comments[0]).toMatch(/^policy: .*where this PR would land/m)
  })

  // The merge does not start, but the judgement arrived and it shows. And it
  // is no escalation: `needs-human` is a state `tier.sh` reads back as tier
  // 3, and a stacked PR has nothing to put to a human who does not know it
  // already.
  it('still posts the verdict and labels the role, without calling a human', () => {
    const run = policy(verdict(), { base: 'slice/S10-spec-e-slice' })
    expect(posted(run.calls)).toBe(1)
    expect(labelled(run.calls, 'judge:correctness:approve')).toBe(true)
    expect(labelled(run.calls, 'needs-human')).toBe(false)
  })

  it('holds a local judgement back too, green ci and all', () => {
    const run = policy(verdict({ head_sha: sha }), {
      checks: green,
      base: 'slice/S10-spec-e-slice',
    })
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(false)
  })
})

// The JSON the policy closes in the <details>, read the way review-log.sh
// reads it: the lines between the ```json fence and the ``` that shuts it.
// jq -c writes one line, so nothing the model wrote can open or close it.
function verdictJson(comment: string): {
  findings?: { evidence?: string }[]
  answers?: unknown
} {
  const lines = comment.split('\n')
  const from = lines.indexOf('```json')
  const to = lines.indexOf('```', from + 1)
  expect(from, 'the comment has no json block').toBeGreaterThanOrEqual(0)
  expect(to, 'the json block never closes').toBeGreaterThan(from)
  return JSON.parse(lines.slice(from + 1, to).join('\n')) as {
    findings?: { evidence?: string }[]
    answers?: unknown
  }
}

describe('policy.sh, one comment, the human first', () => {
  it('posts one comment per judgement, the decision at the bottom of it', () => {
    const run = policy(verdict(), { tier: 2, labels: 'tier:2' })
    expect(posted(run.calls)).toBe(1)
    const lines = run.comments[0]?.split('\n') ?? []
    expect(lines.at(-1)).toMatch(/^policy: waiting for the security verdict/)
  })

  it('opens with role, tier, verdict, sha and confidence, then one sentence', () => {
    const [comment = ''] = policy(verdict()).comments
    const lines = comment.split('\n')
    expect(lines[0]).toBe(
      '## judge: correctness (local) · tier 1 · **approve** · `47f76d6` · confidence 0.9',
    )
    expect(lines[2]).toBe(sample.reason)
  })

  it('puts the question for the human right under the sentence', () => {
    const [comment = ''] = policy(
      verdict({ needs_human: true, human_reason: 'Decidi: A o B.' }),
    ).comments
    expect(comment.indexOf('**For you:** Decidi: A o B.')).toBeGreaterThan(0)
    expect(comment.indexOf('**For you:**')).toBeLessThan(
      comment.indexOf('<details>'),
    )
  })

  it('shows the criteria table only when there is a slice', () => {
    const criteria = [{ id: 'AC1', covered_by: 'tests/x.test.ts', ok: true }]
    expect(policy(verdict({ criteria })).comments[0]).not.toMatch(
      /\| criterion \|/,
    )
    const [withSlice = ''] = policy(
      verdict({ slice: 'S03', criteria }),
    ).comments
    expect(withSlice).toMatch(/\| criterion \| test \| ok \|/)
    expect(withSlice).toMatch(/\| AC1 \| tests\/x\.test\.ts \| yes \|/)
  })

  it('keeps the order: sentence, criteria, findings, json in details', () => {
    const [comment = ''] = policy(
      verdict({
        slice: 'S03',
        criteria: [{ id: 'AC1', covered_by: 'tests/x.test.ts', ok: true }],
        findings: [
          {
            severity: 'high',
            file: 'src/a.ts',
            line: 12,
            claim: 'wrong',
            evidence: 'seen',
          },
        ],
      }),
    ).comments
    const at = (s: string) => {
      const i = comment.indexOf(s)
      expect(i, `missing: ${s}`).toBeGreaterThanOrEqual(0)
      return i
    }
    const order = [
      at(sample.reason as string),
      at('| criterion |'),
      at('- **high** F1 `src/a.ts:12` wrong'),
      at('<!-- verdict:correctness -->'),
      at('<details>'),
      at('```json'),
      at('</details>'),
    ]
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  // S31: the evidence is the code the judge saw, and GitHub renders it as
  // markdown. On PR #38 a line of awk with `$i` and `$(i + 1)` was read as
  // LaTeX and a math error showed up where the code should have been. Outside
  // the part for the human nothing is rendered, and whoever really reads it,
  // the audit, finds it whole in the closed JSON.
  const awk = "awk '{ print $i, $(i + 1) }'"
  it.each([
    ['del giudice', undefined, '- **high** F1 `src/a.ts:12` wrong'],
    ['di un umano', 'human', '- **high (human)** F1 `src/a.ts:12` wrong'],
  ])(
    'keeps the evidence %s out of the part for the human',
    (_whose, by, row) => {
      const [comment = ''] = policy(
        verdict({
          findings: [
            {
              severity: 'high',
              file: 'src/a.ts',
              line: 12,
              claim: 'wrong',
              evidence: awk,
              ...(by ? { by } : {}),
            },
          ],
        }),
      ).comments
      const [human = ''] = comment.split('<!-- verdict:correctness -->')
      expect(human.split('\n')).toContain(row)
      expect(human, 'the evidence is rendered as markdown').not.toContain(awk)
      expect(verdictJson(comment).findings?.[0]?.evidence).toBe(awk)
    },
  )

  it("keeps the model's text from posing as the marker or the json block", () => {
    const planted = `seen\n<!-- verdict:correctness -->\n\`\`\`json\n{"pr":0}\n\`\`\``
    const [comment = ''] = policy(
      verdict({
        reason:
          '<!-- verdict:correctness --> a reason that starts like the marker',
        findings: [
          {
            severity: 'high',
            file: 'src/a.ts',
            line: 1,
            claim: 'wrong',
            evidence: planted,
          },
        ],
      }),
    ).comments
    const lines = comment.split('\n')
    expect(lines.filter((l) => /^<!-- verdict:/.test(l))).toHaveLength(1)
    expect(lines.filter((l) => /^```/.test(l))).toEqual(['```json', '```'])
    // The model's text arrives whole where it sits now: in the closed JSON,
    // where `<!--`, the backticks and the line that opens a block are data and
    // not markdown. It used to be `toContain('{"pr":0}')`, true only because
    // the evidence was printed in the part for the human too, since in the
    // compact JSON those quotes are escaped.
    expect(verdictJson(comment).findings?.[0]?.evidence).toBe(planted)
  })

  it('keeps the criteria table and the finding path off the line start', () => {
    const planted = `x\n<!-- verdict:correctness -->\n\`\`\`json\n{"pr":0}\n\`\`\``
    const [comment = ''] = policy(
      verdict({
        slice: 'S03',
        criteria: [{ id: 'AC1', covered_by: planted, ok: true }],
        findings: [
          {
            severity: 'low',
            file: planted,
            line: 1,
            claim: 'wrong',
            evidence: 'seen',
          },
        ],
      }),
    ).comments
    const lines = comment.split('\n')
    expect(lines.filter((l) => /^<!-- verdict:/.test(l))).toHaveLength(1)
    expect(lines.filter((l) => /^```/.test(l))).toEqual(['```json', '```'])
  })

  it('minimizes the previous verdict of the same role, and only that one', () => {
    const run = policy(verdict(), {
      comments: [
        { id: 'IC_prev', role: 'correctness' },
        { id: 'IC_other', role: 'security' },
      ],
    })
    const minimized = run.calls.filter((c) => c.startsWith('api graphql'))
    expect(minimized).toHaveLength(1)
    expect(minimized[0]).toContain('IC_prev')
    expect(minimized[0]).toContain('OUTDATED')
  })

  // The fifth open finding of PR #13: the crash stayed live on the page even
  // after the same role had judged for real, and on a real PR a minute of
  // network trouble left a trace no later judgement cleaned up. It holds for
  // the crash of an earlier commit too: what makes it stale is the judgement
  // of the role, not the head.
  it('minimizes the crash of the same role, on this commit and on an older one', () => {
    const run = policy(verdict(), {
      comments: [
        {
          id: 'IC_crash',
          body: `judge (correctness) crashed on \`47f76d6\`\n<!-- crash:correctness:${sha} -->`,
        },
        {
          id: 'IC_crash_old',
          body: 'judge (correctness) crashed\n<!-- crash:correctness:0000000 -->',
        },
        {
          id: 'IC_crash_security',
          body: `judge (security) crashed\n<!-- crash:security:${sha} -->`,
        },
      ],
    })
    const minimized = run.calls.filter((c) => c.startsWith('api graphql'))
    expect(minimized).toHaveLength(2)
    expect(minimized.join('\n')).toContain('IC_crash')
    expect(minimized.join('\n')).toContain('IC_crash_old')
    expect(
      minimized.join('\n'),
      'it minimized the crash of the other judge',
    ).not.toContain('IC_crash_security')
  })

  it('leaves a marker comment written by someone else alone', () => {
    const run = policy(verdict(), {
      comments: [
        { id: 'IC_prev', role: 'correctness' },
        { id: 'IC_stranger', role: 'correctness', mine: false },
      ],
    })
    const minimized = run.calls.filter((c) => c.startsWith('api graphql'))
    expect(minimized).toHaveLength(1)
    expect(minimized[0]).toContain('IC_prev')
  })
})

describe('policy.sh, the fields the chain fills', () => {
  // The role is a label, a marker and, since markers are matched as a line, a
  // piece of two regexes: a word with a metacharacter inside would widen a
  // selector, or would not compile, and a read that fails there ends where a
  // crashed judge ends.
  it('takes one of the two roles and nothing else', () => {
    const run = policy(verdict(), { role: 'corr.*' })
    expect(run.status).toBe(2)
    expect(run.stderr).toContain('is not a role')
    expect(run.calls, 'it talked to GitHub anyway').toHaveLength(0)
  })

  // `base_sha` is the field the hook decides on. The verdict comes out of the
  // store, where judge.sh has already taken off the fields of the chain and
  // put in the base it read: that one stays.
  it('keeps the base the store had', () => {
    const planted = '0'.repeat(40)
    const run = policy(verdict({ base_sha: planted }))
    expect(run.status, run.stderr).toBe(0)
    expect(run.verdict.base_sha, 'the base of the store was dropped').toBe(
      planted,
    )
  })

  // The marker says where the JSON is, and a line quoting it inside a finding
  // is not that comment: the live verdict of one role cannot disappear
  // because the other role quoted its marker. It holds mid line and at the
  // start of a line: a finding that opens the line with the marker and then
  // comments on it is the shape a judge really writes.
  it('minimizes a marker line, not a comment that quotes one', () => {
    const run = policy(verdict(), {
      comments: [
        {
          id: 'IC_quote',
          body: `## judge: security\n\n- **low** \`policy.sh\` the marker <!-- crash:correctness:${sha} --> quoted mid line, and at the start of a line:\n\n<!-- crash:correctness:${sha} --> ← quoted, not written\n\n<!-- verdict:security -->\n`,
        },
        {
          id: 'IC_crash',
          body: `judge (correctness) crashed\n<!-- crash:correctness:${sha} -->`,
        },
      ],
    })
    const minimized = run.calls.filter((c) => c.startsWith('api graphql'))
    expect(minimized).toHaveLength(1)
    expect(minimized[0]).toContain('IC_crash')
  })
})

describe('policy.sh, a policy that crashed', () => {
  it('says so on the PR when a read fails, instead of dying under set -e', () => {
    const run = policy(verdict(), {
      tier: 2,
      labels: 'tier:2',
      fail: '--json headRefOid',
    })
    expect(run.status, run.stderr).toBe(0)
    expect(labelled(run.calls, 'judge:correctness:crashed')).toBe(true)
    expect(labelled(run.calls, 'needs-human')).toBe(false)
    expect(run.comments.join('\n')).toMatch(/crashed/)
  })
})

const notified = (calls: string[]) => calls.filter((c) => c.startsWith('curl '))

describe('policy.sh, a judge that crashed', () => {
  // Without a verdict the commit comes only from HEAD_SHA, still read from the
  // environment: the crash marker names it, and the cases that match a marker
  // need one to match.
  const judged = { HEAD_SHA: sha }

  it('labels judge:<role>:crashed, not needs-human', () => {
    const run = policy('', { env: judged })
    expect(run.status, run.stderr).toBe(0)
    expect(labelled(run.calls, 'judge:correctness:crashed')).toBe(true)
    expect(labelled(run.calls, 'needs-human')).toBe(false)
    expect(run.comments[0]).toMatch(/no verdict/)
    expect(run.comments[0]).toContain(`<!-- crash:correctness:${sha} -->`)
  })

  it('updates its crash comment instead of posting a second one on the same head', () => {
    const run = policy('', {
      env: judged,
      comments: [
        {
          id: 'IC_crash',
          body: `judge (correctness): crashed once\n<!-- crash:correctness:${sha} -->`,
        },
      ],
    })
    expect(posted(run.calls)).toBe(0)
    const edits = run.calls.filter(
      (c) => c.startsWith('api graphql') && c.includes('updateIssueComment'),
    )
    expect(edits).toHaveLength(1)
    expect(edits[0]).toContain('IC_crash')
  })

  // Same rule as the other selector: a marker line, not a body that quotes
  // one, neither mid line nor at the start of a line. Here the comment would
  // not be minimized but rewritten, which is worse.
  it('does not write its crash into a comment that only quotes the marker', () => {
    const run = policy('', {
      env: judged,
      comments: [
        {
          id: 'IC_quote',
          body: `a finding quoting <!-- crash:correctness:${sha} --> mid line,\n<!-- crash:correctness:${sha} --> ← and at the start of a line`,
        },
      ],
    })
    expect(
      run.calls.filter((c) => c.includes('updateIssueComment')),
    ).toHaveLength(0)
    expect(posted(run.calls)).toBe(1)
  })

  it('says HEAD_SHA is missing instead of dying on the substring', () => {
    const run = policy(verdict({ head_sha: undefined }))
    expect(run.status, run.stderr).toBe(0)
    expect(labelled(run.calls, 'judge:correctness:crashed')).toBe(true)
    expect(run.comments.join('\n')).toMatch(/HEAD_SHA/)
    expect(run.comments.join('\n')).toContain('an unknown commit')
  })

  it('does not write its crash into a comment someone else planted', () => {
    const run = policy('', {
      env: judged,
      comments: [
        {
          id: 'IC_fake',
          body: `<!-- crash:correctness:${sha} -->`,
          mine: false,
        },
      ],
    })
    expect(run.calls.filter((c) => c.startsWith('api graphql'))).toHaveLength(0)
    expect(posted(run.calls)).toBe(1)
  })

  it('still reports the crash when the repo has no label for it', () => {
    const run = policy('', { fail: '--add-label' })
    expect(run.status, run.stderr).toBe(0)
    expect(run.comments.join('\n')).toMatch(/no verdict/)
    expect(run.stderr).toMatch(/harness-init ci/)
  })

  it('notifies the crash', () => {
    const run = policy('', { ntfy: 'topic' })
    expect(notified(run.calls)).toHaveLength(1)
    expect(notified(run.calls)[0]).toContain('crashed')
    expect(notified(run.calls)[0]).toContain('ntfy.sh/topic')
  })
})

describe('policy.sh, an escalation always tells the human', () => {
  const escalation = verdict({
    verdict: 'escalate',
    needs_human: true,
    reason: 'A decision the diff cannot take.',
    human_reason: 'Decidi: A o B.',
  })

  it('sends a reason that starts with @ as text, not as a file name', () => {
    const run = policy(
      verdict({
        verdict: 'escalate',
        needs_human: true,
        reason: '@types/node is in without a declaration.',
      }),
      { labels: 'tier:1,needs-human', ntfy: 'topic' },
    )
    const [call = ''] = notified(run.calls)
    expect(call).toContain('--data-raw')
    expect(call).toContain('@types/node')
  })

  it('never takes needs-human off, not even to put it back', () => {
    const run = policy(escalation, {
      labels: 'tier:1,needs-human',
      ntfy: 'topic',
    })
    expect(
      run.calls.some((c) => c.includes('--remove-label needs-human')),
    ).toBe(false)
    expect(labelled(run.calls, 'needs-human')).toBe(true)
  })

  it('notifies from the verdict, even when the label was already there', () => {
    const run = policy(escalation, {
      labels: 'tier:1,needs-human',
      ntfy: 'topic',
    })
    const [call = ''] = notified(run.calls)
    expect(notified(run.calls)).toHaveLength(1)
    expect(call).toContain('Decidi: A o B.')
    expect(call).toContain('A decision the diff cannot take.')
    expect(call).not.toContain('no verdict yet')
    expect(call).toContain('ntfy.sh/topic')
  })

  it('stays quiet without a topic, and on an approve', () => {
    expect(notified(policy(escalation).calls)).toHaveLength(0)
    expect(notified(policy(verdict(), { ntfy: 'topic' }).calls)).toHaveLength(0)
  })

  it('touches only the labels of its own role', () => {
    const run = policy(verdict(), { labels: 'tier:2,judge:security:changes' })
    const touched = run.calls.filter((c) => c.includes('judge:security'))
    expect(touched).toHaveLength(0)
    expect(labelled(run.calls, 'judge:correctness:approve')).toBe(true)
    expect(
      run.calls.some((c) =>
        c.includes('--remove-label judge:correctness:escalate'),
      ),
    ).toBe(true)
  })
})

// The same script, called from a terminal after /judge, which since
// ADR-0004 is the only caller. The verdict lands on the PR with the marker
// review-log.sh logs.
describe('policy.sh, the verdict that came from /judge', () => {
  it('reads the judged commit back from the verdict when the env is silent', () => {
    const run = policy(verdict({ head_sha: sha }))
    expect(run.status, run.stderr).toBe(0)
    expect(run.comments[0]).toContain('<!-- verdict:correctness -->')
    expect(run.comments[0]).toContain(`\`${sha.slice(0, 7)}\``)
    expect(posted(run.calls)).toBe(1)
  })

  // /judge runs before the PR exists, so the judge cannot know the number and
  // the schema no longer asks it to. The policy knows: it was given one.
  it('stamps the PR number the judge could not know', () => {
    const run = policy(verdict({ head_sha: sha, pr: undefined }))
    expect(run.status, run.stderr).toBe(0)
    expect(run.verdict.pr).toBe(7)
  })

  // From a terminal the working directory is the repo, and a rendered verdict
  // written there gets committed, lands in the branch's own diff and in the
  // bundle of every judgement after it. It happened once, on this branch.
  it('leaves nothing behind in the working directory', () => {
    const run = policy(verdict({ head_sha: sha }))
    expect(run.status, run.stderr).toBe(0)
    expect(run.left).toEqual(['comments.txt', 'gh.log', 'verdict.json'])
  })

  it('says which judge spoke, on the comment and in the log', () => {
    const run = policy(verdict({ head_sha: sha }))
    expect(run.comments[0]?.split('\n')[0]).toContain(
      'judge: correctness (local)',
    )
    expect((run.verdict.judge as Record<string, unknown>).where).toBe('local')
  })

  it('at tier 2 one verdict waits for the other', () => {
    const run = policy(verdict({ head_sha: sha }), {
      tier: 2,
      labels: 'tier:2',
    })
    expect(merged(run.calls)).toBe(false)
    expect(labelled(run.calls, 'needs-human')).toBe(false)
    expect(run.comments[0]).toMatch(
      /^policy: waiting for the security verdict/m,
    )
  })

  // A terminal has no green ci by construction, and a human can run this right
  // after the PR opens: before ci has passed on the head, a local judgement
  // reports and does not merge, automerge or not.
  it('never merges before ci, even with automerge on', () => {
    const run = policy(verdict({ head_sha: sha }), {
      automerge: 'on',
      checks: '',
    })
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(false)
    expect(run.comments[0]).toMatch(/a local judgement never does/)
  })

  it('does nothing when the head moved since /judge ran', () => {
    const run = policy(verdict({ head_sha: sha }), {
      head: 'deadbeef',
    })
    expect(merged(run.calls)).toBe(false)
    expect(run.comments[0]).toMatch(/PR head moved/)
  })

  // No run to link to out here, so the crash says the one thing that helps.
  it('tells you to run /judge again instead of linking a run that does not exist', () => {
    const run = policy('')
    expect(run.status, run.stderr).toBe(0)
    expect(run.comments[0]).toMatch(/Run \/judge again/)
    expect(run.comments[0]).not.toContain('actions/runs')
  })
})

// ADR-0003, decision 2. The judge runs once; a high or medium finding is
// fixed by the session and answered with the commit that closes it, and the
// stored verdict carries the answers when /judge hands it to the policy.
const fixSha = 'b'.repeat(40)
const otherFix = 'c'.repeat(40)

function answered(overrides: Record<string, unknown> = {}): string {
  return verdict({
    head_sha: sha,
    verdict: 'request-changes',
    findings: [
      finding('high'),
      finding('medium', 'shaky'),
      finding('low', 'nit'),
    ],
    answers: [
      { id: 'F1', sha: fixSha },
      { id: 'F2', sha: fixSha },
    ],
    ...overrides,
  })
}

// The comment the policy leaves for the other role, the way it writes it: the
// marker line, then the JSON in its fenced block.
function other(role: string, json: Record<string, unknown>) {
  return {
    id: `IC_${role}`,
    role,
    body: `## judge: ${role}\n\n<!-- verdict:${role} -->\n<details><summary>verdict.json</summary>\n\n\`\`\`json\n${JSON.stringify({ ...sample, ...json, judge: { role, model: 'm', ts: 't' } })}\n\`\`\`\n\n</details>\n\npolicy: waiting\n`,
  }
}

describe('policy.sh, a request-changes answered by commits', () => {
  it('at tier 1, treats it as an approve, merges once ci passed, and says answered', () => {
    const run = policy(answered(), {
      head: fixSha,
      checks: green,
    })
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(true)
    expect(labelled(run.calls, 'needs-human')).toBe(false)
    expect(labelled(run.calls, 'judge:correctness:changes')).toBe(true)
    expect(run.comments[0]).toMatch(/^policy: answered, merged/m)
    expect(run.stderr).toMatch(/^policy: answered, merged/m)
  })

  it('with automerge off, says it would have merged, answered', () => {
    const run = policy(answered(), {
      head: fixSha,
      checks: green,
      automerge: 'off',
    })
    expect(merged(run.calls)).toBe(false)
    expect(run.comments[0]).toMatch(/^policy: answered, would have merged/m)
  })

  it('under the human gate, a human merges it all the same', () => {
    const run = policy(answered(), {
      head: fixSha,
      checks: green,
      labels: 'tier:1,human-gate',
    })
    expect(merged(run.calls)).toBe(false)
    expect(labelled(run.calls, 'needs-human')).toBe(true)
  })

  it('posts the answers between the sentence and the criteria, with the commit linked', () => {
    const [comment = ''] = policy(
      answered({
        slice: 'S03',
        criteria: [{ id: 'AC1', covered_by: 'tests/x.test.ts', ok: true }],
      }),
      { head: fixSha, checks: green },
    ).comments
    const link = `[${fixSha.slice(0, 7)}](https://github.test/o/r/commit/${fixSha})`
    expect(comment).toContain('Answers:')
    expect(comment).toContain(`- F1 high: ${link}`)
    expect(comment).toContain(`- F2 medium: ${link}`)
    expect(comment, 'a low is declared, not answered').not.toMatch(/- F3 low:/)
    const at = (text: string) => comment.indexOf(text)
    expect(at(sample.reason as string)).toBeLessThan(at('Answers:'))
    expect(at('Answers:')).toBeLessThan(at('| criterion |'))
    const json = JSON.parse(
      comment.split('```json\n')[1]?.split('\n```')[0] ?? '{}',
    ) as { answers: unknown }
    expect(json.answers).toEqual([
      { id: 'F1', sha: fixSha },
      { id: 'F2', sha: fixSha },
    ])
  })

  it('sends it to a human when a medium has no answer, and names it', () => {
    const run = policy(answered({ answers: [{ id: 'F1', sha: fixSha }] }), {
      head: fixSha,
      checks: green,
    })
    expect(merged(run.calls)).toBe(false)
    expect(labelled(run.calls, 'needs-human')).toBe(true)
    expect(run.comments[0]).toMatch(/^policy: .*F2/m)
  })

  // A request-changes with no high or medium finding has nothing to answer:
  // the judge asked for a change it put in a criterion or in scope_ok. It is
  // not answered, it is open.
  it('sends a request-changes with nothing to answer to a human', () => {
    const nothing = verdict({
      head_sha: sha,
      verdict: 'request-changes',
      slice: 'S03',
      criteria: [{ id: 'AC1', covered_by: null, ok: false }],
      findings: [finding('low', 'nit')],
    })
    const run = policy(nothing, { checks: green })
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(false)
    expect(labelled(run.calls, 'needs-human')).toBe(true)
    expect(run.comments[0]).toMatch(
      /^policy: a human decides: request-changes/m,
    )
  })

  // A verdict acts on the commit it judged and on the commits that answer it.
  // Any other head is a push nobody judged.
  it('does nothing on a head that is neither the judged commit nor an answer', () => {
    const run = policy(answered(), {
      head: otherFix,
      checks: green,
    })
    expect(merged(run.calls)).toBe(false)
    expect(labelled(run.calls, 'needs-human')).toBe(false)
    expect(run.comments[0]).toMatch(/PR head moved/)
  })

  it('does not act on a head that only answers a low', () => {
    const run = policy(
      verdict({
        head_sha: sha,
        findings: [finding('low', 'nit')],
        answers: [{ id: 'F1', sha: fixSha }],
      }),
      { head: fixSha, checks: green },
    )
    expect(merged(run.calls)).toBe(false)
    expect(run.comments[0]).toMatch(/PR head moved/)
  })
})

describe('policy.sh, a local judgement merges only after ci', () => {
  it('merges an approve once ci passed on the PR head, on that head only', () => {
    const run = policy(verdict({ head_sha: sha }), {
      checks: green,
    })
    expect(run.status, run.stderr).toBe(0)
    const merge = run.calls.find((c) => c.startsWith('pr merge 7')) ?? ''
    expect(merge).toMatch(/^pr merge 7 --squash/)
    expect(merge).toContain(`--match-head-commit ${sha}`)
    expect(run.comments[0]).toMatch(/^policy: merged/m)
  })

  it('does not merge while ci is still running or red', () => {
    for (const conclusion of ['', 'FAILURE']) {
      const checks = JSON.stringify({
        statusCheckRollup: [{ name: 'ci', status: 'IN_PROGRESS', conclusion }],
      })
      const run = policy(verdict({ head_sha: sha }), { checks })
      expect(merged(run.calls), conclusion).toBe(false)
      expect(run.comments[0]).toMatch(/a local judgement never does/)
    }
  })

  // The gate is the `ci` job of the ci workflow, every run of it on the head:
  // a check or a status that only carries the name, or a green run next to a
  // red one, is not ci passing.
  it('reads ci as passed only when every ci run of the ci workflow passed', () => {
    const run = (name: string, workflowName: string, conclusion: string) => ({
      __typename: 'CheckRun',
      name,
      workflowName,
      status: 'COMPLETED',
      conclusion,
    })
    const cases: [string, unknown[]][] = [
      [
        'a red run masked by a later green one',
        [run('ci', 'ci', 'FAILURE'), run('ci', 'ci', 'SUCCESS')],
      ],
      ['a green ci from another workflow', [run('ci', 'mine', 'SUCCESS')]],
      [
        'a commit status named ci',
        [{ __typename: 'StatusContext', context: 'ci', state: 'SUCCESS' }],
      ],
      ['no ci at all', [run('checks', 'ci', 'SUCCESS')]],
    ]
    for (const [what, entries] of cases) {
      const checks = JSON.stringify({ statusCheckRollup: entries })
      const result = policy(verdict({ head_sha: sha }), { checks })
      expect(merged(result.calls), what).toBe(false)
    }
  })

  // The tier the judgement was run for comes from the session; the label is
  // what ci computed on the head. A higher one is a signal the session did
  // not see, a checked box, a weakened test, and the policy does not merge
  // past it.
  it('does not merge when ci labelled a higher tier than the one judged', () => {
    const run = policy(verdict({ head_sha: sha }), {
      checks: green,
      labels: 'tier:3,tests-weakened',
    })
    expect(merged(run.calls)).toBe(false)
    expect(labelled(run.calls, 'needs-human')).toBe(true)
    expect(run.comments[0]).toMatch(/^policy: ci says tier 3/m)
  })
})

describe('policy.sh, tier 2 acts on both verdicts of the same head', () => {
  it('merges two approves', () => {
    const run = policy(verdict(), {
      tier: 2,
      labels: 'tier:2',
      role: 'security',
      comments: [other('correctness', { head_sha: sha })],
    })
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(true)
    expect(labelled(run.calls, 'needs-human')).toBe(false)
  })

  it('sends a high the other role left open to a human, with its reason first', () => {
    const run = policy(verdict(), {
      tier: 2,
      labels: 'tier:2',
      role: 'security',
      comments: [
        other('correctness', {
          head_sha: sha,
          verdict: 'request-changes',
          findings: [finding('high')],
        }),
      ],
    })
    expect(merged(run.calls)).toBe(false)
    expect(labelled(run.calls, 'needs-human')).toBe(true)
    expect(run.comments[0]).toMatch(/^policy: .*correctness/m)
  })

  it('does not merge past the other role asking for changes it gave nothing to answer', () => {
    const run = policy(verdict(), {
      tier: 2,
      labels: 'tier:2',
      role: 'security',
      comments: [
        other('correctness', {
          head_sha: sha,
          verdict: 'request-changes',
          findings: [],
        }),
      ],
    })
    expect(merged(run.calls)).toBe(false)
    expect(labelled(run.calls, 'needs-human')).toBe(true)
  })

  it('sends its own open high to a human without waiting for the other', () => {
    const run = policy(verdict({ findings: [finding('high')] }), {
      tier: 2,
      labels: 'tier:2',
    })
    expect(merged(run.calls)).toBe(false)
    expect(labelled(run.calls, 'needs-human')).toBe(true)
  })

  it('reads a verdict of another head as no verdict, and waits', () => {
    const run = policy(verdict(), {
      tier: 2,
      labels: 'tier:2',
      role: 'security',
      comments: [other('correctness', { head_sha: otherFix })],
    })
    expect(merged(run.calls)).toBe(false)
    expect(labelled(run.calls, 'needs-human')).toBe(false)
    expect(run.comments[0]).toMatch(
      /^policy: waiting for the correctness verdict/m,
    )
  })

  // The fix that answers a finding of one role is a commit of the judgement
  // both roles ran on: the role that found nothing is carried to it by the
  // other's answers, whichever of the two the policy hears first.
  it('carries the role with nothing to answer to the fix the other one answered', () => {
    const first = policy(verdict({ head_sha: sha }), {
      tier: 2,
      labels: 'tier:2',
      role: 'security',
      head: fixSha,
      checks: green,
    })
    expect(merged(first.calls)).toBe(false)
    expect(first.comments[0]).toMatch(
      /^policy: waiting for the correctness verdict/m,
    )

    const second = policy(verdict({ head_sha: sha }), {
      tier: 2,
      labels: 'tier:2',
      role: 'security',
      head: fixSha,
      checks: green,
      comments: [
        other('correctness', {
          head_sha: sha,
          verdict: 'request-changes',
          findings: [finding('high')],
          answers: [{ id: 'F1', sha: fixSha }],
        }),
      ],
    })
    expect(second.status, second.stderr).toBe(0)
    expect(merged(second.calls)).toBe(true)
  })
})

// S18: a human reads the open PR and writes what they found into the
// verdict that is there, with `by: human` (judge.sh finding). For the merge
// it counts as a finding of the judge: answered by the current head the PR
// goes through, open it holds the PR still, and in the comment the word
// `umano` says who found it. The judge had spoken before the finding
// existed, so an open human `high` or `medium` blocks on its own, whatever
// the verdict says.
function humanFinding(severity: string, claim = 'ordine sbagliato') {
  return {
    ...finding(severity, claim),
    evidence: 'found by a human reading the PR',
    by: 'human',
  }
}

describe('policy.sh, the finding a human added reading the PR', () => {
  it('at tier 1, merges the head that answers it, and marks it umano', () => {
    const run = policy(
      verdict({
        head_sha: sha,
        findings: [humanFinding('medium')],
        answers: [{ id: 'F1', sha: fixSha }],
      }),
      { head: fixSha, checks: green },
    )
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(true)
    expect(labelled(run.calls, 'needs-human')).toBe(false)
    expect(run.comments[0]).toMatch(/\*\*medium \(human\)\*\* F1/)
  })

  it('at tier 2, the head that answers it merges like any other', () => {
    const run = policy(
      verdict({
        head_sha: sha,
        findings: [humanFinding('high')],
        answers: [{ id: 'F1', sha: fixSha }],
      }),
      {
        tier: 2,
        labels: 'tier:2',
        role: 'security',
        head: fixSha,
        checks: green,
        comments: [other('correctness', { head_sha: sha })],
      },
    )
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(true)
    expect(labelled(run.calls, 'needs-human')).toBe(false)
  })

  it('says umano only of the finding a human added', () => {
    const run = policy(
      verdict({
        head_sha: sha,
        findings: [finding('medium'), humanFinding('low', 'un nit umano')],
      }),
      { checks: green },
    )
    expect(run.comments[0]).toMatch(/\*\*medium\*\* F1/)
    expect(run.comments[0]).toMatch(/\*\*low \(human\)\*\* F2/)
  })

  // The command adds a finding, not a merge: while it is open the PR goes to
  // a human, as for a `request-changes` nobody answered.
  it('sends an open one to a human, whatever the judge said, and names it', () => {
    const run = policy(
      verdict({ head_sha: sha, findings: [humanFinding('medium')] }),
      { checks: green },
    )
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(false)
    expect(labelled(run.calls, 'needs-human')).toBe(true)
    expect(run.comments[0]).toMatch(/^policy: a human decides.*F1/m)
  })

  // A human low is a nit like the judge's: it is declared in the PR and not
  // answered, so it stops nothing.
  it('lets a low a human added through', () => {
    const run = policy(
      verdict({ head_sha: sha, findings: [humanFinding('low', 'un nit')] }),
      { checks: green },
    )
    expect(merged(run.calls)).toBe(true)
    expect(labelled(run.calls, 'needs-human')).toBe(false)
  })

  it('at tier 2, holds the merge on one the other role still has open', () => {
    const run = policy(verdict(), {
      tier: 2,
      labels: 'tier:2',
      role: 'security',
      comments: [
        other('correctness', {
          head_sha: sha,
          findings: [humanFinding('medium')],
        }),
      ],
    })
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(false)
    expect(labelled(run.calls, 'needs-human')).toBe(true)
  })
})

// S26. Since ADR-0004 `policy.sh` has one caller only, a terminal after
// /judge or inside /next, and the GitHub Actions environment says nothing
// to it any more: with those variables set it does what it does without
// them. A project running it from an action of its own would get no merge
// without CI, and no cost, link or run promised that nobody delivers.
describe('policy.sh, the GitHub Actions environment changes nothing', () => {
  const execution = join(mkdtempSync(join(tmpdir(), 'execution-')), 'log.jsonl')
  writeFileSync(
    execution,
    `${JSON.stringify({
      type: 'result',
      num_turns: 24,
      duration_ms: 183033,
      total_cost_usd: 1.10798,
      usage: { input_tokens: 30, output_tokens: 13536 },
    })}\n`,
  )
  const actions = {
    GITHUB_ACTIONS: 'true',
    GITHUB_SERVER_URL: 'https://actions.test',
    GITHUB_REPOSITORY: 'ci/r',
    GITHUB_RUN_ID: '4242',
    EXECUTION_FILE: execution,
  }

  it('does not merge a tier 1 approve before ci has passed on the head', () => {
    const run = policy(verdict({ head_sha: sha }), {
      env: actions,
      automerge: 'on',
      checks: '',
    })
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(false)
    expect(run.comments[0]).toMatch(/a local judgement never does/)
  })

  it('merges it once ci has passed on the head, as from a terminal', () => {
    const run = policy(verdict({ head_sha: sha }), {
      env: actions,
      automerge: 'on',
      checks: green,
    })
    expect(run.status, run.stderr).toBe(0)
    expect(merged(run.calls)).toBe(true)
    expect(run.comments[0]).toMatch(/^policy: merged: ci passed on 47f76d6$/m)
  })

  it('posts no cost line and no run link, and drops a cost the judge wrote', () => {
    const run = policy(verdict({ head_sha: sha, cost: { turns: 3 } }), {
      env: actions,
      checks: green,
    })
    const [comment = ''] = run.comments
    expect(comment).not.toContain('actions/runs')
    expect(comment).not.toMatch(/costo:/)
    expect(run.verdict.cost).toBe(undefined)
    const json = JSON.parse(
      comment.split('```json\n')[1]?.split('\n```')[0] ?? '{}',
    ) as { cost?: unknown; head_sha: string }
    expect(json.head_sha).toBe(sha)
    expect(json.cost).toBe(undefined)
  })

  it('says local on the comment and in the verdict', () => {
    const run = policy(verdict({ head_sha: sha }), {
      env: actions,
      checks: green,
    })
    expect(run.comments[0]?.split('\n')[0]).toBe(
      '## judge: correctness (local) · tier 1 · **approve** · `47f76d6` · confidence 0.9',
    )
    expect((run.verdict.judge as Record<string, unknown>).where).toBe('local')
  })

  it('links an answer to the repo gh names, not to the one in the environment', () => {
    const run = policy(answered(), {
      env: actions,
      head: fixSha,
      checks: green,
    })
    expect(run.comments[0]).toContain(
      `(https://github.test/o/r/commit/${fixSha})`,
    )
    expect(run.comments[0]).not.toContain('actions.test')
  })

  it('promises no ci run that judges again when the head moved', () => {
    const run = policy(verdict({ head_sha: sha }), {
      env: actions,
      head: 'deadbeef',
    })
    expect(merged(run.calls)).toBe(false)
    expect(run.comments[0]).toMatch(/^policy: PR head moved/m)
    expect(run.comments[0]).not.toMatch(/ci run/)
  })

  it('tells a crash to run /judge again on that commit, with no run to link', () => {
    const run = policy('', {
      env: { ...actions, HEAD_SHA: sha },
      ntfy: 'topic',
    })
    expect(run.status, run.stderr).toBe(0)
    expect(run.comments[0]).toContain(
      'Run /judge again on this commit: nothing was stored for it.',
    )
    expect(run.comments[0]).not.toContain('actions/runs')
    expect(run.comments[0]).not.toMatch(/ci run/)
    const [call = ''] = notified(run.calls)
    expect(call).toContain('Run /judge again')
    expect(call).not.toContain('runs/4242')
    expect(call).toContain('Click: https://github.test/o/r/pull/7')
  })

  // The behaviour above says what the script does with those variables; this
  // one says it never reads them, and that no text of its own promises a CI
  // run that judges again, not even in a comment.
  it('reads none of those variables and promises no ci run that judges', () => {
    const source = readFileSync(script, 'utf8')
    for (const name of Object.keys(actions)) {
      expect(source, `policy.sh reads ${name}`).not.toContain(name)
    }
    expect(source).not.toMatch(/ci run (judges|brings)|rerun of ci/i)
  })
})

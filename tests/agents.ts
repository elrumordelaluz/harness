// The policy block of AGENTS.md, for the fixtures that need a repo whose
// policy is not this repo's. The fence is the one scripts/policy-lines.sh
// extracts and gives to jq: a test that rewrote the prose around it would
// change nothing, and one that wrote its own AGENTS.md from scratch would
// stop proving that the real file is the one the scripts read.
const fence = /(## Policy block[\s\S]*?```json\n)([\s\S]*?)(\n```)/

export type PolicyBlock = {
  version: number
  docs_mode: string
  sensitive_paths: string[]
  never_tier_0: string[]
  human_gate_paths: string[]
  docs_extra_paths: string[]
  max_lines: number
  max_files: number
}

// The block as it is. It throws instead of failing an expectation: the
// callers read it while the cases are collected, where there is nobody to
// report to, and a block that is not there is not a case that fails, it is a
// fixture that does not exist.
export function policyBlock(text: string): PolicyBlock {
  const match = text.match(fence)
  if (match === null)
    throw new Error('the AGENTS.md under test has no policy block')
  return JSON.parse(match[2] ?? '') as PolicyBlock
}

// The four ways the block can be unreadable, from S40: no fence at all, a
// fence jq refuses, one of the eight keys missing, a version this harness has
// never read. They are one fault with four faces, every reader of the block
// has to stop on all four, and the list lives here so tier.sh, the git hooks
// and intent.sh are held to the same fixtures.
export type BrokenPolicy = { name: string; agents: string; fault: RegExp }

export function brokenPolicies(text: string): BrokenPolicy[] {
  const match = text.match(fence)
  if (match === null)
    throw new Error('the AGENTS.md under test has no policy block')
  const [whole, head = '', body = '', tail = ''] = match
  // A comma after the last key: what a hand that edits the block leaves. It
  // throws when the block does not end the way it thinks, or the fixture
  // would hand the scripts a block that parses and prove nothing.
  const trailingComma = body.replace(/\n}$/, ',\n}')
  if (trailingComma === body)
    throw new Error(
      'the policy block does not end with a brace on its own line',
    )
  return [
    {
      name: 'no policy block',
      agents: text.replace(whole, ''),
      fault: /no policy block/,
    },
    {
      name: 'a fence jq refuses',
      agents: text.replace(whole, () => `${head}${trailingComma}${tail}`),
      fault: /not valid json/,
    },
    {
      name: 'a key missing',
      agents: withPolicy(text, (block) => {
        delete block.max_lines
      }),
      fault: /has no max_lines/,
    },
    {
      name: 'a version it does not know',
      agents: withPolicy(text, (block) => {
        block.version = 2
      }),
      fault: /version 2/,
    },
  ]
}

// The same AGENTS.md with some of its keys changed, or taken out: what a repo
// with its own policy, or with a block written by hand, hands the scripts.
export function withPolicy(
  text: string,
  change: (block: Record<string, unknown>) => void,
): string {
  const match = text.match(fence)
  if (match === null)
    throw new Error('the AGENTS.md under test has no policy block')
  const block = JSON.parse(match[2] ?? '') as Record<string, unknown>
  change(block)
  const [whole, head = '', , tail = ''] = match
  return text.replace(
    whole,
    () => `${head}${JSON.stringify(block, null, 2)}${tail}`,
  )
}

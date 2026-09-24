// Structural test: one "Do not" line of AGENTS.md, enforced mechanically.
// Template: set DOMAIN_DIR and FORBIDDEN to the repo's own rule. A red run
// on existing code is a finding for the hand-back, not something to fix here.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const DOMAIN_DIR = '{{src/lib/engine}}'
const FORBIDDEN: Array<[RegExp, string]> = [
  [/from ['"]react(\/|['"])/, 'React'],
  [/from ['"](\.\.\/)+state\//, '{{src/state}}'],
]

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory())
      return name === '__tests__' ? [] : walk(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

describe('architecture', () => {
  it(`${DOMAIN_DIR} stays pure`, () => {
    for (const file of walk(DOMAIN_DIR)) {
      const source = readFileSync(file, 'utf8')
      for (const [pattern, what] of FORBIDDEN) {
        expect(source, `${file} imports ${what}`).not.toMatch(pattern)
      }
    }
  })
})

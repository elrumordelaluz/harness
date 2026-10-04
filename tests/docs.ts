// The one README of .harness/docs/ has a `## <folder>/` section per folder,
// and what the README of a folder said is read from there. A heading of a
// slice or of an intent sits inside an indented block, so only a `## ` at the
// start of a line opens or closes a section.
export const folders = [
  'intent',
  'specs',
  'backlog',
  'decisions',
  'review-log',
] as const

export function folderSection(readme: string, folder: string): string {
  const lines = readme.split('\n')
  const start = lines.indexOf(`## ${folder}/`)
  if (start === -1) return ''
  const end = lines.findIndex(
    (line, index) => index > start && line.startsWith('## '),
  )
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n')
}

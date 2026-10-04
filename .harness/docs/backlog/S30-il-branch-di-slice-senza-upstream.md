---
id: S30
title: Il branch di una slice nasce senza upstream e il primo push nomina il suo ref
status: done
blocked_by: none
tier: 1
human: false
spec: inbox (2026-09-16)
---

## Goal

`/next` crea il worktree di ogni slice con `git worktree add -b` partendo da
`origin/<default branch>`. Quando il punto di partenza è un remote-tracking
branch, git gli mette quel branch come upstream: nel worktree `git status` dice
"ahead of main", un `git pull` nudo mergia il ramo di default, e un `git push`
nudo non va sul branch della slice. Il subagent poi riceve "Push the empty
branch at once" senza il comando, e il push che fa da presa in carico dipende
da quello che git sceglie.

Dopo questa slice il branch nasce con `--no-track`, il primo push è
`git push -u origin slice/S<NN>-<slug>`, che è la presa in carico e insieme
mette l'upstream giusto, e un test tiene le due righe dove sono.

## Acceptance criteria

- [ ] Il blocco dei worktree in `skills/next/SKILL.md` crea il branch con `git worktree add --no-track`, e il testo sotto dice perché in una frase.
- [ ] Il passo 1 del prompt del subagent in `skills/next/SKILL.md` nomina il push della presa in carico come `git push -u origin slice/S<NN>-<slug>`, eseguito nel worktree.
- [ ] La 5.4 di `docs/spec.md` scrive `worktree add` con `--no-track`, con una versione nuova nell'intestazione e una riga in "Cosa cambia".
- [ ] Un test in `tests/architecture.test.ts` asserisce che ogni `git worktree add` di `skills/next/SKILL.md` e di `docs/spec.md` ha `--no-track`, e che la skill contiene `git push -u origin slice/S<NN>-<slug>`.
- [ ] Suite, typecheck, format e build verdi.

## Test plan

- Prima di tutto, in `tests/architecture.test.ts`, un `describe` accanto a
  `.gitignore keeps the worktrees of /next out of the tree` (`:1103`): ogni riga
  di `skills/next/SKILL.md` e di `docs/spec.md` che contiene
  `git worktree add` contiene anche `--no-track`, e il testo della skill
  contiene `git push -u origin slice/S<NN>-<slug>`. Rosso oggi: la riga a
  `skills/next/SKILL.md:142` e quella della 5.4 a `docs/spec.md:436` non hanno
  `--no-track`, e il passo 1 a `skills/next/SKILL.md:184` non nomina il comando.
- Poi `pnpm test` intera.

## Touchpoints

- `tests/architecture.test.ts`: il `describe` nuovo.
- `skills/next/SKILL.md`: `--no-track` nel blocco a `:142` con la sua frase, il comando del push nel passo 1 a `:184`.
- `docs/spec.md`: la versione, "Cosa cambia", la riga di `worktree add` nella 5.4 a `:436`.

## Notes

La riga dell'inbox, del 2026-09-16: `git worktree add .claude/worktrees/S<NN> -b
slice/S<NN>-<slug> origin/<default>` in `skills/next/SKILL.md` e nella 5.4 della
spec mette `origin/<default>` come upstream del branch di slice, perché è il
default di git quando il punto di partenza è un remote-tracking branch: nel
worktree `git status` dice "ahead of main", un `git pull` nudo mergia main, un
`git push` nudo sbaglia bersaglio. Serve `--no-track`, e il push del passo 1
nomina il ref, `git push -u origin slice/S<NN>-<slug>`. F2 low di correctness su
PR #38.

`git worktree add` accetta `--[no-]track` con lo stesso significato di
`git branch` (`git worktree add -h`, git 2.54). Il repo ha già il precedente:
`skills/harness-init/templates/scripts/intent.sh:135` crea il branch
dell'intent con `git switch --no-track -c` dal ramo remoto, per la stessa
ragione.

Con `-u` sul primo push l'upstream diventa `origin/slice/S<NN>-<slug>`, e i push
nudi che il prompt chiede dopo, quello della slice bloccata a
`skills/next/SKILL.md:214` compreso, vanno sul branch giusto senza cambiarli.

S29 tocca lo stesso file e la riga sopra, la fetch a `skills/next/SKILL.md:141`,
e `docs/spec.md`: `/next` tiene le due slice in onde diverse per i touchpoint in
comune, e le righe citate qui possono essersi spostate quando questa parte.

Fuori scope: `skills/slice/SKILL.md:396` e `skills/spec/SKILL.md:329` nominano
già il ref nel push. Il passo 1 della 4.4 (`docs/spec.md:318`) descrive
`git switch -c` per chi esegue a mano, senza worktree, e resta com'è.

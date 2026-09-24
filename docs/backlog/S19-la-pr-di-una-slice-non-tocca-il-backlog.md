---
id: S19
title: La PR di una slice non tocca il backlog, così la policy può mergiarla
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-16)
---

## Goal

Il 16 settembre il passo 6 su Tipoff ha chiuso le quattro slice di esc-key
con zero merge della policy, a `HARNESS_AUTOMERGE=on`. Ogni PR di slice
portava la propria slice a `status: in-progress`, come dicono il passo 2
della 4.4 della spec e il passo 2 di `/next`; `docs/backlog/**` sta in
"Merge umano per path" di `AGENTS.md`, quindi `tier.sh` ha stampato
`human-gate`, la CI ha messo la label e `policy.sh` ha scritto "a human
merges it" su tutte e quattro, anche a tier 1 con zero finding. In questo
repo non si vedeva perché ogni PR la mergia Lionel comunque.

Il branch `slice/S<NN>-<slug>` è già la presa in carico, atomica perché la
fa il server (4.4 passo 1). Il commit `in-progress` è ridondante e costa il
merge automatico. Esce, e con lui il valore `in-progress` dello status: lo
stato "in corso" è l'esistenza del branch sul remote.

## Acceptance criteria

- [ ] `skills/next/SKILL.md` non chiede più il commit `in-progress`: il passo 2 sparisce e il subagent, dopo il push del branch vuoto, non tocca `docs/backlog/`. Il guardrail lo dice: una PR di slice che tocca il backlog finisce sotto il gate umano.
- [ ] `docs/spec.md` sale di versione: la 4.3 elenca `todo | blocked | done`, la 4.4 perde il passo 2 e dice che "in corso" è il branch sul remote, "Cosa cambia" ha la riga.
- [ ] `docs/backlog/README.md` e la copia in `skills/harness-init/templates/docs/backlog/README.md` elencano `todo | blocked | done` e dicono che la presa in carico è il branch e nient'altro.
- [ ] Un test in `tests/tier.test.ts` tiene fermo il fatto: una PR con `docs/backlog/S01-x.md` fra i file stampa `human-gate`, anche a tier 1. Esiste già per `docs/specs/`; qui il caso è la slice, con il commento che spiega perché la PR di una slice non deve toccarla.
- [ ] Suite, typecheck, format e build verdi.

## Test plan

- Il caso in `tests/tier.test.ts` si scrive prima: `tier({ 'docs/backlog/S01-x.md': ..., 'src/a.ts': ... })` con `why` che contiene `human-gate: docs/backlog/S01-x.md`. È verde da subito, perché `tier.sh` fa già la cosa giusta: il test è il documento che spiega perché `/next` non deve più toccare quel file.
- `pnpm test` intera: `architecture.test.ts` confronta i README di `docs/` con le copie nei template.

## Touchpoints

- `skills/next/SKILL.md`: il passo 2 del subagent e una riga di guardrail.
- `docs/spec.md`: 4.3, 4.4, "Cosa cambia", versione.
- `docs/backlog/README.md`, `skills/harness-init/templates/docs/backlog/README.md`: lo status e la presa in carico.
- `tests/tier.test.ts`: il caso della slice sotto il gate.
- `docs/codebase-map.md`: una riga nei draghi.

## Notes

`close.yml` non cambia: porta la slice a `done` su main al merge, e non ha
mai letto `in-progress`. `tier.sh` non cambia: fa già la cosa giusta, il
gate su `docs/backlog/**` è voluto, perché nessuna PR deve cambiare i
criteri di una slice senza un umano.

Lo stato "in corso" della board lo deriva `board.sh` da
`git ls-remote --heads origin 'slice/*'`: è una riga di inbox per le slice
di `/board`, la cui spec è approvata e non lo dice.

Nei repo dei progetti il README del backlog arriva rilanciando
`/harness-init local`; le slice già `done` non cambiano.

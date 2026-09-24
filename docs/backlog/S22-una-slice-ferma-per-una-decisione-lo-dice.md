---
id: S22
title: Una slice ferma per una decisione lo dice nel campo, e la board lo stampa
status: done
blocked_by: S21
tier: 2
human: false
spec: docs/specs/SPEC-board.md
---

## Goal

`blocked_by` accetta l'id di un ADR oltre a quello di una slice, e `blocked`
torna a voler dire una cosa sola: presa in carico e lasciata a metà. La board
stampa `ferma per ADR-0002` leggendo il campo. S05 e S08 tornano `todo` con
`blocked_by: ADR-0002`, S06 e S07 restano dietro S05, e chi legge la board
vede perché quattro slice sono ferme senza aprire i file.

## Acceptance criteria

- [ ] `board.sh` stampa, per una slice con un id `ADR-<nnnn>` in `blocked_by`, `ferma per ADR-<nnnn>` al posto della lista grezza; con id di slice e ADR insieme li stampa tutti e due. Nel JSON `blocked_by` resta la lista com'è.
- [ ] `docs/backlog/README.md` e `skills/harness-init/templates/docs/backlog/README.md` dicono i due valori del campo, `S<NN>` e `ADR-<nnnn>`, e che `blocked` è solo la slice presa e lasciata a metà del passo 4 della 4.4.
- [ ] `docs/spec.md` sale di versione: la 4.3 dice i due valori di `blocked_by` e cosa vuol dire `blocked`, "Cosa cambia" ha la riga.
- [ ] Su main S05 e S08 hanno `status: todo` e `blocked_by: ADR-0002`; S06 e S07 hanno `status: todo` e `blocked_by: S05`. Le sezioni `## Blocked` restano, e dicono la stessa cosa del campo.
- [ ] `skills/next/SKILL.md` non cambia e S05-S08 restano fuori dalle onde: un test in `tests/board.test.ts` mostra che una slice con `blocked_by: ADR-0002` non è eleggibile per la regola di S21.
- [ ] Suite, typecheck, format e build verdi; `architecture.test.ts` resta verde perché i due README dicono le stesse sezioni.

## Test plan

- In `tests/board.test.ts`, rossi finché il codice non esiste: una slice con `blocked_by: ADR-0002` stampa `ferma per ADR-0002`; una con `S01, ADR-0002` li stampa tutti e due; la stessa slice non compare come eleggibile nella prossima azione; il JSON porta la lista grezza.
- `pnpm test` intera per i README.

## Touchpoints

- `skills/harness-init/templates/scripts/board.sh`: la lettura del campo.
- `tests/board.test.ts`: i casi.
- `docs/backlog/README.md`, `skills/harness-init/templates/docs/backlog/README.md`: il campo e `blocked`.
- `docs/spec.md`: 4.3, "Cosa cambia", versione.
- `docs/backlog/S05-*.md`, `S06-*.md`, `S07-*.md`, `S08-*.md`: il frontmatter.

## Notes

Decisione della spec: nessun campo nuovo, per il principio di Lionel, ogni
cosa deve far risparmiare tempo a chi sviluppa, e un campo in più è una cosa
in più che ogni lettore, `/next` compreso, deve imparare. Scartato
`blocked_reason`. `/next` non cambia perché la sua regola, "ogni id in
`blocked_by` è una slice `done`", non è mai vera per un ADR: la slice resta
fuori dalle onde finché un umano toglie l'ADR dal campo, ed è giusto che sia
un umano.

I quattro frontmatter di S05-S08 e `docs/spec.md` sono documenti della riga
`Documenti` di `AGENTS.md` e vanno su main con un commit, non nella PR: una PR
che tocca `docs/backlog/**` finisce sotto il gate umano (S19). Il subagent
li cambia in un commit su main dalla sessione che lo ha lanciato, con il sì
dell'umano, o li lascia come cosa da fare nell'hand-back con il diff pronto.
La PR porta lo script, il test e il README del template.

`blocked_by: S21` è per il file, non per il codice: S21 e questa slice
scrivono tutte e due `board.sh` e `board.test.ts`, e due PR sullo stesso
file nella stessa onda lasciano la seconda in conflitto (inbox del 16
settembre).

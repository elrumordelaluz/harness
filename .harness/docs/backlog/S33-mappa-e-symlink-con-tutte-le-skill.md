---
id: S33
title: AGENTS.md e CLAUDE.md nominano tutte le skill del repo, board e next comprese
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-16)
---

## Goal

Una sessione a contesto pulito su questo repo parte da `AGENTS.md` e da
`CLAUDE.md`. Con S23 mergiata tutti e due sono indietro: la "Mappa" di
`AGENTS.md` descrive `skills/next/SKILL.md` e chiude con "`/board` e `/audit`
dopo", come se `/board` non ci fosse, e `CLAUDE.md` elenca come symlink in
`~/.claude/skills/` quattro skill, senza `next` e `board`, che esistono e sono
linkate. Chi legge crede che manchino due skill, e chi aggiunge la settima non
ha niente che gli ricordi le due righe.

Dopo questa slice le due righe nominano ogni cartella di `skills/`, e un test
fallisce quando una skill nuova arriva senza la sua riga.

## Acceptance criteria

- [ ] La riga di `CLAUDE.md` sui symlink in `~/.claude/skills/` nomina ogni cartella di `skills/`, oggi `board`, `harness-init`, `judge`, `next`, `slice` e `spec`.
- [ ] La "Mappa" di `AGENTS.md` nomina `skills/<nome>/SKILL.md` per ogni cartella di `skills/`, con una frase su cosa fa, e non dice più che `/board` viene dopo; `/audit`, che non c'è ancora, può restare dopo.
- [ ] Un test in `tests/architecture.test.ts` legge le cartelle di `skills/` e fallisce, nominando la skill e il file, quando una manca da una delle due righe.
- [ ] Suite, typecheck, format e build verdi.

## Test plan

- Prima di tutto, in `tests/architecture.test.ts`, accanto a
  `every skill has a SKILL.md with its frontmatter` (`:688`), che legge già le
  cartelle di `skills/`: per ogni cartella, la riga di `CLAUDE.md` che nomina
  `~/.claude/skills/` contiene il nome fra backtick, e la sezione `## Mappa` di
  `AGENTS.md` contiene `skills/<nome>/SKILL.md`. Rosso oggi: `CLAUDE.md:5` non
  nomina `next` né `board`, e `AGENTS.md:11` non nomina
  `skills/board/SKILL.md`.
- Poi `pnpm test` intera.

## Touchpoints

- `tests/architecture.test.ts`: il test nuovo.
- `AGENTS.md`: la riga delle skill nella "Mappa" a `:11`.
- `CLAUDE.md`: la frase dei symlink a `:5`.

## Notes

La riga dell'inbox, del 2026-09-16: con S23 mergiata due righe sono indietro. In
"Mappa" di `AGENTS.md` c'è ancora "`/board` e `/audit` dopo", e `CLAUDE.md`
elenca come symlink in `~/.claude/skills/` solo `harness-init`, `judge`, `spec`
e `slice`, senza `next` e `board`.

La stessa cosa sta in una seconda riga dell'inbox dello stesso giorno, che
aggiunge che i due file passano da una PR: `AGENTS.md` e `CLAUDE.md` non sono
fra i documenti che vanno su main (riga `Documenti` di "Gate umani" in
`AGENTS.md`), e `AGENTS.md` è un path sensibile, da cui il tier 2.

La frase su `/board` nella Mappa la scrive chi fa la slice, sul modello delle
altre skill della stessa riga, leggendo `skills/board/SKILL.md`: la schermata di
`scripts/board.sh` e le righe dell'inbox chiuse una alla volta. `/board` sta
dopo `/next` nell'ordine di ADR-0003, e la riga può dirlo.

Il test confronta nomi, non frasi: la descrizione di ogni skill resta prosa di
chi la scrive.

Fuori scope: il `CLAUDE.md` del template
(`skills/harness-init/templates/CLAUDE.md`), che non nomina symlink; il README
del repo; le righe di `AGENTS.md` fuori dalla Mappa.

---
id: S34
title: I modelli di commit delle skill passano commitlint, e la slice dall'inbox si scrive s<NN>
status: done
blocked_by: none
tier: 1
human: false
spec: inbox (2026-09-17)
---

## Goal

Le skill che committano documenti su main danno il soggetto del commit come
modello, in un blocco di codice che la sessione copia. Il modello della risposta
`slice` di `/board` comincia con `S<NN>`, e `commitlint.sh` rifiuta ogni soggetto
che non comincia con una lettera minuscola: chi lo copia com'è si vede rifiutare
il commit dall'hook, e ogni run di `/board` lo corregge a mano in `s<NN>`, come
S24, S25, S26 e le slice da S27 a S33.

Dopo questa slice il modello dice `s<NN>`, la 5.7 della spec lo stesso, e un test
passa a `commitlint.sh` ogni modello di soggetto di ogni `SKILL.md`, così il
prossimo modello sbagliato fallisce in CI e non al primo commit di una sessione.

## Acceptance criteria

- [ ] `skills/board/SKILL.md`, nel blocco del commit della risposta `slice`, ha per soggetto `docs(backlog): s<NN> dall'inbox`.
- [ ] La 5.7 di `docs/spec.md` scrive lo stesso soggetto, con una versione nuova nell'intestazione e una riga in "Cosa cambia".
- [ ] Un test in `tests/architecture.test.ts` prende da ogni `skills/*/SKILL.md` le righe che cominciano con `<type>(<scope>): ` e usano un type di `commitlint.sh`, sostituisce ogni segnaposto `<...>` con una parola minuscola di più lettere, e la passa come primo rigo di un messaggio a `scripts/commitlint.sh --file`: ogni riga passa, e il messaggio del fallimento nomina il file e la riga.
- [ ] Il test trova almeno le nove righe modello di oggi, in `board`, `slice` e `spec`: una modifica che le togliesse tutte dalla sua vista non passa in silenzio.
- [ ] Suite, typecheck, format e build verdi.

## Test plan

- Prima di tutto, in `tests/architecture.test.ts`, un `describe` accanto a
  `skills/board/SKILL.md wraps board.sh and closes the inbox` (`:972`): per ogni
  `SKILL.md` sotto `skills/`, le righe che corrispondono a
  `^(feat|fix|chore|docs|style|refactor|test|perf|revert|build|ci)\([a-z0-9-]+\): `;
  su ciascuna i segnaposto `<[^>]+>` diventano `parola`, e
  `scripts/commitlint.sh --file` su un file temporaneo con quel rigo esce 0. Un
  secondo caso conta le righe trovate, almeno nove. Rosso oggi su
  `skills/board/SKILL.md:246`: `S<NN>` diventa `Sparola`, e il soggetto comincia
  con una maiuscola.
- Poi `pnpm test` intera.

## Touchpoints

- `tests/architecture.test.ts`: il `describe` nuovo.
- `skills/board/SKILL.md`: il soggetto del commit della risposta `slice` a `:246`.
- `docs/spec.md`: la versione, "Cosa cambia", il soggetto nella 5.7 a `:465`.

## Notes

La riga dell'inbox, del 2026-09-17: nella sezione 5 di `skills/board/SKILL.md` il
commit della risposta `slice` ha per soggetto `docs(backlog): S<NN> dall'inbox`,
e `commitlint.sh` lo rifiuta perché vuole il soggetto minuscolo: S26 è passata
solo con `s26`. Il modello va scritto `s<NN>`, come nei commit di S24 e S25.

La regola è `SUBJECT` a `skills/harness-init/templates/scripts/commitlint.sh:10`:
dopo `type(scope): ` una lettera minuscola e almeno un altro carattere, per
questo il segnaposto diventa una parola e non una lettera sola. Il test lancia lo
script e non ne copia la regex, così una regola che cambia là cambia anche qui.

Le righe modello di oggi, trovate con `git grep` sulle `SKILL.md` il
2026-09-17: `skills/board/SKILL.md:198`, `:246`, `:276`, `:305`;
`skills/slice/SKILL.md:359`, `:392`; `skills/spec/SKILL.md:312`, `:384`, `:420`.
Solo `:246` di board fallisce.

Il nome del file della slice, `docs/backlog/S<NN>-<slug>.md`, resta maiuscolo:
è l'id, e la regola vale solo per il soggetto.

Fuori scope: `docs/specs/SPEC-board.md:49` porta lo stesso soggetto, ma la spec è
approvata e non si riapre. I soggetti che le skill scrivono dentro la prosa, fra
backtick e non a inizio riga, non sono modelli da copiare e il test non li legge.

---
id: S48
title: La spec della catena si legge in inglese e un ADR dice da quando
status: done
blocked_by: none
tier: 2
human: false
spec: docs/specs/SPEC-english-first.md
---

## Goal

`docs/spec.md` è la fonte della catena: 707 righe che descrivono i documenti,
il processo, le skill, gli hook, il verdetto e il tier, e sono il file che si
legge per capire perché l'harness è fatto così. È in italiano, e resta l'unico
documento lungo che un dev di fuori non può leggere.

Dopo questa slice `docs/spec.md` è in inglese, con una versione nuova
nell'intestazione e la sua riga in "Cosa cambia", e un ADR dichiara il giorno
da cui intent, spec, slice e ADR nuovi si scrivono in inglese e che la storia
non si traduce.

## Acceptance criteria

- [ ] `docs/spec.md` è in inglese, dalla sezione 0 alla 12, tabelle e figure comprese.
- [ ] L'intestazione porta una versione nuova con la sua data, e "Cosa cambia" ha la riga che dice che cosa è cambiato in questa versione.
- [ ] Le stringhe che sono contratto dentro la spec restano quelle vere: i nomi dei campi del frontmatter, i nomi dei branch, i soggetti dei commit, le chiavi del blocco di policy e i path.
- [ ] Le citazioni di documenti già scritti restano come sono: un titolo di ADR, il testo di una slice `done` o una riga di verdetto non si traducono dentro la spec.
- [ ] Un ADR nuovo in `docs/decisions/` dichiara il giorno da cui intent, spec, slice e ADR nuovi si scrivono in inglese.
- [ ] Lo stesso ADR dice che la storia non si traduce, e nomina che cosa resta com'è: intent, spec, slice, ADR e verdetti già scritti.
- [ ] La riga di "Cosa cambia" nomina l'ADR.

## Test plan

Nessun caso nuovo sul testo della spec: la lingua di `docs/spec.md` la tiene
il caso di S50, e qui si traduce perché quel caso possa essere verde.

- `tests/architecture.test.ts`, il caso che confronta lo scheletro di `/spec` con i README, e quelli che leggono i soggetti dei commit e i nomi dei branch: restano verdi. Rosso vuol dire che la traduzione ha toccato una stringa di contratto invece della prosa intorno.
- `scripts/prose.sh --staged` al commit: nessun trattino lungo nelle righe aggiunte. Su 707 righe riscritte è il gate che si incontra per primo.
- `pnpm format:check`: Prettier riscrive una riga lunga in modo diverso in inglese, e la spec ha tabelle che cambiano larghezza.
- La verifica a mano sta nella PR: la sezione 0 confrontata con la 0.28 riga per riga, e un giro sui numeri delle sezioni che le altre docs citano, perché una sezione persa non la vede nessun test.

## Touchpoints

- `docs/spec.md`: tutto il file, l'intestazione con la versione nuova e la riga in "Cosa cambia".
- `docs/decisions/ADR-00NN-<slug>.md`: l'ADR nuovo, con il numero dopo l'ultimo preso.
- `docs/decisions/README.md`: solo se il README elenca gli ADR e va aggiunto.

## Notes

I due criteri della spec: `docs/spec.md` è in inglese, con una versione nuova
nell'intestazione e la sua riga in "Cosa cambia"; un ADR dichiara il giorno da
cui intent, spec, slice e ADR nuovi si scrivono in inglese, e che la storia
non si traduce. Stanno nella stessa slice perché sono la stessa notizia: la
riga di "Cosa cambia" nomina l'ADR, e l'ADR è quello che dà una data alla
regola che la spec scrive.

La regola del repo, non negoziabile qui: non si cambia la spec senza una
versione nuova nell'intestazione e una riga in "Cosa cambia". La spec è la
fonte, non un appunto.

Questa spec di feature, `docs/specs/SPEC-english-first.md`, resta in italiano,
perché è il verbale di una conversazione in italiano. L'inglese vale dal
giorno in cui l'ADR atterra su main.

La slice è tier 2 per la sola dimensione, e resta una slice sola: mezza spec
inglese e mezza italiana su main sarebbe un artefatto peggiore di un diff
grande, e il diff è prosa che nessuno esegue, senza logica da sbagliare. Il
giudice a tier 2 su una traduzione costa poco e serve: legge se una sezione è
sparita.

L'ADR porta con sé la label `human-gate`, perché `docs/decisions/**` sta fra i
path a merge umano: la PR la mergia Lionel, ed è il momento in cui un umano
legge l'inglese della spec. È il posto giusto per quel controllo, e vale la
pena scriverlo nella PR.

Il numero dell'ADR si prende contando dopo l'ultimo in `docs/decisions/`, che
oggi è ADR-0004: se un altro ADR atterra prima di questa slice, il numero si
rifà al momento di scriverlo.

Fuori scope: tradurre gli intent, le spec, le slice, gli ADR e i verdetti già
scritti, che la spec mette esplicitamente fuori; cambiare il contenuto della
spec, che qui cambia lingua e nient'altro; il test sulla lingua, che è S50.

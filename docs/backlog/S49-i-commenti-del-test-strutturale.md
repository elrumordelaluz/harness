---
id: S49
title: Il test strutturale si legge in inglese
status: done
blocked_by: none
tier: 1
human: false
spec: docs/specs/SPEC-english-first.md
---

## Goal

`tests/architecture.test.ts` è il file che spiega perché ogni regola del "Non
fare" è un test: i suoi commenti raccontano i guasti veri da cui ogni caso è
nato, i cinque workflow rimasti indietro di tre slice, il `close.yml` che ha
portato una slice a `done` con il lavoro non su main, `CLAUDE.md` a tier 0 una
cartella più in là. Sono circa centonovanta righe italiane dentro un file che
un dev di fuori deve poter correggere.

Dopo questa slice i commenti di `tests/architecture.test.ts` sono in inglese.
Il codice e i messaggi di asserzione, che sono già inglesi, restano come sono,
e nessun caso cambia comportamento.

## Acceptance criteria

- [ ] Nessun commento di `tests/architecture.test.ts` contiene una parola funzione italiana.
- [ ] I messaggi di asserzione, i nomi dei `describe` e degli `it` non cambiano: erano già inglesi, e un rename farebbe sparire un caso dai report senza che nessuno se ne accorga.
- [ ] Nessun caso cambia comportamento: la suite passa con lo stesso numero di test di prima e nessuna asserzione è tolta o indebolita.
- [ ] Le citazioni di documenti italiani dentro i commenti, quando ci sono, restano citazioni e si riconoscono come tali.
- [ ] Le date, gli sha, i numeri di PR e i path nominati nei commenti restano quelli: sono la traccia dei guasti veri e non si riscrivono.

## Test plan

Nessun caso nuovo: qui cambiano solo i commenti. La rete è la suite stessa.

- `pnpm test`: lo stesso numero di test passati prima e dopo, che è il modo di provare che un caso non è sparito dentro un blocco di commento riscritto male.
- `pnpm typecheck` e `pnpm format:check`: un commento tradotto cambia la lunghezza delle righe e Prettier le riscrive.
- `scripts/prose.sh --staged` al commit: nessun trattino lungo nelle righe aggiunte.
- Il confronto che conta lo fa il giudice sulla PR: ogni commento tradotto sta sopra il caso che spiegava prima.

## Touchpoints

- `tests/architecture.test.ts`: i soli commenti.

## Notes

Questa slice e S50 sono le due metà dello stesso lavoro, l'italiano che resta
dentro l'insieme di path che il test di S51 guarda e che nessun'altra slice
tocca. Sono due perché insieme superano le duecento righe e sarebbero tier 2
per la sola dimensione, che in questo repo vuol dire due slice.

Il criterio da cui vengono è quello di S51, spezzato: perché il caso che cerca
le parole funzione italiane sull'insieme dichiarato possa essere verde,
l'insieme deve essere pulito. `tests/**` sta nell'insieme, e questo file è la
sua parte più grande.

Perché non si rinominano i `describe` e gli `it`: sono già inglesi, e un nome
cambiato fa sparire un caso dal confronto con la run precedente senza rompere
niente. Questa slice non deve poter togliere un test.

Le date e i numeri di PR nei commenti sono la memoria dei guasti veri: PR #9
con i cinque workflow indietro, PR #32 con il guard della base provato per
metà, il 2026-09-15 di `close.yml`. Si traduce la frase, non il fatto.

Questo file lo toccano quasi tutte le slice di questa board: le onde di
`/next` tengono lontane due slice che nominano lo stesso path, quindi questa
arriva dopo, e chi la prende rilegge il file com'è in quel momento invece di
fidarsi delle righe citate qui.

Fuori scope: gli altri file di `tests/`, che sono S50; il caso nuovo sulla
lingua, che è S51; il comportamento di qualunque test.

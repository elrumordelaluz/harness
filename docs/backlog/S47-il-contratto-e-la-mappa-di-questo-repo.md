---
id: S47
title: Il contratto e la mappa del repo dell'harness sono in inglese
status: done
blocked_by: S42
tier: 2
human: false
spec: docs/specs/SPEC-english-first.md
---

## Goal

`AGENTS.md` e `docs/codebase-map.md` sono i due file da cui questo repo dice a
un agente e a un dev che cosa hanno davanti, e sono i primi due che una
sessione a contesto pulito legge. Restano italiani mentre i template che
escono da qui sono già inglesi, e chi arriva da fuori legge la catena in una
lingua e il repo che la costruisce in un'altra.

Dopo questa slice `AGENTS.md`, `CLAUDE.md`, `docs/codebase-map.md` e
`docs/inbox.md` di questo repo sono in inglese. Il blocco di policy che S39 ci
ha messo non si tocca: è dati, non prosa, e nessuna chiave cambia nome.

## Acceptance criteria

- [ ] `AGENTS.md` di questo repo è in inglese, con le stesse sezioni e le stesse regole di oggi, sotto le 100 righe.
- [ ] Il blocco di policy dentro `AGENTS.md` resta byte a byte quello di S39: chiavi, valori e glob non cambiano, e `jq` lo parsa uguale.
- [ ] `docs/codebase-map.md` è in inglese, tabella dei moduli, flusso dei dati, come si testa e draghi compresi.
- [ ] `CLAUDE.md` di questo repo è in inglese e continua a puntare ad `AGENTS.md`.
- [ ] `docs/inbox.md` è in inglese, paragrafo in testa e righe aperte, e la forma `- <YYYY-MM-DD>: <una riga>` resta quella.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm format:check` e `pnpm build` restano verdi, e `scripts/tier.sh main` dà lo stesso tier di prima sugli stessi file.

## Test plan

Nessun comportamento cambia: i casi che tengono onesta questa slice esistono
già e girano sull'`AGENTS.md` vero.

- `tests/tier.test.ts`, che copia l'`AGENTS.md` di questo repo dentro i repo usa e getta: resta verde sulla versione inglese. Rosso vuol dire che una frase è ancora portante, e la lettura si ripara in S39.
- `tests/hooks.test.ts`, che gira `pre-commit` e `pre-push` sullo stesso file: resta verde, commit di soli documenti su main compreso.
- `tests/architecture.test.ts`, il caso che chiede che ogni path nominato dal blocco esista nel repo: resta verde, perché il blocco non si traduce.
- Un caso nuovo, o un'asserzione nel caso del blocco: il blocco di `AGENTS.md` si parsa e porta le otto chiavi anche dopo la traduzione della prosa intorno. Fallisce solo se qualcuno traduce dentro il fence, ed è esattamente il modo in cui questa slice può rompere la catena.

## Touchpoints

- `AGENTS.md`: tutta la prosa, non il blocco.
- `CLAUDE.md`: le righe su hook, permessi e symlink delle skill.
- `docs/codebase-map.md`: tutto il file.
- `docs/inbox.md`: il paragrafo in testa e le righe aperte.
- `tests/architecture.test.ts`: l'asserzione sul blocco che sopravvive alla traduzione.

## Notes

Il criterio della spec: `AGENTS.md` e `docs/codebase-map.md` di questo repo
sono in inglese. `CLAUDE.md` e `docs/inbox.md` vengono con loro perché stanno
nell'insieme di path che il test sulla lingua di S50 guarda, e lasciarli
indietro vorrebbe dire una slice rossa in fondo alla board.

Perché dopo S39: finché gli script leggono `- Path sensibili:`, `## Gate umani`
e `- Documenti:` dentro questo file, tradurli spegne il calcolo del tier e apre
main. Con il blocco al suo posto la prosa è solo prosa.

Il blocco non si traduce. Le chiavi sono un contratto, i valori sono glob, e
un glob tradotto è un path che non esiste: il caso che chiede a ogni path del
blocco di esistere nel repo è la rete, ma la regola va detta a chi implementa
prima che scriva.

`docs/codebase-map.md` è l'unico documento vivo del repo e si aggiorna quando
cambia la forma del codice: qui cambia solo la lingua, quindi non si riscrive
il contenuto e non si tolgono i draghi. Un drago che questa slice rende falso
si corregge, non si cancella.

Le righe di `docs/inbox.md` sono lavoro aperto, non storia: si traducono.
Quelle chiuse si tolgono, non si spuntano, e non è questa slice a chiuderle.

La prosa di `docs/**` e degli `SKILL.md` va normalmente su main con il sì
dell'umano, ma quello che sta in una slice viaggia sul branch della slice con
il resto: la PR è il posto dove la modifica è intera e dove il giudice la
legge con i suoi touchpoint.

Fuori scope: `docs/spec.md`, che è S48; i template, che sono S42; gli intent,
le spec, le slice, gli ADR e i verdetti già scritti, che non si traducono.

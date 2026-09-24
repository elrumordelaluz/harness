---
id: S50
title: I test del giudice e della policy e gli ultimi due script si leggono in inglese
status: done
blocked_by: none
tier: 2
human: false
spec: docs/specs/SPEC-english-first.md
---

## Goal

Dopo le slice di prosa e dopo S49 resta l'italiano che nessuna di loro tocca:
i commenti di `tests/judge.test.ts`, di `tests/policy.test.ts` e di
`tests/review-log.test.ts`, che raccontano lo store del verdetto, i finding
umani, gli stub di `gh` e di `curl` e il log dei verdetti, e una riga per
ciascuno dentro `ensure-verdict.sh` e `policy.sh`.

Dopo questa slice l'insieme di path che il test di S51 guarda non ha più
italiano da nessuna parte, e quel caso può nascere verde.

## Acceptance criteria

- [ ] Nessun commento di `tests/judge.test.ts`, `tests/policy.test.ts` e `tests/review-log.test.ts` contiene una parola funzione italiana.
- [ ] Nessun commento di `skills/harness-init/templates/scripts/ensure-verdict.sh` e `skills/harness-init/templates/scripts/policy.sh` contiene una parola funzione italiana.
- [ ] I messaggi di asserzione, i nomi dei `describe` e degli `it` e le variabili `STUB_*` non cambiano.
- [ ] Nessun caso cambia comportamento e nessuno script cambia una stringa che qualcuno legge: quello che i due script stampano resta identico.
- [ ] La suite passa con lo stesso numero di test di prima.
- [ ] Un giro di `grep` sull'insieme dichiarato dalla spec non trova più italiano fuori dai path che l'insieme esclude.

## Test plan

Nessun caso nuovo: cambiano solo commenti.

- `pnpm test`: stesso numero di test passati prima e dopo.
- `tests/policy.test.ts` e `tests/judge.test.ts` girano con gli stub di `gh` e di `curl`: se una traduzione scivola dentro una stringa che lo stub confronta, il caso diventa rosso subito, ed è la rete di questa slice.
- `pnpm typecheck`, che è `tsc` sui test più `scripts/check-shell.sh`: i due script devono restare validi per `bash -n`, e un commento riscritto male dentro uno heredoc non lo è.
- `pnpm format:check`.
- Il `grep` finale sull'insieme, fatto a mano in questa slice, è quello che S51 trasforma in un caso.

## Touchpoints

- `tests/judge.test.ts`, `tests/policy.test.ts`, `tests/review-log.test.ts`: i soli commenti.
- `skills/harness-init/templates/scripts/ensure-verdict.sh` e `skills/harness-init/templates/scripts/policy.sh`: i soli commenti. I symlink in `scripts/` non si toccano.

## Notes

Questa slice e S49 sono le due metà dello stesso lavoro, divise perché insieme
sarebbero tier 2 per la sola dimensione. Il criterio da cui vengono è quello
di S51, spezzato: il caso che cerca le parole funzione italiane sull'insieme
dichiarato può essere verde solo se l'insieme è pulito.

`ensure-verdict.sh` legge come comando ogni riga che comincia con
`gh pr create`, anche dentro un heredoc: chi traduce un suo commento non lo
riscriva in modo da far nascere una riga così, o l'hook ferma la scrittura del
file. Il drago è in `docs/codebase-map.md` e vale per chi lavora nei repo dei
progetti, dove il template lo installa.

Gli stub di `gh` e di `curl` in `tests/fixtures/bin` registrano le chiamate e
rispondono dalle variabili `STUB_*`: una stringa che il test confronta non è
un commento, e non si tocca. Lo stesso vale per i corpi dei commenti che
`policy.sh` posta, che sono output e non prosa di servizio.

Se al momento di implementare una di queste righe è già stata tradotta da
un'altra slice, la si salta e lo si scrive nella PR: l'insieme che deve
risultare pulito è quello, non la lista di partenza.

Fuori scope: `tests/architecture.test.ts`, che è S49; il caso nuovo sulla
lingua, che è S51; il comportamento di qualunque test o script.

---
id: S36
title: La 7.1 della spec dice che lo schema lo guarda judge.sh check e che un JSON non valido è un crash
status: todo
blocked_by: none
tier: 1
human: false
spec: inbox (2026-09-17)
---

## Goal

La 7.1 di `docs/spec.md` apre dicendo chi fa rispettare lo schema del verdetto e
cosa succede a un JSON che non lo rispetta, e sbaglia tutte e due le cose da
ADR-0004. Dice che lo impone l'action al giudice, e nessuna action giudica più:
la guardia è `judge.sh check`, che rifiuta il verdetto prima di archiviarlo. E
dice che `policy.sh` risponde a un JSON non valido con una escalation, mentre lo
script lo tratta come un crash, con la sua label e il suo commento che chiede di
rilanciare `/judge`. La spec è la fonte: chi la legge per capire come la catena
reagisce a un verdetto rotto trova il comportamento di prima.

Dopo questa slice il primo paragrafo della 7.1 dice la cosa com'è, e un test lo
tiene fermo.

## Acceptance criteria

- [ ] Il primo paragrafo della 7.1 di `docs/spec.md` nomina `judge.sh check` come la guardia dello schema e non nomina un'action.
- [ ] Lo stesso paragrafo dice che un verdetto mancante o non valido che arriva a `policy.sh` è un crash e non una escalation, e che non finisce mai in un merge.
- [ ] `docs/spec.md` sale di versione con una riga in "Cosa cambia".
- [ ] Un test in `tests/architecture.test.ts` legge il paragrafo fra `### 7.1` e il blocco `json` che lo segue e asserisce i due criteri sopra: contiene `judge.sh check` e `crash`, non contiene `action` né `escalation`.
- [ ] Suite, typecheck, format e build verdi.

## Test plan

- Prima di tutto, in `tests/architecture.test.ts`, accanto a
  `no template judges on the server` (`:1076`): da `docs/spec.md` il testo fra la
  riga `### 7.1 Schema del verdetto` e la prima riga che apre un blocco `json`;
  contiene `judge.sh check` e `crash`, e non corrisponde a `/action|escalation/`.
  Rosso oggi: il paragrafo a `docs/spec.md:537` nomina l'action e l'escalation e
  non `judge.sh check`.
- Poi `pnpm test` intera.

## Touchpoints

- `tests/architecture.test.ts`: il test nuovo.
- `docs/spec.md`: la versione, "Cosa cambia", il primo paragrafo della 7.1 a `:537`.

## Notes

La riga dell'inbox, del 2026-09-17: la 7.1 di `docs/spec.md` apre con "l'action
lo impone al giudice e `policy.sh` rifiuta un JSON non valido con una
escalation": da ADR-0004 lo schema lo fa rispettare `judge.sh check`, e
`policy.sh` tratta un JSON non valido come un crash.

Il comportamento da scrivere sta negli script e non cambia: la validazione è
`cmd_check` a `skills/harness-init/templates/scripts/judge.sh:398`, il crash è
il commento a `skills/harness-init/templates/scripts/policy.sh:48-56`, la
decisione è `docs/decisions/ADR-0004-il-giudice-solo-in-locale.md`. La 0.25
(`89dc39b`) ha riscritto per lo stesso motivo il paragrafo della 4.6 sul crash, e
il paragrafo nuovo della 7.1 non deve contraddirlo.

Il test legge solo il primo paragrafo: il resto della 7.1 racconta il costo che
il giudice cloud misurava, e "Cosa cambia" e l'intestazione nominano l'action
come storia, a ragione.

S29, S30 e S34 cambiano anche loro la versione della spec: `/next` le tiene in
onde diverse per il touchpoint in comune, e il numero di versione si prende da
quello che c'è su main quando la slice parte.

Fuori scope: il resto della 7.1, il blocco JSON d'esempio, e i residui del
giudice cloud in `skills/harness-init/templates/scripts/judge.sh` e in
`tests/judge.test.ts`, che sono un'altra riga.

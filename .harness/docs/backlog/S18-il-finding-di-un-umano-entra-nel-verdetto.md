---
id: S18
title: Il finding di un umano su una PR aperta entra nel verdetto e si risponde come gli altri
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-16)
---

## Goal

Un umano che legge una PR aperta e trova qualcosa non ha posto nella catena.
Il verdetto copre una head, `judge.sh answer` risponde solo ai finding del
giudice, e un commit di correzione chiesto dall'umano lascia la head senza
giudizio: la policy non mergia e l'agente propone di mergiare com'è. Il 16
settembre su Tipoff, PR #10, è andata così.

Un umano che legge la PR è l'audit spostato prima, e il suo finding vale per
la calibrazione quanto uno sfuggito. `judge.sh finding` lo scrive nel
verdetto della head giudicata con `by: human`, la sessione lo corregge e lo
risponde con `answer` come gli altri, la head corretta è "risposta" e la
policy la tratta come tale, e il review log registra cosa il giudice non ha
visto.

## Acceptance criteria

- [ ] `judge.sh finding <severity> <file>[:<line>] <claim> [role]` aggiunge al verdetto che copre HEAD, quello di `judge.sh path`, un finding con `by: human` ed `evidence` "trovato da un umano leggendo la PR", e stampa i finding con i loro id come fa `findings`. Senza verdetto esce 1 e dice di lanciare `/judge`; con una severity o un ruolo fuori lista esce 2.
- [ ] Nello schema del verdetto ogni finding ha `by`, opzionale, `judge` o `human`; assente vale `judge`. `judge.sh check` toglie `by` se lo scrive il giudice, come fa con `answers`.
- [ ] `judge.sh answer F<n> <sha>` chiude un finding umano come uno del giudice; `findings` e `have` lo trattano allo stesso modo: un `high` o `medium` umano aperto tiene la head fuori da `have`, risposto la fa entrare.
- [ ] `policy.sh` con la head corrente fra le risposte mergia come per un finding del giudice, a tier 1 e a tier 2; nel commento il finding umano porta la parola `umano` accanto alla severity.
- [ ] `review-log.sh` copia `by` nel log: una riga del review log distingue il finding del giudice da quello dell'umano.
- [ ] Un finding umano senza `answer` sulla head corrente porta a `needs-human` come oggi: il comando aggiunge un finding, non un merge.
- [ ] Suite, typecheck, format e build verdi; `.github/judge/verdict.schema.json` uguale al template.

## Test plan

- In `tests/judge.test.ts`, sul repo usa e getta con la catena dentro: `finding medium src/a.ts:3 "ordine sbagliato"` dopo un `check` scrive il finding con `by: human` e `findings` lo stampa con id `F<n+1>`; senza verdetto esce 1; `answer` su quell'id lo chiude e `have` passa dalla head che risponde; `check` su un verdetto del giudice con `by: human` dentro lo toglie. Rosso finché il comando non esiste.
- In `tests/policy.test.ts`: un verdetto con un finding `by: human` risposto dalla head corrente mergia a tier 1, e il commento contiene `umano`; lo stesso finding aperto porta a `needs-human`.
- In `tests/review-log.test.ts`: la riga scritta conserva `by`.
- In `tests/architecture.test.ts` non cambia niente: lo schema del template e la copia in `.github/judge/` sono già confrontati byte a byte.

## Touchpoints

- `skills/harness-init/templates/scripts/judge.sh`: il comando `finding`, l'uso in testa, `check` che toglie `by` dal verdetto del giudice.
- `skills/harness-init/templates/judge/verdict.schema.json` e la copia `.github/judge/verdict.schema.json`: `by` sui finding.
- `skills/harness-init/templates/scripts/policy.sh`: la parola `umano` nel commento; la logica di merge non cambia.
- `skills/harness-init/templates/scripts/review-log.sh`: `by` nel log.
- `tests/judge.test.ts`, `tests/policy.test.ts`, `tests/review-log.test.ts`.
- `skills/judge/SKILL.md`, `skills/next/SKILL.md`, `docs/spec.md` (4.4, 4.6, 7.1), `docs/codebase-map.md`: prosa, su main.

## Notes

Il verdetto sta in `.git/harness/` del clone: `finding` va lanciato nel
clone dove `/judge` ha girato, di solito quello della sessione di `/next`.
In un altro clone il comando dice che non c'è verdetto, ed è giusto così.

La severity la sceglie l'umano. Un `low` umano non ferma niente, si dichiara
nella PR come i `low` del giudice; `high` e `medium` si rispondono con il
commit, e finché sono aperti la policy mette `needs-human` come oggi.

Nessun secondo giudizio (ADR-0003): il finding umano entra nel verdetto che
c'è, non ne produce uno nuovo.

Il ripensamento sulla spec, l'altra metà del caso di Tipoff, non è di questa
slice: è una frase in `skills/slice/SKILL.md` e `skills/next/SKILL.md`, prosa
su main, che nomina l'inbox come strada per un cambio da una riga.

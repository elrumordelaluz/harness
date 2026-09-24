---
id: S14
title: close.yml non chiude una slice mergiata fuori dal ramo di default
status: done
blocked_by: S15
tier: 2
human: false
spec: audit (PR #27)
---

## Goal

La PR #27 aveva per base `slice/S10-spec-e-slice-committano-su-main` e non
main. È stata mergiata il 2026-09-14 alle 15:06:48 UTC, e undici secondi dopo
`close.yml` ha committato `e289d07` su main mettendo `status: done` sul file
di S12. Su main quel lavoro non c'era: `skills/next/SKILL.md` non esisteva, e
non è esistito fino alla PR #29.

Il motivo è che il job parte su `pull_request: [closed]` con
`github.event.pull_request.merged == true` e nient'altro. Non guarda dove la
PR è stata mergiata. Per il workflow una PR mergiata in un branch qualsiasi e
una mergiata nel ramo di default sono lo stesso evento.

Il danno è nella board, che è quello che decide cosa si prende dopo. `/next`
legge `status` e `blocked_by` per calcolare le onde: un `done` falso rende
eleggibile una slice che dipende da lavoro che non c'è, e il subagent che la
prende costruisce sopra il vuoto. Lo stesso commit scrive anche le righe di
`verdicts.jsonl`, quindi il review log si riempie di verdetti di una PR che
il ramo di default non ha mai ricevuto, e l'audit legge quel file per tarare
le soglie.

Vale per ogni repo che monta la catena: il difetto sta nel template, non
nella copia di questo repo.

## Acceptance criteria

- [ ] Una PR mergiata in un ref che non è il ramo di default non fa scrivere niente a `close.yml`: né lo `status` della slice, né le righe del review log.
- [ ] Una PR mergiata nel ramo di default chiude la sua slice e scrive i verdetti esattamente come oggi.
- [ ] Il ramo di default si legge dall'evento, `github.event.repository.default_branch`, e non da `main` scritto a mano: il template gira anche dove il ramo si chiama altro.
- [ ] Un run che non fa niente per questa ragione lo dice nel summary del job, con il numero della PR e la base che aveva. Un workflow che tace è indistinguibile da uno che non è partito.
- [ ] Gli altri workflow che agiscono sul merge si controllano nello stesso giro, `automerge.yml` per primo: se anche loro trattano una PR stacked come una PR su main, il guard va anche lì.
- [ ] `.github/workflows/close.yml` e il suo template restano identici, e `tests/architecture.test.ts` continua a provarlo.

## Test plan

- Il guard è una condizione in YAML e non gira in Vitest. Quello che si prova qui è la sua presenza: un test che legge il workflow e verifica che la condizione del job nomini `base.ref` e `default_branch`, così una riscrittura che la perde torna rossa. Il rosso si scrive prima togliendo la condizione.
- La prova vera è una PR di prova mergiata in un branch che non è il ramo di default, con il job che salta e lo dice. Va nella sezione «Come verificare a mano» della PR.
- `tests/architecture.test.ts`: la copia di `close.yml` uguale al template, che è il check di S04 e va solo tenuto verde.
- Il resto della suite resta verde senza modifiche.

## Touchpoints

- `skills/harness-init/templates/github/close.yml`: la condizione del job `close`.
- `.github/workflows/close.yml`: la copia, che si riporta rilanciando la fase `judge` di `/harness-init`, che possiede il file.
- `skills/harness-init/templates/github/automerge.yml` e la sua copia, se il controllo trova lo stesso cieco.
- `tests/architecture.test.ts`.

## Notes

S08 tocca lo stesso job e resta `blocked`: lì il difetto è il push che perde
una corsa contro un altro merge, qui è il job che parte quando non deve. Non
si sovrappongono, ma chi arriva secondo ribasa.

`blocked_by: S15` per due motivi, e nessuno dei due è una dipendenza di
codice. Le due slice scrivono nello stesso file, `tests/architecture.test.ts`,
e in parallelo la seconda PR nascerebbe in conflitto. E chi prende questa
slice legge la suite per sapere se ha finito: conviene che il gate abbia
smesso di mentire prima, non dopo.

Il commit `e289d07` resta nella storia di main. Dice che S12 era `done`
quando non lo era, e la correzione è `a42c968`: la storia non si riscrive, si
corregge con un commit che spiega.

La base sbagliata della #27 è una scelta di chi ha aperto la PR, non un
difetto del workflow. Una PR stacked su un'altra slice è legittima e a volte
comoda. Quello che non è legittimo è che il merge di una PR stacked chiuda la
slice sul ramo di default: la slice è chiusa quando il lavoro arriva lì.

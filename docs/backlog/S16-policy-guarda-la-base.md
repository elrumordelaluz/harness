---
id: S16
title: policy.sh non mergia una PR che non atterra sul ramo di default
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-15)
---

## Goal

La 4.7 della spec 0.15 dice che un merge conta solo sul ramo di default e che
la riga vale per ogni cammino di merge della catena, `automerge.yml` e
`policy.sh`. S14 l'ha scritta in `close.yml` e in `automerge.yml`. In
`policy.sh` no: il suo cammino di decisione legge tier, verdetto, label, head
e stato della CI, e la base non la chiede mai. `baseRefName` nello script non
compare.

Con `HARNESS_AUTOMERGE` acceso, un `approve` a tier 1 su una PR stacked viene
mergiato dentro il branch di un'altra slice, senza nessuno a guardare.
`human-gate` non lo ferma, perché quella label la mette il path toccato e non
la base. Il danno alla board resta coperto, perché il guard di `close.yml`
sta sull'evento e vale chiunque abbia mergiato: la slice non va a `done` per
sbaglio. Quello che resta scoperto è il merge, cioè il momento in cui la
catena agisce da sola.

Vale adesso perché l'interruttore sta per andare `on`. Oggi in questo repo è
spento e il buco non morde; il passo 6 di ADR-0003 lo accende su Tipoff e
manda `/next` a chiudere le slice senza un click. `policy.sh` è un symlink al
template, quindi il difetto è di ogni repo che monta la catena.

Trovato dal giudice sulla PR #31. L'analisi è già scritta nel commento sopra
`the chain merges from two places and no more` in `tests/architecture.test.ts`,
che tiene fermo l'elenco dei punti di merge e dice che il cammino di decisione
di `policy.sh` non si tocca di passaggio, perché è di una slice sua. Questa.

## Acceptance criteria

- [ ] Con `HARNESS_AUTOMERGE` acceso, una PR la cui base non è il ramo di default non viene mergiata da `policy.sh`, a nessun tier e con qualunque verdetto.
- [ ] Quella PR riceve lo stesso il commento con il verdetto e la label del suo ruolo: cambia l'azione, non il fatto che il giudizio sia visibile. La riga di decisione dice la base che la PR aveva e perché nessuno ha mergiato, come un job di `close.yml` che salta lo scrive nel summary.
- [ ] Il ramo di default si legge dal repo e non da `main` scritto a mano: lo script gira anche dove il ramo si chiama altro, ed è la stessa ragione per cui S14 l'ha letto dall'evento.
- [ ] Una lettura vuota o fallita ferma il merge invece di lasciarlo passare: il campo che non arriva vale come base sconosciuta, e la decisione lo dice.
- [ ] Una PR basata sul ramo di default decide esattamente come oggi, e i casi già in `tests/policy.test.ts` restano verdi senza cambiare quello che asseriscono.
- [ ] Il test che tiene a due i punti di merge smette di essere solo un elenco: chiede a tutti e due di nominare la base, come già fa per `automerge.yml`, così un terzo cammino nasce con la domanda addosso.

## Test plan

- Il rosso si scrive prima, in `tests/policy.test.ts`: `HARNESS_AUTOMERGE=on`, tier 1, `approve`, base su un branch di slice. Oggi quel caso registra `gh pr merge` nel log dello stub, e deve smettere di registrarlo.
- Lo stub di `gh` in `tests/fixtures/bin/gh` non risponde né alla base della PR né al ramo di default del repo: la lettura nuova va aggiunta lì con la sua `STUB_*`. Il default della variabile è il caso sano, base uguale al ramo di default, altrimenti tutti i casi esistenti cambiano comportamento insieme e il verde non vuol più dire niente.
- Un caso per la lettura vuota: variabile vuota, nessun `gh pr merge` nel log, decisione che nomina il motivo.
- Un caso che prova che il commento e la label partono lo stesso quando la base ferma il merge: la PR non resta muta.
- `tests/architecture.test.ts`: il test dei due punti di merge si stringe, e il suo rosso si scrive togliendo la lettura da `policy.sh`.
- Il resto della suite resta verde senza modifiche.

## Touchpoints

- `skills/harness-init/templates/scripts/policy.sh`: la lettura della base accanto a quelle di label e head, e il ramo nella catena di decisione. `scripts/policy.sh` è il symlink e segue.
- `tests/policy.test.ts`: i casi nuovi.
- `tests/fixtures/bin/gh`: la risposta alle due letture nuove.
- `tests/architecture.test.ts`: il test dell'elenco dei punti di merge.

## Notes

Dove mettere il ramo nella catena è la decisione di chi prende la slice. Il
posto che somiglia di più è accanto a `human-gate`, che ha la stessa forma: la
macchina non mergia e lo dice. Ma non è la stessa cosa. `human-gate` è un
approve valido per l'umano che mergerà quella PR sul ramo di default; qui il
merge di questa PR non porta il lavoro dove deve arrivare, e l'umano che
mergia una PR stacked lo sta facendo per un altro motivo. Chi sceglie scriva
il perché accanto alla riga.

Non è la stessa lettura di `automerge.yml`. Là il workflow ha l'evento e il
campo `default_branch` del repository; qui siamo in un terminale o dentro
`judge.yml`, e il ramo di default va chiesto, che è una chiamata `gh` in più
per giudizio. È il costo da accettare: l'alternativa, `main` nello script,
rompe il template nei repo dove il ramo si chiama altro, ed è esattamente
quello che S14 ha evitato in `close.yml`.

La mappa dice che la lettura del ramo di default sotto `workflow_run`, quella
di `automerge.yml`, non è provata e non lo sarà finché l'interruttore è
spento. Questa slice non la prova: prova la propria, che è un'altra chiamata
su un'altra strada. Chi accende `HARNESS_AUTOMERGE` guardi comunque quel
primo run.

`HARNESS_AUTOMERGE` in questo repo è off e resta off: il caso si prova nei
test, non su una PR vera. Il primo merge non presidiato della catena sarà su
Tipoff, al passo 6 di ADR-0003, e questa slice viene prima per quello.

La riga di `docs/inbox.md` del 2026-09-15 su `policy.sh` esce dal file con il
commit che porta questa slice: le righe chiuse si tolgono, la storia sta in
git. Le altre quattro restano, e tre di loro sono del 2026-09-15 e parlano
d'altro.

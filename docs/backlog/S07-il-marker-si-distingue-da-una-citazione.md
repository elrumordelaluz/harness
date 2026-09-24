---
id: S07
title: Il marker di un commento si distingue da un marker citato dentro un altro commento
status: todo
blocked_by: S05
tier: 2
human: false
spec: audit (PR #14)
---

## Goal

I marker `<!-- verdict:<ruolo> -->` e `<!-- crash:<ruolo>:<sha> -->` dicono
dove sta il JSON di un verdetto e dove sta un crash. `policy.sh` li cerca per
decidere due cose distruttive: quale commento minimizzare come superato, e
quale riscrivere per intero con il corpo del crash. Il commento che sceglie
può essere il verdetto vivo dell'altro giudice.

PR #14 ha ristretto i due selettori. Prima ancoravano solo `(^|\n)`, quindi
una riga che si apriva col marker e poi commentava veniva presa: è la forma
che un giudice scrive davvero, il marker citato dentro un finding e la nota
di fianco. Ora sono ancorati ai due capi, e quel caso è chiuso.

Resta il caso che nessuna àncora chiude. Un marker da solo sulla sua riga,
dentro un blocco di codice, in un finding che parla proprio dei marker, è
byte per byte il marker vero. Il giudizio di sicurezza di PR #14 lo dice
così: le àncore non li distinguono perché non è rimasto niente da
distinguere. Un giudice che scrive un finding su questo meccanismo, come è
successo due volte in due giri su questa stessa catena, può far sparire il
verdetto vivo dell'altro ruolo, o farselo riscrivere sopra dal corpo di un
crash.

Serve un distinguo che il giudice che cita non possa riprodurre. Il verdetto
di sicurezza ne indica due: un nonce per run dentro il marker, oppure il
marker del crash cercato in fondo al corpo invece che ovunque.

## Acceptance criteria

- [ ] Un commento il cui corpo contiene il marker di un altro ruolo su una riga sua, dentro un blocco di codice, non viene né minimizzato né riscritto.
- [ ] Il criterio sopra vale anche quando il commento citante è scritto dallo stesso autore del commento vero: il distinguo non può poggiare sull'autore, che `policy.sh` controlla già per un altro motivo.
- [ ] Il marker vero resta trovabile da `review-log.sh` al merge, e i verdetti già postati sulle PR mergiate continuano a essere letti: il formato nuovo non orfana lo storico.
- [ ] `docs/review-log/verdicts.jsonl` si ricostruisce dalle PR chiuse prima e dopo il cambio con lo stesso comando, e il risultato è identico riga per riga per le PR di prima.
- [ ] Il formato del marker è scritto in un posto solo, e `policy.sh`, `review-log.sh` e i workflow che lo cercano lo prendono da lì invece di ricostruirlo ciascuno per conto suo.
- [ ] Un test prova il caso che ha aperto la slice: due verdetti sulla stessa PR, quello di un ruolo cita il marker dell'altro su una riga sua, e il verdetto citato sopravvive.

## Test plan

- `tests/policy.test.ts`: commento A è il verdetto vivo di `security`; commento B è il verdetto di `correctness` e cita `<!-- verdict:security -->` su una riga sua dentro un fence. Dopo `policy.sh`, A è ancora vivo. Rosso prima: oggi A viene minimizzato.
- `tests/policy.test.ts`: stesso schema sul ramo del crash, dove il commento non viene minimizzato ma riscritto, che è il danno peggiore.
- `tests/policy.test.ts`: il marker vero, quello che `policy.sh` ha scritto lei, viene ancora trovato e minimizzato al giudizio successivo dello stesso ruolo. Il fix non deve chiudere il buco smettendo di trovare niente.
- `tests/review-log.test.ts` o il describe equivalente: un commento nel formato vecchio, preso da una PR mergiata, viene ancora letto.
- `tests/architecture.test.ts`: il formato del marker vive in un posto solo, e nessuno dei file che lo usano se lo riscrive.

## Touchpoints

- `skills/harness-init/templates/scripts/policy.sh`: la costruzione del marker e i due selettori.
- `skills/harness-init/templates/scripts/review-log.sh`: la lettura al merge, e la compatibilità col formato vecchio.
- `skills/harness-init/templates/github/close.yml` e `judge.yml`: se cercano il marker per conto loro, e in quel caso anche le copie in `.github/workflows/`.
- `docs/spec.md`: il formato del marker, se diventa parte del contratto.

## Notes

Il nonce per run è la strada che il verdetto indica per prima e ha un costo:
va scritto dove `review-log.sh` lo ritrova al merge, quindi da qualche parte
che sopravvive al run che lo ha generato, e il candidato è il marker stesso
più una riga nel commento. La seconda strada, cercare il marker del crash in
fondo al corpo, è più piccola e copre solo il ramo del crash: non chiude il
selettore dei verdetti, che è quello che fa sparire un giudizio.

C'è una terza strada che il verdetto non nomina: non cercare per marker ma
per identità del commento, tenendo l'id restituito da GitHub alla creazione.
Costa uno stato che oggi non esiste e che deve sopravvivere tra un run e
l'altro, ed è il motivo per cui la catena usa i marker. Va valutata e
scartata per iscritto, non ignorata.

La scelta cambia un formato che esiste già sulle PR mergiate e che
`review-log.sh` legge per costruire l'audit, quindi è una decisione, non un
fix: se la valutazione delle tre strade non sta nel corpo della PR, va in un
ADR in `docs/decisions/` prima di scrivere il codice.

`blocked_by: S05` per lo stesso motivo di S06: finché una PR a tier 2 diventa
tier 3 e smette di essere giudicata, questa slice riceve un giudizio solo, e
il meccanismo che tocca è quello che i giudici usano per parlare.

Questa slice non nasce da un buco sfruttabile da un estraneo: `policy.sh`
guarda già l'autore e minimizza solo commenti del token, di un owner o di un
member. Nasce da due giudici della stessa catena che si pestano i piedi
scrivendo del meccanismo con cui scrivono, che su questo repo è successo due
volte in due giri.

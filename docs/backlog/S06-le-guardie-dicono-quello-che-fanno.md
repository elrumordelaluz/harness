---
id: S06
title: Le guardie della catena coprono quello che la riga sopra dichiara
status: todo
blocked_by: S05
tier: 2
human: false
spec: audit (PR #14)
---

## Goal

I due giudizi di PR #14 hanno aperto cinque finding su `judge.sh` e
`policy.sh` che sono la stessa forma: una guardia scritta più stretta della
frase che le sta sopra. Il commento dice la regola giusta, il codice ne copre
un pezzo, e il pezzo scoperto è invisibile finché non ci si finisce dentro.
Presi uno per uno sono `low`, e nessuno blocca. Presi insieme sono un modo di
sbagliare che questo repo ripete, e vale la pena chiuderli in un colpo mentre
la forma è ancora riconoscibile.

**`check` toglie quattro campi della catena su sette** (`judge.sh:339`,
medium). Prima di validare, `check` toglie i campi che riempie la catena,
perché un giudice che li scrive non deve poter decidere cosa finisce nello
store. Ne toglie quattro, ma `pr`, `judge.where` e `cost` sono campi della
catena allo stesso titolo. Se un giudice ne scrive uno malformato, la
validazione fallisce, il ruolo non archivia niente, e la sua PR non si apre:
è esattamente il fallimento che PR #14 ha chiuso per `head_sha` e `base_sha`,
lasciato aperto sugli altri tre.

**`have` risponde 3 per due motivi diversi** (`judge.sh:417`, low). Un
verdetto giudicato contro un'altra base e una base che non risolve affatto
danno la stessa risposta, quindi il rifiuto incolpa il verdetto quando il
problema è il ref. Chi legge il messaggio va a cercare dalla parte sbagliata.

**`have` risponde 0 su una base vuota** (`judge.sh:415`, low). È l'unico ramo
della catena dove non sapere è un sì: con la base vuota la guardia salta
proprio il controllo che PR #14 ha aggiunto. Oggi non è raggiungibile, perché
`ensure-verdict.sh` la base la calcola prima per il tier, ma la guardia ha la
forma opposta a quella che il branch dichiara, e la sua irraggiungibilità
dipende da un altro file.

**`policy.sh` si fida del primo argomento in locale** (`policy.sh:193`, low).
«O il campo viene dalla catena o non c'è» vale sul ramo ci. In locale
`base_sha`, `outcome` e `audit` restano quelli del file passato come primo
argomento, e a tenerli puliti è solo il fatto che la skill di `/judge` passi
il path dello store invece del verdetto grezzo. La garanzia è vera per
convenzione del chiamante, non per costruzione.

**`HEAD_SHA` entra in una regex senza essere uno sha** (`policy.sh:129`,
low). Il marker del crash si costruisce per concatenazione e `policy.sh`
controlla `HEAD_SHA` solo quando manca, mai per forma. Un valore con un
metacarattere allargherebbe il selettore, e quel selettore riscrive il corpo
di un commento che ha già passato il controllo sull'autore.

## Acceptance criteria

- [ ] `check` toglie tutti i campi che riempie la catena prima di validare, e la lista è una sola, in un posto solo: `pr`, `judge.where` e `cost` inclusi.
- [ ] Un verdetto che arriva dal giudice con uno qualsiasi di quei campi malformato viene comunque archiviato, e il campo è quello che scrive la catena: un test per campo, non uno solo sul primo della lista.
- [ ] Lo schema e la lista dei campi della catena non possono divergere in silenzio: un test struttura li confronta e nomina il campo che manca da una delle due parti.
- [ ] `have` distingue «giudicato contro un'altra base» da «questa base non risolve», con due uscite diverse, e il messaggio del rifiuto nomina il ref quando il problema è il ref.
- [ ] `have` con una base vuota rifiuta invece di rispondere 0: nessun ramo della catena tratta il non sapere come un via libera, indipendentemente da chi la chiama.
- [ ] `policy.sh` toglie `base_sha`, `outcome` e `audit` dal file che riceve sul ramo locale come già fa su quello ci, e un test lo prova passando un verdetto grezzo con quei campi riempiti a mano.
- [ ] `policy.sh` controlla `HEAD_SHA` come sha prima di costruire il marker, e un valore che non lo è finisce dove finisce un giudice crashato invece che dentro una regex.

## Test plan

- `tests/judge.test.ts`: `it.each` sui campi della catena, uno per volta malformato nel verdetto in ingresso, `check` archivia lo stesso. Rosso prima su `pr`, `judge.where` e `cost`, già verde su `head_sha` e `base_sha`.
- `tests/architecture.test.ts`: la lista dei campi della catena in `judge.sh` contro i campi che lo schema dichiara scritti dalla catena. Fallisce nominando il campo e il file da cui manca.
- `tests/judge.test.ts`: `have` con base che non risolve, con base diversa da quella del verdetto, con base vuota. Tre uscite, tre messaggi, e il caso vuoto rifiuta.
- `tests/policy.test.ts`: un verdetto grezzo con `base_sha`, `outcome` e `audit` riempiti a mano, passato sul ramo locale; il commento e il review log portano quelli della catena.
- `tests/policy.test.ts`: `HEAD_SHA` con un metacarattere, `policy.sh` esce come per un crash e non tocca nessun commento. Rosso prima.

## Touchpoints

- `skills/harness-init/templates/scripts/judge.sh`: la lista dei campi in `check`, le uscite di `have`.
- `skills/harness-init/templates/scripts/policy.sh`: il ramo locale della riga 193, il controllo su `HEAD_SHA` prima della riga 129.
- `skills/harness-init/templates/judge/verdict.schema.json`: solo se il confronto struttura chiede di marcare quali campi sono della catena.
- `tests/judge.test.ts`, `tests/policy.test.ts`, `tests/architecture.test.ts`.

## Notes

Cinque finding, cinque `low` tranne il primo che è `medium`, tutti dichiarati
nel corpo di PR #14 e nessuno bloccante. Stanno insieme perché il fix è lo
stesso gesto ripetuto, non perché siano lo stesso bug: se durante il lavoro
uno dei cinque si allarga, esce e diventa una slice sua.

Un sesto finding di quel giudizio non entra qui e non è codice: il corpo del
commit `4904337` conta sei campi in `cost` dove lo schema ne dichiara sette.
La storia è scritta e riscriverla per una parola costa più di quanto valga.
Resta dichiarato in PR #14.

`blocked_by: S05` non è una dipendenza di codice: le due slice toccano file
diversi e potrebbero girare in parallelo. È che finché il tier 2 si escalation
da solo a tier 3, la PR di questa slice smette di essere giudicata dopo il
primo verdetto, e questa è una slice che si giudica da sola male. Prima si
ripara la catena, poi la si usa.

Il marker che non si distingue da una sua citazione è l'altro finding di
sicurezza dello stesso giudizio e non sta qui: cambia un formato che esiste
già sulle PR mergiate, quindi è S07.

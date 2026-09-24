# ADR-0001: il giudice locale prima del cloud, e la catena finita qui prima di Tipoff

Data: 2026-09-08. Stato: proposta, accettata al merge della PR che la porta.

## Contesto

Nove PR dal 7 settembre, tutte mergiate a mano, quattro finite a tier 3 per `needs-human`. Dei 90 file tracciati, 46 stanno nei path sensibili di `AGENTS.md` e altri 3 non sono mai tier 0: il prodotto di questo repo sono i template, gli script e i workflow, cioè esattamente ciò che la policy protegge. Ogni modifica vera è tier 2 per costruzione, e a tier 2 girano due giudici e la policy manda comunque a `needs-human`, anche con due `approve` e nessun finding alto, come su PR #9. Qui il giudice non decide mai: pre-digerisce per un umano che poi legge anche il diff.

Quattordici verdetti su sei PR, 25 dollari di listino, 364 turni, 77 minuti di giudice. Tre finding `high`, due veri (il gate umano montato su una sola porta di merge, la deriva tra symlink e copie in `.github/`). Otto verdetti su quattordici sono rigiudizi della stessa PR dopo un push. Il campo `human_reason`, che dovrebbe dire all'umano cosa decidere, non è mai comparso: tutti e quattordici sono usciti dal prompt precedente a S01, arrivato su `main` solo con PR #9, perché il giudice legge il proprio workflow dal default branch e una correzione al giudice si vede alla PR dopo. Per due slice i workflow di `.github/` erano copie vecchie mentre gli script erano symlink aggiornati, e nessun test lo vedeva (S04).

Il costo non viene dal modello ma dalla forma: il giudice esplora il repo con strumenti per 20 o 30 turni, con mezzo milione di token in cache riletti a ogni giro, e il verdetto arriva quando la sessione che ha scritto il codice è già chiusa. Il prezzo è quello di listino che l'action riporta; con il token dell'abbonamento esce dalla quota del piano, la stessa delle sessioni interattive.

L'appunto fondativo dice che la presenza deve essere strategica e non costante. Su questo repo l'umano ha aspettato ogni PR. La wiki riporta la regola di Lopopolo: quando l'agente fatica, la risposta è lo strumento che manca, non una persona che aspetta.

## Decisione

1. Su questo repo la catena gira con hook, gate CI e label del tier. `judge.yml` è spento dal 2026-09-08 con `gh workflow disable judge`, finché non esiste la versione a richiesta; `gh workflow enable judge` è l'undo. Ogni PR resta a merge umano, `HARNESS_AUTOMERGE` resta `off`.
2. `/judge` locale è il giudizio di default prima della PR, in ogni repo. È un subagent a contesto fresco, mai un fork della sessione che ha scritto il codice, e riceve gli artefatti inline: il diff contro la base, il file della slice, `AGENTS.md`, `docs/codebase-map.md`, l'esito dei quattro comandi. Stesso prompt di `.github/judge/prompt.md`, stesso schema, un passaggio solo. Scrive `verdict.json` per la head corrente; dopo `gh pr create` lo posta `scripts/policy.sh`, con lo stesso marker della CI, così `review-log.sh` lo logga e la PR mostra un verdetto come oggi.
3. Il gemello meccanico è un hook `PreToolUse` in `.claude/settings.json` su `gh pr create`: senza un verdetto per HEAD la PR non si apre e l'hook dice di lanciare `/judge`. La regola sta nell'hook, non nella memoria del modello.
4. Il giudice cloud diventa il fallback. Gira al primo ci verde solo se la head non ha già un verdetto con marker, poi solo con la label `judge:again`, che il workflow toglie dopo aver girato. A tier 1 il rigiudizio resta automatico, perché è il verdetto a sbloccare l'automerge. È l'intent `giudizio-a-richiesta`, con il verdetto locale come prima causa di salto.
5. A tier 2 con due `approve` e nessun finding `high` l'umano riceve una riga da decidere, merge sì o no, con la notifica e senza `needs-human`. `needs-human` resta per i verdetti che chiedono una decisione e porta `human_reason` in testa.
6. Le sei skill si scrivono in questo repo, nell'ordine `/judge`, `/spec`, `/slice`, `/next`, `/board`, `/audit`, ciascuna provata sul lavoro vero di questo repo: il primo uso di `/spec` è l'intent `giudizio-a-richiesta`, il primo uso di `/slice` è quella spec, il primo uso di `/next` è una di quelle slice. Tipoff parte dopo, con la catena intera, senza la fase di due settimane a guardare il giudice cloud.

## Alternative scartate

Continuare il dogfooding completo qui. Il repo è fatto di path sensibili, il giudice non decide niente e ogni correzione al giudice si vede una PR dopo: il ciclo di feedback è il più lento possibile proprio dove serve il più veloce.

Cambiare modello o tagliare i turni del giudice cloud. Riduce il costo, non l'attesa: il verdetto arriva comunque dopo la PR, quando la sessione che poteva correggere è chiusa.

Togliere il giudice. I due finding veri li ha trovati lui, e il contesto pulito resta il principio 7. La forma locale tiene il contesto pulito e il log a una frazione del costo.

CodeRabbit o Copilot code review come giudice. Già escluse in 6.3 della spec, per le stesse ragioni: verdetto non strutturato, niente gate deterministici prima, niente audit.

## Conseguenze

Modo di lavoro su questo repo da oggi: un branch per passo, una PR, i quattro comandi più `scripts/tier.sh main` e `scripts/prose.sh` in locale, `/judge` prima della PR appena esiste, merge umano. Niente gira nel cloud a pagamento.

`docs/spec.md` sale a 0.9 nella prima PR che cambia il comportamento, con la riga in "Cosa cambia": 4.6 per il giudice locale come default e il cloud come fallback, e per la riga da decidere a tier 2; 5.5 per la forma di `/judge`; 6.1 per l'hook su `gh pr create`; 9.3 per l'ordine nuovo.

L'App GitHub di Claude si può disinstallare dal repo: con `judge.yml` spento nessun workflow la chiama. L'App dell'harness (`HARNESS_APP_ID`) resta, perché `close.yml` la usa. Se a essere scollegato è il login locale di `gh`, le PR le apre l'umano con i comandi che la sessione stampa.

Quello che resta umano qui: il merge di ogni PR, l'approvazione delle spec, questa decisione.

Fuori scope: Docket, la modalità team, `HARNESS_AUTOMERGE` acceso, `gc.yml`.

## Ordine di lavoro

0. Aprire la PR del file di S04, che sta sul branch locale `backlog/audit-drift-github`, e quella di questo ADR con il suo intent. Merge a mano, tier 0.
1. S04: il test che confronta `.github/workflows/` con i template. Piccolo, e protegge tutto il resto.
2. `/judge` locale, l'hook su `gh pr create`, `policy.sh` che posta il verdetto locale, `judge.yml` che salta una head già giudicata. Spec 0.9.
3. `/spec`, provata su `docs/intent/giudizio-a-richiesta.md` fino a `status: approved`.
4. `/slice` su quella spec, poi `/next` sulle slice che ne escono: il giudice a richiesta e la riga da decidere a tier 2.
5. `/board` e `/audit`.
6. Rilanciare le fasi `ci` e `judge` di `/harness-init` qui, così `.github/` torna uguale ai template, e riaccendere `judge.yml`. Poi Tipoff.

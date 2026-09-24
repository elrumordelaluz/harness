# ADR-0003: i documenti su main, il giudice una volta, `/next` prima di tutto

Data: 2026-09-11. Stato: accettata da Lionel nella conversazione che l'ha scritta. Arriva su main con PR #22, l'ultima PR di documenti: dal prossimo, un ADR è un commit su main, per la decisione 1 qui sotto.

## Contesto

L'11 settembre Lionel ha detto, con le sue parole: sono diverse sessioni in cui itero di più che lavorando nel metodo precedente; troppi step umani, mi stanno bloccando; ho scritto uno slice, ok l'intervista, dopo in un run mi aspetto tutto fatto; non mi piace nemmeno quante volte si chiama `/judge`; o lo risolviamo o riparto da zero con un altro agente.

I numeri di Tipoff gli danno ragione. La feature esc-key, undici file e zero path sensibili, è costata tre PR mergiate a mano prima di una riga di codice: l'intent (#5), la spec (#6) e la board delle slice che ancora non esiste. Con `/next` come lo descrive ADR-0002 ogni slice avrebbe aggiunto un `/judge`, un giro di fix, un secondo `/judge`, una PR e un click, perché `HARNESS_AUTOMERGE` è off e ogni tier 2 finisce a `needs-human`. Per due slice sono cinque merge umani e quattro giudizi. Dopo otto giorni di harness su Tipoff il codice di prodotto mergiato è zero.

I finding sull'harness hanno una causa precisa. Sul branch `harness/judge` di Tipoff stanno sei commit che non riguardano il prodotto: `tier.sh` riallineato al template, la riga `Mai tier 0`, `intent.sh`, il README del backlog, `.claude/` tracciato. Le skill confrontano il repo con il template corrente, i template copiati derivano, e ogni sessione parte per fare una slice e finisce a riparare l'harness. Nel repo dell'harness lo stesso fix a `tier.sh` era rimasto non committato. Ogni prova genera manutenzione, la manutenzione genera una PR a tier 2 qui, la PR chiede un giudizio.

La parte alta della catena è stata costruita nell'ordine sbagliato una seconda volta, dopo che ADR-0002 lo aveva detto della parte bassa: esistono `/spec` e `/slice`, due skill che producono documenti e PR, e non esiste `/next`, l'unica che produce codice. Quello che Lionel si aspetta, un run dopo l'intervista e tutto fatto, è `/next`.

Il codice non è il problema. Gli script, i 249 test e i workflow reggono. Il costo viene da due decisioni della spec: i documenti che viaggiano come PR a merge umano, e il giudice che gira più volte per PR. Sono decisioni, e si cambiano qui.

## Decisione

1. **I documenti vanno su main, senza PR.** Intent, spec, slice, ADR e righe dell'inbox si scrivono con l'umano nella stanza, e il sì detto nella conversazione è l'approvazione. `/spec` al sì mette `status: approved` e `approved: <data>` nel frontmatter e fa un commit su main, `docs(spec): <slug> approved`, con nel corpo le decisioni confermate una per riga: quel commit è il verbale, `git log -- docs/` è la storia, e la spec stessa tiene le decisioni bloccate con il perché. `/slice` stampa la board, fa la sua domanda, e al sì committa `docs(backlog): <slug>` su main. `scripts/intent.sh open` committa e pusha su main. L'interruttore è per repo, nella sezione "Gate umani" di `AGENTS.md`: la riga `Documenti: su main` per chi lavora da solo, `Documenti: PR` in team, dove il gate umano torna a essere un merge. La riga la leggono gli hook e le skill, come `tier.sh` legge le altre righe di policy: `pre-commit` e `pre-push` lasciano passare su main un commit i cui file stanno tutti nei path della riga "Merge umano per path" quando la riga dice `su main`, e rifiutano tutto il resto come oggi. `docs/review-log/` resta di `close.yml`, che già scrive su main con il token dell'App. Il flag per run che Lionel ha proposto, un `automerge: true` all'inizio, diventa questa riga: una regola che il modello deve ricordare a ogni run è quello che gli hook esistono per sostituire.

2. **Il giudice gira una volta per PR, dopo il codice.** Un passaggio per ruolo, in locale, sull'ultimo commit del lavoro. I finding `high` e `medium` si correggono nella stessa sessione e ciascuno si risponde con il commit che lo chiude: `scripts/judge.sh answer <id> <sha>` lo scrive nel verdetto archiviato sotto la git dir. I `low` si dichiarano nel corpo della PR. Nessuno rigiudica: l'hook su `gh pr create` accetta il verdetto di un commit antenato della head, sullo stesso branch, quando ogni finding `high` e `medium` ha una risposta, e `policy.sh` posta il verdetto con le risposte dentro. A tier 1 un `request-changes` con tutti i finding risposti vale `approve` per la policy, che scrive `answered` nel log invece di `approve`. A tier 2 i due ruoli girano una volta ciascuno, insieme: con due `approve`, o risposti, e nessun `high` aperto la policy mergia; altrimenti `needs-human` con `human_reason` in testa. È la decisione che ADR-0002 aveva rimandato a questo ADR, presa. Il giudice cloud resta spento, `fix.yml` non gira, la label `fix-round` non si usa più. La verità di una risposta, cioè se il commit chiude davvero il finding, non la verifica nessuna macchina: la verifica l'audit, in Docket, leggendo verdetto e diff insieme, ed è la cosa per cui l'audit esiste.

3. **`/next` si scrive adesso, prima di `/board`, e "vai" chiude tutto.** La sessione che dice "vai" è l'orchestratore: legge la board, prende le slice eleggibili a onde, e per ogni slice apre un subagent a contesto pulito che fa il lavoro di 4.4: branch e push, test prima, i quattro comandi, commit dal verde. Poi `/judge` una volta, con il modello per tier di ADR-0002 (Sonnet 5 a tier 1, Opus 5 a tier 2); i finding tornano allo stesso subagent, che li corregge e li risponde; PR, `policy.sh` che posta, attesa del merge, `close.yml` che porta la slice a `done`, onda successiva da main aggiornato. Una slice che trova una decisione che la spec non copre va a `status: blocked`, PR in draft, domanda di una riga; le altre slice dell'onda continuano e la domanda arriva alla fine. L'hand-back è una riga per PR, con il verdetto in una frase, più "come verificare a mano" dove la slice ha passi manuali nelle Notes. Nessun racconto del codice: sta nel corpo della PR. `HARNESS_AUTOMERGE` va `on` su Tipoff dal primo run di `/next`: senza, `/next` apre PR che aspettano comunque un click. Una slice sola, nominata, resta possibile: "vai" è il default.

4. **Le skill non fanno manutenzione all'harness nel repo dove lavorano.** Un template indietro, una riga mancante in `AGENTS.md`, uno script che si comporta male: la skill scrive una riga datata in `docs/inbox.md` del repo e va avanti con quello che c'è. La correzione si fa nel repo dell'harness, in una sessione sua, e arriva nel repo rilanciando la fase di `/harness-init` che possiede il file, che è idempotente. L'unico caso in cui la skill si ferma resta quello di oggi: manca la cartella che deve scrivere, quindi non c'è harness. Nel repo dell'harness la stessa regola si applica a se stessa: la prosa, `docs/**`, `skills/**/SKILL.md` e `skills/spec/templates/SPEC.md`, va su main con la riga `Documenti: su main` allargata a quei path; script, hook, workflow, test e `package.json` passano da una PR con i quattro gate e il merge di Lionel; il giudice su questo repo non gira più per default, l'hook del verdetto esce da `.claude/settings.json` di questo repo e resta nel template, e `/judge` si lancia quando Lionel lo chiede, come audit.

5. **Chi fa cosa da qui.** La sessione di implementazione gira con Opus 5, a contesto pulito, da `AGENTS.md`, dalla mappa, da questo ADR e dalle slice S09-S13, nell'ordine sotto, e non si ferma prima del passo 6: l'harness è pronto quando su Tipoff due slice di esc-key sono mergiate dalla policy senza un click. Fable arriva dopo, per l'audit: legge i verdetti e le PR di Tipoff in Docket con Lionel, e se qualcosa va cambiato è ADR-0004. Restano umani, per feature: scrivere l'intent, rispondere all'intervista, la domanda della board, il merge di un tier 2 con un `high` aperto o un `needs-human`, l'audit.

## Alternative scartate

Ripartire da zero con un altro agente. Riprodurrebbe gli script, i test e i workflow tra un mese e lascerebbe le stesse due domande, chi mergia i documenti e quante volte gira il giudice, senza risposta. Le due risposte stanno in questo file e costano cinque slice.

Un secondo giudizio economico, ristretto ai fix. Tiene l'invariante "un verdetto per commit" e costa una frazione, ma è un giudizio in più, e il punto di Lionel è il numero di giri, non solo il prezzo. La risposta per finding con lo sha lascia la verifica a chi già la fa, l'audit.

Una PR per spec con merge umano, togliendo solo intent e board. È il caso team, e la riga `Documenti: PR` lo copre. Da soli il merge di una PR che si è appena dettata non aggiunge niente al sì detto un minuto prima.

Il flag per run, `automerge: true` in testa alla sessione, come l'auto mode di Claude Code. Scelto invece per repo, in `AGENTS.md`: un flag per run lo deve ricordare il modello, una riga del repo la leggono gli hook.

Saltare il giudice sotto un tier o per tipo di modifica. Già scartato in ADR-0002, per le stesse ragioni: taglia per dimensione o per etichetta, non per quello che il giudice sa aggiungere.

## Conseguenze

`docs/spec.md` sale a 0.14 con questa decisione, e le righe in "Cosa cambia" nominano le sezioni: 4.1, 4.2, 4.3 e 5.2, 5.3 per i documenti su main; 4.4, 4.6, 5.4 e 5.5 per il giudice una volta e le risposte, la riga di tier 2 della policy e "vai"; 6.1 per gli hook che leggono la riga `Documenti`; 9.3 per l'ordine nuovo; 11 per la decisione su tier 2 e l'automerge, chiusa.

Di ADR-0002 restano in piedi le decisioni 1, 2, 4, 5, 6 e 7. La 3 si allarga: `/next` è interattivo e "vai" prende tutte le slice eleggibili, e il giro di giudizio non è più "chiuso al secondo" ma uno. L'8 resta senza la PR: l'umano approva il piano una volta per spec, sulla board stampata. L'ordine di lavoro di ADR-0002 è sostituito da quello qui sotto. Di ADR-0001 resta tutto, e l'hook della decisione 3 cambia solo in cosa accetta.

S05, S06, S07 e S08 restano `blocked`, per le stesse ragioni di ADR-0002.

Dopo il passo 6 il flusso per una feature su Tipoff è: dieci righe di intent, l'intervista di `/spec`, la board di `/slice` con una domanda, "vai". Quattro momenti umani, tutti all'inizio, e l'audit a settimana.

## Ordine di lavoro

0. Lionel mergia PR #22 com'è: porta `/slice`, il fix a `tier.sh`, questo ADR, le slice S09-S13 e la spec 0.14. Il checkout dell'harness torna su main e ci resta, perché i symlink delle skill puntano al working tree. Finché S09 non è su main, un commit di documenti su main si fa con `HARNESS_ALLOW_MAIN=1`.
1. S09, i documenti su main: gli hook leggono la riga `Documenti`, `intent.sh open` committa su main, i README di `docs/intent/`, `docs/specs/` e `docs/backlog/` qui e nei template dicono il flusso nuovo, il template di `AGENTS.md` porta la riga.
2. S10, `/spec` e `/slice` committano su main: niente branch `spec/<slug>` e `backlog/<slug>`, il campo `approved:`, il commit di approvazione con le decisioni nel corpo.
3. S11, il giudice una volta: `judge.sh answer`, l'hook che accetta un verdetto antenato con i finding risposti, `policy.sh` con `answered` e la riga di tier 2 che mergia, la skill `/judge` senza "run again".
4. S12, `/next`: la skill, il symlink, il modello per tier, la prova su una slice di Tipoff.
5. S13, le skill non fanno manutenzione all'harness: il guardrail nelle quattro skill, `docs/inbox.md` nei template e nella fase `local`, questo repo senza hook del verdetto e con la prosa su main.
6. Tipoff pronto: le fasi `local`, `ci` e `judge` di `/harness-init` rilanciate dal main dell'harness, così i sei commit di `harness/judge` diventano inutili o si mergiano prima; `HARNESS_AUTOMERGE=on`; `judge.yml` resta spento; `/slice docs/specs/SPEC-esc-key.md`; `/next` con "vai" fino a quando le due slice sono mergiate dalla policy. Poi la nota di memoria `prove-su-tipoff` aggiornata con l'esito.
7. Fable, con Lionel: l'audit dei verdetti di Tipoff in Docket, e ADR-0004 se serve.

---
status: approved
intent: docs/intent/board.md
date: 2026-09-16
approved: 2026-09-16
---

# SPEC: la skill `/board`

## Problema

Ogni sessione a freddo su questo repo ricostruisce la board a mano: un grep sui frontmatter di `docs/backlog/S*.md`, `gh pr list`, `docs/inbox.md` riga per riga, l'ordine di lavoro dell'ADR in vigore incrociato con `git log` per sapere a che passo sta il piano. Il 15 settembre, per scegliere fra due raccomandazioni difendibili, sono servite quattro fonti in quattro posti, e la sessione non ha visto che S05-S08 aspettavano proprio la skill che mancava: quattro slice ferme per la stessa ragione, due dette `blocked` e due `todo`. La spec della catena (5.7) promette la schermata e la prossima azione con un motivo, ma descrive solo il menu, backlog e PR aperte, non l'ordine.

## Soluzione

La schermata la costruisce uno script, `scripts/board.sh`, non la skill. Lo script legge i frontmatter di `docs/backlog/S*.md`, le righe di `docs/inbox.md`, la sezione `## Ordine di lavoro` dell'ADR in vigore e le PR aperte con `gh pr list --json`, e stampa la board in quaranta righe; con `--json` stampa gli stessi dati come un oggetto, che è il modello dei dati per ogni altro lettore, la vista HTML della roadmap compresa. Bash 3.2 e jq, come gli altri script dei template, e i test in `tests/board.test.ts` su un repo usa e getta. La skill `/board` lancia lo script, mostra l'output, applica la regola scritta della prossima azione e fa le domande sull'inbox, scrivendo solo lì con il sì.

## User stories con criteri

Come chi apre una sessione a freddo, lancio `/board` e vedo lo stato in una schermata.

- [ ] La board sta in quaranta righe.
- [ ] Le slice `done` non si elencano: sono un conteggio in testa alla sezione delle slice, per esempio `13 done`.
- [ ] Una sezione vuota è una riga che dice che è vuota: un lettore a freddo può dire che non c'era niente, non chiedersi se la board l'ha saltata.

Come chi apre una sessione a freddo, leggo in fondo alla board la prossima azione e il suo motivo.

- [ ] La prossima azione la sceglie una regola scritta nella skill, in ordine fisso, e la prima che scatta vince: una PR aperta che aspetta un umano (`human-gate`, `needs-human`, tier 3); una slice eleggibile, azione `/next`; una spec `approved` senza slice su main, azione `/slice`; un intent senza spec, azione `/spec`; il passo del piano in vigore, se il backlog non lo ha superato; altrimenti leggere l'inbox.
- [ ] La riga di motivo nomina la regola che ha vinto e il fatto che l'ha fatta scattare, per esempio "S05 è eleggibile da quando `/board` esiste".
- [ ] "Eleggibile" è la definizione della sezione 2 di `skills/next/SKILL.md`: `status: todo`, ogni `blocked_by` in `done`, `human: false`. La board e `/next` non possono disaccordare su cosa viene dopo.

Come chi apre una sessione a freddo, vedo a che passo sta il piano in vigore senza aprire l'ADR.

- [ ] Il piano in vigore è l'ADR più recente in `docs/decisions/` con una sezione `## Ordine di lavoro`; oggi ADR-0003, perché ADR-0004 non ce l'ha. Nessun file nuovo e nessun campo nuovo lo nomina.
- [ ] La board stampa i passi numerati di quella sezione. Un passo le cui slice nominate con `S<NN>` sono tutte `done` è fatto; il primo non fatto è quello corrente; un passo che non nomina nessuna slice, come il 6 e il 7 di ADR-0003, si stampa "a mano".
- [ ] Il backlog è andato oltre quando su main esiste una slice con id più alto di ogni id nominato dal piano, e la board lo segna accanto al piano: oggi S14-S17 rispetto a un ADR che si ferma a S13.

Come chi legge la board, vedo perché una slice è ferma senza aprire il file.

- [ ] `blocked_by` accetta l'id di una slice, `S<NN>`, o l'id di un ADR, `ADR-<nnnn>`, in lista. La board stampa "ferma per ADR-0002" leggendo il campo, non la prosa di `## Blocked`.
- [ ] `status: blocked` vuol dire una cosa sola, quella del passo 3 della sezione 4.4 della spec della catena: presa in carico e lasciata a metà, con `## Blocked` e la PR in draft. Una slice mai presa è `todo`.
- [ ] S05 e S08 sono `status: todo` con `blocked_by: ADR-0002`; S06 e S07 restano `todo` dietro S05. `/next` non cambia: un ADR non è mai una slice `done`, quindi le quattro restano fuori dalle onde finché un umano toglie l'ADR dal campo.
- [ ] `docs/backlog/README.md`, la sua copia nei template e la 4.3 della spec della catena dicono i due valori del campo.

Come chi apre la board, rispondo a ogni riga di inbox con una parola e la riga sparisce.

- [ ] Per ogni riga aperta di `docs/inbox.md` la skill fa una domanda con tre risposte: intent, slice, via. Ogni risposta toglie la riga dall'inbox ed è un commit su main, uno per riga.
- [ ] "Via": il commit porta solo la riga tolta.
- [ ] "Slice": la skill scrive `docs/backlog/S<NN>-<slug>.md` con l'id dopo il più alto su main, `status: todo`, `spec: inbox (<data della riga>)`, il Goal dalla riga, criteri e touchpoint ricavati leggendo il codice che la riga nomina; il commit `docs(backlog): S<NN> dall'inbox` porta la slice e la riga tolta insieme, e la slice è eleggibile subito.
- [ ] "Intent": la skill lancia `scripts/intent.sh new <slug>`, toglie la riga con un commit e si ferma: le dieci righe le scrive l'umano e il commit dell'intent lo fa `intent.sh open`.
- [ ] Una riga è una risposta: una riga che nomina più cose si spezza a mano prima.

Come chi legge la board, vedo cosa aspetta un umano e mi fido di una sezione vuota.

- [ ] "Cosa aspetta un umano" sono le PR aperte con label `human-gate`, `needs-human` o `tier:3`, e le spec con `status: draft` in `docs/specs/`, che sono interviste da riprendere. Niente altro.
- [ ] Con `gh` assente o non loggato la sezione delle PR dice "gh non disponibile", non "nessuna", e lo script esce 0.

Come chi lavora in un repo di progetto, ho la stessa board.

- [ ] `board.sh` è un template di `scripts/` e lo porta la fase `local` di `/harness-init`; la skill sta in `~/.claude/skills/board` come le altre e non è copiata nei repo.
- [ ] `scripts/board.sh --json` stampa un oggetto con le chiavi `slices`, `prs`, `inbox`, `plan`, `next`, gli stessi nomi delle sezioni della schermata, e nessun campo in più.

## Decisioni bloccate

- Forma: la schermata la calcola `scripts/board.sh`, con `--json` per gli altri lettori, e `/board` è il wrapper che la mostra e fa le domande. Deciso nell'intervista: da un terminale lo script costa zero token e zero attesa, dà la stessa schermata ogni volta, e le regole della board, le quaranta righe, le sezioni vuote, il passo del piano, il segno "oltre", si testano solo se le calcola uno script; `--json` è il modello dei dati che la roadmap HTML legge dopo. Scartata l'alternativa in cui la skill legge tutto e compone la schermata in prosa come `/slice`: niente script da mantenere, ma ogni sessione ricostruisce la board con tool call, le quaranta righe restano un'intenzione e la roadmap rifà la lettura per conto suo.
- La prossima azione la sceglie una regola scritta in ordine fisso, non il ragionamento del modello sulla schermata. Deciso nell'intervista: una regola scritta è verificabile e dà la stessa risposta in due sessioni; il 15 settembre il ragionamento libero ha prodotto due raccomandazioni difendibili. Scartata l'alternativa del modello che ragiona, più adatta ai casi strani.
- Il passo del piano si deriva dall'ADR in vigore, l'ultimo con `## Ordine di lavoro`, leggendo gli id `S<NN>` di ogni passo: nessun file nuovo, nessun campo in `AGENTS.md`. Deciso nell'intervista: un puntatore da aggiornare a mano invecchia come la riga di inbox del 15 settembre; il costo è la convenzione che un passo nomini le sue slice con `S<NN>`, che ADR-0003 rispetta già in cinque passi su sette. Scartata l'alternativa in cui il piano non è un oggetto della board e `blocked_by` è l'unico ordine: perde il passo 6, che non è una slice ed è il criterio di accettazione dell'harness.
- Una slice ferma per una decisione porta l'ADR in `blocked_by` e resta `todo`; nessun campo nuovo. Deciso nell'intervista, con il principio di Lionel: ogni cosa deve far risparmiare tempo a chi sviluppa, leggere in fretta e procedere in fretta, e un campo in più è una cosa in più che ogni lettore, `/next` compreso, deve imparare. Scartata l'alternativa di un campo `blocked_reason` o `held_by`.
- Ogni risposta su una riga di inbox toglie la riga ed è un commit su main; "slice" scrive la slice nello stesso commit, "intent" apre lo scheletro e si ferma perché l'intent lo scrive solo un umano. Deciso nell'intervista: una risposta, un commit, niente stato a metà, e la board rilanciata non mostra più la riga.
- Cosa aspetta un umano è una lista chiusa: le tre label sulle PR e le spec `draft`. Deciso al checkpoint.
- Una fonte che non si può leggere lo dice nella sua sezione e non ferma la board. Deciso al checkpoint, per il lettore a freddo.
- Lo script viaggia con la fase `local`, la skill resta personale; il `--json` ha le chiavi delle sezioni e basta. Deciso al checkpoint.
- Una schermata sono quaranta righe; le slice `done` un conteggio, le sezioni vuote una riga. Deciso nell'intervista: questo repo ha diciassette slice di cui tredici `done` e sette righe di inbox, e l'elenco intero passa le sessanta righe prima delle PR.

## Moduli toccati

- `skills/harness-init/templates/scripts/board.sh` (nuovo): lo script, con il symlink in `scripts/` come gli altri.
- `tests/board.test.ts` (nuovo): i test, su un repo usa e getta con slice, inbox e un ADR con `## Ordine di lavoro`, e lo stub di `gh` di `tests/fixtures/bin` per le PR.
- `skills/board/SKILL.md` (nuovo): la skill, con il symlink in `~/.claude/skills/board`.
- `skills/harness-init/templates/README.md`: la riga del template nuovo, destinazione e fase.
- `docs/backlog/README.md` e la copia in `skills/harness-init/templates/docs/`: i due valori di `blocked_by`.
- `docs/backlog/S05`, `S06`, `S07`, `S08`: `status: todo` e `blocked_by: ADR-0002` dove serve.
- `docs/spec.md`: la 4.3 per `blocked_by`, la 5.7 per la forma a script.
- `docs/codebase-map.md`: la riga di `board.sh` e della skill.

## Fuori scope

Dall'intent: Docket e la vista di calibrazione; `/audit`; le Issues come board; la vista HTML interattiva della roadmap, che viene dopo e legge gli stessi file di `/board`; il frontmatter delle slice si tocca solo se questa spec lo decide.

## Domande aperte

Nessuna.

## Decisioni da confermare

1. La schermata la calcola `scripts/board.sh`, bash 3.2 e jq, testato in Vitest, con `--json` come modello dei dati per la roadmap HTML; `/board` è il wrapper che la mostra e fa le domande. Scartata la skill che compone la board in prosa.
2. La prossima azione la sceglie una regola scritta in ordine fisso: PR che aspetta un umano, slice eleggibile, spec approvata senza slice, intent senza spec, passo del piano, inbox. Il motivo nomina la regola e il fatto.
3. Il passo del piano si deriva dall'ultimo ADR con `## Ordine di lavoro` e dagli id `S<NN>` delle sue righe; "oltre" quando il backlog ha id più alti. Nessun file nuovo.
4. `blocked_by` accetta `S<NN>` e `ADR-<nnnn>`, `blocked` torna a voler dire "presa e lasciata a metà", S05-S08 tornano `todo`. Nessun campo nuovo.
5. Ogni riga di inbox, una risposta e un commit su main: "via" toglie, "slice" scrive la slice eleggibile, "intent" apre lo scheletro e lascia le dieci righe all'umano.

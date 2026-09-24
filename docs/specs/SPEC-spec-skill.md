---
status: superseded
intent: docs/intent/spec-skill.md
date: 2026-09-07
---

# SPEC: la skill `/spec`

## Problema

Un'idea nuova arriva come una frase e l'agente parte a implementare. L'umano si trova a rivedere un diff senza un documento su cui aveva detto sì prima, e non può dire se è sbagliato il diff o l'idea. La spec (4.2, 5.2) fissa già cosa `/spec` deve fare: una domanda per messaggio con raccomandazione e motivo, lettura della mappa e dei moduli toccati prima di chiedere, la lista di copertura, l'alternativa strutturale obbligatoria, le sezioni del file, le tre-cinque decisioni da confermare, l'approvazione umana. Manca la meccanica: cosa legge davvero, dove vive l'intervista mentre gira, come l'approvazione arriva su main, cosa fa con un intent incompleto, quando si ferma.

## Soluzione

Una skill in `skills/spec/`, installata con symlink come `harness-init`, che si lancia con `/spec docs/intent/<slug>.md`. Senza argomento elenca gli intent senza spec e chiede quale, una domanda sola.

Prima domanda, la skill verifica l'intent: tre sezioni presenti e non vuote, "Cosa vuol dire riuscire" una frase verificabile. Se manca qualcosa si ferma, nomina la sezione con la riga del README di `docs/intent/`, e non scrive niente. Se per quello slug esiste già una spec `approved` o `superseded`, si ferma e dice di scrivere un intent nuovo. Se esiste una spec `draft`, la legge e riprende dalle "Domande aperte" senza ripetere domande.

Poi legge `AGENTS.md`, `docs/codebase-map.md` e i moduli che l'idea tocca, con strumenti di sola lettura (Read, Grep, Glob, `git log` e `git show`). Ogni alternativa che propone nomina un path reale.

L'intervista: una domanda per messaggio, con la raccomandazione e il perché; le risposte vaghe si contestano prima di andare avanti ("veloce" non è un numero). La skill cammina la lista di copertura della spec: criteri di successo, confine dello scope, flussi e casi infelici, dati, punti di integrazione, decisioni da bloccare, requisiti non funzionali, rischi. Una volta fissati criteri e scope, e prima di bloccare le decisioni, propone almeno un'alternativa strutturale; l'umano sceglie e l'alternativa finisce nel file anche se scartata, con il motivo. Si ferma quando una domanda in più non cambierebbe quello che si costruisce. Alla settima domanda fa il punto: deciso, aperto, la sua ipotesi per ogni punto aperto, e chiede se continuare o scrivere il draft con il resto sotto "Domande aperte".

Dalla prima risposta lo stato vive nel file: la skill crea il branch `spec/<slug>` da main e scrive `docs/specs/SPEC-<slug>.md` con `status: draft`, riscrivendolo dopo ogni risposta, le decisioni prese nelle loro sezioni e il resto in "Domande aperte". Nessun commit per risposta. Alla fine un commit solo, `docs(spec): <slug>`, e la PR aperta con `gh`, con le tre-cinque decisioni da confermare nel corpo. L'umano le conferma, in conversazione o sulla PR; la skill mette `status: approved`, committa, e l'umano mergia. La spec su main è approvata per costruzione e la PR è il verbale.

La skill non scrive codice, non tocca l'intent, non taglia slice: scrive solo il suo file di spec.

## User stories con criteri

1. Come umano, lancio `/spec docs/intent/x.md` con un intent completo.
   - [ ] Il primo messaggio contiene una domanda, una raccomandazione e il perché, e niente altro da decidere.
   - [ ] Prima della prima risposta non esiste né il branch né il file.
   - [ ] La domanda cita un path reale del repo quando dipende da come funziona qualcosa oggi.
2. Come umano, lancio `/spec` su un intent senza una sezione, o con "Cosa vuol dire riuscire" che non è una frase verificabile.
   - [ ] La skill si ferma prima di ogni domanda, nomina la sezione e riporta la riga del README di `docs/intent/`.
   - [ ] Nessun file scritto, nessun branch creato.
3. Come umano, rispondo alla prima domanda.
   - [ ] Esiste il branch `spec/<slug>` creato da main e il file `docs/specs/SPEC-<slug>.md` con `status: draft`, `intent` e `date` nel frontmatter.
   - [ ] Dopo ogni risposta il file contiene le decisioni prese nelle loro sezioni e i punti non ancora coperti in "Domande aperte".
   - [ ] Il branch non ha commit finché l'intervista non finisce.
4. Come umano, ricevo almeno un'alternativa strutturale.
   - [ ] Arriva dopo criteri e scope e prima di "Decisioni bloccate".
   - [ ] L'opzione scelta e quella scartata stanno entrambe nel file con il motivo.
5. Come umano, do una risposta vaga.
   - [ ] La skill chiede la forma verificabile (un numero, un caso, un path) prima della domanda successiva.
6. Come umano, arrivo alla settima domanda.
   - [ ] Il messaggio elenca deciso, aperto e l'ipotesi della skill per ogni punto aperto, e chiede se continuare o scrivere.
7. Come umano, rilancio `/spec` su un intent con una spec `draft`.
   - [ ] La skill riprende dalle "Domande aperte" e non ripete una domanda già risposta.
   - [ ] Con una spec `approved` o `superseded` si ferma e dice di scrivere un intent nuovo.
8. Come umano, chiudo l'intervista.
   - [ ] Un commit solo sul branch, `docs(spec): <slug>`, e una PR aperta con le tre-cinque decisioni nel corpo.
   - [ ] Quando confermo, il file passa a `status: approved` in un secondo commit e la PR resta da mergiare a mano.
   - [ ] Con "Domande aperte" non vuote il file resta `draft` e la PR lo dice.
9. Come manutentore di questo repo, cambio le sezioni della spec.
   - [ ] Un test strutturale fallisce se le sezioni del template in `skills/spec/templates/SPEC.md` e la lista nel README di `docs/specs/` divergono.

## Decisioni bloccate

- Legge documenti e codice, in sola lettura: `AGENTS.md`, la mappa, poi i moduli toccati con Read, Grep, Glob, `git log`, `git show`. Perché: "Moduli toccati" vuole path reali e le alternative devono nascere da come funziona il codice oggi. Alternativa scartata: solo documenti, più veloce, ma la mappa è una schermata e `/slice` dovrebbe riscoprire i touchpoint.
- Lo stato dell'intervista vive nel file dalla prima risposta, su `spec/<slug>`, riscritto a ogni risposta. Perché: principio 10, la memoria sta nei documenti; una sessione che muore alla settima domanda non perde niente e un'altra sessione riprende. Alternativa scartata: file scritto alla fine, skill più semplice ma intervista non ripristinabile.
- Un commit solo alla fine dell'intervista, non uno per risposta. Perché: il branch resta leggibile e la PR ha un diff solo.
- Una PR per spec, con l'approvazione dentro: draft committato, PR aperta dalla skill, conferma dell'umano, `status: approved` in un secondo commit, merge umano. Perché: la spec su main è approvata per costruzione e la PR è il verbale di chi ha detto sì a cosa. Alternativa scartata: due PR, draft prima e approvazione dopo; serve in team dove approva un altro, costa un giro in più da soli.
- Intent incompleto: rifiuto prima della prima domanda, sezione nominata, niente scritto. Perché: l'intent è la tesi dell'umano e l'agente non deve scriverla. Alternativa scartata: riempire la sezione con le prime domande, più veloce ma la tesi la formula l'agente.
- Si ferma quando una domanda in più non cambierebbe la costruzione; alla settima domanda fa il punto e chiede se continuare. Perché: la lista di copertura ha otto voci, a cinque il checkpoint scatterebbe quasi sempre prima di averla percorsa, a dieci si è già smesso di leggere. Alternativa scartata: cap duro, prevedibile ma una spec che aveva bisogno dell'undicesima domanda si affetta a metà.
- L'alternativa strutturale è una domanda dell'intervista, dopo criteri e scope, prima di "Decisioni bloccate", e finisce nel file anche se scartata con il motivo. Perché: spec 4.2, è il punto in cui l'intervento umano vale di più.
- Frontmatter minimo: `status`, `intent`, `date`. Perché: il resto (chi ha approvato, quando) sta nella PR. In team si aggiunge `approved_by`.
- La skill è in inglese come `harness-init`; la spec è nella lingua dell'intent. Perché: le skill le legge l'agente, le spec le legge chi ha scritto l'intent.
- Il template del file sta in `skills/spec/templates/SPEC.md`; il contratto nei repo di progetto resta il README di `docs/specs/`, che elenca le sezioni. Perché: chi non ha la skill ha comunque il formato sotto gli occhi; un test tiene i due allineati.
- `docs/spec.md` non cambia in questa slice. Perché: 4.2 e 5.2 restano veri; la meccanica decisa qui va nella 0.5 quando la skill è provata su Tipoff.
- Senza argomento la skill elenca gli intent senza spec e chiede quale. Perché: una domanda sola, e non si parte mai senza intent.
- "Decisioni da confermare" è l'ottava sezione del contratto, non solo del corpo della PR: la elenca il README di `docs/specs/` e la contiene il template della skill. Perché: è la sezione su cui poggia l'approvazione, e una spec su main senza quella coda non dice più cosa l'umano ha approvato. Alternativa scartata: tenerla solo nella PR, un file in meno da allineare ma il verbale resta fuori dalla spec.

## Moduli toccati

- `skills/spec/SKILL.md`: la skill, nuova.
- `skills/spec/templates/SPEC.md`: lo scheletro del file, frontmatter e sezioni, nuovo.
- `skills/harness-init/templates/docs/specs/README.md` e `docs/specs/README.md`: i campi del frontmatter (`intent`, `date`), il nome del branch e "Decisioni da confermare" come ottava sezione.
- `tests/architecture.test.ts`: la regola che tiene allineati template e README, e che ogni `skills/*/` ha un `SKILL.md` con frontmatter.
- `README.md`, `AGENTS.md`, `docs/codebase-map.md`: `skills/spec/` nella struttura e nella mappa.
- `~/.claude/skills/spec`: symlink al checkout, fuori dal repo, come da README.

## Fuori scope

`/slice` e `/next`. Il giudice locale. La conversione dei PRD esistenti. La modalità team (approva il tech lead, `approved_by`). La regola di `tier.sh` per cui una PR di sole docs oltre venti righe è tier 1 e viene giudicata: vale anche per le PR di spec, si decide all'audit.

## Domande aperte

Nessuna.

## Decisioni da confermare

1. Il checkpoint alla settima domanda, con l'ipotesi della skill per ogni punto aperto.
2. Una PR per spec con l'approvazione dentro: `status: approved` è un secondo commit della skill, il merge è tuo.
3. Il rifiuto secco di un intent incompleto, senza riempire la sezione al posto tuo.
4. La skill apre la PR da sola con `gh`, alla fine dell'intervista: è la sola azione verso l'esterno che fa.
5. Il template del file sta nella skill e il README di `docs/specs/` resta il contratto, con un test che li tiene uguali.

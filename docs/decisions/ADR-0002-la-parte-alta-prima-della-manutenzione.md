# ADR-0002: la parte alta della catena prima della manutenzione della parte bassa

Data: 2026-09-10. Stato: proposta, accettata al merge della PR che la porta.

## Contesto

Il 10 settembre il progetto è stato riletto contro i quattro articoli da cui nasce (Horthy su ACE-FCA, Lopopolo su harness engineering, il playbook AI-native SDLC di Anthropic, Osmani su human in the loop) e contro il bisogno quotidiano di chi lo usa, detto con le sue parole: un momento di presenza densa in cui si scrivono le spec, una roadmap che ne esce, e sessioni che partono da un obiettivo definito e lo chiudono da sole; il tempo perso oggi è leggere il resoconto di un lavoro che ha seguito la spec, approvare un push che si approva quasi sempre, e ridire a ogni apertura di sessione priorità e novità.

Il repo ha sei giorni di storia vera, dal 4 al 9 settembre: diciassette PR, tutte mergiate a mano, la spec alla 0.10 con dieci revisioni. Esiste ed è provata la parte bassa della catena: `/harness-init` a tre fasi, nove script con 249 test che li lanciano come processi, sei workflow, il giudice locale con l'hook che rifiuta la PR senza verdetto. Manca per intero la parte alta, che è l'unica che tocca il bisogno: `/spec`, `/slice`, `/next`, `/board`, `/audit`. Il backlog, S05-S08, è fatto di difetti della catena trovati dalla catena su se stessa; nessuna slice riguarda un prodotto.

Il disegno della spec risponde al bisogno: la sezione 4 descrive esattamente il flusso chiesto, con l'umano su intent, spec e board, `/next` che lavora da una slice a contesto pulito, il verdetto in una frase e la board in una schermata. L'ordine di costruzione è stato dettato da quello che si rompeva, non da quello che serve, ed è la cosa che ADR-0001 aveva già visto a metà.

Un paragrafo scritto da un agente senza il contesto del repo, a partire dagli stessi articoli e dallo stesso bisogno, coincide con il piano in tutto tranne quattro punti, e i quattro sono utili: nomina un inbox di novità che il piano non ha; mette l'umano dopo il piano di ogni task dove la spec lo mette una volta per spec; dà per scontato che il push non aspetti nessuno, cosa vera solo con l'automerge acceso; e non dice cosa renda il controllo rapido ignorabile senza rischio, che nel piano sono i gate e il giudice.

## Decisione

1. Il repo continua, non riparte. S05, S06, S07 e S08 restano nel backlog, dichiarate e ferme: con il giudice locale e il merge umano nessuna delle quattro fa danno oggi. S05 e S08 passano a `status: blocked` con questo ADR come motivo, così una sessione a contesto pulito non le prende per eleggibili; S06 e S07 sono già bloccate da S05.
2. Le skill si scrivono in quest'ordine, una PR ciascuna in questo repo: `/spec`, che ha la sua spec approvata in `docs/specs/SPEC-spec-skill.md`; `/slice`; `/next`; `/board`. `/audit` e Docket dopo il primo mese di PR automatiche, quando ci sarà qualcosa da tarare. Ogni skill si prova su Tipoff con una feature vera prima di scrivere la successiva: qui ogni PR è tier 2 e la prova non dice niente.
3. `/next` è interattivo. Si apre la sessione, si dice "vai" o si nomina una slice, la skill prende la slice eleggibile e chiude con la PR aperta e il verdetto di `/judge` già postato. L'hand-back sono tre righe: il link della PR, il verdetto in una frase, "come verificare a mano" solo se la slice è `human: true`. Nessun racconto di cosa ha fatto nel codice: sta nel corpo della PR per chi vorrà leggerlo. Se trova una decisione che la spec non copre, si ferma con `status: blocked`, PR in draft, e una domanda di una riga. Il giro di giudizio è chiuso al secondo: giudizio, fix, secondo giudizio; se restano solo `low` si dichiarano nella PR e si apre. La forma headless resta rimandata (spec, 11).
4. A tier 1 il giudice gira solo se il branch nomina una slice. Con una slice verifica che ogni criterio abbia un test e che il test lo copra davvero, cosa che nessun gate sa fare. Senza slice i criteri non ci sono e il giudice legge un corpo di PR: non vale un modello. Un agente non apre PR senza slice, perché `/next` lavora sempre da una; un bug fix entra come slice aperta dall'audit o dall'inbox. Tier 2 resta com'è, con o senza slice. Il criterio è deterministico: `tier.sh` fa già la ricerca dal nome del branch al file del backlog.
5. Il modello per ruolo. `/next` e il fixer restano Opus 5: un coder economico che ha bisogno di un giro di fix costa più di uno che chiude al primo colpo. `/spec`, `/slice` e `/audit` sono Fable, dove una riga sbagliata vale cento righe dopo. Il giudice di correttezza a tier 1 è Sonnet 5, il giudice a tier 2 resta Opus 5 in entrambi i ruoli: in locale è il campo `model` dell'Agent tool nella skill, in CI `HARNESS_JUDGE_MODEL` diventa una variabile per tier. È un esperimento e non una decisione: il verdetto porta `judge.model`, e dopo venti PR a tier 1 su Tipoff la vista di calibrazione dice se l'accordo regge rispetto ai verdetti Opus già nel log. Chiude la prima decisione aperta della spec (11).
6. `docs/inbox.md` è la quarta fonte di lavoro, dopo spec, audit e osservazione. Righe scritte a mano quando si vuole: un bug visto, una priorità che cambia, una nota. `/board` le mostra all'apertura e fa una domanda per riga: diventa un intent, diventa una slice con `spec: inbox (<data>)`, o si butta. Una feature nuova resta intent, spec, slice; l'inbox non salta la spec, evita la cerimonia per ciò che non la merita. La riga del README di `docs/backlog/` che ammette due sole fonti è sbagliata da tre slice (S04, S05, S08) e si riscrive con questa.
7. Controlli visivi automatici, in tre livelli e in quest'ordine. Primo, deterministico: snapshot test in Playwright per le viste che una slice tocca, immagine di riferimento nel repo, diff oltre soglia rosso in CI; una regressione visiva sfuggita due volte diventa uno snapshot. Secondo, l'artefatto per l'umano: su una slice `human: true` di UI, `/next` produce lo screenshot della vista finita e lo lega alla PR come artifact del workflow con il link nel corpo; un branch `screenshots` con l'URL raw se il link non viene mai aperto; mai il binario nel branch della slice. Il video resta fuori finché uno screenshot non si rivela insufficiente. Terzo, il giudice che riceve lo screenshot nel bundle per un criterio visivo scritto nella slice: non ora, quando l'audit dice che gli screenshot vengono guardati. Il tutto entra come intent scritto a mano, perché tocca il template di PR, `ci.yml` e la skill.
8. L'umano approva il piano una volta per spec, sulla board, non per slice. Il file della slice, con touchpoint e note, è il piano. Un'approvazione a ogni slice rimetterebbe l'attesa che la catena esiste per togliere.

Restano aperte, da decidere quando `/next` è pronto e il primo giro vero le rende concrete: la riga di tier 2 in `policy.sh`, oggi `needs-human` sempre, proposta merge con due `approve` senza `high` e notifica; e `HARNESS_AUTOMERGE` acceso su Tipoff, senza il quale `/next` apre PR che aspettano comunque un click. Entrambe sono ADR-0003.

## Alternative scartate

Ripartire da zero. Butterebbe l'unica parte provata sul campo e la riprodurrebbe tra un mese; gli script, i test e i workflow non sono il problema, l'ordine lo era.

Chiudere prima S05-S08. Sono la catena che corregge se stessa, tutte tier 2 su path sensibili, e nessuna impedisce di scrivere le skill mancanti. Il costo di rimandarle è zero finché il merge è umano.

Saltare il giudice sui bug fix per tipo di modifica. Il tipo lo dichiara chi apre la PR, cioè l'agente, e un agente che sa che il giudice si salta sui fix chiamerà fix qualunque cosa. La slice nominata dal branch è un fatto, il tipo è un'etichetta.

Una soglia di tier sotto cui non giudicare (`HARNESS_JUDGE_MIN_TIER`). Proposta e ritirata nella stessa conversazione: taglia per dimensione, non per quello che il giudice sa aggiungere, e a tier 1 con una slice il controllo sui test tautologici è la cosa che il verde da solo non prova.

Un modello economico anche per il coder. Il costo si misura per task completato, non per richiesta: un giro di fix costa un giudizio in più e un giro di PR.

L'approvazione umana del piano a ogni slice, come in ACE-FCA. Giusta per un team che condivide il codice a mano, sbagliata per il bisogno di partenza.

## Conseguenze

Modo di lavoro da oggi: una skill per PR, provata su Tipoff prima della successiva; S05-S08 ferme; `/judge` prima della PR come oggi; merge umano.

`docs/spec.md` sale a 0.11 nella prima PR che cambia il comportamento, con le righe in "Cosa cambia": 4.6 e 5.5 per il giudice a tier 1 solo con slice; 6.3 e 11 per il modello per tier; 4.3 e il README del backlog per l'inbox come quarta fonte; 4.4 e 5.4 per la forma di `/next` e il giro di giudizio chiuso al secondo; 5.7 per `/board` che legge l'inbox; 4.3 per `human: true` che dice "occhi umani, con l'immagine già pronta" quando arrivano i controlli visivi.

L'intent dei controlli visivi lo scrive Lionel a mano, dieci righe, quando `/board` esiste e l'inbox ha un posto dove metterlo.

## Ordine di lavoro

1. Questo ADR con S05 e S08 bloccate e il README aggiornato. Merge a mano, tier 0.
2. `/spec`: branch `skills/spec` da main, `skills/spec/SKILL.md` e `skills/spec/templates/SPEC.md`, il README di `docs/specs/` con l'ottava sezione e i campi del frontmatter, il test in `tests/architecture.test.ts` che tiene allineati template e README e che ogni `skills/*/` ha un `SKILL.md` con frontmatter, il symlink `~/.claude/skills/spec`. Le nove user story di `SPEC-spec-skill.md` sono i criteri. Prova: `/spec` su un intent di Tipoff.
3. `/slice`: spec 4.3 e 5.3, con l'inbox come fonte ammessa nel README del backlog. Prova: la spec appena scritta su Tipoff.
4. `/next`: spec 4.4 e 5.4 più la decisione 3 di questo ADR; il giudice a tier 1 solo con slice (decisione 4) tocca `judge.sh required` e `ensure-verdict.sh`, ed è la sola modifica alla parte bassa di questa serie; il modello per tier (decisione 5) tocca la skill `/judge` e `judge.yml`. Prova: una slice di Tipoff, dalla board alla PR.
5. `/board`: spec 5.7 più `docs/inbox.md`. Archivia `session-start` e `session-end`. Prova: l'apertura di sessione su Tipoff e qui.
6. Le fasi `ci` e `judge` di `/harness-init` rilanciate qui e su Tipoff; ADR-0003 su tier 2 e automerge; `judge.yml` riacceso.
7. L'intent dei controlli visivi, poi `/audit` con Docket dopo il primo mese.

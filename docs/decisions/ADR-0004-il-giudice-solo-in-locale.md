# ADR-0004: il giudice solo in locale, e l'impianto che chiede una cosa sola

Data: 2026-09-15. Stato: accettata da Lionel nella conversazione che l'ha scritta, un commit su main per la decisione 1 di ADR-0003.

## Contesto

L'audit del 15 settembre, fatto a freddo da main, dice che il codice è chiuso: S09-S16 sono `done`, la suite è verde, sul backlog non resta niente di eleggibile. Quello che non è chiuso è il passo 6 di ADR-0003, Tipoff con due slice mergiate dalla policy, e l'ultima cosa che sta tra un repo nuovo e la catena è la checklist umana in coda a `/harness-init judge`: la GitHub App, `claude setup-token`, il topic ntfy, la PR di impianto.

Il token serve a due workflow soltanto. `judge.yml` è il giudice cloud, il fallback di ADR-0001, spento su questo repo dall'8 settembre e da tenere spento su Tipoff per ADR-0003. `fix.yml` è il fixer, morto con la decisione 2 di ADR-0003, lasciato nei template "finché un audit non decide di toglierlo". La skill però li installa tutti e due, chiede il token come se fosse necessario, e la spec porta ancora tre variabili e un secret per macchine che nessuno accende. Lionel ha detto cosa vuole, con le sue parole: apro un repo, faccio init come con l'init di Claude Code, e poi proseguo il lavoro ogni giorno. Ogni voce della checklist è frizione, e due delle quattro non comprano niente.

## Decisione

1. **Il giudizio è solo locale.** `/judge` prima della PR, e `/next` che lo lancia per ogni slice, sono l'unico giudice della catena. `judge.yml` e `fix.yml` escono dai template e dalle copie in `.github/workflows/`. Non c'è fallback: una PR senza verdetto non si apre, perché l'hook di ADR-0001 lo impedisce, e una head giudicata non viene rigiudicata da nessuno. L'intent `giudizio-a-richiesta` e la decisione 4 di ADR-0001 sono superati.
2. **Quello che serviva solo a loro sparisce.** Il secret `CLAUDE_CODE_OAUTH_TOKEN`, le variabili `HARNESS_JUDGE_MODEL` e `HARNESS_FIXER_MODEL`, le label `fix-round:1` e `fix-round:2`. `tier.sh` smette di leggere `fix-round:2`. Il modello del giudice resta quello per tier che `/judge` e `/next` già usano, Sonnet a tier 1 e Opus a tier 2, e sta nelle skill perché è l'Agent tool a riceverlo.
3. **La checklist umana scende a due voci.** La GitHub App, che serve al merge e non al giudice, e il merge della PR di impianto. Il topic ntfy è opzionale, il codice lo salta già quando è vuoto, e la skill lo dice invece di chiederlo.
4. **La fase `judge` tiene il nome.** Installa il prompt, lo schema, `policy.sh`, `automerge.yml`, `escalate.yml`, `close.yml`. Rinominarla oggi cambia tre skill, la spec e i test per un nome, e l'impianto in un colpo solo che Lionel vuole la assorbirà comunque.

## Alternative scartate

Tenere `judge.yml` spento come fallback, senza chiederne il token. È lo stato di oggi meno una voce di checklist: un workflow che nessuno accende resta da mantenere, da copiare nei repo, da tenere uguale al template nel test, e resta nella spec come una cosa che la catena fa. La catena non lo fa.

Rinominare la fase `judge` in `merge` o `policy`. Giusto nel nome, costoso adesso, e la direzione è un `init` solo.

## Conseguenze

`docs/spec.md` sale a 0.16. La 4.6 perde il fallback, la 5.1 e la 6.3 perdono i due workflow, il token, le due variabili e il paragrafo su `claude-code-action`, la 7.2 perde la riga di `fix-round:2`, la 11 aggiorna la decisione sul modello.

`policy.sh` tiene per ora il ramo che riconosce l'ambiente di GitHub Actions, il link al run e il costo dall'`execution_file`: nessuno lo chiama più da lì, ma toglierlo riscrive metà di `tests/policy.test.ts`, che gira per default in quell'ambiente, ed è una slice sua, con `judge.where` nello schema del verdetto da rivedere insieme. È la riga di inbox che questo ADR lascia.

Il lavoro è la slice S17. Dopo S17 il passo 6 di ADR-0003 resta il criterio di accettazione, con una checklist più corta.

Quello che resta aperto, e che Lionel ha nominato: la GitHub App è l'unica voce che l'impianto ancora chiede, e va semplificata. Un'App sola installata su tutti i repo dell'account, con gli stessi due valori copiati da `/harness-init`, è la strada corta; farne a meno vuol dire un merge che non fa partire `close.yml`, e va deciso con una prova, non qui. E le tre fasi che diventano un `init` solo, come quello di Claude Code: è la 5.1 da riscrivere, e passa da un intent.

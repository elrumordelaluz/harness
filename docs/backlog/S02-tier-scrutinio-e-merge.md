---
id: S02
title: Il tier separa quanto scrutinio serve da chi può mergiare
status: done
blocked_by: none
tier: 2
human: false
spec: audit (PR #3)
---

## Goal

PR #3 è 95 righe di sole docs, una spec in `status: draft` che nessuno
esegue, ed è finita a tier 1 perché la regola del tier 0 è "solo docs e non
più di venti righe". Costo: 1,11 dollari per farsi dire che il template della
PR era vuoto.

Alzare il limite di righe non è la correzione. Il tier oggi risponde a due
domande insieme, quanto scrutinio serve e chi può mergiare, e il tier 0 le
risponde entrambe con "nessuno" e "la macchina". Per una spec le due si
separano: zero scrutinio del modello e merge umano obbligatorio. Portare
`docs/specs/**` a tier 0 così com'è vuol dire che il giorno in cui
`HARNESS_AUTOMERGE` va su `on`, `automerge.yml` mergia da solo una spec in
`draft` che nessuno ha approvato, e questo è peggio di 1,11 dollari.

## Acceptance criteria

- [ ] `tier.sh` porta a tier 0 per path, senza guardare le righe, la prosa che nessuno esegue: `docs/intent/**`, `docs/specs/**`, `docs/backlog/**`, `docs/decisions/**`, `docs/review-log/**`.
- [ ] Restano a tier 1 o più, anche se sono `.md`, la prosa che un agente esegue e i contratti: `skills/**/SKILL.md`, `AGENTS.md`, `docs/spec.md`, `docs/codebase-map.md`.
- [ ] La regola delle venti righe continua a valere per tutte le altre docs.
- [ ] `tier.sh` stampa su stderr il motivo del tier 0 per path, come fa per gli altri segnali.
- [ ] Le righe di policy di `AGENTS.md` (`Path sensibili` e `Gate umani`) si leggono dal base ref con `git show "$base:AGENTS.md"`, non dal checkout della PR: una PR non allarga da sola le regole con cui viene giudicata. In più `AGENTS.md` entra nella lista dei path sensibili, così ogni sua modifica è tier 2 a merge umano.
- [ ] Il job `tier` di `ci.yml` mette la label `human-gate` quando il diff tocca un path nominato nella riga "Gate umani" di `AGENTS.md`, letta dal base ref.
- [ ] `automerge.yml` non mergia una PR con la label `human-gate`, nemmeno a tier 0 con CI verde, e lo scrive nel log del run.
- [ ] `policy.sh` non mergia una PR con la label `human-gate` nemmeno a tier 1 con `approve`: la manda a `needs-human`, così chi deve mergiare riceve la notifica. Le due porte di merge automatico onorano lo stesso gate.
- [ ] `tier.sh` conserva una label `human-gate` già sulla PR e la ristampa su stderr: il freno lo toglie solo un umano, e `ci.yml` non lo rimuove più al push successivo.
- [ ] Senza `AGENTS.md` al base ref `tier.sh` sale a tier 2 invece di lasciare le liste vuote: si chiude, non si apre.
- [ ] `tier.sh` legge i nomi dei file una riga alla volta, senza word splitting, e `ci.yml` passa `github.base_ref` per `env` e non interpolato nel `run`.
- [ ] `docs/review-log/**` entra nella riga "Merge umano per path" e `skills/*/templates/AGENTS.md` in "Path sensibili": il log dell'audit non si riscrive da solo e il contratto copiato in ogni repo non è mai tier 0.
- [ ] Rilanciato su PR #3, `tier.sh` stampa `0` e la PR prende `human-gate`.
- [ ] `docs/spec.md` sale di versione con la sua riga in "Cosa cambia": la tabella 7.2, la riga del tier 0 nella tabella della policy a 4.6, e il fatto che le regole si leggono dal base ref.

## Test plan

- `tests/tier.test.ts`, nuovo: un repo git temporaneo, un commit di base e uno di lavoro, `tier.sh` lanciato sul range. Casi: cento righe sotto `docs/specs/` danno 0; duecento righe sotto `docs/backlog/` danno 0; una riga in `skills/spec/SKILL.md` dà 1; una riga in `AGENTS.md` dà 2; cinque righe in `docs/handbook/x.md` danno 0 e venticinque danno 1; `docs/specs/` più un file di codice danno almeno 1.
- Stesso file, il caso che conta: un commit che aggiunge un path alla riga "Path sensibili" di `AGENTS.md` e insieme tocca quel path non abbassa il tier, perché la riga viene letta dal base ref.
- Nello stesso test: con `PR_LABELS` che contiene `needs-human` il tier resta 3, cioè la regola vecchia non si rompe.
- `tests/tier.test.ts`: il diff che tocca `docs/specs/` fa stampare `human-gate` sul canale previsto, e un diff di solo codice no.
- `tests/architecture.test.ts`: la riga "Gate umani" di `AGENTS.md` esiste e nomina path che esistono, così lo script non legge il vuoto.
- `tests/policy.test.ts`, nuovo: con `HARNESS_AUTOMERGE=on`, tier 1 e `approve` lo stub registra `gh pr merge`; con la label `human-gate` registra `--add-label needs-human` e nessun merge; con `off` nessun merge e il commento "would have merged"; con la head della PR diversa da `HEAD_SHA` nessuna azione.
- `tests/tier.test.ts`: senza `AGENTS.md` al base ref il tier è 2; con `PR_LABELS` che contiene `human-gate` lo stderr ripete `human-gate: kept from the label`; un file con lo spazio nel nome arriva intero al confronto.

## Touchpoints

- `skills/harness-init/templates/scripts/tier.sh`: il tier 0 per path, la lettura dal base ref, la riga "Gate umani".
- `skills/harness-init/templates/github/ci.yml`: la label `human-gate` nel job `tier`.
- `skills/harness-init/templates/github/automerge.yml`: il rifiuto su `human-gate`.
- `skills/harness-init/templates/AGENTS.md` e `AGENTS.md`: la riga "Gate umani" in forma leggibile dallo script, e `AGENTS.md` dentro "Path sensibili".
- `skills/harness-init/templates/scripts/policy.sh`: il rifiuto su `human-gate` prima del merge. Fuori dai touchpoints iniziali: entrambi i giudici su PR #5 hanno visto che il freno era su una porta sola.
- `tests/tier.test.ts` e `tests/policy.test.ts`: nuovi. Il secondo usa uno stub di `gh` sul PATH che registra le chiamate.
- `docs/spec.md`: 0, 4.6, 7.2.

## Notes

Gli 1,11 dollari hanno comprato una contraddizione vera dentro la spec, il
finding 2: la riga 23 e il criterio 8 mandano le decisioni da confermare nel
corpo della PR, ma il file ha una sezione `## Decisioni da confermare` che non
sta nelle sette sezioni del README, e il criterio 9 chiede un test che fallisce
proprio quando template e README divergono. Quindi la spesa non è stata
sprecata questa volta. Ma è fortuna, non policy: non si fa un budget sul
giudice che per caso trova contraddizioni nella prosa a cui era stato puntato
per il motivo sbagliato. Quel controllo appartiene all'umano che approva la
spec, e per il criterio 9 al test strutturale che la spec stessa chiede.

`Fuori scope` di `SPEC-spec-skill.md` parcheggia questa decisione all'audit.
Questa slice è l'audit che risponde in anticipo, con la ricevuta.

La lettura dal base ref viene dal giudice di sicurezza su PR #4, ed è un buco
che esiste già oggi, non uno che questa slice introduce: `tier.sh` fa `cd`
sulla root e legge `AGENTS.md` dal checkout, che sull'evento `pull_request` è
la versione della PR, e `AGENTS.md` non sta nella lista dei path sensibili.
Una PR che riscrive quella riga resta quindi a tier 1 e, con l'automerge
acceso, viene mergiata senza umano. Aggiungere `human-gate` senza chiudere
questo buco vorrebbe dire mettere il freno dentro il file che la PR può
riscrivere.

Versione minima della label: la calcola il job `tier` di `ci.yml`, che già
chiama `tier.sh` e già scrive label. Non serve un workflow nuovo.

---
id: S13
title: Le skill non riparano l'harness del repo dove girano, e questo repo smette di giudicarsi
status: done
blocked_by: S09
tier: 2
human: false
spec: docs/spec.md
---

## Goal

Decisione 4 di ADR-0003. Una skill che nota qualcosa dell'harness nel repo
dove lavora, un template indietro, una riga mancante in `AGENTS.md`, uno
script che sbaglia, scrive una riga datata in `docs/inbox.md` e va avanti con
quello che c'è. La correzione si fa nel repo dell'harness e arriva
rilanciando la fase di `/harness-init` che possiede il file. Nel repo
dell'harness la prosa va su main e il giudice non gira più per default.

## Acceptance criteria

- [x] Ogni `skills/*/SKILL.md` tranne quello di `harness-init` porta lo stesso paragrafo tra le ground rules: quello che la skill nota sull'harness del repo va in `docs/inbox.md` come `- <YYYY-MM-DD>: <una riga>` e il run continua; la skill non rilancia `/harness-init`, non modifica script, hook, workflow o `AGENTS.md` del repo; si ferma solo se manca la cartella in cui deve scrivere. `tests/architecture.test.ts` lo controlla su tutte, parola per parola, e lo cerca per cartella invece che per lista, così `/next` di S12 lo eredita per costruzione.
- [x] `docs/inbox.md` è un template, `skills/harness-init/templates/docs/inbox.md`, con la riga nel README dei template, destinazione `docs/inbox.md`, fase `local`; la fase `local` lo crea se manca e non lo tocca se c'è. Il template è la sola intestazione, senza voci: `tests/architecture.test.ts` chiede che `docs/inbox.md` di questo repo cominci con il template e che il template non porti voci, come fa con `.github/judge/prompt.md` sopra `## This repo`. Le voci sono dati del repo, non prosa da tenere allineata.
- [x] La riga "Merge umano per path" del template di `AGENTS.md` e quella di questo repo coprono `docs/inbox.md`, così una riga di inbox si committa su main con la regola di S09.
- [x] `.claude/settings.json` di questo repo tiene `ensure-hooks.sh` e non ha più `ensure-verdict.sh`; il template `settings.json` li tiene entrambi. Se `tests/architecture.test.ts` confronta i due file, il test dice questa differenza e nessun'altra.
- [x] `AGENTS.md` di questo repo dice il flusso di ADR-0003 per l'harness stesso: la prosa, `docs/**`, `skills/**/SKILL.md`, `skills/spec/templates/SPEC.md`, su main con la riga `Documenti`; script, hook, workflow, test e `package.json` con una PR dai quattro gate e il merge di Lionel; `/judge` a richiesta, non prima di ogni PR. La riga di "Convenzioni" che oggi impone `/judge` prima della PR cambia in questo senso.
- [x] `docs/codebase-map.md`: il paragrafo "Flusso dei dati" e la riga di `.claude/settings.json` dicono lo stesso.
- [x] Nessun test indebolito.

## Test plan

- `tests/architecture.test.ts`: il paragrafo comune in ogni skill che non è `harness-init`; `templates/docs/inbox.md` con la riga nel README dei template, senza voci, e `docs/inbox.md` che comincia con lui; la riga di `AGENTS.md` con `docs/inbox.md`; il confronto nuovo tra `.claude/settings.json` e il template, che dice quella differenza e nessun'altra.
- Il resto della suite resta verde.
- La prova della regola è il passo 6 di ADR-0003: `/slice` e `/next` su Tipoff con un template deliberatamente indietro non lo toccano e lasciano la riga nell'inbox.

## Touchpoints

- `skills/spec/SKILL.md`, `skills/slice/SKILL.md`, `skills/judge/SKILL.md`: le ground rules. `skills/next/SKILL.md` non esiste ancora e lo scrive S12, che nasce con il paragrafo perché il test lo chiede a ogni skill.
- `skills/harness-init/templates/docs/inbox.md`, nuovo; `skills/harness-init/templates/README.md`; `skills/harness-init/SKILL.md`, la fase `local`.
- `skills/harness-init/templates/AGENTS.md` e `AGENTS.md`: la riga "Merge umano per path", la riga di "Convenzioni" su `/judge`, la sezione "Non fare".
- `.claude/settings.json` di questo repo.
- `tests/architecture.test.ts`, `docs/codebase-map.md`.

## Notes

`docs/inbox.md` di questo repo esiste da ADR-0003 e porta già la prima
riga, i sei commit di manutenzione su `harness/judge` di Tipoff. ADR-0002,
decisione 6, lo aveva previsto come quarta fonte del backlog letta da
`/board`: `/board` non c'è ancora, e la riga si legge a mano finché non
arriva.

Il paragrafo comune si scrive una volta e si copia in ogni skill; il test lo
tiene uguale, così una correzione si fa dappertutto o in nessun posto.

La slice era `blocked_by: S09, S12` perché nominava `skills/next/SKILL.md`,
che S12 crea. La dipendenza cade perché il test cerca il paragrafo in ogni
cartella di `skills/` tranne `harness-init`, non in una lista di quattro
nomi: `/next` nasce già obbligato, e S13 può stare prima. Lionel l'ha
chiesta prima per il motivo che conta, il gate del verdetto che toglie da
questo repo: S10 e S12 aprono la loro PR senza un giudizio, che a tier 2
costa circa 300k token.

Il giudice su questo repo resta lanciabile con `/judge` quando Lionel lo
chiede: è l'audit con Fable del passo 7 di ADR-0003, non un gate.

Fuori scope: `/board` che legge l'inbox; l'inbox in team.

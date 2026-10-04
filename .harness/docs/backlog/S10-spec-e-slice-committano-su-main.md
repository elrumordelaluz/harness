---
id: S10
title: /spec e /slice chiudono con un commit su main, non con una PR
status: done
blocked_by: S09
tier: 2
human: false
spec: docs/spec.md
---

## Goal

Decisione 1 di ADR-0003, applicata alle due skill che esistono. `/spec`
intervista come oggi e al sì dell'umano alle decisioni da confermare mette
`status: approved` e `approved: <data>` nel frontmatter e fa un commit su
main con le decisioni confermate nel corpo: quel commit è il verbale.
`/slice` stampa la board, fa la sua domanda, e al sì committa su main con la
board nel corpo. Niente branch `spec/<slug>` e `backlog/<slug>`, niente PR,
niente attesa del merge. Con `Documenti: PR` in `AGENTS.md` le due skill
fanno il flusso di oggi.

## Acceptance criteria

- [x] `/spec` con `Documenti: su main` non crea `spec/<slug>`: scrive `docs/specs/SPEC-<slug>.md` nel working tree del ramo di default, aggiornato con un pull all'inizio, e non committa finché l'umano non approva. Una spec interrotta resta nel working tree e la ripresa la rilegge da lì.
- [x] Al sì, un solo commit `docs(spec): <slug>` su main, pushato, con il corpo che comincia con `Decisioni confermate:` e porta una riga per decisione, poi la riga dell'alternativa strutturale scelta o scartata. `git log -- docs/specs/` basta per sapere chi ha detto sì a cosa.
- [x] Il frontmatter della spec porta `approved: <YYYY-MM-DD>` accanto a `status: approved`; `templates/SPEC.md`, il README di `docs/specs/` e la sua copia nei template lo dicono, e `tests/architecture.test.ts` li tiene allineati.
- [x] Una spec con domande aperte non si approva e non si committa, come oggi.
- [x] `/slice` con `su main` legge la spec dal ramo di default aggiornato, conta gli id dal più alto in `docs/backlog/` del ramo di default, stampa la board, fa la domanda, e al sì committa `docs(backlog): <slug>` su main, pushato, con la board nel corpo: id, titolo, `blocked_by`, tier, `human`, le onde.
- [x] Ripresa di `/slice`: slice di quella spec non committate nel working tree si rileggono e si riparte da lì; una spec che ha già slice sul ramo di default resta un rifiuto.
- [x] Con `Documenti: PR` entrambe le skill fanno il flusso di oggi, branch e PR, senza cambiamenti.
- [x] L'hand-back di ciascuna skill è tre righe: il file o i file scritti, lo sha del commit, il comando successivo (`/slice <spec>` dopo `/spec`, `/next` dopo `/slice`).
- [x] `docs/codebase-map.md` descrive le due skill senza la PR e il branch.

## Test plan

- Le skill sono prosa per un agente e si provano lanciandole: `/spec` su un intent di Tipoff con `su main`, fino al commit su main; `/slice` su `docs/specs/SPEC-esc-key.md` di Tipoff, fino al commit con la board. È il passo 6 di ADR-0003.
- `tests/architecture.test.ts`: lo scheletro di `templates/SPEC.md` e i due README di `docs/specs/` dicono gli stessi campi, `approved:` compreso; ogni `skills/*/SKILL.md` ha il frontmatter.
- Il resto della suite resta verde senza modifiche.

## Touchpoints

- `skills/spec/SKILL.md`: la sezione 1 sul branch e sul ramo di default, il passo che oggi fa `git commit` e `gh pr create` e quello dell'approvazione, l'hand-back finale.
- `skills/spec/templates/SPEC.md`: il campo `approved:`.
- `skills/slice/SKILL.md`: la sezione 1 sul branch `backlog/<slug>`, il conteggio degli id dai branch `backlog/*`, il passo del commit e della PR, la ripresa, l'hand-back.
- `docs/specs/README.md`, `docs/backlog/README.md` e le copie in `skills/harness-init/templates/docs/`, se S09 non le ha già portate a dire il flusso nuovo.
- `tests/architecture.test.ts`, `docs/codebase-map.md`.

## Notes

Il branch `backlog/<slug>` serviva a contare gli id anche sulle spec in
corso di taglio altrove. Con il commit su main il conteggio dal ramo di
default basta, perché una spec si taglia in una sessione sola e la board
finisce su main prima della successiva.

Le due skill sono in inglese, i file che scrivono nella lingua della spec.
Il paragrafo di `/slice` che parla del merge come revisione del piano
cambia in: la board stampata è la revisione, il sì è l'approvazione, il
commit è il verbale (ADR-0002, decisione 8, come la rilegge ADR-0003).

La skill non rilancia mai `/harness-init` e non corregge niente
dell'harness del repo dove gira: una riga in `docs/inbox.md` e avanti, S13.
Se `docs/inbox.md` non c'è ancora, lo dice nell'hand-back e non lo crea.

Fuori scope: `/next`, S12; il guardrail sull'harness nelle skill, S13.

---
id: S08
title: La chiusura di una PR non perde un verdetto quando un'altra PR mergia nello stesso momento
status: todo
blocked_by: ADR-0002
tier: 2
human: false
spec: audit (PR #14)
---

## Goal

Sul merge di PR #14 il review log ha perso i due verdetti di quella PR.
`close.yml` ha fatto tre passi su quattro: `review-log.sh` ha letto i verdetti
dai commenti, il commit `chore(harness): close pr #14 [skip ci]` è stato
creato nel runner, e `git push origin HEAD` è stato rifiutato con
`[rejected] (fetch first)`. Il commit è morto lì.

Il motivo è che il job non era solo su main. PR #14 è stata mergiata alle
13:25:48, PR #15 alle 13:26:01. Il job di chiusura di #14 ha fatto il
checkout alle 13:26:00, quando la punta era ancora il merge di #14, e ha
provato a pushare alle 13:26:03, quando la punta era il merge di #15. Tredici
secondi tra due merge bastano.

`close.yml` fa `git add -A docs`, `git commit`, `git push origin HEAD` e
nient'altro: nessun rebase, nessun retry, nessuna rilettura della punta. È
scritto come se main si muovesse solo per mano sua, e main si muove ogni
volta che qualcuno mergia.

Il fallimento è rumoroso nel posto sbagliato. Il run è rosso, ma è il run di
un branch appena cancellato, e nessuno apre i workflow di un branch che non
c'è più: la PR è verde, mergiata, chiusa, e il log ha un buco. L'audit legge
`verdicts.jsonl` per tarare le soglie sull'accordo tra giudice e umano, e una
PR mancante non si vede come un errore, si vede come una PR che non è mai
stata giudicata.

Vale per tutto quello che `close.yml` scrive, non solo per il log: lo stesso
push porta anche `status: done` sul file della slice. Una slice chiusa può
restare `todo` per lo stesso motivo, e lì il danno è peggiore, perché il
README dice che una slice `todo` è eleggibile e qualcuno la riprende.

## Acceptance criteria

- [ ] Il push di `close.yml` sopravvive a un main che si è mosso tra il checkout e il push: rilegge la punta e riapplica il suo commit sopra, invece di fallire.
- [ ] Il riapplico non perde le righe scritte da un altro `close` nel frattempo: due chiusure concorrenti lasciano nel log i verdetti di tutte e due le PR, non quelli dell'ultima che ha vinto.
- [ ] `verdicts.jsonl` resta valido dopo un riapplico: una riga JSON per riga, nessuna riga spezzata a metà, nessun marker di conflitto.
- [ ] Il retry ha un tetto, e quando lo esaurisce fallisce in un modo che qualcuno vede: non basta il run rosso di un branch cancellato.
- [ ] Un `close` che fallisce definitivamente lascia sulla PR il modo di ripararlo, con il numero della PR e il comando da rilanciare, così il recupero non va ricostruito dal log del job come è stato fatto per #14.
- [ ] La stessa protezione copre `status: done` sul file della slice, non solo il review log: sono lo stesso commit e si perdono insieme.
- [ ] `.github/workflows/close.yml` e il suo template restano identici, e `tests/architecture.test.ts` continua a provarlo.

## Test plan

- Il pezzo che si può testare in locale è `review-log.sh` su un file che è cambiato sotto: si scrive il log, si aggiunge una riga da fuori, si riapplica, e le righe ci sono tutte e due. Questo è il criterio sulle chiusure concorrenti e non richiede GitHub.
- `tests/review-log.test.ts`: `verdicts.jsonl` dopo un riapplico è ancora una riga JSON per riga. Il rosso si prova costruendo a mano il caso che il push perdente produrrebbe.
- `tests/architecture.test.ts`: la copia in `.github/workflows/close.yml` uguale al template, che è il check di S04 e va solo tenuto verde.
- Il retry vero, quello contro GitHub, non si prova in Vitest. Va provato una volta a mano su una PR di prova, mergiando due PR a pochi secondi di distanza e verificando che il log le contenga tutte e due, e il modo si scrive nella sezione «Come verificare a mano» della PR.

## Touchpoints

- `skills/harness-init/templates/github/close.yml`: il blocco `git add`/`commit`/`push`.
- `.github/workflows/close.yml`: la copia, che va riportata rilanciando `/harness-init ci`, altrimenti `tests/architecture.test.ts` fallisce.
- `skills/harness-init/templates/scripts/review-log.sh`: solo se il riapplico chiede allo script di essere rilanciabile senza duplicare righe già presenti.
- `tests/review-log.test.ts`, `tests/architecture.test.ts`.

## Notes

Il recupero delle due righe perse su #14 è PR #16, una PR di manutenzione, e
non aspetta questa slice.

La strada più corta è `git pull --rebase` prima del push, in un ciclo con un
tetto di tentativi. Su un file append-only come `verdicts.jsonl` il rebase di
due append concorrenti dà un conflitto banale, ma banale non vuol dire
automatico: va deciso se il conflitto si risolve tenendo tutte e due le parti,
e in quel caso la regola va scritta, oppure se il ciclo rigenera il commit da
zero rilanciando `review-log.sh` sulla punta nuova. La seconda è più lenta e
non ha conflitti da risolvere, ed è probabilmente quella giusta proprio
perché non chiede a nessuno di indovinare come si fondono due log.

`concurrency` sul workflow non basta da sola: serializza i job di `close`, ma
il checkout resta prima del push e la finestra si stringe senza chiudersi. Se
si aggiunge, si aggiunge in più al retry, non al posto suo.

Non c'entra `[skip ci]` nel messaggio di commit: quello evita che la chiusura
faccia ripartire la CI, e funziona. Il push rifiutato è successo prima che
quel messaggio contasse qualcosa.

Fonte: l'osservazione sul run fallito di `close.yml`, non un verdetto. È la
terza volta, dopo S04 e S05, e la riga del README di `docs/backlog/` che lega
l'audit ai verdetti continua a non coprire quello che l'audit trova guardando
le PR e i run. A questo punto la riga è sbagliata, non incompleta.

## Blocked

Ferma per ADR-0002 (2026-09-10): la parte alta della catena, `/spec`, `/slice`, `/next` e `/board`, viene prima della manutenzione della parte bassa. Con il giudice locale e il merge umano questo difetto non fa danno. Resta `todo` con `blocked_by: ADR-0002`, fuori dalle onde di `/next`, finché un umano non toglie l'ADR dal campo quando le quattro skill esistono.

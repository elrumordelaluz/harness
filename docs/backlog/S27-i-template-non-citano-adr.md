---
id: S27
title: I commenti dei template portano la ragione e non il numero di un ADR dell'harness
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-15)
---

## Goal

Gli script, gli hook, lo schema del verdetto e l'inbox che `/harness-init`
copia nei repo dei progetti citano ADR-0003 e ADR-0004 per numero. Quegli ADR
stanno in `docs/decisions/` di questo repo e in nessun progetto: chi legge un
hook in Tipoff trova un riferimento che non porta da nessuna parte, e Tipoff lo
ha notato al rilancio di `local`.

Dopo questa slice nessun template nomina un ADR per numero. Dove il numero
reggeva la frase, il commento dice la ragione con parole sue, e un test in
`tests/architecture.test.ts` impedisce che un numero torni.

## Acceptance criteria

- [ ] Nessun file sotto `skills/harness-init/templates/` contiene `ADR-` seguito da quattro cifre: un test nuovo cammina tutti i template, README compreso, e fallisce nominando il file.
- [ ] Nei nove file cambiano solo commenti, la `description` di `judge.where` nello schema e la prosa del paragrafo di `docs/inbox.md`: le suite che lanciano quegli script e quegli hook (`tests/hooks.test.ts`, `tests/intent.test.ts`, `tests/judge.test.ts`, `tests/policy.test.ts`) passano senza toccare un `expect`, e `scripts/check-shell.sh` resta verde.
- [ ] `.github/judge/verdict.schema.json` torna uguale al template rilanciando la fase `judge` di `/harness-init`, e il confronto delle copie in `tests/architecture.test.ts` resta verde.
- [ ] Suite, typecheck, format e build verdi.

## Test plan

- Prima di tutto, in `tests/architecture.test.ts`, un `describe` accanto a
  `no template judges on the server` (`:1076`), con la stessa forma:
  `it.each(walk(templates))` e, per ogni file, un `expect` che il testo non
  corrisponda a `/ADR-[0-9]{4}/`, con un messaggio che dice perché, un progetto
  non ha gli ADR dell'harness. Rosso oggi su nove file: `githooks/pre-commit`,
  `githooks/pre-push`, `judge/verdict.schema.json`,
  `scripts/ensure-verdict.sh`, `scripts/intent.sh`, `scripts/judge.sh`,
  `scripts/policy-lines.sh`, `scripts/policy.sh`, `docs/inbox.md`.
- Poi `pnpm test` intera: il confronto delle copie in `.github/` cammina i
  template, e le suite degli script provano che il comportamento non è
  cambiato.

## Touchpoints

- `tests/architecture.test.ts`: il `describe` nuovo.
- `skills/harness-init/templates/githooks/pre-commit`: il commento a `:12`.
- `skills/harness-init/templates/githooks/pre-push`: il commento a `:5`.
- `skills/harness-init/templates/judge/verdict.schema.json`: la `description` di `judge.where` a `:50`.
- `.github/judge/verdict.schema.json`: la copia, dalla fase `judge` di `/harness-init`.
- `skills/harness-init/templates/scripts/ensure-verdict.sh`: i commenti a `:162` e `:168`.
- `skills/harness-init/templates/scripts/intent.sh`: il commento a `:4`.
- `skills/harness-init/templates/scripts/judge.sh`: i commenti a `:49` e `:599`.
- `skills/harness-init/templates/scripts/policy-lines.sh`: il commento a `:37`.
- `skills/harness-init/templates/scripts/policy.sh`: i commenti a `:5` e `:22`.
- `skills/harness-init/templates/docs/inbox.md`: il paragrafo a `:3`.

## Notes

La riga dell'inbox, del 2026-09-15: i commenti degli script e degli hook dei
template citano ADR-0003 e ADR-0004 per numero, e nel repo di un progetto quegli
ADR non esistono: Tipoff, al rilancio di `local`, lo ha notato. O si dice
"dell'harness" accanto al numero, o il commento porta la ragione senza il
riferimento.

Delle due forme vale la seconda. L'assenza del numero la verifica una regex sola
e non ha eccezioni; "dell'harness" accanto al numero manderebbe comunque il
lettore di un progetto a cercare un file che non ha, e il test dovrebbe
distinguere un numero accompagnato da uno nudo. In quasi tutte le dodici
citazioni la ragione sta già nella frase e il numero è una parentesi che si
toglie; dove la parentesi era la ragione (`ensure-verdict.sh:162`,
`policy.sh:5`), il commento la scrive, ricavandola da
`docs/decisions/ADR-0003-documenti-su-main-giudice-una-volta.md` e da
`docs/decisions/ADR-0004-il-giudice-solo-in-locale.md`.

`git grep 'ADR-[0-9]' -- skills/harness-init/templates` il 2026-09-17 trova le
dodici citazioni dei nove file dei Touchpoints e nient'altro. La forma
`ADR-<nnnn>` che `board.sh` e i README del backlog usano per `blocked_by` non
ha cifre e il test non la tocca.

`docs/inbox.md` del template si copia solo se manca (`templates/README.md:14`):
un progetto che l'ha già tiene il suo paragrafo, e riportarlo là non è di
questa slice. I file di Tipoff si aggiornano rilanciando `local` e `judge`
dopo il merge, fuori da qui.

Fuori scope: lo stesso paragrafo di `docs/inbox.md:3` del template parla ancora
di `/board` come di una cosa che deve arrivare, e `judge.sh:53` nomina ancora
l'action che imponeva lo schema in CI: sono altre righe, e la slice tocca solo
il numero. Anche le `SKILL.md`, che citano ADR per numero e girano nei progetti
dal symlink, restano fuori: la riga parla dei template. I commenti dei test di
questo repo citano gli ADR a ragione, perché qui gli ADR ci sono.

---
id: S35
title: La skill /judge non racconta più un giudizio o una policy che girano in CI
status: done
blocked_by: none
tier: 1
human: false
spec: inbox (2026-09-17)
---

## Goal

Da ADR-0004 il giudizio è solo locale: nessun workflow giudica, e `policy.sh` ha
un chiamante solo, un terminale dopo `/judge` o dentro `/next`. La skill
`/judge`, che ogni sessione esegue alla lettera, parla ancora di una CI che non
c'è in due frasi: dice che `policy.sh` applica la stessa policy che applica in
CI, e che in CI l'action impone lo schema del verdetto mentre in locale nessuno
lo fa. Chi la legge cerca un secondo cammino che non esiste, e la ragione per cui
`judge.sh check` è la guardia si appoggia a un confronto sparito.

Dopo questa slice le due frasi dicono la cosa com'è, e un test impedisce che la
skill torni a nominare la CI.

## Acceptance criteria

- [ ] Il paragrafo di `policy.sh` nella sezione 7 di `skills/judge/SKILL.md` descrive la policy senza un secondo chiamante: niente "in CI".
- [ ] Il paragrafo di `judge.sh check` dice che è l'unica guardia dello schema, senza il confronto con un'action in CI, e tiene la conseguenza: un rifiuto non si corregge a mano, si rilancia il ruolo con lo stesso bundle.
- [ ] Un test in `tests/architecture.test.ts` asserisce che `skills/judge/SKILL.md` non contiene `in CI`, senza badare a maiuscole.
- [ ] Suite, typecheck, format e build verdi.

## Test plan

- Prima di tutto, in `tests/architecture.test.ts`, accanto a
  `no template judges on the server` (`:1076`): `skills/judge/SKILL.md` letto
  intero non corrisponde a `/\bin CI\b/i`, con un messaggio che nomina ADR-0004,
  il giudizio solo locale. Rosso oggi su `skills/judge/SKILL.md:173` e `:229`.
- Poi `pnpm test` intera.

## Touchpoints

- `tests/architecture.test.ts`: il test nuovo.
- `skills/judge/SKILL.md`: la frase sullo schema a `:173` e quella sulla policy a `:229`.

## Notes

La riga dell'inbox, del 2026-09-17: `skills/judge/SKILL.md:229` dice che
`policy.sh` "applies the same deterministic policy it applies in CI", un
chiamante che non esiste più.

La frase a `:173` non è nella riga: l'ha trovata la lettura del file quando la
riga è diventata slice, ed è dello stesso genere, una CI che giudica. Sono le due
sole occorrenze di "in CI" nel file il 2026-09-17, per questo il test può
vietarlo senza eccezioni.

Il comportamento da descrivere sta negli script e non cambia: il cammino unico
di `policy.sh` è il commento in testa a
`skills/harness-init/templates/scripts/policy.sh:4-6`, la validazione è
`cmd_check` a `skills/harness-init/templates/scripts/judge.sh:398`, e la decisione
è `docs/decisions/ADR-0004-il-giudice-solo-in-locale.md`.

Fuori scope, perché sono altre righe dell'inbox dello stesso giorno: la 7.1 di
`docs/spec.md` sull'action che impone lo schema, il commento di
`skills/harness-init/templates/scripts/judge.sh:224` e il describe di
`tests/judge.test.ts:358`. Resta fuori anche il commento di `judge.sh:53`, che
dice lo stesso della frase a `:173` in un template: è codice e passa dalla sua
slice. Le occorrenze di "in CI" in `skills/harness-init/SKILL.md` parlano dei
gate deterministici, che in CI girano davvero, e restano.

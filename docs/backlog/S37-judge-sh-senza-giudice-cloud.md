---
id: S37
title: judge.sh e i suoi test non spiegano più il giudizio locale con il giudice cloud
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-17)
---

## Goal

Da ADR-0004 il giudice cloud non c'è più, e `judge.sh check` non chiude un buco
rispetto a un'action che in CI imponeva lo schema: è l'unica guardia dello
schema che la catena ha. I commenti di `scripts/judge.sh`, che `/harness-init`
copia in ogni progetto, e i test che lo provano spiegano ancora le scelte dello
script con quel confronto: il bundle nato per il costo del giudice cloud, lo
schema che in CI imponeva l'action, una severità che in CI sarebbe stata
rifiutata, un describe che chiama `check` la guardia che `--json-schema` era in
CI. Chi legge lo script in un progetto cerca un giudice che non esiste.

Dopo questa slice ogni commento dice la ragione della scelta senza il giudice
cloud, e il test sui template che vieta i nomi del giudice cloud vieta anche i
due che restavano.

## Acceptance criteria

- [ ] I commenti di `skills/harness-init/templates/scripts/judge.sh` a `:53`, `:224`, `:273` e `:607` non nominano un'action, `--json-schema`, la CI come posto dove lo schema si impone o il giudice cloud, e ciascuno tiene la ragione che dava: `check` è la guardia dello schema, il bundle è un file solo e una passata, lo schema viaggia con il prompt perché il giudice ci scriva contro, una severità fuori dallo schema non si archivia.
- [ ] In `tests/judge.test.ts` il describe a `:358` e i commenti a `:413` e `:431` dicono la stessa cosa senza la CI e l'action; nessun `expect` cambia.
- [ ] Il test `no template judges on the server` in `tests/architecture.test.ts` vieta anche `--json-schema` e `cloud judge` in ogni template, e con quei due nomi è rosso oggi solo su `judge.sh`.
- [ ] Suite, typecheck, format e build verdi.

## Test plan

- Prima di tutto, in `tests/architecture.test.ts`, la lista `names` del test
  `%s names none of the cloud judge` (`:1084`) prende `--json-schema` e
  `cloud judge`. Rosso oggi su `skills/harness-init/templates/scripts/judge.sh`,
  per `:53` e `:224`; nessun altro template li nomina, a parte `json-schema.org`
  nell'URL di `$schema` dello schema del verdetto, che non contiene
  `--json-schema` e passa.
- Poi `pnpm test` intera: i commenti di `tests/judge.test.ts` non sono coperti da
  un test, e il criterio si chiude leggendo il diff.

## Touchpoints

- `tests/architecture.test.ts`: i due nomi nuovi nella lista a `:1084`.
- `skills/harness-init/templates/scripts/judge.sh`: i commenti a `:53`, `:224`, `:273`, `:607`.
- `tests/judge.test.ts`: il nome del describe a `:358`, i commenti a `:413` e `:431`.

## Notes

La riga dell'inbox, del 2026-09-17: il commento di
`skills/harness-init/templates/scripts/judge.sh:224`, "the cost of the cloud
judge", e il describe di `tests/judge.test.ts:358`, "the guard that
--json-schema is in CI", nominano ancora il giudice cloud.

`judge.sh:53`, `:273`, `:607` e i commenti di `tests/judge.test.ts:413` e `:431`
non sono nella riga: li ha trovati la lettura dei due file quando la riga è
diventata slice, e dicono la stessa cosa con altre parole. Il commento di
`tests/judge.test.ts:86` parla del tier calcolato in CI, che è vero, e resta.

I due nomi entrano nella lista che S26 e ADR-0004 hanno già
(`tests/architecture.test.ts:1070-1097`), invece di un test nuovo, perché dicono
lo stesso divieto. `:273` e `:607` non hanno un nome che li distingua da un uso
legittimo di "in CI", che nei template c'è per i gate deterministici: il test non
li tiene, il diff sì.

Le decisioni sono `docs/decisions/ADR-0004-il-giudice-solo-in-locale.md` e la
validazione è `cmd_check` a `judge.sh:398`, che non cambia: la slice tocca solo
prosa di commenti e nomi di test.

S27 cambia i commenti di `judge.sh` a `:49` e `:599`, vicini a `:53` e `:607`:
`/next` tiene le due slice in onde diverse per il touchpoint in comune, e le
righe citate qui possono essersi spostate quando questa parte. Anche S35 riscrive
la frase di `skills/judge/SKILL.md:173` che dice lo stesso di `judge.sh:53`: le
due frasi nuove devono dire la stessa ragione.

Fuori scope: la 7.1 di `docs/spec.md`, che è S36; il comportamento di `check`.

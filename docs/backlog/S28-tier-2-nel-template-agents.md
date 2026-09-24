---
id: S28
title: Il template di AGENTS.md dice quando una PR a tier 2 aspetta un umano, come la policy
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-16)
---

## Goal

Nella sezione "Gate umani" del template `AGENTS.md` la riga su intent, spec,
board, tier e audit dice che tier 2 e tier 3 si mergiano a mano. Da ADR-0003
non è più vero: `policy.sh` mergia una PR a tier 2 quando i verdetti di tutti e
due i giudici sulla head approvano o hanno risposto, senza un `high` aperto, e
aspetta un umano solo con un `high` aperto o `needs-human`. L'`AGENTS.md` di
questo repo lo scrive già. Ogni progetto installato dal template, Tipoff per
primo, porta la frase vecchia, e una sessione di `/next` che la legge può
fermarsi davanti a una PR che la policy sta per mergiare.

Dopo questa slice il template dice quello che dice questo repo, e un test tiene
le due frasi uguali.

## Acceptance criteria

- [ ] In "Gate umani" di `skills/harness-init/templates/AGENTS.md` la frase sul merge umano per tier è quella di `AGENTS.md` di questo repo: tier 2 con un `high` aperto o `needs-human`, e tier 3. Un test la estrae dai due file e le confronta.
- [ ] Il template non contiene più "Tier 2 e 3: merge umano": lo stesso test lo asserisce, con un messaggio che nomina `policy.sh`.
- [ ] Le suite che leggono il template (`tests/hooks.test.ts`, `tests/intent.test.ts`, `tests/architecture.test.ts`) restano verdi senza toccare un `expect` esistente.
- [ ] Suite, typecheck, format e build verdi.

## Test plan

- Prima di tutto, in `tests/architecture.test.ts`, dentro o accanto a
  `AGENTS.md names paths that exist` (`:384`), che legge già il template in
  `template` (`:399`): un test che prende, dalla riga `- Intent e spec:` di
  ciascuno dei due file, la frase che finisce con `merge umano.` e asserisce che
  quella del template è uguale a quella del repo e non è `Tier 2 e 3: merge
umano.`. Rosso oggi: il template ha la frase vecchia a
  `skills/harness-init/templates/AGENTS.md:40`, il repo quella nuova a
  `AGENTS.md:50`.
- Poi `pnpm test` intera.

## Touchpoints

- `tests/architecture.test.ts`: il test nuovo.
- `skills/harness-init/templates/AGENTS.md`: la frase sul merge umano per tier a `:40`.

## Notes

La riga dell'inbox, del 2026-09-16: la riga "Tier 2 e 3: merge umano" in "Gate
umani" del template `AGENTS.md` è rimasta a prima di ADR-0003: `policy.sh` a
tier 2 mergia con due approve o risposti senza `high` aperto, e l'`AGENTS.md` di
questo repo lo dice già. Tipoff la porta com'è, e un `/next` che legge quella
riga può fermarsi a una PR a tier 2 aspettando un umano che la policy non
aspetta. È un template, quindi una slice.

Il comportamento da descrivere è quello del commento in testa a
`skills/harness-init/templates/scripts/policy.sh:31-36` e del ramo di tier 2 a
`:290-330`; la frase di riferimento è `AGENTS.md:50` di questo repo. La slice
cambia la prosa del template, non la policy.

Il test confronta la frase e non la riga intera: le altre frasi della stessa
riga divergono per ragioni proprie. "Audit: ..., in Docket" è di questo repo e
non di un progetto; "Board: revisione prima della prima PR" contro "la board
stampata e una domanda, poi il commit" dipende dalla riga `Documenti`
(`skills/harness-init/templates/AGENTS.md:39`), e decidere come il template la
dice nei due modi è un'altra riga.

Tipoff riceve la frase rilanciando la fase `local` di `/harness-init` dopo il
merge (`skills/harness-init/templates/README.md:5`), fuori da qui.

Fuori scope: lo scheletro di `AGENTS.md` nella 3.3 di `docs/spec.md` porta la
stessa frase vecchia a `:227`, ed è indietro anche in altri punti della
sezione "Gate umani" e di "Non fare"; riallinearlo vuol dire una versione nuova
della spec, ed è un'altra riga. "Giri di fix esauriti" fra i segnali di tier 3
(`skills/harness-init/templates/AGENTS.md:31`, e `AGENTS.md` di questo repo)
nomina il fixer che ADR-0004 ha tolto, e resta a un'altra riga anche quello.

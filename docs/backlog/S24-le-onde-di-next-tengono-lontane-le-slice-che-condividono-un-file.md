---
id: S24
title: Le onde di /next tengono lontane le slice che condividono un file
status: done
blocked_by: S19
tier: 1
human: false
spec: inbox (2026-09-16)
---

## Goal

Oggi le onde di `/next` nascono da `blocked_by` soltanto. Due slice della
stessa onda che scrivono lo stesso file, su Tipoff S02 e S03 su
`escape-target.test.ts`, fanno fallire in silenzio il merge della seconda:
`policy.sh` dice `merge`, `gh pr merge` rifiuta il conflitto, `/next`
aspetta venti minuti e consegna la PR aperta senza dire perché. Ribasare non
è una via: un rebase cambia la head e il verdetto non la copre più, e nessuno
giudica due volte (ADR-0003). L'unico modo di evitarlo oggi è fingere un
prerequisito, come S22 fa con S21.

Da questa slice `/next` calcola le onde da `blocked_by` più i touchpoint
condivisi: due slice eleggibili che nominano lo stesso path in "Touchpoints"
non partono nella stessa onda, e `blocked_by` torna a dire solo "non si può
costruire senza".

## Acceptance criteria

- [ ] La sezione 2 di `skills/next/SKILL.md` dice che le onde nascono da `blocked_by` e dai touchpoint: dentro un'onda nessun path di "Touchpoints" compare in due slice; quando due slice eleggibili condividono un path, resta nell'onda quella con id più basso e l'altra passa all'onda dopo, e il blocco stampato prima della run lo dice con il path, per esempio `S22 dopo S21: board.sh`.
- [ ] Il confronto è sui path come scritti nelle righe di "Touchpoints", il primo backtick di ogni riga, con "(nuovo)" e "(symlink nuovo)" ignorati; una riga senza backtick non conta.
- [ ] La 5.4 e la 4.4 di `docs/spec.md` dicono la regola nuova, "Cosa cambia" ha la riga e la versione sale.
- [ ] La ground rule su `blocked_by` in `skills/slice/SKILL.md` dice che un file condiviso non è un prerequisito e non va scritto nel campo: ci pensa `/next`.
- [ ] Suite, typecheck, format e build verdi.

## Test plan

- Nessun test automatico: la regola vive in prosa nelle due skill, che nessuno script esegue, e `tests/architecture.test.ts` copre già il frontmatter degli `SKILL.md`. La prova è la board di `/board` in questo repo: S22 e S21 condividono `board.sh`, e con S22 su `blocked_by: S20` il blocco delle onde le tiene lontane da solo.

## Touchpoints

- `skills/next/SKILL.md`: la sezione 2 e il blocco stampato prima della run.
- `skills/slice/SKILL.md`: la ground rule su `blocked_by`.
- `docs/spec.md`: 4.4, 5.4, "Cosa cambia", versione.

## Notes

Dalla riga di inbox del 16 settembre. Quando `board.sh` esiste (S20, S21)
la stessa regola potrà calcolarla lo script e stampare le onde: non è di
questa slice, che è prosa e parte subito.

`skills/**/SKILL.md` e `docs/spec.md` sono prosa della riga `Documenti`:
la slice passa dalla PR come le altre, e `docs/spec.md` può andare su main
con un commit dalla sessione che ha lanciato `/next`.

S22 tiene `blocked_by: S21` finché questa slice non è su main: la run che la
porta legge la skill di prima. Per la stessa ragione questa slice sta dietro
S19, che scrive anche lei `skills/next/SKILL.md`: è l'ultimo `blocked_by`
finto, e lo dice.

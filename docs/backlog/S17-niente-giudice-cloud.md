---
id: S17
title: Il giudice cloud e il fixer escono dai template
status: done
blocked_by: none
tier: 2
human: false
spec: docs/spec.md
---

## Goal

ADR-0004: il giudizio è solo locale. `judge.yml` e `fix.yml` escono dai
template e dalle copie in `.github/workflows/`, con loro il secret
`CLAUDE_CODE_OAUTH_TOKEN`, le variabili `HARNESS_JUDGE_MODEL` e
`HARNESS_FIXER_MODEL` e le label `fix-round:*`. La checklist umana in coda a
`/harness-init judge` scende a due voci, la GitHub App e la PR di impianto.

Oggi la skill installa due workflow che nessuno accende, chiede un token che
solo loro leggono, e la spec descrive un giudice, `claude-code-action`, che
la catena non usa dall'8 settembre. Per chi monta l'harness su un repo nuovo
sono due voci di checklist e un'action da leggere per niente.

## Acceptance criteria

- [ ] Nei template non esistono `github/judge.yml` e `github/fix.yml`, e nemmeno le copie in `.github/workflows/`; `templates/README.md` elenca i quattro workflow che restano nella fase `judge`.
- [ ] Nessun file dei template nomina `CLAUDE_CODE_OAUTH_TOKEN`, `HARNESS_JUDGE_MODEL`, `HARNESS_FIXER_MODEL` o `fix-round`: un test strutturale lo tiene fermo.
- [ ] `tier.sh` non legge più `fix-round:2`: una PR con quella label resta al tier che i path le danno. `tests-weakened` e `needs-human` portano a 3 come oggi.
- [ ] La fase `judge` di `skills/harness-init/SKILL.md` non nomina più `claude-code-action`, il token, le due variabili, il fixer; le label della fase `ci` non hanno `fix-round`; la rilevazione dello stato legge `automerge.yml` e non `judge.yml`; la checklist umana ha due voci e dice che ntfy è opzionale.
- [ ] `skills/judge/SKILL.md` non descrive un fallback cloud e non spiega perché `HARNESS_JUDGE_MODEL` non si usa.
- [ ] I commenti negli script e nei test che spiegano il codice con `judge.yml` o il fixer dicono quello che il codice fa oggi. `policy.sh` resta come è: il suo ramo CI è di un'altra slice (ADR-0004, conseguenze).
- [ ] Suite, typecheck, format e build verdi. Il test che tiene `.github/` uguale ai template resta verde perché le copie escono con i template.

## Test plan

- Il rosso si scrive prima in `tests/architecture.test.ts`: un `describe` che
  cammina i template e fallisce se un file contiene uno dei quattro nomi, e
  fallisce se `github/judge.yml` o `github/fix.yml` esistono. Rosso finché i
  due workflow ci sono.
- In `tests/tier.test.ts`, accanto al caso della label `crashed`: una PR a
  tier 1 con `PR_LABELS: 'tier:1,fix-round:2'` resta a 1. Rosso finché
  `tier.sh` sale a 3.
- Il caso di `tests/policy.test.ts` che chiede di non mettere mai `fix-round`
  resta com'è: dice ancora la cosa giusta.
- `pnpm test` intera, perché le copie in `.github/workflows/` sono confrontate
  con i template da un test che cammina i template stessi.

## Touchpoints

- `skills/harness-init/templates/github/judge.yml`, `fix.yml`: cancellati, con `.github/workflows/judge.yml` e `fix.yml`.
- `skills/harness-init/templates/README.md`: la riga dei workflow della fase `judge`.
- `skills/harness-init/templates/scripts/tier.sh`: la riga di `fix-round:2` e il commento in testa.
- `skills/harness-init/templates/scripts/policy.sh`, `ensure-verdict.sh`: i commenti che nominano `judge.yml`.
- `tests/architecture.test.ts`, `tests/tier.test.ts`: i test nuovi; `tests/judge.test.ts`, `tests/policy.test.ts`: i commenti.
- `AGENTS.md`, `README.md`: la riga di `.github/` e i prerequisiti.
- `skills/harness-init/SKILL.md`, `skills/judge/SKILL.md`, `docs/spec.md`, `docs/codebase-map.md`: prosa, su main con l'ADR.

## Notes

`.github/judge/prompt.md` e `verdict.schema.json` restano: sono del giudice
locale. `escalate.yml` resta: notifica una label messa a mano e non ha niente
del cloud. `automerge.yml` e `close.yml` restano e con loro la GitHub App,
che serve al merge: un merge fatto con `GITHUB_TOKEN` non fa partire
`close.yml` (spec 6.2).

Le variabili e il secret già impostati su questo repo e su Tipoff non li
tocca la slice: si tolgono a mano con `gh variable delete` e
`gh secret delete`, e il comando sta nel resoconto della PR.

Il ramo `origin=ci` di `policy.sh`, con `EXECUTION_FILE` e il link al run,
non ha più chiamanti e resta: è una slice sua, con `judge.where` nello schema
e metà di `tests/policy.test.ts` da riscrivere.

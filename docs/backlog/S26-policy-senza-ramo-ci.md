---
id: S26
title: policy.sh ha un cammino solo, quello del terminale, e il verdetto dice solo local
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-15)
---

## Goal

Da ADR-0004 `scripts/policy.sh` ha un chiamante solo, un terminale dopo
`/judge` o dentro `/next`. Lo script però riconosce ancora l'ambiente di
GitHub Actions e, quando lo trova, applica un'altra policy: il link al run, il
costo letto dal log dell'action, la pulizia dei campi che nessuno ha
archiviato, e un merge che non chiede se la CI è passata sulla head. Nessun
workflow lo lancia più, e `tests/policy.test.ts` gira per default proprio in
quell'ambiente: metà della suite prova un cammino che nessuno percorre, e un
progetto che lanciasse lo script da una sua action avrebbe un merge senza CI.

Dopo questa slice lo script ha un cammino solo, i test lo provano per default,
e lo schema del verdetto non ammette più `judge.where: "ci"`.

## Acceptance criteria

- [ ] `policy.sh` non legge `GITHUB_ACTIONS`, `GITHUB_SERVER_URL`, `GITHUB_REPOSITORY`, `GITHUB_RUN_ID` né `EXECUTION_FILE`: con quelle variabili nell'ambiente fa quello che fa da un terminale senza.
- [ ] Con `GITHUB_ACTIONS=true` e `HARNESS_AUTOMERGE=on`, un approve a tier 1 non si mergia finché il check `ci` non è passato sulla head, come da un terminale.
- [ ] Il commento non ha più la riga `costo:` né un link a `actions/runs`, e un `cost` scritto dal giudice non arriva nel verdetto postato, come oggi da un terminale.
- [ ] Un crash dice sempre di rilanciare `/judge` su quel commit. Nessun testo dello script, nelle decisioni, nei crash o nei commenti, promette un run di CI che giudica di nuovo.
- [ ] `judge.where` vale solo `local`: nello schema del template `"enum": ["local"]` con una descrizione che non nomina un workflow, `judge.sh check` rifiuta `judge.where: "ci"`, e la riga in cima al commento resta `## judge: <role> (local) · ...`.
- [ ] Il cammino del terminale non cambia: ogni test che oggi passa `local: true` passa con gli stessi `expect`, con l'ambiente del terminale diventato il default dell'helper.
- [ ] I test che provano solo il ramo CI escono con il ramo, e la PR li elenca uno per uno con la riga di `policy.sh` che li rendeva veri. `tests/fixtures/execution.jsonl` esce con loro.
- [ ] `.github/judge/verdict.schema.json` torna uguale al template rilanciando la fase `judge` di `/harness-init`, e il confronto delle copie in `tests/architecture.test.ts` resta verde.
- [ ] `docs/spec.md` sale di versione con una riga in "Cosa cambia": nella 7.1 `where` vale solo `local`, e le frasi della 4.6 e della 7.1 che fanno leggere il costo a `policy.sh` dal log dell'action dicono che un giudizio locale non ne porta. `skills/harness-init/SKILL.md` e `docs/codebase-map.md` non nominano più un verdetto giudicato in CI.
- [ ] Suite, typecheck, format e build verdi.

## Test plan

- Prima di tutto, in `tests/policy.test.ts`, un `describe` nuovo con
  `GITHUB_ACTIONS: 'true'`, `GITHUB_RUN_ID` ed `EXECUTION_FILE` sopra
  l'ambiente di un run da terminale (l'helper prende un'opzione per le
  variabili in più). Un approve a tier 1 con automerge on e la CI non passata
  non si mergia; il commento non contiene `actions/runs` né `costo:`;
  `judge.where` nel verdetto è `local`; un verdetto vuoto dice di rilanciare
  `/judge`. Rosso oggi: con `GITHUB_ACTIONS` lo script prende il ramo `ci`
  (`policy.sh:80`), mergia senza guardare la CI (`:410`), costruisce il link al
  run (`:94`) e scrive `ci` in `judge.where` (`:219`).
- In `tests/judge.test.ts`, accanto al caso `.judge.where = "somewhere"`
  (`:397`): `.judge.where = "ci"` è rifiutato con
  `judge.where is ci, not one of`. Rosso finché lo schema ammette `ci`.
- Poi l'helper `policy()` passa per default all'ambiente del terminale: niente
  variabili di GitHub Actions, `head_sha` nel verdetto e non in `HEAD_SHA`, la
  CI verde sulla head come il run del giudice cloud l'aveva per costruzione.
  L'opzione `local` sparisce, e i test che oggi non la passano continuano ad
  asserire la stessa cosa; `(ci)` a `:293` diventa `(local)`.
- Escono solo le asserzioni che hanno per soggetto il ramo CI: la riga del
  costo nel test dell'ordine delle sezioni (`:320`), il test del costo
  (`:400`), il link al run nei due test del crash (`:559`, `:635`), la metà
  `ci` del test sui campi che nessuno ha archiviato (`:497`). La parte che il
  cammino del terminale condivide, l'ordine delle sezioni, la notifica del
  crash, la base che lo store tiene, resta.
- `pnpm test` intera, perché il confronto delle copie in `.github/` cammina i
  template.

## Touchpoints

- `skills/harness-init/templates/scripts/policy.sh`: via `origin`, `run_url`, il costo da `EXECUTION_FILE`, il `del` dei campi del ramo CI, il merge di `:410`, i testi e i commenti che nominano un run di CI che giudica (`:5`, `:45`, `:59`, `:136`, `:366`).
- `skills/harness-init/templates/judge/verdict.schema.json`: `judge.where` a `["local"]` e la sua descrizione.
- `.github/judge/verdict.schema.json`: la copia, dalla fase `judge` di `/harness-init`.
- `tests/policy.test.ts`: il `describe` nuovo, l'helper con l'ambiente del terminale per default, le asserzioni del solo ramo CI fuori.
- `tests/judge.test.ts`: il caso `judge.where = "ci"`.
- `tests/fixtures/execution.jsonl`: cancellato.
- `docs/spec.md`: la versione, "Cosa cambia", il paragrafo del commento nella 4.6, la 7.1.
- `skills/harness-init/SKILL.md`: il punto 2 della fase `judge` (`:226`).
- `docs/codebase-map.md`: la riga sul finding `by: human` tolto da un verdetto giudicato in CI (`:49`).

## Notes

La riga dell'inbox, del 2026-09-15: il ramo `origin=ci` di `policy.sh`, con
`EXECUTION_FILE`, il costo e il link al run, non ha più chiamanti da ADR-0004 e
resta perché `tests/policy.test.ts` gira per default in quell'ambiente.
Toglierlo è una slice sua, con `judge.where` nello schema del verdetto da
rivedere insieme.

La lasciano ADR-0004 (`docs/decisions/ADR-0004-il-giudice-solo-in-locale.md:28`)
e le Notes di S17. L'unico workflow che nomina `policy.sh` è `escalate.yml`, in
un commento.

`judge.where` resta, con un valore solo, invece di uscire dallo schema. Le 40
righe di `docs/review-log/verdicts.jsonl` hanno tutte `"where":"local"`.
`judge.sh check` non toglie il campo prima di validare (`judge.sh:420`), e oggi
lo sovrascrive `policy.sh`: fuori dallo schema e non più scritto, un `where`
inventato dal giudice arriverebbe fino al log, a meno di una guardia nuova in
uno dei due script. Con l'enum a `local` il caso di `tests/judge.test.ts:397`
resta com'è.

Il blocco `cost` dello schema resta, fuori scope: nessun giudizio locale lo
misura oggi, e se toglierlo lo decide l'audit che legge i costi (spec 7.1).
`policy.sh` continua a togliere un `cost` che il giudice ha scritto, come fa
già da un terminale.

Il `del(.base_sha, .outcome, .audit, .answers)` e il `del(.by)` del ramo CI
(`policy.sh:218-226`) escono senza sostituti: da un terminale il verdetto
arriva dallo store, dove `judge.sh check` li ha già tolti (`judge.sh:412-428`),
e `tests/architecture.test.ts:662` tiene `policy.sh` dietro `judge.sh have`.

Il gate di `test-weakening.sh` può leggere le asserzioni tolte come test
indeboliti e portare la PR a tier 3. È atteso: la PR elenca ogni asserzione
tolta con la riga di codice che la rendeva vera, e in questo repo il merge è di
Lionel comunque.

Fuori scope: `HEAD_SHA` nell'ambiente, che oggi vince sul `head_sha` del
verdetto (`policy.sh:181`), resta com'è, perché il suo controllo è di S06.
`tests/tier.test.ts:153` parla di `tier.sh`, che in CI gira davvero. Le righe
storiche di "Cosa cambia" che nominano `execution_file` restano: sono storia
della spec. S05, S06 e S07 toccano `policy.sh` e `tests/policy.test.ts` e
citano righe che questa slice sposta; sono ferme, e `/next` le tiene fuori
dall'onda di questa per i touchpoint in comune.

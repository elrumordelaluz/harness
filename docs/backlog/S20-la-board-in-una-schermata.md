---
id: S20
title: La board stampa slice, inbox e PR in una schermata, e la stessa cosa in JSON
status: done
blocked_by: none
tier: 2
human: false
spec: docs/specs/SPEC-board.md
---

## Goal

Lo scheletro di `/board`: uno script, `scripts/board.sh`, che da un terminale
stampa in quaranta righe le slice di `docs/backlog/` per stato, le righe
aperte di `docs/inbox.md` e le PR aperte, e con `--json` gli stessi dati come
un oggetto. Chi apre una sessione a freddo lo lancia e vede lo stato senza un
grep. Il piano e la prossima azione arrivano con S21, le loro chiavi nel JSON
nascono qui vuote.

## Acceptance criteria

- [ ] `scripts/board.sh` esiste come template in `skills/harness-init/templates/scripts/`, con il symlink in `scripts/`, bash 3.2 e jq, l'uso in testa come gli altri script.
- [ ] Stampa una sezione "Slice" con il conteggio delle `done` in testa, per esempio `13 done`, e una riga per ogni slice non `done`: id, stato, `blocked_by`, tier, `human`, titolo. Le `done` non si elencano.
- [ ] Stampa una sezione "Inbox" con le righe aperte di `docs/inbox.md`, data e testo, e una sezione "PR aperte" con numero, titolo, label di tier e di giudizio da `gh pr list --json`.
- [ ] Una sezione senza niente dentro è una riga che lo dice, `nessuna slice aperta`, `inbox vuota`, `nessuna PR aperta`: mai una sezione che sparisce.
- [ ] Con `gh` assente o non loggato la sezione delle PR dice `gh non disponibile` e lo script esce 0.
- [ ] La schermata sta in quaranta righe con il backlog di questo repo al momento della slice: un test lo verifica su un repo usa e getta con venti slice, di cui quindici `done`, e sette righe di inbox.
- [ ] `--json` stampa un oggetto con esattamente le chiavi `slices`, `prs`, `inbox`, `plan`, `next`; `plan` e `next` sono `null` finché S21 non li riempie, e un test tiene ferma la lista delle chiavi.
- [ ] `skills/harness-init/templates/README.md` ha la riga di `board.sh`, destinazione `scripts/`, fase `local`; la fase `local` di `skills/harness-init/SKILL.md` lo nomina fra gli script che copia; `.claude/settings.json` e il template `settings.json` hanno `Bash(scripts/board.sh*)` nell'allowlist.
- [ ] Suite, typecheck, format e build verdi; `architecture.test.ts` resta verde perché il symlink e la riga del README ci sono.

## Test plan

- `tests/board.test.ts` (nuovo), sul modello di `tests/tier.test.ts`: un repo usa e getta con `docs/backlog/`, `docs/inbox.md` e `docs/decisions/` scritti dal test, e `tests/fixtures/bin` davanti al `PATH` per lo stub di `gh`, con `STUB_PRS` per le PR aperte. Casi, tutti rossi finché lo script non esiste: il conteggio delle `done` e l'assenza delle loro righe; le tre righe delle sezioni vuote; `gh non disponibile` con un `PATH` senza `gh` e con lo stub che fallisce su `pr list` via `STUB_FAIL`; le quaranta righe sulla fixture da venti slice e sette righe di inbox; le cinque chiavi del JSON e nessun'altra.
- `tests/architecture.test.ts` non cambia: cammina i template e trova la riga del README e il symlink da solo.

## Touchpoints

- `skills/harness-init/templates/scripts/board.sh` (nuovo) e `scripts/board.sh` (symlink nuovo).
- `tests/board.test.ts` (nuovo).
- `tests/fixtures/bin/gh`: il ramo `pr list` risponde già con `STUB_PRS`; se il formato JSON che lo script chiede non è coperto, si allarga lì.
- `skills/harness-init/templates/README.md`: la riga di `board.sh`.
- `skills/harness-init/SKILL.md`: la fase `local` nomina lo script.
- `.claude/settings.json`, `skills/harness-init/templates/settings.json`: l'allowlist.
- `docs/codebase-map.md`: la riga dello script nella tabella dei moduli e il test in "Come si lancia e si testa".

## Notes

Decisioni della spec che legano questa slice. La schermata la calcola lo
script e non la skill, perché da un terminale costa zero token e le regole si
testano solo se le calcola un programma; `--json` è il modello dei dati per la
vista HTML della roadmap, che è fuori scope e verrà dopo, e per questo le
chiavi sono esattamente le sezioni della schermata. Una sezione vuota è una
riga che lo dice, per il lettore a freddo: deve poter dire che non c'era
niente, non chiedersi se la board l'ha saltata. Quaranta righe sono "una
schermata"; le `done` non si elencano perché in questo repo sono tredici su
diciassette e mangerebbero lo schermo.

Lo stato "in corso" non è un valore di `status`: da S19 la presa in carico è
il branch `slice/S<NN>-*` sul remote. Questa slice non lo mostra, è la riga
di inbox del 16 settembre, e lo script non deve inventare un valore.

`blocked_by` può contenere un id `ADR-<nnnn>` oltre a `S<NN>` (S22): qui lo
script stampa il campo com'è, senza interpretarlo.

Il ramo `pr list` dello stub `gh` risponde con `STUB_PRS` grezzo: lo script
chiede `--json number,title,labels` e lo stub deve restituire quel JSON; se
il ramo va allargato, resta un ramo per `pr list`, con `STUB_PRS` che porta
il JSON intero.

Bash 3.2 e jq soltanto: niente `mapfile`, array associativi, `${var,,}`,
`-v` su array. `architecture.test.ts` lo cerca.

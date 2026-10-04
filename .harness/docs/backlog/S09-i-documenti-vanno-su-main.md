---
id: S09
title: Un commit di soli documenti passa su main quando AGENTS.md lo dice
status: done
blocked_by: none
tier: 2
human: false
spec: docs/spec.md
---

## Goal

Decisione 1 di ADR-0003. Intent, spec, slice, ADR e righe dell'inbox si
scrivono con l'umano nella stanza e il suo sì è l'approvazione: da oggi vanno
su main senza PR. La regola sta in una riga di `AGENTS.md`, sezione "Gate
umani", `Documenti: su main` oppure `Documenti: PR`, e la leggono gli hook,
non la memoria del modello. `pre-commit` e `pre-push` lasciano passare su
main un commit i cui file stanno tutti nei path della riga "Merge umano per
path" quando la riga `Documenti` dice `su main`, e rifiutano tutto il resto
come oggi. `scripts/intent.sh open` committa e pusha su main. I README delle
tre cartelle raccontano il flusso nuovo.

## Acceptance criteria

- [ ] Con `Documenti: su main` in `AGENTS.md`, un commit su main i cui file staged, cancellazioni comprese, stanno tutti nei path di "Merge umano per path" passa `pre-commit`; un commit con anche un solo file fuori da quei path è rifiutato con il messaggio di oggi più il primo path che non ci sta.
- [ ] Con `Documenti: PR`, o senza la riga, `pre-commit` rifiuta ogni commit su main come oggi.
- [ ] `pre-push` applica la stessa regola ai commit del push verso main: passa se tutti i file toccati nel range stanno nei path, rifiuta altrimenti e nomina il primo path fuori. `HARNESS_ALLOW_MAIN=1` scavalca entrambi gli hook come oggi.
- [ ] La lettura delle due righe segue quella di `scripts/tier.sh`: stessa sezione, stessi glob, stesso modo di trattare un nome con spazi o caratteri quotati. Un pattern che `tier.sh` accetta lo accetta l'hook, e la lettura è dall'`AGENTS.md` del working tree, perché su main la base è HEAD.
- [ ] `scripts/intent.sh`: con `su main`, `new <slug>` scrive il file sul ramo di default senza creare `intent/<slug>`, e `open` rifiuta una sezione vuota, fa il commit del solo file, `docs(intent): <slug>`, lo pusha su main e stampa lo sha; con `PR` fa quello che fa oggi.
- [ ] I README di `docs/intent/`, `docs/specs/` e `docs/backlog/`, qui e nei template, dicono che con `su main` l'approvazione è il commit e con `PR` è il merge, e `tests/architecture.test.ts` continua a tenerli uguali ai template.
- [ ] Il template di `AGENTS.md` porta la riga `Documenti:` in "Gate umani"; la fase `local` di `/harness-init` la scrive `su main` di default e `PR` se l'umano dice team, e non riscrive quella che trova. `tests/architecture.test.ts` controlla che la riga stia nel template.
- [ ] Nessun test indebolito. I casi di oggi degli hook, il rifiuto su main e su master, restano verdi.

## Test plan

- `tests/hooks.test.ts`, nuovo: repo git usa e getta con `core.hooksPath` sugli hook del template e un `AGENTS.md` copiato dentro con la riga in entrambi i valori; un commit di sole docs su main con `su main` passa, uno con un file di `src/` è rifiutato, con `PR` tutto è rifiutato; `pre-push` provato con un origin bare, stesso schema. Prettier e typecheck si saltano nel repo di prova con i comandi stub, come fa `tests/intent.test.ts` con `pnpm`.
- `tests/intent.test.ts`: i casi di oggi restano per `PR`; nuovi casi per `su main`, `new` senza branch e `open` che committa e pusha sul ramo di default senza chiamare `gh`.
- `tests/architecture.test.ts`: la riga `Documenti` nel template di `AGENTS.md`, i README uguali ai template.

## Touchpoints

- `skills/harness-init/templates/githooks/pre-commit`, `skills/harness-init/templates/githooks/pre-push`: il blocco che rifiuta main.
- `skills/harness-init/templates/scripts/tier.sh`: solo se la lettura delle righe di policy si estrae in una funzione che gli hook possano riusare senza copiarla; altrimenti non si tocca.
- `skills/harness-init/templates/scripts/intent.sh`: `new` e `open`.
- `skills/harness-init/templates/AGENTS.md`: la riga in "Gate umani".
- `skills/harness-init/SKILL.md`: la fase `local`, dove compila "Gate umani".
- `skills/harness-init/templates/docs/intent/README.md`, `docs/specs/README.md`, `docs/backlog/README.md` e le tre copie in `docs/` di questo repo.
- `tests/hooks.test.ts`, `tests/intent.test.ts`, `tests/architecture.test.ts`; `docs/codebase-map.md`, il paragrafo dei test.

## Notes

Il flag per run che Lionel aveva proposto, un `automerge: true` in testa
alla sessione, diventa questa riga per repo: un flag per run lo deve
ricordare il modello, una riga del repo la leggono gli hook (ADR-0003,
alternative scartate).

`docs/review-log/` sta nella riga "Merge umano per path" e ci resta: lo
scrive `close.yml` con il token dell'App, che non passa dagli hook locali.

Su questo repo la riga `Documenti: su main` copre anche `skills/**/SKILL.md`
e `skills/spec/templates/SPEC.md`, perché qui la prosa delle skill è un
documento (ADR-0003, decisione 4). La riga è già in `AGENTS.md` con la nota
che vale da quando questa slice è su main; questa slice toglie la nota.

Finché questa slice non è su main, il commit di un documento su main si fa
con `HARNESS_ALLOW_MAIN=1`.

Fuori scope: `/spec` e `/slice` che committano su main, che è S10; `tier.sh`
e la label `human-gate` in CI, che restano come sono perché dicono chi mergia
una PR quando una PR c'è.

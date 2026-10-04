---
id: S04
title: Un workflow di .github che ha lasciato indietro il suo template fa fallire la suite
status: done
blocked_by: none
tier: 2
human: false
spec: audit (PR #8)
---

## Goal

PR #8 è entrata con `tier:0` e senza `human-gate`, che per un file sotto
`docs/intent/**` è la label che dice chi mergia. La label non mancava
dall'harness: `templates/github/ci.yml` la mette dal lavoro di S02, leggendo
le righe `human-gate:` che `tier.sh` stampa su stderr, e
`templates/github/automerge.yml` si ferma quando la trova, tier 0 o no.
Mancava dalla copia: `.github/workflows/ci.yml` era la versione di prima di
S02.

Non era un caso isolato. Al momento di PR #9 cinque workflow su sei
divergevano dal loro template: `ci.yml` per 21 righe, `close.yml` per 26,
`escalate.yml` per 14, `automerge.yml` e `judge.yml` per 7 ciascuno. Solo
`fix.yml` era allineato. Siccome `scripts/` e `.githooks/` sono symlink e
quindi sempre l'ultima versione, questo repo girava con gli script di oggi e
i workflow di tre slice fa: niente di S01 e S03 era in funzione, e il gate
`prose.sh` che la CI doveva eseguire non lo eseguiva nessuno. PR #9 ha
rimesso a posto i file. Questa slice fa in modo che non serva accorgersene di
nuovo a mano.

La suite non se ne era accorta perché guarda dalla parte sbagliata.
`tests/architecture.test.ts` verifica il symlink per ogni hook e ogni script,
ma per i workflow legge dai template, mai da `.github/`. Ogni asserzione sul
comportamento della CI passava mentre la CI che girava davvero faceva
un'altra cosa.

Un symlink qui non è la risposta: GitHub Actions non segue i symlink dentro
`.github/workflows/` e il workflow non viene registrato. La copia resta, e
allora serve un check che la tenga onesta.

## Acceptance criteria

- [ ] Un test struttura confronta ogni file di `.github/workflows/` con il template omonimo in `skills/harness-init/templates/github/` e fallisce alla prima differenza, nominando il file e la fase di `/harness-init` da rilanciare.
- [ ] Il test elenca i file leggendo `.github/workflows/`, non da una lista scritta a mano: un workflow nuovo entra nel check senza che nessuno se lo ricordi.
- [ ] Un file di `.github/workflows/` senza template omonimo fa fallire il test: o manca il template, o è un workflow che non appartiene alla catena.
- [ ] `.github/judge/prompt.md` resta fuori dal confronto, e il test dice perché nel messaggio: è il template con la sezione `## This repo` al posto del placeholder.
- [ ] `docs/codebase-map.md` dice che i workflow sono copie e non symlink, con il motivo, accanto ai draghi già scritti.
- [ ] La definition of done in `AGENTS.md` nomina il check accanto alla riga sul template che si riporta rilanciando la fase.

## Test plan

- `tests/architecture.test.ts`, describe nuovo accanto a "the repo runs on its own templates": `it.each` sui file letti da `.github/workflows/`, confronto del contenuto con il template omonimo, messaggio di errore che nomina la fase da rilanciare.
- Stesso describe: un file senza template omonimo fallisce con un messaggio diverso, così i due modi di sbagliare non si confondono.
- Rosso prima: PR #9 ha già allineato l'albero, quindi il rosso si prova riportando un workflow alla versione di prima con `git checkout <sha prima di #9> -- .github/workflows/close.yml`. Il test deve fallire nominando quel file e tornare verde quando il file è ripristinato.

## Touchpoints

- `tests/architecture.test.ts`: il describe nuovo.
- `docs/codebase-map.md`: la riga sui workflow come copie e il perché.
- `AGENTS.md`: la definition of done.

## Notes

Il rinfresco di `.github/` è PR #9, una PR di manutenzione e non una slice,
perché AGENTS.md vieta di toccare `.github/` da una slice. Va mergiata prima:
il branch di questa slice parte da main dopo quel merge, altrimenti il test
nasce rosso sul suo stesso branch.

L'uguaglianza byte a byte vale qui e non in generale: `SKILL.md` dice di
adattare package manager e versione di Node quando `ci.yml` entra in un
progetto nuovo. In questo repo pnpm e Node sono già quelli del template, e il
test vive in `tests/` di questo repo, quindi guarda solo questo repo. Il
giorno che serve un adattamento anche qui, il confronto diventa normalizzato
e la slice si riapre.

La fonte è l'osservazione sulle label di PR #8, non un verdetto. Il README di
`docs/backlog/` lega l'audit ai verdetti, e questo caso non ci rientra: o la
riga si allarga a quello che l'audit trova guardando le PR, o questa slice
cambia fonte.

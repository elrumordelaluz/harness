---
id: S38
title: La board elenca gli ADR che tengono ferme le slice e chiede se toglierli
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-18)
---

## Goal

Una slice con un `ADR-<nnnn>` in `blocked_by` resta `todo` per sempre finché
un umano non toglie l'ADR a mano, e niente dice quando tocca: la board la
stampa `ferma per ADR-<nnnn>` nella sua riga e la lascia lì, `/next` non la
prende perché un ADR non è mai `done`, e la condizione che la sbloccherebbe
sta in prosa dentro la sezione `## Blocked` del file, che nessuno rilegge.
S05 e S08 sono ferme per ADR-0002 dal 16 settembre.

Dopo questa slice `scripts/board.sh` elenca quegli ADR sotto "Cosa aspetta un
umano", una riga per ADR con il titolo e gli id delle slice, senza valutare
niente: la condizione la legge un umano. E `/board`, dopo le righe
dell'inbox, fa per ogni ADR la stessa domanda che fa per una riga di inbox:
cita la frase del `## Blocked` così com'è, aggiunge la propria lettura del
repo dichiarata come tale, e chiede se togliere l'ADR. Al sì l'ADR esce da
`blocked_by`, la sezione `## Blocked` sparisce e un commit su main lo dice; al
no non si tocca niente. La decisione resta di un umano, la modifica a mano no.

## Acceptance criteria

- [ ] Con una slice non `done` il cui `blocked_by` nomina `ADR-0002`, e `docs/decisions/ADR-0002-<slug>.md` presente, "Cosa aspetta un umano" ha una riga per quell'ADR con l'id, il titolo preso dal primo heading del file e gli id delle slice in ordine di id.
- [ ] Lo script non legge la sezione `## Blocked` e non valuta la sua condizione: due slice ferme per lo stesso ADR con `## Blocked` diversi danno la stessa riga sola con i due id.
- [ ] Un ADR nominato solo da slice `done` non mette righe, e un `blocked_by` di sole slice non ne mette.
- [ ] Il file dell'ADR che non c'è non fa fallire lo script: la riga esce con l'id e senza titolo, e l'uscita resta 0.
- [ ] Le righe degli ADR stanno dopo le PR e le spec `draft` della stessa sezione, con i titoli che iniziano alla stessa colonna delle altre righe, e con almeno un ADR la sezione non stampa `niente aspetta un umano`.
- [ ] `--json` porta la chiave `blocked`, una voce per ADR con `adr`, `title` (`null` senza file) e `slices`, e `[]` quando nessuna slice aperta è ferma per un ADR.
- [ ] Le righe degli ADR non cambiano la prossima azione: la regola 1 legge solo le PR con le tre label, e con un ADR fermo e una slice eleggibile l'azione resta `/next`.
- [ ] La schermata resta sotto le quaranta righe nei casi di larghezza che il test già copre, con tre ADR fermi in più.
- [ ] `skills/board/SKILL.md` nomina il file di una slice già scritta fra i posti che la skill può scrivere, per il solo `blocked_by` e la sola sezione `## Blocked`, e `tests/architecture.test.ts` ritrova nel file il soggetto del commit di questa risposta e lo passa a `scripts/commitlint.sh` come fa con i soggetti delle tre risposte dell'inbox.

## Test plan

- `tests/board.test.ts`, un `describe` nuovo accanto a `the human section lists what waits for a human, and nothing else`: il repo usa e getta scrive `docs/decisions/ADR-0002-<slug>.md` e le slice, e i casi coprono la riga con titolo e id, le due slice sullo stesso ADR, l'ADR delle sole slice `done`, il file dell'ADR mancante con l'uscita 0, l'ordine dentro la sezione e le colonne, e la sezione che non dice più che non aspetta niente. Falliscono prima perché oggi la sezione legge solo `.prs` attraverso le tre label e le spec `draft` (`scripts/board.sh:413`).
- `tests/board.test.ts`, nel `describe` del JSON: la chiave `blocked` con le tre voci e `[]` senza ADR fermi. Fallisce prima perché la chiave non esiste, e il commento in testa allo script dice che cosa aspetta un umano non è una chiave (`scripts/board.sh:28`).
- `tests/board.test.ts`, nel `describe` della prossima azione e in quello delle quaranta righe: un ADR fermo non cambia il ramo della regola 1 né la larghezza della schermata. Il primo passa già oggi ed è la guardia contro il ritocco della regola, il secondo fallisce solo se le righe nuove sfondano lo schermo.
- `tests/architecture.test.ts`, accanto al caso dei soggetti delle tre risposte di `/board`: il soggetto del commit che toglie un ADR sta in `skills/board/SKILL.md` e passa `commitlint.sh`. Fallisce prima perché nel file non c'è.

## Touchpoints

- `skills/harness-init/templates/scripts/board.sh`: la sezione umana, la chiave `blocked` del JSON e il commento in testa. `scripts/board.sh` è il symlink e non si tocca.
- `tests/board.test.ts`: i casi nuovi e la fixture che scrive un ADR.
- `tests/architecture.test.ts`: il soggetto del commit della risposta.
- `skills/board/SKILL.md`: la ground rule dei posti che la skill scrive, la sezione nuova delle domande sugli ADR e la riga nell'hand-back. Nel branch, non su main.
- `docs/spec.md`: la 5.7 e una versione nuova nell'intestazione con la sua riga in "Cosa cambia". Nel branch, non su main.
- `docs/backlog/README.md`: la riga di `blocked_by` dice che l'ADR lo toglie `/board` con il sì dell'umano. Nel branch, non su main.
- `docs/codebase-map.md`: le righe di `skills/board/` e della cartella degli script. Nel branch, non su main.

## Notes

La riga dell'inbox da cui viene, intera:

> - 2026-09-18: una slice ferma per un ADR non si sblocca da sola e niente
>   dice quando tocca: S05 e S08 sono `ferma per ADR-0002` sulla board dal 16
>   settembre, quando `/board` è arrivata e la condizione del loro
>   `## Blocked` è diventata vera. `board.sh` le elenchi sotto "Cosa aspetta
>   un umano", una riga per ADR con il titolo dell'ADR e gli id delle slice,
>   senza valutare la condizione. Poi `/board` fa per ogni ADR una domanda,
>   come per una riga di inbox: dice il titolo dell'ADR, cita la frase del
>   `## Blocked` così com'è, aggiunge una riga su quello che vede nel repo,
>   dichiarata come lettura sua, e chiede "la togli?". Al sì mette
>   `blocked_by: none`, toglie la sezione `## Blocked` e fa un commit su main;
>   al no non tocca niente. La decisione resta di un umano, come dice
>   `docs/backlog/README.md`, e la modifica a mano sparisce. Allarga quello
>   che `/board` può scrivere: `skills/board/SKILL.md` e la spec con una
>   versione nuova.

Letture di quando la riga è stata chiusa. La condizione è la stessa frase in
`docs/backlog/S05-tier-2-non-si-escalation-da-solo.md:103` e
`docs/backlog/S08-close-non-perde-un-verdetto.md:95`, e le quattro skill che
nomina esistono tutte in `skills/`. La sezione umana della schermata è
`scripts/board.sh:413`, e legge solo le PR con le tre label più le spec
`draft`. Il commento in testa allo script, `scripts/board.sh:28`, dice che
quella sezione non è una chiave del JSON: questa slice la aggiunge e lo
riscrive. Un commit su main che tocca `docs/backlog/` passa il `pre-commit`,
perché la riga `Documenti` di "Gate umani" in `AGENTS.md:49` ci mette i path
di "Merge umano per path". S29 e S32 toccano `board.sh` per altro: le onde di
`/next` le tengono lontane da questa.

Due scelte da fare in sede di implementazione, scritte qui perché la riga non
le copre. Le domande sugli ADR vengono dopo quelle dell'inbox, non prima: la
prossima azione è già stampata e non cambia, e le righe dell'inbox sono
quelle che la schermata nomina in fondo. `blocked_by` può essere una lista, e
al sì esce solo l'ADR di quella domanda: `none` lo diventa il campo quando
non resta niente.

I quattro touchpoint di prosa dicevano "Commit su main", che è la riga
`Documenti` di "Gate umani" di `AGENTS.md`, e non è quello che succede: la
prosa che una slice nomina viaggia nel suo branch con il codice, che è il
punto 5 del brief del subagent in `skills/next/SKILL.md`. Vince quel punto,
perché il giudice legge i touchpoint della slice e la PR è dove la modifica è
intera; la riga di `AGENTS.md` vale per la prosa che nessuna slice sta
portando. Il `human-gate` che la PR prende da `docs/backlog/README.md` viene
da lì ed è voluto: quella PR la mergia un umano. È la risposta al finding F1,
la cui osservazione è giusta e il cui rimedio no: un rebase cambierebbe la
head che il verdetto copre, e nessuno giudica due volte (ADR-0003).

Fuori scope: se S05 e S08 vadano sbloccate davvero, che è la domanda che
questa slice rende possibile e non la risposta; `/next` e la sua definizione
di eleggibile, che non cambia; lo stato `blocked` del frontmatter; la
valutazione automatica di una condizione del `## Blocked`, che resta di un
umano.

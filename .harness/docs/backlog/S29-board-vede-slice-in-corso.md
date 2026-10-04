---
id: S29
title: La board dice quale slice è in corso, e né la board né /next la danno per eleggibile
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-16)
---

## Goal

Da S19 la presa in carico di una slice è il branch `slice/S<NN>-<slug>` sul
remote, e `in-progress` non è più uno stato. Il commento in testa a
`scripts/board.sh` lo dice, ma nessuna riga dello script legge un branch: una
slice presa da un'altra sessione resta `todo` sulla schermata, conta come
eleggibile, e la prossima azione dice `/next` su un lavoro che ha già un
padrone. `/next` se ne accorge solo quando `git worktree add` o il push del
branch falliscono.

Dopo questa slice una slice `todo` che ha il suo branch sul remote si legge
`in corso` nella colonna dello stato, non è eleggibile né per la regola 2 della
board né per la sezione 2 di `/next`, e le due skill fanno la fetch con
`--prune`, così un branch cancellato libera la sua slice.

## Acceptance criteria

- [ ] Con `refs/remotes/origin/slice/S<NN>-<qualunque slug>` presente, una slice `S<NN>` con `status: todo` è stampata con `in corso` nella colonna `stato` al posto di `todo`. Il `status` del frontmatter non cambia, e nel JSON la slice porta il nome del branch in un campo suo, `null` quando non ce n'è.
- [ ] Una slice `todo` in corso non è eleggibile: con solo quella fra le `todo`, la regola 2 non scatta e la prossima azione è la regola successiva che scatta; con un'altra slice eleggibile, il fatto della regola 2 nomina solo l'altra.
- [ ] Un branch di una slice `done` o `blocked` non cambia niente di quello che la board stampa oggi per quella slice.
- [ ] Un branch che non ha la forma `slice/S<NN>-<slug>` non marca nessuna slice, e l'id si confronta intero: `slice/S1-x` non marca `S10`, `slice/S10-x` non marca `S1`.
- [ ] Senza nessun ref `refs/remotes/origin/slice/*`, anche in un repo senza remote, la board stampa quello che stampa oggi ed esce 0.
- [ ] La sezione 2 di `skills/next/SKILL.md` aggiunge alla definizione di eleggibile il quarto punto, nessun `slice/S<NN>-*` sul remote, e la sezione 1 lo aggiunge ai motivi per cui una slice passata come argomento non è eleggibile. `docs/backlog/README.md` e il suo template dicono lo stesso nella riga "Eleggibile".
- [ ] `skills/board/SKILL.md` fa `git fetch --prune origin` nella sezione 2 e scrive la regola 2 con il quarto punto; `skills/next/SKILL.md` fa la fetch del default branch con `--prune`. Il confronto dei nomi e dell'ordine delle regole in `tests/architecture.test.ts` resta verde.
- [ ] `docs/spec.md` sale di versione con una riga in "Cosa cambia": la definizione di eleggibile della 4.4 (`:316`) e la 5.7 (`:460`) nominano il branch.
- [ ] Suite, typecheck, format e build verdi.

## Test plan

- Prima di tutto, in `tests/board.test.ts`, un'opzione `branches` dell'helper
  `board()` (`:77`): dopo `git init` un commit vuoto con un'identità passata
  con `-c`, e per ogni nome un `git update-ref refs/remotes/origin/<nome>`
  sullo stesso commit. Poi, in un `describe` nuovo accanto a
  `eligible is the definition of /next` (`:765`):
  - una `todo` con `slice/S02-una-slice` ha la riga con `in corso` nella
    colonna `stato`, e nel JSON il campo del branch;
  - la sola `todo` in corso fa scattare la regola dopo la 2; con `S02` in corso
    e `S03` eleggibile il fatto è `S03`;
  - una `done` e una `blocked` con il loro branch non cambiano riga, conteggio
    né prossima azione;
  - `slice/S1-x` non marca `S10`, `slice/S10-x` non marca `S1`,
    `slice/altro` e `feature/S02-x` non marcano niente;
  - senza ref, e senza remote, l'output è quello di oggi.
    Rossi oggi: `board.sh` non legge ref, stampa `.status` così com'è (`:394`) e
    `eligible` guarda solo `status`, `human` e `blocked_by` (`:319-322`).
- In `tests/architecture.test.ts`, accanto a
  `skills/board/SKILL.md wraps board.sh and closes the inbox` (`:972`): la
  sezione 2 di `skills/board/SKILL.md` contiene `git fetch --prune origin`, e la
  sezione 2 di `skills/next/SKILL.md` nomina `slice/S<NN>-` nella definizione di
  eleggibile. Rosso oggi: nessuna delle due lo dice.
- Poi `pnpm test` intera.

## Touchpoints

- `skills/harness-init/templates/scripts/board.sh`: la lettura dei ref `refs/remotes/origin/slice/*`, il campo del branch nel JSON, `eligible` che lo esclude, `in corso` nella colonna `stato`, e il commento di testa a `:33-37` e `:281-285` che lo dice.
- `tests/board.test.ts`: l'opzione `branches` dell'helper e il `describe` nuovo.
- `tests/architecture.test.ts`: le due asserzioni sulle skill.
- `skills/board/SKILL.md`: `--prune` nella fetch della sezione 2, la regola 2 con il quarto punto.
- `skills/next/SKILL.md`: il quarto punto di eleggibile nella sezione 2, il quarto motivo nella sezione 1, `--prune` nella fetch.
- `docs/backlog/README.md`: la riga "Eleggibile" a `:22`.
- `skills/harness-init/templates/docs/backlog/README.md`: la stessa riga a `:22`.
- `docs/spec.md`: la versione, "Cosa cambia", la 4.4 a `:316`, la 5.7 a `:460`.

## Notes

La riga dell'inbox, del 2026-09-16: `board.sh`, quando ci sarà, legge lo stato
"in corso" dai branch `slice/S<NN>-*` sul remote e non da un valore di
`status`, perché `in-progress` esce dal frontmatter con la riga sopra; la spec
di `/board` è approvata e non lo dice.

La decisione presa rispondendo alla riga: una slice in corso esce dall'insieme
delle eleggibili per tutte e due, board e `/next`, perché
`docs/specs/SPEC-board.md:30` vuole che non disaccordino su cosa viene dopo, e
perché `/next` la troverebbe comunque presa al `worktree add`
(`skills/next/SKILL.md:161`). La fetch con `--prune` viene con la stessa
decisione: oggi il checkout tiene i ref di `slice/S16` fino a `slice/S26`, tutte
slice `done`, e senza prune un branch cancellato sul remote terrebbe ferma la
sua slice per sempre. `board.sh` non fa la fetch: la schermata è fresca quanto
l'ultima fetch della skill, come lo è oggi per `docs/`.

Il remote è `origin`, come nelle fetch di `/board` e di `/next`. L'id del branch
è la parte fra `slice/` e il primo trattino, confrontata intera con l'`id` del
frontmatter, con la forma `S[0-9]+`.

Le righe restano quelle del frontmatter con due eccezioni, `ferma per ADR-<nnnn>`
in `blocked_by` e ora `in corso` nello stato; il JSON tiene `status` come è
scritto, come tiene `blocked_by`.

`/next`, dentro una run, calcola le onde prima di creare i branch, e un'onda
successiva si calcola su slice che il branch non l'hanno ancora: il quarto punto
non toglie a una run le slice che sta per prendere. Un branch lasciato da una
run caduta a metà senza `status: blocked` tiene la slice in corso finché un
umano non lo cancella, ed è quello che la presa in carico dice già
(`docs/spec.md:318`).

Fuori scope: `docs/specs/SPEC-board.md` è approvata e non si riapre. Chi
cancella i branch delle slice mergiate, `close.yml` o l'impostazione del repo,
è un'altra riga: con questa slice un branch rimasto di una slice `done` non
cambia niente. Il ramo delle PR aperte della board non cambia.

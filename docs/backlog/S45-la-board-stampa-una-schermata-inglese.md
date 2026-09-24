---
id: S45
title: La board apre la sessione in inglese
status: done
blocked_by: none
tier: 2
human: false
spec: docs/specs/SPEC-english-first.md
---

## Goal

`scripts/board.sh` è la prima cosa che un dev vede a ogni sessione fredda:
cinque titoli di sezione, le colonne, le righe che non sono un titolo e la
prossima azione con la regola che l'ha scelta. Tutto italiano, e stampato da
uno script, quindi non lo salva nemmeno la lingua della conversazione.

Dopo questa slice la schermata è inglese: i titoli, le intestazioni di
colonna, le righe che oggi dicono `ferma per ADR-<nnnn>`, `in corso`,
`gh non disponibile` e le altre, e la riga finale con l'azione e la regola.
Le chiavi di `--json` non cambiano: le legge un programma, non un umano.

## Acceptance criteria

- [ ] I cinque titoli di sezione della schermata sono inglesi.
- [ ] Le intestazioni di colonna della tabella delle slice sono inglesi.
- [ ] Le righe che non sono un titolo sono inglesi: `ferma per ADR-<nnnn>`, `in corso`, `gh non disponibile`, le righe vuote delle sezioni, le marche dei passi del piano e la riga `oltre:`.
- [ ] La riga finale, azione, regola e fatto, è inglese, e i nomi delle regole seguono.
- [ ] Le chiavi dell'oggetto `--json` restano quelle di oggi, e i valori che sono dati restano dati: gli id, i path, i testi presi dai file e le label non si traducono.
- [ ] La schermata resta sotto le quaranta righe e dentro le cento colonne nei casi di larghezza che `tests/board.test.ts` già copre.
- [ ] `skills/board/SKILL.md` ripete la prossima azione con le parole nuove e non ne ricalcola nessuna.

## Test plan

- `tests/board.test.ts`, i `describe` della schermata: i titoli, le colonne e le righe vuote inglesi, su ogni fixture che oggi si aspetta l'italiano. Falliscono prima perché le stringhe attese sono quelle italiane dello script.
- `tests/board.test.ts`, il `describe` della prossima azione: una fixture per ramo della regola, con l'azione e il nome della regola inglesi, e l'ordine fra i rami che non cambia. Falliscono prima per la stessa ragione.
- `tests/board.test.ts`, il `describe` del JSON: le chiavi restano quelle, e il valore di `next.rule` è il nome inglese. Il primo passa già oggi ed è la guardia contro una traduzione che scivola nelle chiavi, il secondo fallisce prima.
- `tests/board.test.ts`, i casi della larghezza e delle quaranta righe: passano sulle stringhe inglesi, che sono più corte o più lunghe di quelle italiane e possono spostare una colonna.
- `tests/architecture.test.ts`, il caso che tiene i nomi e l'ordine delle regole della prossima azione uguali a quelli che `board.sh` applica: i nomi nuovi. Fallisce prima perché li confronta con quelli italiani.

## Touchpoints

- `skills/harness-init/templates/scripts/board.sh`: le stringhe della schermata, i nomi delle regole, i commenti che le spiegano. `scripts/board.sh` è il symlink e non si tocca.
- `skills/board/SKILL.md`: la prossima azione ripetuta con le parole nuove e gli esempi di schermata che il file porta.
- `tests/board.test.ts`: le attese di ogni caso che legge la schermata.
- `tests/architecture.test.ts`: i nomi delle regole.
- `docs/codebase-map.md`: la riga di `skills/board/` e quella della cartella degli script, se la traduzione le rende false.

## Notes

Il criterio della spec: `scripts/board.sh` stampa titoli inglesi, e le righe
che non sono un titolo, oggi `ferma per ADR-<nnnn>`, `in corso` e
`gh non disponibile`, lo sono. La spec elenca tre righe come esempio e non
come lista chiusa: quello che va in inglese è tutto quello che lo script
stampa per un umano.

I dati non si traducono. Un id, un path, il testo di una riga di inbox, il
titolo di una slice, una label di GitHub e il testo di un passo del piano
arrivano dai file e restano come sono: tradurli vorrebbe dire riscrivere il
contenuto del repo, che questa slice non fa. Le chiavi di `--json` sono un
contratto fra script e skill e non cambiano.

`/board` mostra la schermata com'è e ripete la prossima azione senza
ricalcolarla: la skill non traduce niente a video, quindi le sue righe di
esempio vanno allineate o mostrerebbero una schermata che lo script non
stampa più.

S38 e S29 toccano `board.sh` per altro: le onde di `/next` le tengono lontane
da questa, e chi arriva secondo rilegge lo script prima di tradurre.

La larghezza della schermata è calcolata sui valori che la sezione stampa: una
stringa inglese più lunga di quella italiana allarga una colonna e può
sfondare le cento colonne o le quaranta righe. I casi che lo provano esistono
già e sono la ragione per cui questa slice non è solo una sostituzione di
testo.

Fuori scope: le regole della prossima azione e il loro ordine, che non
cambiano; le chiavi del JSON; `/board` come skill, a parte le righe che
ripetono la schermata.

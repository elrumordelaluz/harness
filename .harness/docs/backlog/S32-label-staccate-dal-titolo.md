---
id: S32
title: Nella board la label più lunga non si attacca al titolo della PR
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-16)
---

## Goal

La board stampa le PR aperte e quello che aspetta un umano in colonne a
larghezza fissa, e la colonna delle label è larga 25. Le label di giudizio che
`policy.sh` mette arrivano a 26 caratteri, `judge:correctness:escalate`, e le tre
label umane insieme ne fanno 29: quando la label supera la colonna, `pad` non
aggiunge spazi, il titolo si attacca alla label e la riga esce dall'allineamento
delle altre.

Dopo questa slice le due colonne si allargano sulla label più lunga che stampano,
come fa già la colonna `blocked_by` delle slice, e il titolo restituisce le
colonne, così la riga resta nei cento caratteri.

## Acceptance criteria

- [ ] In "PR aperte", con una PR `judge:correctness:escalate` e una `judge:security:approve`, fra la label e il titolo c'è almeno uno spazio e i due titoli iniziano alla stessa colonna.
- [ ] In "Cosa aspetta un umano", con una PR che ha `human-gate`, `needs-human` e `tier:3`, una che ha solo `human-gate` e una spec `draft`, fra le label e il titolo c'è almeno uno spazio, e i titoli e il path della spec iniziano alla stessa colonna.
- [ ] Nessuna riga delle due sezioni supera i cento caratteri con un titolo lungo e le label più lunghe: il titolo si taglia di quanto la colonna si è allargata.
- [ ] Con label di al massimo 23 caratteri, che oggi hanno già due spazi prima del titolo, le due sezioni stampano le stesse righe di oggi.
- [ ] Suite, typecheck, format e build verdi.

## Test plan

- Prima di tutto, in `tests/board.test.ts`, nel `describe`
  `the PR section reads the open PRs from gh` (`:316`): due PR, una con
  `judge:correctness:escalate`, una con `judge:security:approve`, e titoli lunghi;
  la riga della prima ha almeno uno spazio fra la label e il titolo, i due titoli
  hanno lo stesso `indexOf`, nessuna riga della sezione supera i cento
  caratteri. Rosso oggi: `pad(25)` a `board.sh:409` non aggiunge spazi a una
  label di 26.
- Nel `describe`
  `the human section lists what waits for a human, and nothing else` (`:430`):
  le due PR e la spec `draft` del criterio, con gli stessi tre controlli, spazio,
  colonna, cento caratteri. Rosso oggi: le tre label unite fanno 29 caratteri
  contro `pad(25)` a `board.sh:417`.
- Un caso con label corte, `tier:1` e `judge:security:approve`, che confronta le
  righe delle due sezioni con quelle attese oggi, per il quarto criterio. Verde
  prima e dopo: tiene fermo che la colonna non si allarga senza motivo.
- Poi `pnpm test` intera.

## Touchpoints

- `skills/harness-init/templates/scripts/board.sh`: la larghezza calcolata delle due colonne di label a `:409` e `:417`, anche per la riga della spec `draft` a `:421`, e il taglio dei titoli a `:410`, `:418` e del path a `:421` che la restituisce.
- `tests/board.test.ts`: i casi nuovi nei due `describe`.

## Notes

La riga dell'inbox, del 2026-09-16: in `board.sh` la colonna delle label di
giudizio di "PR aperte" è larga 25 e `judge:correctness:approve` ne occupa 25: il
titolo della PR si attacca alla label, e `judge:correctness:request-changes`
sposta tutta la riga. "Cosa aspetta un umano", nata con S21, ha lo stesso
difetto: le tre label umane insieme fanno 29 caratteri nella stessa cella (F2 low
di correctness su PR #40). La larghezza va calcolata sulla label più lunga che la
CI può mettere, o la label va dopo il titolo.

Le label di giudizio che esistono sono `judge:<role>:<esito>` con esito
`approve`, `changes`, `escalate` e `crashed`
(`skills/harness-init/templates/scripts/policy.sh:97` e `:440`): la più lunga è
`judge:correctness:escalate`, 26 caratteri. `judge:correctness:request-changes`,
che la riga nomina, non la mette nessuno.

Delle due forme vale la larghezza calcolata sui valori stampati, decisa
rispondendo alla riga, perché è la regola che la board applica già alla colonna
`blocked_by` (`board.sh:391`, con il minimo di 12 e il valore più lungo più due):
qui il minimo è 25, così una board con label corte non cambia. Una larghezza
fissa sulla label più lunga possibile toglierebbe spazio al titolo anche quando
nessuna PR la porta, e la label dopo il titolo cambierebbe il colpo d'occhio di
tutte le righe.

La larghezza di ogni sezione si calcola sulle sue righe: "PR aperte" sulle label
di giudizio, "Cosa aspetta un umano" sulle label umane unite e su `draft`.

Fuori scope: a tier 2 una PR porta due label di giudizio, una per ruolo, e la
board ne stampa una sola (`tag` a `board.sh:374` prende la prima); il test
esistente a `tests/board.test.ts:317` usa `judge:correctness:pass`, un esito che
non esiste, e resta com'è.

S29 tocca gli stessi due file, in altre righe: `/next` tiene le due slice in onde
diverse per i touchpoint in comune, e le righe citate qui possono essersi
spostate quando questa parte.

---
id: S21
title: La board dice a che passo sta il piano e qual è la prossima azione, con il motivo
status: done
blocked_by: S20
tier: 2
human: false
spec: docs/specs/SPEC-board.md
---

## Goal

Sotto le tre sezioni di S20 la board stampa il piano in vigore, con il passo
corrente e il segno che il backlog è andato oltre, poi la prossima azione con
una riga di motivo, scelta da una regola in ordine fisso. Chi apre una
sessione a freddo sa cosa fare senza aprire un ADR e senza scegliere fra due
raccomandazioni. Le chiavi `plan` e `next` del JSON, nate vuote in S20, si
riempiono qui.

## Acceptance criteria

- [ ] Il piano in vigore è l'ADR più recente in `docs/decisions/` con una sezione `## Ordine di lavoro`, per numero di ADR; senza nessun ADR così la sezione "Piano" dice `nessun piano in vigore`.
- [ ] La sezione "Piano" stampa i passi numerati di quella sezione, uno per riga, con un segno: fatto quando ogni `S<NN>` nominato nella riga è `done`; corrente il primo non fatto; `a mano` per un passo che non nomina nessuna slice.
- [ ] Accanto al piano la riga `oltre: S14-S17` quando su main esiste una slice con id più alto di ogni id nominato dal piano; niente riga quando non c'è.
- [ ] La sezione "Cosa aspetta un umano" elenca le PR aperte con label `human-gate`, `needs-human` o `tier:3`, e le spec con `status: draft` in `docs/specs/`; vuota, lo dice.
- [ ] La prossima azione la sceglie una regola in ordine fisso e la prima che scatta vince: una PR che aspetta un umano; una slice eleggibile, azione `/next`; una spec `approved` senza slice su main, azione `/slice <path>`; un intent senza spec, azione `/spec <path>`; il passo corrente del piano, se il backlog non è andato oltre; altrimenti `leggi l'inbox`.
- [ ] Eleggibile è la definizione di `skills/next/SKILL.md`, sezione 2: `status: todo`, ogni id in `blocked_by` una slice `done`, `human: false`. Un `blocked_by` che nomina un ADR non è mai `done`.
- [ ] L'ultima riga della board è `prossima azione: <azione>, perché <regola>: <fatto>`, per esempio `prossima azione: /next, perché slice eleggibile: S18`.
- [ ] `--json` porta `plan` con i passi, ognuno con numero, testo, stato e gli id nominati, più `beyond`; e `next` con `action`, `rule`, `fact`. Le chiavi del primo livello restano le cinque di S20.
- [ ] La schermata resta in quaranta righe sulla fixture di S20 più un ADR con sette passi.

## Test plan

- In `tests/board.test.ts`, casi nuovi, rossi finché il codice non esiste: due ADR nella fixture, il più recente con `## Ordine di lavoro` e sette passi come ADR-0003, di cui due senza id; i segni fatto, corrente, a mano; `oltre` presente con una S17 sul backlog e assente senza; la sezione umana con `STUB_PRS` che porta una PR `human-gate` e una spec `draft`; la regola con una fixture per ogni ramo, dalla PR umana al `leggi l'inbox`, e l'ultima riga esatta; il JSON con `plan` e `next` pieni e le cinque chiavi; le quaranta righe.

## Touchpoints

- `skills/harness-init/templates/scripts/board.sh`: le due sezioni e la regola.
- `tests/board.test.ts`: i casi.
- `docs/codebase-map.md`: una riga se la forma dello script cambia.

## Notes

Decisioni della spec che legano questa slice. Il passo del piano si deriva
dall'ADR e da nessun file nuovo: un puntatore da aggiornare a mano invecchia,
è la riga di inbox del 15 settembre; il costo è la convenzione che un passo
nomini le sue slice con `S<NN>`, che ADR-0003 rispetta in cinque passi su
sette. La regola della prossima azione è scritta e in ordine fisso perché il
15 settembre il ragionamento libero ha dato due raccomandazioni difendibili:
la stessa regola sta in prosa in `skills/board/SKILL.md` (S23), ma la calcola
lo script, così due sessioni danno la stessa risposta. Cosa aspetta un umano è
una lista chiusa: le tre label e le spec `draft`, niente altro.

Il motivo nomina la regola e il fatto, mai un giudizio: "S18 è eleggibile",
non "S18 sembra la più urgente".

Un intent senza spec è un file di `docs/intent/` che nessuna spec di
`docs/specs/` nomina nel campo `intent:`; una spec senza slice è una
`approved` che nessuna slice nomina in `spec:`.

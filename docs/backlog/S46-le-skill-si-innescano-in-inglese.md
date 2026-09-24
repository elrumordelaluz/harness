---
id: S46
title: Le sei skill si presentano e si innescano in inglese
status: done
blocked_by: none
tier: 1
human: false
spec: docs/specs/SPEC-english-first.md
---

## Goal

Il corpo dei sei `SKILL.md` è già inglese, il frontmatter no: ogni
`description` porta frasi d'innesco italiane, `"vai"`, `"monta l'harness"`,
`"affetta la spec"`, `"giudica questo branch"`, `"apri la board"`, ed è la
riga che Claude Code legge per decidere quando far partire una skill. È l'unico
pezzo di contratto bilingue che resta dopo le slice di prosa.

Dopo questa slice nessuna `description` contiene una frase italiana. Restano i
comandi, `/harness-init`, `/spec`, `/slice`, `/next`, `/judge`, `/board`, le
frasi inglesi, e le condizioni che non sono frasi di nessuno, come "when a
session starts in a repo that has the harness".

## Acceptance criteria

- [ ] Nessuna `description` dei sei `SKILL.md` contiene una frase italiana.
- [ ] I comandi restano tutti, uno per skill, scritti con la barra.
- [ ] Le frasi d'innesco inglesi che ci sono già restano.
- [ ] Le condizioni che non sono frasi di nessuno restano, a partire da "when a session starts in a repo that has the harness" di `skills/board/SKILL.md`.
- [ ] Il frontmatter resta valido: `name` uguale al nome della cartella e una `description` non vuota, come il caso di `tests/architecture.test.ts` già chiede.
- [ ] `tests/architecture.test.ts` chiede a `skills/board/SKILL.md` gli inneschi che la tengono aperta a freddo, con le parole nuove.

## Test plan

- `tests/architecture.test.ts`, il caso che oggi tiene i trigger di `/board`: le frasi italiane escono dalla lista attesa e restano le inglesi più il comando. Fallisce prima perché la lista attesa nomina `"apri la board"` e le altre.
- `tests/architecture.test.ts`, un caso nuovo accanto a quello del frontmatter: la `description` di ogni skill non contiene nessuna delle parole funzione italiane, e il caso fallisce su una fixture che ne rimette una. È lo stesso confronto che S50 fa sull'insieme intero, qui ristretto alle sei `description` perché questa slice non aspetta S50.
- `tests/architecture.test.ts`, il caso del frontmatter: `name` e `description` restano al loro posto dopo la riscrittura. Passa già oggi ed è la guardia.

## Touchpoints

- `skills/board/SKILL.md`, `skills/harness-init/SKILL.md`, `skills/judge/SKILL.md`, `skills/next/SKILL.md`, `skills/slice/SKILL.md`, `skills/spec/SKILL.md`: il solo frontmatter `description`.
- `tests/architecture.test.ts`: il caso dei trigger di `/board` e il caso nuovo sulle `description`.
- `docs/codebase-map.md`: la riga di `skills/next/` che cita "vai", se la traduzione la rende falsa.

## Notes

La decisione della spec, per intero: le frasi d'innesco italiane escono dalle
`description`, restano i comandi, le frasi inglesi e le condizioni che non
sono frasi di nessuno. Questa decisione contraddice "Cosa vuol dire riuscire"
dell'intent, che chiedeva a `"vai"` di continuare a funzionare: la spec l'ha
deciso e `"vai"` smette di innescare `/next`. Chi implementa non lo rimetta
dentro.

Scartata la regola che esentava dal test gli span fra virgolette della
`description`: teneva vivo `"vai"` al prezzo di un contratto bilingue
permanente. Scartata anche la lettura larga, togliere ogni innesco in
linguaggio naturale: cambierebbe quando una skill parte, non in che lingua è
scritta, e `/board` smetterebbe di aprirsi da sola a freddo.

Il corpo dei sei file è già inglese e non è questa slice a renderlo tale: qui
si tocca solo il frontmatter. Se durante il lavoro si trova italiano nel
corpo, si traduce, perché l'insieme di S50 prende `skills/*/SKILL.md` intero.

Le skill girano da `~/.claude/skills/`, che punta a questo working tree: una
`description` cambiata su un branch è già viva in ogni altro repo. Si lavora
corto e si torna su main prima di usare le skill altrove, come dice il drago
in `docs/codebase-map.md`.

Fuori scope: quando una skill parte, che non cambia a parte la sparizione
degli inneschi italiani; il corpo delle skill, che è già inglese; il test
sull'insieme di path, che è S50.

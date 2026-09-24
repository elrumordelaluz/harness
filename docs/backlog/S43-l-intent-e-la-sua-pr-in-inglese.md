---
id: S43
title: L'intent si scrive in inglese, dalle sue tre sezioni al corpo della PR
status: done
blocked_by: none
tier: 2
human: false
spec: docs/specs/SPEC-english-first.md
---

## Goal

`scripts/intent.sh new` scrive le tre intestazioni che l'umano riempie, e
`open` rifiuta una sezione vuota cercando quelle stesse tre stringhe: sono la
prima cosa che un dev vede quando apre un intent, e sono italiane. Lo stesso
script compone il corpo della PR con le intestazioni del template di PR, che è
italiano anche lui e che tre skill citano per nome quando scrivono una PR.

Dopo questa slice l'intent nasce con tre intestazioni inglesi, `open` rifiuta
la sezione vuota cercando quelle, e il template di PR e chi lo compila,
`intent.sh`, `/spec`, `/slice` e `/next`, parlano la stessa lingua.

## Acceptance criteria

- [ ] `scripts/intent.sh new <slug>` scrive tre intestazioni inglesi, nello stesso ordine di oggi, e `SECTIONS` le porta in quella forma.
- [ ] `scripts/intent.sh open` rifiuta una sezione mancante o vuota cercando le tre intestazioni inglesi, e il messaggio nomina la sezione con il suo nome inglese.
- [ ] `skills/harness-init/templates/docs/intent/README.md` e `docs/intent/README.md` dicono le stesse tre sezioni inglesi, e restano identici fra loro.
- [ ] `skills/harness-init/templates/github/pull_request_template.md` è in inglese, caselle di "Dichiarazioni" comprese, e `.github/pull_request_template.md` è tornato uguale al template rilanciando la fase di `/harness-init` che lo possiede.
- [ ] Il corpo della PR che `intent.sh` compone usa le intestazioni inglesi del template.
- [ ] `skills/next/SKILL.md`, `skills/slice/SKILL.md` e `skills/spec/SKILL.md` nominano le sezioni della PR con i nomi nuovi.
- [ ] La CI continua a leggere le caselle: una casella spuntata nel corpo porta la PR a tier 2, perché `tier.sh` cerca `- [x]` e non il testo della voce.

## Test plan

- `tests/intent.test.ts`, nel caso che tiene lo scheletro di `new` uguale alle sezioni dei due README: le tre intestazioni inglesi. Fallisce prima perché `SECTIONS` porta `Problema|Cosa vuol dire riuscire|Fuori scope`.
- `tests/intent.test.ts`, nei casi che provano `open` con una sezione vuota: il rifiuto arriva sulla sezione inglese, e un file con le tre sezioni inglesi piene passa. Falliscono prima perché lo script cerca le tre stringhe italiane.
- `tests/intent.test.ts`, nel caso che legge il corpo della PR: `## Slice`, `nessuna` e `## Come verificare a mano` diventano le stringhe inglesi. Fallisce prima perché il corpo le scrive in italiano.
- `tests/tier.test.ts`, un caso che passa un `PR_BODY` con una casella spuntata scritta in inglese e si aspetta tier 2. Passa già oggi ed è la guardia: se qualcuno traducesse anche il pattern, diventerebbe rosso.
- `tests/architecture.test.ts`, nel caso che confronta ogni file di `.github/` con il suo template: il template di PR tradotto e la copia allineata. Rosso finché la copia non è tornata uguale.

## Touchpoints

- `skills/harness-init/templates/scripts/intent.sh`: `SECTIONS`, i messaggi che nominano le sezioni, le intestazioni del corpo della PR. `scripts/intent.sh` è il symlink e non si tocca.
- `skills/harness-init/templates/docs/intent/README.md` e `docs/intent/README.md`: le tre sezioni.
- `skills/harness-init/templates/github/pull_request_template.md`: tutto il file.
- `.github/pull_request_template.md`: la copia, riportata rilanciando la fase `ci` di `/harness-init`, non a mano.
- `skills/next/SKILL.md`, `skills/slice/SKILL.md`, `skills/spec/SKILL.md`: i nomi delle sezioni della PR.
- `tests/intent.test.ts`, `tests/tier.test.ts`, `tests/architecture.test.ts`.

## Notes

Il criterio della spec: `scripts/intent.sh new <slug>` scrive tre intestazioni
inglesi, e `open` rifiuta una sezione vuota cercando quelle. Le intestazioni
che un umano scrive a mano diventano inglesi con il resto, perché sono la
prima cosa che un dev vede aprendo un intent. Scartata l'alternativa di
tradurre la prosa dei README e tenere le intestazioni come token italiani
fissi: risparmia `intent.sh` e il test sulla lingua, e lascia il contratto
bilingue per sempre.

Il template di PR sta in questa slice e non in S42 perché non lo legge
nessuno: lo scrive `intent.sh` e lo riempiono tre skill, e le intestazioni
devono cambiare insieme o il corpo di una PR non combacia più con il file che
dice come compilarlo.

I documenti già scritti non si toccano, qui, su Tipoff e su Docket.
`intent.sh open` legge solo il file che `new` ha appena scritto, quindi
nessuno inciampa in un'intestazione vecchia. Un intent scritto e non ancora
aperto si rifà con `new`: vale anche per i repo dei progetti.

`.github/` non si modifica a mano da una slice: la copia torna uguale al
template rilanciando la fase di `/harness-init` che lo possiede, e il caso di
`tests/architecture.test.ts` resta rosso finché non è tornata. È la definition
of done di questo repo, non un'eccezione presa qui.

La riga `- [x]` che `tier.sh` cerca nel corpo della PR non è testo tradotto: è
la sintassi della casella. Tradurre le voci non tocca il calcolo del tier, e il
caso del test lo dice a chi legge dopo.

Fuori scope: le `description` delle skill, che sono S46; lo scheletro della
spec e quello della slice, che sono S44; gli intent già scritti.

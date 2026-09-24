---
id: S44
title: La spec e la slice nascono con sezioni inglesi
status: done
blocked_by: none
tier: 1
human: false
spec: docs/specs/SPEC-english-first.md
---

## Goal

Lo scheletro che `/spec` scrive ha otto sezioni italiane, e i due README di
`docs/specs/` le ripetono come contratto. Lo scheletro della slice ha le
intestazioni già inglesi, ma i due README di `docs/backlog/` che lo spiegano
sono italiani, e sono il file che `/next` e `/board` mandano a leggere quando
qualcuno chiede che cos'è una slice.

Dopo questa slice una spec nuova nasce con otto sezioni inglesi, i due README
di `docs/specs/` dicono le stesse otto, e i due README di `docs/backlog/` sono
in inglese. Le skill che scrivono e leggono quei documenti nominano le sezioni
nuove.

## Acceptance criteria

- [ ] `skills/spec/templates/SPEC.md` ha otto sezioni inglesi, nello stesso ordine di oggi, e il frontmatter resta quello.
- [ ] `skills/harness-init/templates/docs/specs/README.md` e `docs/specs/README.md` dicono le stesse otto sezioni e gli stessi campi dello scheletro, e restano identici fra loro.
- [ ] `skills/harness-init/templates/docs/backlog/README.md` e `docs/backlog/README.md` sono in inglese, restano identici fra loro, e tengono i nomi dei campi del frontmatter e delle cinque sezioni della slice, che sono già inglesi.
- [ ] `skills/spec/SKILL.md` nomina le otto sezioni inglesi dove oggi nomina quelle italiane.
- [ ] `skills/slice/SKILL.md` nomina con i nomi nuovi le sezioni della spec che legge per tagliare.
- [ ] Il caso di `tests/architecture.test.ts` che tiene lo scheletro di `/spec` uguale ai due README passa sulle otto sezioni inglesi.
- [ ] Il caso che legge la riga `Eleggibile` di `docs/backlog/README.md` passa sul testo inglese.

## Test plan

- `tests/architecture.test.ts`, `the spec template and the docs/specs README say the same sections`: le otto sezioni inglesi, prese dallo scheletro e confrontate con i due README. Fallisce prima perché la lista attesa è italiana.
- `tests/architecture.test.ts`, `docs/*/README.md matches the templates it was copied from`: `specs` e `backlog` tradotti in tutte e due le copie. Rosso appena se ne traduce una sola.
- `tests/architecture.test.ts`, il caso che legge la riga `Eleggibile` di `docs/backlog/README.md` e il nome del branch di una slice: la riga esiste ancora con il suo nome inglese e nomina il branch. Fallisce prima se la traduzione le cambia la forma senza aggiornare il caso.
- Un caso nuovo accanto a quello delle sezioni: `skills/slice/SKILL.md` nomina le sezioni della spec che legge, con i nomi dello scheletro, così una traduzione futura che sposta una sezione non lascia la skill a cercare un titolo che non c'è. Fallisce prima perché nel file i nomi sono italiani.

## Touchpoints

- `skills/spec/templates/SPEC.md`: le otto sezioni.
- `skills/harness-init/templates/docs/specs/README.md` e `docs/specs/README.md`.
- `skills/harness-init/templates/docs/backlog/README.md` e `docs/backlog/README.md`.
- `skills/spec/SKILL.md`: i nomi delle sezioni che la skill scrive e rilegge.
- `skills/slice/SKILL.md`: i nomi delle sezioni della spec che la skill legge.
- `tests/architecture.test.ts`.

## Notes

Il criterio della spec: lo scheletro della spec, in `skills/spec/templates/SPEC.md`
e nei due README di `docs/specs/`, ha otto sezioni inglesi; quello della
slice, nei due README di `docs/backlog/`, è inglese. Le intestazioni che un
umano scrive a mano diventano inglesi con il resto, e scartata l'alternativa
di tradurre la prosa e tenere le intestazioni come token italiani fissi, che
lascerebbe il contratto bilingue per sempre.

Le spec e le slice già scritte non si toccano: `/spec` e `/slice` leggono le
intestazioni di documenti che producono loro, quindi nessuno inciampa in una
sezione vecchia. Le spec di `docs/specs/` e le slice di `docs/backlog/` di
questo repo restano in italiano e stanno fuori dall'insieme di path del test
sulla lingua, che è S50.

`docs/backlog/README.md` sta fra i path a merge umano: la PR di questa slice
prende la label `human-gate` e non la mergia la policy, nemmeno a tier 1 con
zero finding. È voluto, non un intoppo, e vale la pena scriverlo nella PR.

Le cinque intestazioni della slice, `## Goal`, `## Acceptance criteria`,
`## Test plan`, `## Touchpoints`, `## Notes`, e i campi del frontmatter sono
già inglesi: qui si traduce la prosa che li spiega, non si rinominano loro. Un
rename cambierebbe ogni slice del backlog e lo esclude il fuori scope della
spec.

Fuori scope: le tre sezioni dell'intent, che sono S43; le `description` delle
skill, che sono S46; tradurre le spec e le slice già scritte.

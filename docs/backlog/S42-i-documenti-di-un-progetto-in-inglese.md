---
id: S42
title: Un repo montato oggi riceve i suoi documenti in inglese
status: done
blocked_by: S39
tier: 2
human: false
spec: docs/specs/SPEC-english-first.md
---

## Goal

Un dev che apre un repo montato con l'harness legge per primo `AGENTS.md`, poi
`CLAUDE.md`, la mappa e i README delle cartelle di `docs/`: sono i file che
dicono che cosa ha davanti e che regole valgono. Oggi sono tutti in italiano, e
chi non lo legge non può né usare la catena né correggerla.

Dopo questa slice i documenti che `/harness-init local` copia in un repo sono
in inglese: `templates/AGENTS.md` e `templates/CLAUDE.md`, la mappa di
partenza, l'inbox e i README di `docs/decisions/` e `docs/review-log/`. Le
copie di questo repo che `tests/architecture.test.ts` tiene identiche ai
template seguono nella stessa slice, perché il caso che le confronta è byte a
byte.

## Acceptance criteria

- [ ] `skills/harness-init/templates/AGENTS.md` è in inglese, blocco di policy compreso nei suoi commenti, e resta sotto le 100 righe che la fase `local` impone.
- [ ] `skills/harness-init/templates/CLAUDE.md` è in inglese.
- [ ] `skills/harness-init/templates/docs/codebase-map.md` è in inglese, segnaposto `{{...}}` compresi.
- [ ] `skills/harness-init/templates/docs/inbox.md` è in inglese, e la forma della riga `- <YYYY-MM-DD>: <una riga>` resta quella.
- [ ] `skills/harness-init/templates/docs/decisions/README.md` e `skills/harness-init/templates/docs/review-log/README.md` sono in inglese, e `docs/decisions/README.md` e `docs/review-log/README.md` di questo repo restano identici ai loro template.
- [ ] I titoli di sezione di `templates/AGENTS.md` che un umano cerca restano riconoscibili in inglese e nessuno script li legge: dopo S39 la fonte è il blocco.
- [ ] `pnpm test`, `pnpm format:check` e `pnpm typecheck` restano verdi: il caso che confronta i README di `docs/` con i template passa sulle versioni inglesi.

## Test plan

Nessun caso nuovo: questa slice non cambia comportamento, cambia lingua. I
casi che la tengono onesta esistono già e devono restare verdi su testi
inglesi.

- `tests/architecture.test.ts`, `docs/*/README.md matches the templates it was copied from`: i due README tradotti devono restare byte a byte uguali ai template. Rosso appena si traduce una copia sola, ed è la guardia di questa slice.
- `tests/architecture.test.ts`, `templates/README.md lists every template`: nessun template nasce o sparisce qui, e il caso lo prova.
- `tests/tier.test.ts` e `tests/hooks.test.ts`, che copiano l'`AGENTS.md` vero dentro i repo usa e getta: restano verdi perché dopo S39 leggono il blocco e non la prosa. Se uno di loro diventa rosso, una frase è ancora portante e la slice ha trovato un buco di S39.
- Se durante il lavoro si trova uno script che legge ancora una di queste frasi, si scrive una riga in `docs/inbox.md` e si traduce lo stesso: la lettura si ripara in S39, non qui.

## Touchpoints

- `skills/harness-init/templates/AGENTS.md`: tutta la prosa.
- `skills/harness-init/templates/CLAUDE.md`: le tre righe.
- `skills/harness-init/templates/docs/codebase-map.md`: la mappa di partenza.
- `skills/harness-init/templates/docs/inbox.md`: il paragrafo in testa.
- `skills/harness-init/templates/docs/decisions/README.md` e `skills/harness-init/templates/docs/review-log/README.md`.
- `docs/decisions/README.md` e `docs/review-log/README.md`: le copie di questo repo, che il test tiene identiche.
- `skills/harness-init/SKILL.md`: le righe della fase `local` che citano il testo dei template, se la traduzione le rende false.

## Notes

La decisione della spec: sopra la base del blocco, tutto quello che un umano
legge o scrive diventa inglese. Qui tocca ai file che un progetto riceve. La
lingua della prosa di un repo che installa l'harness non la decide l'harness:
il test che tiene fuori l'italiano resta nel repo dell'harness e non entra nei
template, quindi questi file diventano inglesi come punto di partenza e
nessuno impedisce a un progetto di riscriverli nella sua lingua.

Perché dopo S39: finché `policy_line` e `docs_line` cercano `- Path sensibili:`
e `## Gate umani`, tradurre questa prosa spegne il calcolo del tier e apre main
agli hook. Con il blocco al suo posto la lingua smette di essere portante, ed è
questa slice la prima che lo usa.

I README di `docs/intent/`, `docs/specs/` e `docs/backlog/` non stanno qui:
portano gli scheletri che `intent.sh`, `/spec` e `/slice` scrivono, e viaggiano
con loro in S43 e S44. Il template di PR nemmeno: lo compilano `intent.sh` e
tre skill, e va con loro in S43.

Il caso `docs/*/README.md matches the templates it was copied from` confronta
byte a byte: una copia tradotta e l'altra no è rossa subito, ed è il motivo per
cui le copie di questo repo sono un touchpoint di questa slice e non di S47.

Prettier riscrive questi file a ogni commit, qui e nel repo che li riceve: un
testo inglese che non è stabile sotto Prettier viene riscritto al primo commit
del progetto, quindi si passa `pnpm format:check` prima di chiudere.

Fuori scope: `AGENTS.md`, `CLAUDE.md`, la mappa e l'inbox di questo repo, che
sono S47; il rimontaggio di Tipoff e di Docket; tradurre gli intent, le spec e
gli ADR già scritti.

## Blocked

S42 and S47 cannot land one at a time: `tests/architecture.test.ts` pins this repo's `AGENTS.md` tier sentence and the header of `docs/inbox.md` to their templates byte for byte, both files are declared out of scope here and owned by S47, and whoever translates one side first turns those two cases red, so a human has to say whether the two slices become one, whether S42 takes those two lines of S47 with it, or whether the two cases change.

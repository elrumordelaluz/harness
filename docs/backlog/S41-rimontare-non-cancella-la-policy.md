---
id: S41
title: Rimontare un repo gli aggiunge le chiavi nuove senza cancellargli le sue
status: done
blocked_by: S39
tier: 1
human: false
spec: docs/specs/SPEC-english-first.md
---

## Goal

Il blocco arriva nei repo dei progetti con `/harness-init local`, e quei repo
il blocco lo avranno già al secondo rilancio. Su Tipoff `sensitive_paths` è il
motivo per cui `AGENTS.md` non è il template: una riscrittura secca gli
porterebbe via i path che qualcuno ha aggiunto apposta, e al terzo progetto lo
farebbe in silenzio.

Dopo questa slice la fase `local` lavora chiave per chiave e in modo
deterministico, non a giudizio dell'agente: una chiave che c'è resta com'è,
una che manca arriva dal template, `version` è l'unica che il template
sovrascrive sempre, e `docs_mode` non cambia mai per mano della skill. La
regola sta scritta nella fase `local` di `skills/harness-init/SKILL.md`, che è
il posto da cui l'agente la esegue.

## Acceptance criteria

- [ ] La fase `local` di `skills/harness-init/SKILL.md` dice la fusione chiave per chiave: una chiave presente resta com'è, una assente arriva dal template, `version` la sovrascrive sempre il template.
- [ ] Lo stesso testo dice che `docs_mode` non cambia mai per mano della skill, nemmeno quando il resto del blocco viene dal template.
- [ ] Lo stesso testo dice che cosa succede a una chiave che il template non ha più: resta dov'è e la toglie un umano, e `version` la rende visibile.
- [ ] `tests/architecture.test.ts` ha un caso che ritrova nella fase `local` le otto chiavi, la regola della fusione e le due eccezioni, e che fallisce se una delle otto sparisce dal testo.

## Test plan

- `tests/architecture.test.ts`, accanto ai casi che tengono le skill a quello che dicono di fare: la fase `local` di `skills/harness-init/SKILL.md` nomina tutte e otto le chiavi, dice che una chiave presente resta, che una mancante arriva dal template, che `version` si sovrascrive e che `docs_mode` no. Fallisce prima perché nel file non c'è niente di tutto questo.
- Nello stesso caso: il testo nomina anche il blocco di `skills/harness-init/templates/AGENTS.md` come la sorgente delle chiavi mancanti, così la regola punta a un file che il test dei template già tiene vivo. Fallisce prima per la stessa ragione.

## Touchpoints

- `skills/harness-init/SKILL.md`: il punto 2 della fase `local`, dove oggi la riga `Documenti` che c'è già si tiene com'è, allargato a tutte e otto le chiavi.
- `tests/architecture.test.ts`: il caso nuovo.
- `docs/codebase-map.md`: la riga di `skills/harness-init/`, se la fusione cambia quello che la fase possiede.

## Notes

La decisione della spec, per intero: `/harness-init local` che rigira su un
repo con il fence lavora chiave per chiave, deterministico e non a giudizio
dell'agente. Una chiave che c'è resta com'è, una che manca arriva dal
template, `version` è l'unica che il template sovrascrive sempre. `docs_mode`
non cambia mai per mano della skill. Così un repo prende le chiavi nuove senza
perdere i suoi `sensitive_paths`. Il prezzo è che una chiave rinominata resta
orfana finché qualcuno non la toglie a mano, e `version` la rende visibile.

Scartata la riscrittura secca, dove il template vince e l'umano rimette i suoi
path: con due progetti costa dieci minuti e nessuna regola da testare, ma al
terzo cancella in silenzio una policy allargata apposta.

La regola vive in prosa perché è la skill a eseguirla, non uno script: qui non
c'è codice da scrivere, e il test tiene onesto il testo come già fa per i
soggetti dei commit delle skill e per i modi della riga `Documenti`. Chi
implementa non scriva uno script di fusione: la spec non lo chiede e ne
nascerebbe un template in più da mantenere.

Il rimontaggio vero di Tipoff e di Docket non è questa slice e non è nessuna
slice: è un passo dell'ordine di lavoro dell'ADR, come il passo 6 di ADR-0003.

Fuori scope: la fase `ci` e la fase `judge`; il contenuto del blocco, che è
S39; il comportamento quando il blocco non si legge, che è S40.

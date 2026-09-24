---
id: S15
title: Il gate locale non mente: timeout della suite e copie di .github/ coperte da un check
status: done
blocked_by: none
tier: 2
human: false
spec: audit (PR #29)
---

## Goal

Due difetti dello stesso tipo: un gate che dà un verde o un rosso che non
corrispondono allo stato del repo.

Il primo è la suite. Sul branch di S12 è stata lanciata quattro volte di
fila: 445 verdi, poi 4 rossi, poi 5 rossi, poi i tre file rossi verdi da
soli. Ogni fallimento è `Test timed out in 5000ms`, ogni volta su test
diversi, sempre test che tirano su repo git veri, in `hooks.test.ts`,
`intent.test.ts`, `tier.test.ts` e `judge.test.ts`. `vitest.config.ts` non
imposta `testTimeout`, quindi vale il default di vitest, 5000 ms. In CI la
suite passa in poco più di un minuto su un runner che non fa altro; in
locale, con altro in esecuzione, fallisce a caso.

Conta adesso più di ieri, perché S12 ha portato `/next`: i suoi subagent
lanciano `pnpm test` in locale e credono al risultato. Un rosso inventato
ferma una slice sana, e il subagent non ha modo di distinguerlo da un rosso
vero. La Definition of done dice «suite verde» appoggiandosi a un gate che a
volte mente.

Il secondo è il check sulle copie. `tests/architecture.test.ts` confronta con
i template i workflow di `.github/workflows/` e i file di `.github/judge/`,
ma non `.github/pull_request_template.md`. S12 ha aggiunto la sezione
«Finding dichiarati» al template e la copia è rimasta indietro senza che
niente diventasse rosso: la deriva è stata chiusa a mano nella PR #29. La
lista dei file confrontati è scritta a mano, quindi ogni template nuovo sotto
`.github/` nasce scoperto e nessuno se ne accorge finché non fa danno.

## Acceptance criteria

- [ ] Tre giri consecutivi di `pnpm test` con altro lavoro in corso sulla macchina restano verdi. Il rosso di oggi si riproduce con due suite in parallelo e sparisce con la modifica.
- [ ] Il `testTimeout` è dichiarato in `vitest.config.ts` con un commento che dice perché non è il default: i test che creano repo git veri costano secondi, non millisecondi.
- [ ] Il valore non nasconde un test appeso: un test che non finisce fallisce comunque in un tempo che qualcuno aspetta guardando, dell'ordine dei venti secondi e non dei minuti.
- [ ] Il confronto tra `.github/` e i template copre ogni file che `.github/` copia, ricavato dal contenuto di `skills/harness-init/templates/github/` e `skills/harness-init/templates/judge/` e non da una lista scritta nel test: un template nuovo entra nel check senza che nessuno lo aggiunga.
- [ ] Un file fuori sincrono fallisce dicendo quale file è e con quale fase di `/harness-init` si riporta, non solo con il diff.
- [ ] Un template che di proposito non ha una copia uguale è dichiarato nel test con il motivo accanto, così l'eccezione si legge invece di essere un buco.
- [ ] La copia del template della PR resta uguale al suo template: è il caso che oggi passa e che nessun test guardava.

## Test plan

- Il timeout si prova con la suite sotto carico, due `pnpm test` in parallelo: il rosso di oggi si riproduce così, e il verde dopo la modifica si verifica allo stesso modo, tre volte.
- Il check nuovo si scrive al rosso: si cambia una riga in un template di `.github/`, il test fallisce e nomina il file, si riporta la copia e torna verde. Il caso del template della PR è quello reale e vale come fixture.
- Il check si aggiunge in `tests/architecture.test.ts`, dove vivono già i confronti con i template: non nasce un file di test nuovo per due regole.
- Il resto della suite resta verde senza modifiche.

## Touchpoints

- `vitest.config.ts`: `testTimeout`. È un path sensibile, quindi la PR è tier 2 comunque.
- `tests/architecture.test.ts`: il confronto sulle copie, ricavato dai template invece che elencato.
- `skills/harness-init/templates/github/` e `skills/harness-init/templates/judge/`: solo letti.

## Notes

Alzare il timeout è la medicina, non la cura. Quello che costa secondi è
creare un repo git vero per test, con `git init`, i commit e gli hook
installati. Se la suite continua a crescere la strada è un helper che riusa
un repo di base invece di ricostruirlo ogni volta, e allora il timeout può
tornare basso. Non adesso: una riga oggi toglie di mezzo un gate che mente,
la riscrittura dei fixture è una slice a sé e non la si fa mentre serve la
suite per altro.

Il check va scritto dalla parte dei template e non da quella di `.github/`:
sotto `.github/` ci sono anche file che nascono lì e non copiano niente,
mentre ogni file dei template ha una destinazione dichiarata in
`skills/harness-init/templates/README.md`. Quel README è prosa e leggerlo in
un test è fragile, quindi la destinazione si ricava dalla struttura delle
cartelle, che è già una convenzione, e il README resta il posto dove la
convenzione è spiegata.

`ruleset.json` oggi è identico al suo template ed entra nel check come gli
altri. Se un giorno diverge per scelta, diventa l'eccezione dichiarata del
criterio, con il motivo scritto accanto.

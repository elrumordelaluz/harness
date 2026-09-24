---
id: S40
title: Un repo senza il blocco si ferma invece di degradare in silenzio
status: done
blocked_by: S39
tier: 2
human: false
spec: docs/specs/SPEC-english-first.md
---

## Goal

Oggi metà della catena fallisce chiusa e metà aperta senza che nessuno
l'abbia deciso: `docs_mode` legge come `pr` un valore che non capisce, e
`tier.sh` fallisce chiuso a 2 solo quando `AGENTS.md` manca del tutto, mentre
con il file presente e la riga assente `sensitive_paths` resta vuoto e una PR
che tocca `scripts/` si calcola tier 1. Una riga assente e una scritta male
finora erano la stessa cosa.

Dopo questa slice il blocco assente, il fence che `jq` rifiuta, la chiave che
manca e la `version` sconosciuta sono quattro modi dello stesso guasto, e
ognuno ferma il suo lettore rumorosamente: `tier.sh` stampa 3, `pre-commit` e
`pre-push` tengono main chiuso, `intent.sh` esce con un messaggio, e ogni
messaggio dice `/harness-init local`. Il pavimento resta dov'è: il blocco non
dichiara sensibile se stesso.

## Acceptance criteria

- [ ] Con `AGENTS.md` senza il blocco al base ref, `tier.sh` stampa 3 e dice sullo standard error perché, dove oggi stampa 2 solo se il file manca e 1 se il file c'è e la riga no.
- [ ] Con un fence che `jq` rifiuta, con una delle otto chiavi mancante e con una `version` che lo script non conosce, `tier.sh` stampa 3 negli stessi tre casi, e ognuno nomina il guasto sullo standard error.
- [ ] Nei quattro casi `pre-commit` rifiuta ogni commit su main, anche uno fatto di soli documenti, e `pre-push` rifiuta ogni push su main: la regola che i loro commenti già scrivono.
- [ ] Nei quattro casi `intent.sh new` e `intent.sh open` escono diversi da zero con un messaggio, invece di ricadere nel modo `pr`.
- [ ] Ogni messaggio dei quattro lettori nomina `/harness-init local`.
- [ ] Il pavimento resta hardcoded in `docs_outside` e in `tier.sh` e non arriva dal blocco: `AGENTS.md` e `CLAUDE.md` a qualunque profondità, `.claude/**` e `docs/codebase-map.md` restano fuori dai documenti e sopra il tier 0 anche con un blocco che non li nomina o che non si legge.

## Test plan

- `tests/tier.test.ts`, un `describe` nuovo: quattro fixture al base ref, senza blocco, con un fence rotto, con una chiave tolta, con una `version` alzata di uno, e il tier a 3 in tutte e quattro. Falliscono prima perché con il file presente e il blocco assente lo script arriva in fondo e stampa 1, e la `version` non la guarda nessuno.
- `tests/tier.test.ts`, accanto al caso che oggi legge i contratti dalla riga `Mai tier 0` sopra un pavimento suo: con un blocco che non nomina `CLAUDE.md` e con un blocco che non si legge, `CLAUDE.md`, `.claude/commands/x.md`, `packages/a/AGENTS.md` e `docs/codebase-map.md` restano sopra il tier 0. Il caso di oggi copre la prima metà, la seconda fallisce prima.
- `tests/hooks.test.ts`, nel `describe` che oggi prova `pre-commit` e `pre-push` senza `Documenti: su main`: le stesse quattro fixture, e un commit di soli documenti rifiutato in tutte e quattro con il messaggio che nomina `/harness-init local`. Falliscono prima perché un blocco illeggibile oggi ricade in `pr`, che rifiuta senza dire il guasto vero.
- `tests/intent.test.ts`: `new` e `open` sulle stesse quattro fixture, uscita diversa da zero e messaggio. Falliscono prima perché oggi entrambe proseguono nel modo `pr`.

## Touchpoints

- `skills/harness-init/templates/scripts/policy-lines.sh`: la distinzione fra blocco assente, fence che non si parsa, chiave mancante e `version` sconosciuta, e il modo in cui la dà a chi la chiama.
- `skills/harness-init/templates/scripts/tier.sh`: il tier 3 al posto del tier 2 di oggi, il messaggio, e il pavimento che resta scritto qui.
- `skills/harness-init/templates/githooks/pre-commit` e `skills/harness-init/templates/githooks/pre-push`: main chiuso quando il blocco non si legge, e il messaggio.
- `skills/harness-init/templates/scripts/intent.sh`: lo stop con messaggio al posto della ricaduta in `pr`.
- `tests/tier.test.ts`, `tests/hooks.test.ts`, `tests/intent.test.ts`.

## Notes

La decisione della spec, per intero: blocco assente o che non si parsa, si
fallisce chiusi dappertutto e rumorosamente. Gli hook tengono main chiuso, che
è già la regola scritta nei loro commenti; `intent.sh` si ferma; `tier.sh` dà
3, non 0. Il parsing è il momento per chiudere il buco, perché una riga
assente e una scritta male finora erano la stessa cosa e `jq` le distingue.

Perché 3 e non 2: 3 è il tier che non si giudica e che vuole un umano, ed è
la risposta giusta a un repo che non sa dire come va giudicato. Il tier è il
massimo fra i segnali, quindi 3 vince comunque su tutto il resto del calcolo.

`version` sconosciuta vuol dire un numero che questo `policy-lines.sh` non
sa leggere, non un numero diverso da quello del template: un repo montato con
un template più vecchio ma con la stessa `version` continua a funzionare, e
un repo con una `version` più alta di quella che lo script conosce si ferma.
Chi implementa scelga dove sta scritto il numero che lo script accetta, e lo
scriva una volta sola.

Il pavimento non arriva dal blocco per scelta: qualunque contenitore tenga i
gate non può stare fra i path che vanno su main senza PR e non può dichiarare
sensibile se stesso. `AGENTS.md` e `CLAUDE.md` li carica Claude Code a
qualunque profondità e li segue, quindi sotto un path di documento un pattern
del blocco li farebbe atterrare su main senza PR e senza giudice.

La riga `- Documenti:` che resta in prosa non è più una fonte e non è più un
ramo: chi implementa non la rimetta in mezzo per riconoscere un repo vecchio,
perché la spec esclude la lettura doppia.

Fuori scope: la migrazione dei repo montati, che si fa a mano con
`/harness-init local`; la fusione chiave per chiave di quel rilancio, che è
S41; la prosa inglese.

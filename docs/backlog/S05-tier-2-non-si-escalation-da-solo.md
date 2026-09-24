---
id: S05
title: Una PR a tier 2 resta a tier 2, e il tier 3 lo decide un umano o un segnale vero
status: todo
blocked_by: ADR-0002
tier: 2
human: false
spec: audit (PR #14)
---

## Goal

Nessuna PR a tier 2 di questo repo è mai rimasta a tier 2. PR #13 e PR #14
portano tutte e due `tier:3` con quattro verdetti `approve`, nessun test
indebolito, nessuna slice `human: true` e nessun giro di fix. Il tier 3 se lo
danno da sole.

Il giro è corto. `policy.sh:343` mette `needs-human` su ogni PR a tier >= 2:
è la sua tabella dichiarata, riga 24, e a tier 2 il merge è di un umano
comunque. `tier.sh:138` legge le label da `PR_LABELS` e `needs-human` la
porta a 3. La label che dice chi mergia diventa l'input di quanto scrutinio
serve, e le due cose che S02 aveva separato tornano una sola.

Con `/judge` la cosa si vede subito invece che al push dopo. La skill impone
di postare i verdetti nello stesso respiro della PR, perché `judge.yml` legge
i commenti quando finisce il ci run di quel push e un verdetto in ritardo fa
pagare la head al giudice cloud. Quindi `needs-human` è sulla PR prima che il
job `tier` giri la prima volta, e la PR nasce a tier 3.

Due danni, e il secondo è quello che conta.

La label mente. Tier 3 in `AGENTS.md` è «slice `human: true`, test indeboliti,
giudici in disaccordo, giri di fix esauriti». Il review log e l'audit
registrano tier 3 per PR dove nessuna delle quattro è vera, e il commento del
verdetto sulla stessa PR dice tier 2: la catena si contraddice per iscritto.

E il tier 3 non giudica. `judge.sh roles 3` non stampa niente, `required`
esce 1, e `tests/judge.test.ts` lo mette nero su bianco: «stays out at tier 0
and tier 3, the tiers that never judge». Una PR a tier 2 riceve un verdetto,
diventa tier 3, e da lì nessun push di quel branch viene più giudicato, né in
locale né dal cloud. Lo scrutinio si spegne da solo nel momento esatto in cui
la catena ha scritto che serve un umano, che è il momento in cui uno lo
vorrebbe acceso.

Il tier 3 come «un umano sta guardando, non pagare un giudice» ha senso
quando ci si arriva per un segnale vero: giudici in disaccordo, giri di fix
esauriti, slice `human: true`. Non quando ci si arriva perché la policy ha
fatto il suo lavoro su un `approve`.

## Acceptance criteria

- [ ] `tier.sh` non alza a 3 per `needs-human` messa da `policy.sh` su un verdetto non terminale: il tier 3 arriva da `tests-weakened`, da `fix-round:2`, dalla slice `human: true`, dai giudici in disaccordo, o da una label messa a mano.
- [ ] Una PR a tier 2 con verdetti `approve` da tutti i ruoli del tier resta `tier:2` dopo che `policy.sh` ha postato, e continua a chiedere `needs-human` per il merge: quanto scrutinio e chi mergia restano due cose, che è il lavoro di S02.
- [ ] Un push successivo su quella PR viene ancora giudicato: `judge.sh required` esce 0 e `roles` stampa i ruoli del tier 2.
- [ ] `needs-human` messa da un umano continua ad alzare a 3, e non viene tolta da nessuno script: il freno a mano resta.
- [ ] Un test copre il giro completo su una PR finta: tier 2, `policy.sh` posta un `approve`, si ricalcola il tier, esce ancora 2.
- [ ] Un test copre il caso terminale: `policy.sh` che posta `request-changes` con i giri di fix esauriti, oppure due ruoli in disaccordo, e il tier ricalcolato esce 3.
- [ ] `AGENTS.md` e `docs/spec.md` dicono quale label alza il tier e quale no, perché oggi la riga «Il tier è il massimo tra i segnali» non dice che uno dei segnali lo scrive la catena stessa.

## Test plan

- `tests/tier.test.ts` (nuovo, oppure il describe di `tier.sh` dove già vive): `PR_LABELS` con `needs-human` da sola non alza a 3; con `tests-weakened` o `fix-round:2` sì. Rosso prima: oggi la prima asserzione fallisce.
- `tests/policy.test.ts`: dopo un `approve` a tier 2, le label che `policy.sh` mette non contengono niente che `tier.sh` legga come tier 3. Il test chiama `tier.sh` con le label prodotte, invece di guardarle a occhio: è il giro vero, non due asserzioni scollegate.
- `tests/policy.test.ts`: il caso terminale, dove `needs-human` deve alzare. Serve per non chiudere il buco togliendo semplicemente la riga 138.
- `tests/judge.test.ts`: su una PR a tier 2 già giudicata e etichettata, `required` esce ancora 0. Questo è il criterio che prova il danno vero, non la label.

## Touchpoints

- `skills/harness-init/templates/scripts/tier.sh`: la riga 138 e il commento sopra.
- `skills/harness-init/templates/scripts/policy.sh`: la tabella della riga 24 e la riga 343, se la separazione richiede una label diversa per il gate di merge.
- `skills/harness-init/templates/github/ci.yml`: solo se il job `tier` deve smettere di passare `needs-human` dentro `PR_LABELS`, e in quel caso anche `.github/workflows/ci.yml`, che è una copia e non un symlink.
- `AGENTS.md`, `docs/spec.md`: la riga sui segnali del tier.

## Notes

Non è una regressione di PR #14: `needs-human` non è toccato da quel diff e
PR #13 ha le stesse label. C'è da quando il giudizio locale è atterrato, e
prima non si vedeva perché il verdetto arrivava dal cloud dopo il ci run,
quindi il tier veniva calcolato una volta senza la label e nessuno lo
ricalcolava.

Una via è togliere `needs-human` dai segnali di `tier.sh` e dare a
`policy.sh` una label distinta per il caso terminale, per esempio
`judge-exhausted`, così il tier 3 arriva da un fatto e non da un gate di
merge. L'altra è che `policy.sh` non metta `needs-human` a tier 2, visto che
`AGENTS.md` fa già mergiare da un umano ogni tier 2 e la label è ridondante.
La scelta va scritta, perché tocca due script sensibili e una riga di
`AGENTS.md`: se la discussione si allunga, è un ADR in `docs/decisions/`.

Attenzione a non chiudere il buco togliendo la riga 138 e basta: `needs-human`
messa a mano da un umano deve continuare ad alzare, ed è per questo che i
criteri chiedono i due test opposti.

La fonte è un'osservazione sulle label, non un verdetto, e il README di
`docs/backlog/` lega l'audit ai verdetti. È la seconda volta: S04 aveva
lasciato la stessa nota per PR #8. Due occorrenze non sono più un caso, quindi
la riga del README si allarga a quello che l'audit trova leggendo le PR, non
solo i verdetti, oppure queste due slice cambiano fonte. Va deciso, non
annotato una terza volta.

## Blocked

Ferma per ADR-0002 (2026-09-10): la parte alta della catena, `/spec`, `/slice`, `/next` e `/board`, viene prima della manutenzione della parte bassa. Con il giudice locale e il merge umano questo difetto non fa danno. Resta `todo` con `blocked_by: ADR-0002`, fuori dalle onde di `/next`, finché un umano non toglie l'ADR dal campo quando le quattro skill esistono.

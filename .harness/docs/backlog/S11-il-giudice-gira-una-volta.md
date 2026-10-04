---
id: S11
title: Il giudice gira una volta per PR e i finding si rispondono con un commit
status: done
blocked_by: none
tier: 2
human: false
spec: docs/spec.md
---

## Goal

Decisione 2 di ADR-0003. Un passaggio del giudice per ruolo, dopo il codice.
I finding `high` e `medium` si correggono nella stessa sessione e ciascuno si
risponde con lo sha del commit che lo chiude, `scripts/judge.sh answer <id>
<sha>`. Nessuno rigiudica: l'hook su `gh pr create` accetta il verdetto di un
commit antenato della head quando ogni finding che conta ha una risposta, e
`policy.sh` posta il verdetto con le risposte dentro. A tier 1 un
`request-changes` tutto risposto vale `approve` per la policy, che nel log
scrive `answered`. A tier 2 due ruoli, una volta ciascuno: con due `approve`
o risposti e nessun `high` aperto la policy mergia, altrimenti `needs-human`
con `human_reason` in testa. Se il commit chiude davvero il finding lo
verifica l'audit in Docket, non una macchina.

## Acceptance criteria

- [ ] `scripts/judge.sh answer <finding-id> <sha> [<ruolo>]` scrive nel verdetto archiviato della head giudicata la coppia id e sha, e la rilettura la mostra. Rifiuta, con un messaggio che dice quale, un id che il verdetto non ha, uno sha che non è un commit del branch corrente discendente della head giudicata, un verdetto assente per quel ruolo.
- [ ] Il comando che l'hook usa per sapere se la head ha un verdetto accetta anche il verdetto di un commit antenato di HEAD sullo stesso branch, contro la stessa base, purché ogni finding `high` e `medium` abbia una risposta; senza, il rifiuto nomina gli id senza risposta. Un verdetto contro un'altra base resta un rifiuto come oggi.
- [ ] `scripts/ensure-verdict.sh` apre la PR nel caso "head giudicata più i commit di fix, tutti i finding risposti" e la rifiuta nel caso "un `medium` senza risposta", con il messaggio che dice di rispondere o correggere, mai di rigiudicare.
- [ ] `scripts/policy.sh` posta nel commento una sezione "Risposte" tra la frase di `reason` e la tabella dei criteri, una riga per finding con id, severità e lo sha linkato; nel JSON dopo il marker le risposte stanno in `answers`, campo della catena come `head_sha`.
- [ ] A tier 1 un `request-changes` con tutti i finding `high` e `medium` risposti fa quello che oggi fa `approve`: merge con automerge `on`, "would have merged" con `off`, `needs-human` con `human-gate`. La riga del log lo distingue: `answered`, non `approve`. `fix-round` non viene più messa e `fix.yml` resta nel template senza attivarsi.
- [ ] A tier 2 la policy agisce quando ha entrambi i verdetti della stessa head: due `approve` o risposti e nessun finding `high` senza risposta fanno il merge come a tier 1; un `high` aperto, un `escalate` o un `needs_human` fanno `needs-human` con `human_reason` in testa come oggi. Con un solo verdetto arrivato la policy aspetta e lo scrive nel log del run.
- [ ] `judge.sh check` toglie `answers` dal verdetto che il giudice consegna, come fa con `head_sha`: un giudice che lo scrive non blocca il proprio ruolo.
- [ ] La skill `/judge` non dice più "run again": con finding l'hand-back dice di correggere, rispondere con `judge.sh answer` e aprire la PR; il giudice gira una volta per ruolo per PR, e a tier 2 i due ruoli partono insieme come oggi.
- [ ] Nessun test indebolito; i casi di oggi di `judge.test.ts` e `policy.test.ts` restano verdi.

## Test plan

- `tests/judge.test.ts`: `answer` scrive e rilegge; rifiuta id sconosciuto, sha fuori dal branch, verdetto assente; l'hook accetta la head con i fix sopra quando i finding sono risposti e rifiuta con uno aperto, nominandolo; una base diversa resta un rifiuto.
- `tests/policy.test.ts`: tier 1 `request-changes` risposto con `on` mergia e il log dice `answered`; con `off` commenta; tier 2 con due `approve` mergia; tier 2 con un `high` aperto mette `needs-human`; tier 2 con un verdetto solo aspetta; la sezione "Risposte" nel corpo del commento.
- `tests/architecture.test.ts`: lo schema del verdetto e la copia in `.github/judge/` uguali, se lo schema cambia.

## Touchpoints

- `skills/harness-init/templates/scripts/judge.sh`: `cmd_answer` nuovo, `have` o il comando che l'hook chiama, `check` che toglie `answers`.
- `skills/harness-init/templates/scripts/ensure-verdict.sh`: il messaggio di rifiuto.
- `skills/harness-init/templates/scripts/policy.sh`: la sezione "Risposte", il ramo di tier 1 con `answered`, il ramo di tier 2 che oggi manda sempre a `needs-human`, la label `fix-round` che sparisce.
- `skills/harness-init/templates/scripts/review-log.sh`: solo se la riga del log ha bisogno di `answered` esplicito oltre al JSON.
- `skills/harness-init/templates/judge/verdict.schema.json` e la copia `.github/judge/verdict.schema.json`: solo se `answers` deve comparire tra i campi della catena che lo schema conosce.
- `skills/judge/SKILL.md`: la ground rule sul rigiudizio, l'hand-back con finding.
- `tests/judge.test.ts`, `tests/policy.test.ts`; `docs/codebase-map.md`, il drago sul verdetto sotto la git dir.

## Notes

L'invariante "un verdetto per commit" resta vero per il giudizio e cambia
per l'hook: il verdetto appartiene al commit giudicato, le risposte legano
quel verdetto ai commit venuti dopo, e la PR mostra tutti e due. Chi legge la
PR vede il finding e il commit che dice di chiuderlo; l'audit dice se è vero.

Il modello per tier di ADR-0002, decisione 5, entra con `/next` (S12): la
skill `/judge` oggi ha `model: opus` fisso e S12 lo parametrizza.

`judge.yml` resta spento su Tipoff e qui. Il fallback cloud non cambia in
questa slice: salta le head con verdetto come oggi, e le head con verdetto
antenato le vedrebbe senza; è un caso che non si presenta con il workflow
spento e si affronta quando lo si riaccende.

Fuori scope: `fix.yml` tolto dai template, che è una slice dell'audit se
dopo un mese nessuno lo rimpiange.

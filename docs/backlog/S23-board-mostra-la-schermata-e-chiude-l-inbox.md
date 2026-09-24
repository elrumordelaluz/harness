---
id: S23
title: /board mostra la schermata e chiude ogni riga di inbox con una parola
status: done
blocked_by: S21
tier: 2
human: false
spec: docs/specs/SPEC-board.md
---

## Goal

La skill `/board`: lancia `scripts/board.sh`, mostra la schermata, ripete la
prossima azione, e per ogni riga aperta di `docs/inbox.md` fa una domanda con
tre risposte, intent, slice, via. Ogni risposta toglie la riga ed è un commit
su main. Una sessione a freddo parte da `/board` e non da un grep, ed è la
skill che riapre S05-S08 per il loro `## Blocked`.

## Acceptance criteria

- [ ] `skills/board/SKILL.md` esiste, con `name: board` e una `description` che nomina i trigger: `/board`, "apri la board", "a che punto siamo", "cosa faccio dopo".
- [ ] La skill lancia `scripts/board.sh`, mostra l'output senza riassumerlo, e non ricalcola niente: la prossima azione è quella dell'ultima riga dello script, e la regola sta in prosa nella skill uguale a quella dello script, con il rimando.
- [ ] Per ogni riga aperta di `docs/inbox.md` la skill fa una domanda per messaggio, con le tre risposte e la sua raccomandazione con il motivo, e si ferma alla risposta: mai due righe in un messaggio.
- [ ] "Via": toglie la riga e committa su main, `docs(inbox): <perché>`, e pusha.
- [ ] "Slice": scrive `docs/backlog/S<NN>-<slug>.md` con l'id dopo il più alto su main, `status: todo`, `spec: inbox (<data della riga>)`, il Goal dalla riga, criteri, test plan e touchpoint ricavati leggendo i file che la riga nomina, nel formato di `docs/backlog/README.md`; toglie la riga; un commit su main `docs(backlog): S<NN> dall'inbox` con la slice e l'inbox insieme; push.
- [ ] "Intent": lancia `scripts/intent.sh new <slug>`, toglie la riga con un commit su main e si ferma dicendo che le dieci righe le scrive l'umano e che `intent.sh open` fa il commit dell'intent.
- [ ] Una riga che nomina più cose riceve una risposta sola: la skill lo dice e propone di spezzarla a mano prima.
- [ ] La skill scrive solo in `docs/inbox.md`, in `docs/backlog/`, e lo scheletro di `intent.sh new`; mai codice, mai una spec, mai `AGENTS.md`; il guardrail sull'harness del repo dove lavora è quello delle altre quattro skill, parola per parola.
- [ ] Con `Documenti: PR` in `AGENTS.md` la skill non committa su main: dice che l'inbox in team viaggia su una PR e si ferma dopo la schermata.
- [ ] `docs/spec.md` 5.7 dice la forma a script e il flusso delle tre risposte; `docs/codebase-map.md` ha la riga della skill; `architecture.test.ts` resta verde per il frontmatter.

## Test plan

- Nessun test automatico sulla skill: è prosa, e `tests/architecture.test.ts` verifica già che ogni `skills/*/` abbia un `SKILL.md` con `name` uguale alla cartella e una `description`. La prova è lanciare `/board` in questo repo dopo il symlink: la schermata di `board.sh`, poi le domande sulle righe di inbox aperte.

## Touchpoints

- `skills/board/SKILL.md` (nuovo).
- `docs/spec.md`: 5.7 e "Cosa cambia", versione.
- `docs/codebase-map.md`: la riga della skill.

## Notes

Decisioni della spec. Ogni risposta è un commit, uno per riga, niente stato a
metà: la board rilanciata non mostra più la riga. "Intent" è l'unico caso in
cui la skill non chiude da sola e deve restarlo: l'intent è il documento che
nessun agente scrive, dieci righe a mano. La prossima azione la calcola lo
script (S21) e la skill la ripete: due sessioni, stessa risposta.

Il symlink `ln -s "$PWD/skills/board" ~/.claude/skills/board` lo fa l'umano
una volta, come dice `CLAUDE.md`: la slice lo scrive nell'hand-back della
PR, non lo esegue.

`skills/**/SKILL.md` è prosa della riga `Documenti` e potrebbe andare su main
con un commit; la slice passa dalla PR come S12, perché è la presa in carico
di `/next` e la revisione sono i gate. `docs/spec.md` e la mappa vanno su
main con un commit dalla sessione che ha lanciato `/next`, non nella PR.

Fuori scope, da non sconfinare: Docket e la vista di calibrazione, `/audit`,
le Issues come board, la vista HTML della roadmap.

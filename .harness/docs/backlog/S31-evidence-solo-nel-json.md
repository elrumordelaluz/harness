---
id: S31
title: Il commento del verdetto tiene l'evidence nel JSON chiuso, e il claim sta in due frasi
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-16)
---

## Goal

`policy.sh` stampa ogni finding del commento sulla PR con il claim in una riga
e l'evidence sotto, come prosa markdown. L'evidence è il codice che il giudice
ha visto, e GitHub la rende come markdown: su PR #38 una riga di awk con `$i` e
`$(i + 1)` è stata letta come LaTeX, e al posto del codice è comparso un errore
di math. In più l'evidence raddoppia la lunghezza del commento, che la 0.7
voleva una pagina per l'umano che decide il merge, mentre chi la legge davvero è
l'audit, che la trova già nel `verdict.json` dentro `<details>`.

Dopo questa slice la parte del commento per l'umano porta di ogni finding
severità, id, file, riga e claim, e l'evidence sta solo nel JSON chiuso. Il
prompt del giudice chiede un claim di al massimo due frasi.

## Acceptance criteria

- [ ] La parte del commento prima del marker `<!-- verdict:<role> -->` non contiene l'evidence di nessun finding, né del giudice né `by: human`: la riga del finding resta quella di oggi, severità, id, file con la riga e claim, e sotto non c'è nient'altro.
- [ ] Il JSON nel blocco dentro `<details>` porta l'evidence di ogni finding intera, byte per byte, anche quando contiene `$`, backtick, `<!--` o righe che aprono un blocco di codice.
- [ ] Il testo del modello non si spaccia ancora per il marker né per il blocco JSON: nel commento c'è un solo marker a inizio riga e le sole righe che iniziano con tre backtick sono l'apertura e la chiusura del blocco JSON, con l'evidence piantata del test a `tests/policy.test.ts:355`.
- [ ] `skills/harness-init/templates/judge/prompt.md` chiede un claim di al massimo due frasi, e dice che l'evidence resta il codice visto, per l'audit, e non entra nel commento.
- [ ] `.github/judge/prompt.md` torna uguale al template sopra la sezione `## This repo` rilanciando la fase `judge` di `/harness-init`, e il confronto delle copie in `tests/architecture.test.ts` resta verde.
- [ ] Suite, typecheck, format e build verdi.

## Test plan

- Prima di tutto, in `tests/policy.test.ts`, accanto a
  `keeps the order: sentence, criteria, findings, json in details` (`:322`):
  un finding con un'evidence riconoscibile che contiene `$i` e `$(i + 1)`; il
  testo prima di `<!-- verdict:correctness -->` non contiene l'evidence, e il
  JSON estratto dal blocco fra ` ```json ` e ` ``` `, passato a `JSON.parse`, ha
  `findings[0].evidence` uguale a quella scritta. Lo stesso con un finding
  `by: human`. Rosso oggi: `policy.sh:398` stampa l'evidence sotto il claim.
- In `tests/policy.test.ts:355`, `keeps the model's text from posing as the
marker or the json block`: l'asserzione `toContain('{"pr":0}')` oggi è vera
  solo perché l'evidence è stampata nella parte per l'umano, dato che nel JSON
  compatto le virgolette sono escapate. Si sostituisce con il `JSON.parse` del
  blocco e `findings[0].evidence` uguale a `planted`, che prova la stessa cosa,
  il testo del modello arriva intero, dove ora sta. Le altre due asserzioni
  restano com'erano.
- In `tests/architecture.test.ts`, un test che il template
  `judge/prompt.md` nomina il limite di due frasi per il claim. Rosso oggi:
  `prompt.md:31-32` non pone limiti.
- Poi `pnpm test` intera, perché il confronto delle copie in `.github/`
  cammina i template.

## Touchpoints

- `skills/harness-init/templates/scripts/policy.sh`: la riga del finding a `:398` senza evidence, e il commento di testa a `:12-15` che descrive il commento.
- `skills/harness-init/templates/judge/prompt.md`: la regola dei finding a `:31-32`, con il claim in due frasi al massimo e l'evidence per l'audit.
- `.github/judge/prompt.md`: la copia, dalla fase `judge` di `/harness-init`.
- `tests/policy.test.ts`: il test nuovo e l'asserzione sostituita a `:375`.
- `tests/architecture.test.ts`: il test sul prompt.

## Notes

La riga dell'inbox, del 2026-09-16: `policy.sh` scrive l'evidence di ogni
finding come prosa markdown sotto il claim, e GitHub la rende come markdown:
l'evidence del giudice security su PR #38 portava una riga di awk con `$i` e
`$(i + 1)`, GitHub l'ha letta come LaTeX e ha stampato "Extra open brace or
missing close brace" al posto del codice. L'evidence è "il codice che hai visto"
per definizione del prompt, quindi va in un blocco di codice chiuso, dove né
markdown né math si applicano; il claim resta prosa. E il commento è lungo il
doppio di quello che la 0.7 voleva, "una pagina per l'umano": l'evidence serve
all'audit, che la legge già nel `verdict.json` dentro `<details>`, non a chi
decide il merge. Una slice sui template `scripts/policy.sh` e `judge/prompt.md`:
evidence in un blocco di codice o solo nel JSON chiuso, claim di al massimo due
frasi nel prompt.

Delle due forme vale la seconda, decisa rispondendo alla riga. Un blocco di
codice regge solo con un fence più lungo di ogni sequenza di backtick che il
modello scrive, e il test a `tests/policy.test.ts:355` pianta proprio tre
backtick nell'evidence; fuori dalla parte per l'umano l'evidence non si rende,
e il commento torna corto. L'umano che vuole il codice apre `<details>`.

`evidence` resta obbligatoria nello schema del verdetto
(`skills/harness-init/templates/judge/verdict.schema.json:73`): serve all'audit, che legge
i verdetti del log, e il giudice continua a doverla scrivere. Il limite di
due frasi sul claim è una regola del prompt e non dello schema, perché una frase
non si conta in modo affidabile con un pattern.

La 4.6 di `docs/spec.md` (`:354`) descrive i finding del commento "con file e
riga" e non promette l'evidence: non cambia, e la spec non sale di versione.

Il gate di `test-weakening.sh` può leggere l'asserzione sostituita a `:375` come
un test indebolito e portare la PR a tier 3. È atteso: la PR la elenca con la
riga di `policy.sh` che la rendeva vera e con quella che la sostituisce.

Fuori scope: come `judge.sh findings` stampa i finding nel terminale
(`skills/judge/SKILL.md:188`), la tabella dei criteri, la riga di testa del
commento.

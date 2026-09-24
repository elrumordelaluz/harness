## Problema

L'harness è nato in italiano perché pensavo di limitarlo a un pubblico italiano per semplicità. Ora gira su Tipoff e su Docket e voglio portarlo su codebase in produzione, dove lo leggeranno altri dev. Le skill e il prompt del giudice sono già in inglese, ma il contratto no: le etichette di `AGENTS.md` che script e hook leggono alla lettera (`Documenti`, `Merge umano per path`, `Path sensibili`, `Mai tier 0`), l'output di `board.sh`, le sezioni dell'intent, la spec. Chi non legge l'italiano non può né usarlo né correggerlo, e ogni repo in più che lo installa alza il costo del cambio.

## Cosa vuol dire riuscire

Un repo nuovo che lancia `/harness-init` riceve solo file in inglese: `AGENTS.md`, README dei template, messaggi degli script, schermata della board. Per una versione gli script leggono sia le etichette italiane sia quelle inglesi, così Tipoff e Docket restano verdi finché non rilanciano `local`; poi l'italiano esce e un test lo tiene fuori. `docs/spec.md`, `AGENTS.md` e la mappa di questo repo sono in inglese. "vai" e le altre frasi d'innesco italiane continuano a funzionare.

## Fuori scope

Tradurre la storia: slice `done`, ADR, intent già scritti, review log. Da una data in poi si scrive in inglese e un ADR lo dichiara. La lingua in cui un dev parla agli agenti. i18n dell'output: una lingua sola, l'inglese. Il feedback dagli altri repo e lo stamp dei template, che sono righe di inbox e vengono dopo.

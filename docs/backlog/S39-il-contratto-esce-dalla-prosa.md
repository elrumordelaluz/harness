---
id: S39
title: Gli script leggono la policy da un blocco di chiavi e non da una frase
status: done
blocked_by: none
tier: 2
human: false
spec: docs/specs/SPEC-english-first.md
---

## Goal

Oggi il contratto dell'harness è fatto di frasi italiane che i programmi
cercano alla lettera: `policy_line` prende la prima riga che apre con
`- Path sensibili:`, `docs_line` cerca la sezione `## Gate umani` e dentro
`- Documenti:`, `docs_paths` raccoglie i backtick della riga stessa, e
`tier.sh` ha 200 e 8 scritti alle righe 131 e 132 e riscritti a mano nella
prosa. Finché è così la lingua di `AGENTS.md` è portante e tradurla rompe la
catena.

Dopo questa slice `AGENTS.md`, qui e nel template, porta sotto un titolo fisso
un blocco `json` in un fence con otto chiavi, `policy-lines.sh` lo estrae e lo
passa a `jq`, e nessuna sua funzione cerca più una riga di prosa. Chi legge la
policy, `tier.sh`, i due hook, `intent.sh` e le tre skill che producono
documenti, la legge da lì. Da questo momento la prosa di `AGENTS.md` si può
tradurre senza toccare uno script, che è quello che tutte le slice dopo questa
fanno.

## Acceptance criteria

- [ ] `AGENTS.md` di questo repo e `skills/harness-init/templates/AGENTS.md` portano, sotto lo stesso titolo fisso, un blocco `json` dentro un fence con le otto chiavi `version`, `docs_mode`, `sensitive_paths`, `never_tier_0`, `human_gate_paths`, `docs_extra_paths`, `max_lines`, `max_files`, tutte presenti e nessuna con un default nello script.
- [ ] `scripts/policy-lines.sh` espone una funzione sola che estrae il fence e lo passa a `jq`, e nessuna delle sue funzioni cerca più una riga di prosa: spariscono `policy_line`, `docs_line` e la raccolta dei backtick di `docs_paths`.
- [ ] `tier.sh` prende i path sensibili, i mai tier 0 e il gate umano da `sensitive_paths`, `never_tier_0` e `human_gate_paths`, e le due soglie da `max_lines` e `max_files` invece dei numeri scritti alle sue righe 131 e 132: un repo con `max_lines: 50` manda a tier 2 un diff di 60 righe.
- [ ] `pre-commit`, `pre-push` e `intent.sh` leggono modo e path dei documenti dalla stessa funzione, con lo stesso comportamento di oggi su un repo che il blocco ce l'ha: il modo da `docs_mode`, i documenti da `human_gate_paths` più `docs_extra_paths`.
- [ ] La prosa dei due `AGENTS.md` non nomina più 200 e 8: dice dove sono.
- [ ] I glob stanno in stringhe JSON senza backtick, e il blocco riscritto da `prettier --write` si parsa uguale, chiave per chiave.
- [ ] `skills/spec/SKILL.md`, `skills/slice/SKILL.md` e `skills/board/SKILL.md` prendono il modo da `docs_mode` e non da una riga di prosa, e il caso di `tests/architecture.test.ts` che li tiene a quella riga segue.

## Test plan

- `tests/tier.test.ts`, nei `describe` che oggi tolgono o cambiano le righe di policy: le tre liste arrivano dal blocco, e un `AGENTS.md` con `max_lines` e `max_files` abbassati manda a tier 2 un diff che oggi è tier 1. Falliscono prima perché le liste passano da `policy_line` e le soglie sono due letterali dentro `tier.sh`.
- `tests/hooks.test.ts`: la fixture che oggi riscrive la riga `- Documenti:` riscrive la chiave `docs_mode`; un commit di soli documenti su main passa con `"docs_mode": "main"`, è rifiutato con `"pr"`, e un path di `docs_extra_paths` passa dove oggi passava perché stava fra i backtick della riga. Falliscono prima perché `docs_mode` legge la prosa.
- `tests/intent.test.ts`: i due modi di `intent.sh` letti dalla chiave. Fallisce prima per la stessa ragione.
- `tests/architecture.test.ts`: i due `AGENTS.md` portano il blocco sotto il titolo fisso con le otto chiavi e `jq` lo parsa; ogni path nominato nelle quattro liste esiste nel repo, come il caso di oggi fa con le righe di prosa; il blocco passato a `prettier --write` si parsa identico; i tre `SKILL.md` nominano `docs_mode` e i suoi due valori. Falliscono prima perché il blocco non c'è.

## Touchpoints

- `skills/harness-init/templates/scripts/policy-lines.sh`: riscritto intorno all'estrazione del fence. `scripts/policy-lines.sh` è il symlink e non si tocca.
- `skills/harness-init/templates/scripts/tier.sh`: le tre chiamate a `policy`, le due soglie, il commento in testa che le nomina.
- `AGENTS.md`: il blocco sotto il titolo fisso, e la prosa che smette di essere letta e smette di nominare le soglie.
- `skills/harness-init/templates/AGENTS.md`: lo stesso blocco con i valori del template.
- `skills/spec/SKILL.md`, `skills/slice/SKILL.md`, `skills/board/SKILL.md`: il modo preso da `docs_mode`.
- `skills/harness-init/templates/README.md`: la riga di `policy-lines.sh`, se cambia quello che possiede.
- `docs/codebase-map.md`: la riga della cartella degli script, dove `policy-lines` è descritto come la lettura delle righe di `AGENTS.md`.
- `tests/tier.test.ts`, `tests/hooks.test.ts`, `tests/intent.test.ts`, `tests/architecture.test.ts`.

## Notes

La scelta strutturale della spec, per intero: il contratto esce dalla prosa,
le righe che gli script leggono diventano un blocco di chiavi fisse che
nessuna traduzione tocca. Scartata la lettura doppia, insegnare a
`policy_line`, `docs_line`, `docs_mode` e `SECTIONS` a leggere per una
versione tutte e due le serie di etichette: risolve questa traduzione e lascia
in piedi la prossima. Il prezzo accettato è che Tipoff e Docket vanno
rimontati, ed è un passo dell'ordine di lavoro dell'ADR, non una slice.

Il blocco sta dentro `AGENTS.md` e non in un `.harness/policy.json`, perché
`AGENTS.md` è già il contratto, è già sensibile, è già mai tier 0, è già nel
pavimento hardcoded di `docs_outside` e di `tier.sh`, ed è già il file che
`/harness-init local` possiede: nessun path nuovo da proteggere in quattro
posti, e la regola resta nella stessa pagina del paragrafo che la spiega. Il
prezzo è l'`awk` che estrae il fence prima di `jq`.

Perché ogni chiave. `docs_extra_paths` è nuova come chiave e vecchia come
comportamento: oggi `docs_paths` ricava quei path raccogliendo i backtick
della riga `Documenti` stessa, che è un trucco tipografico. `max_lines` e
`max_files` entrano perché 200 e 8 oggi sono due copie di un numero, una nello
script e una nella prosa; che un repo si allarghi il tier 1 da solo costa una
modifica ad `AGENTS.md`, che è sensibile e non è mai tier 0, quindi esce tier
2 con il giudice addosso. `version` fa fallire chiusi una versione sconosciuta
come il blocco assente: costa una riga e vale questa migrazione intera.
`docs_mode` vale `"main"` o `"pr"`. Ogni chiave è obbligatoria e senza
default.

Il fallimento chiuso quando il blocco manca o non si parsa è S40 e non questa:
qui si costruisce il cammino felice, là la versione sconosciuta, la chiave
mancante e il fence che `jq` rifiuta. Chi implementa scriva la lettura in modo
che S40 abbia dove attaccarsi, senza inventarle i messaggi.

I tre `SKILL.md` non sono in un criterio della spec, ma il caso
`/spec, /slice and /board read the Documenti line, and say both modes` di
`tests/architecture.test.ts` li tiene a una riga di prosa che da qui in poi
nessuno legge: il criterio che dice "nessuna sua funzione cerca più una riga
di prosa" arriva fin lì, e lasciarli indietro vuol dire un test che punta a
una frase morta. La riga `- Documenti:` può restare come spiegazione per chi
legge, ma non è più la fonte.

Il pavimento hardcoded non si tocca in questa slice: `AGENTS.md` e `CLAUDE.md`
a qualunque profondità, `.claude/**` e `docs/codebase-map.md` restano scritti
dentro `docs_outside` e dentro `tier.sh`, perché qualunque contenitore tenga i
gate non può dichiarare sensibile se stesso. La riga che lo prova è un
criterio di S40.

Fuori scope: la prosa inglese, che arriva con le slice dopo; il rimontaggio di
Tipoff e Docket; una lettura di compatibilità per le etichette vecchie, che la
spec esclude.

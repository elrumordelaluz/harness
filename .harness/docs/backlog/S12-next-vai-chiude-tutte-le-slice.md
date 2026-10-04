---
id: S12
title: /next prende la board e "vai" porta ogni slice eleggibile fino alla PR mergiata
status: done
blocked_by: S10, S11
tier: 2
human: false
spec: docs/spec.md
---

## Goal

Decisione 3 di ADR-0003 e sezioni 4.4 e 5.4 della spec. La sessione che dice
"vai" è l'orchestratore: legge la board, prende le slice eleggibili a onde e
per ciascuna apre un subagent a contesto pulito che fa il lavoro, poi lancia
il giudice una volta, riporta i finding allo stesso subagent, apre la PR e
aspetta il merge della policy prima dell'onda seguente. L'hand-back è una
riga per PR. È la skill che manca, l'unica che produce codice.

## Acceptance criteria

- [x] `skills/next/SKILL.md` esiste con frontmatter `name: next` e `description`, e `tests/architecture.test.ts` lo vede come le altre. Il symlink `~/.claude/skills/next` è un passo manuale scritto nelle Notes e nel resoconto.
- [x] Senza argomento la skill legge `docs/backlog/`, calcola le onde (eleggibile: `status: todo`, `blocked_by` tutte `done`, `human: false`) e le esegue in ordine; con un id o uno slug esegue quella slice sola se è eleggibile, altrimenti dice perché no e si ferma.
- [x] Prima di aprire un branch controlla che `package.json` abbia i quattro comandi e che `pnpm test` giri: negato o assente, si ferma e lo dice, perché senza suite non c'è TDD.
- [x] Ogni slice gira in un subagent a contesto pulito, Agent tool con `subagent_type: general-purpose` e `model: opus`, mai un fork, con in input `AGENTS.md`, `docs/codebase-map.md`, il file della slice e i guardrail di 5.4. L'orchestratore non scrive codice e non legge il ragionamento del subagent, solo il suo resoconto.
- [x] Il subagent segue 4.4: `git switch -c slice/S<NN>-<slug>` dal ramo di default aggiornato e push subito, e se il push fallisce perché il branch esiste la slice è di altri, si salta e si dice; `status: in-progress` e commit; per ogni criterio test rosso per il motivo giusto, poi verde; i quattro comandi; commit dal verde; `scripts/tier.sh` e `scripts/test-weakening.sh` prima della PR, con l'esito nel corpo.
- [x] Dopo il codice l'orchestratore lancia `/judge` una volta per ruolo con il modello per tier: Sonnet 5 a tier 1, Opus 5 a tier 2 (ADR-0002, decisione 5). La skill `/judge` prende il modello come parametro invece del `model: opus` fisso di oggi, e il verdetto porta il modello usato dove lo schema lo prevede.
- [x] I finding `high` e `medium` tornano allo stesso subagent con SendMessage, che li corregge, committa e risponde con `scripts/judge.sh answer`; i `low` finiscono dichiarati nel corpo della PR. Nessun secondo giudizio.
- [x] La PR si apre con il template compilato: link alla slice, checklist, "come verificare a mano" dalle Notes della slice. Poi `scripts/policy.sh` posta il verdetto con le risposte.
- [x] L'orchestratore aspetta CI verde e merge della policy, `gh pr checks --watch` e poi `gh pr view --json state`, e la chiusura della slice da `close.yml`, prima di far partire l'onda seguente da main aggiornato. Oltre un tetto di attesa dichiarato nella skill passa avanti e lo scrive nell'hand-back.
- [x] Una slice che trova una decisione che la spec non copre, o un test da indebolire, o un comando negato: `status: blocked`, sezione `## Blocked`, PR in draft con `needs-human`, e la domanda di una riga va nell'hand-back finale. Le altre slice dell'onda continuano.
- [x] L'hand-back è una riga per PR: link, tier, verdetto in una frase, stato (mergiata, aperta, bloccata), più "come verificare a mano" solo dove la slice ha passi manuali. Nessun racconto del codice.
- [x] `docs/codebase-map.md` ha la riga di `skills/next/`.

## Test plan

- La skill è prosa e si prova lanciandola: il passo 6 di ADR-0003, `/next` con "vai" su Tipoff dopo `/slice docs/specs/SPEC-esc-key.md`, con `HARNESS_AUTOMERGE=on`, fino a due PR mergiate dalla policy e un hand-back di tre righe. Prima di quella prova, una slice sola nominata, per vedere il giro intero una volta.
- `tests/architecture.test.ts`: il frontmatter della skill nuova; lo schema del verdetto e la copia uguali se il campo del modello si aggiunge.
- Il resto della suite resta verde senza modifiche.

## Touchpoints

- `skills/next/SKILL.md`, nuovo.
- `skills/judge/SKILL.md`: il passo che lancia il subagent con `model: opus`, che diventa un parametro con il default per tier.
- `skills/harness-init/templates/judge/verdict.schema.json` e la copia in `.github/judge/`: il campo del modello del giudice, solo se manca.
- `skills/harness-init/templates/github/pull_request_template.md`: solo se la sezione dei finding dichiarati manca.
- `tests/architecture.test.ts`, `docs/codebase-map.md`.
- Su Tipoff, al passo 6: `gh variable set HARNESS_AUTOMERGE --body on`.

## Notes

L'orchestratore è la sessione interattiva di Lionel: dice "vai" e legge
l'hand-back. Il contesto pulito per slice è il subagent, non una sessione
nuova, così un run copre una board intera (ADR-0002, decisione 3, come la
rilegge ADR-0003). La forma headless resta rimandata, spec 11.

Il subagent riceve la slice, non la spec: il file della slice porta le
decisioni inlinate per costruzione, ed è il motivo per cui `/slice` le
scrive. Se il subagent sente il bisogno di aprire la spec, è un difetto della
slice e va nella domanda di una riga, non risolto leggendo.

Con `HARNESS_AUTOMERGE=off` la skill funziona uguale e ogni PR resta aperta
con il commento "would have merged": è il modo di provarla senza fidarsi.

Il symlink resta un passo manuale, e si fa dopo il merge, non prima: punta
al working tree, quindi finché la skill vive solo su questo branch un
`~/.claude/skills/next` punterebbe a una cartella che sparisce al primo
`git switch`. Con la PR mergiata e il checkout su main:

    ln -s "$PWD/skills/next" ~/.claude/skills/next

Il campo del modello nello schema del verdetto non serviva: `judge.model` è
già lì ed è già `required`, e il giudice ci scrive dentro il modello con cui
ha girato. Il tier resta l'unica cosa che sceglie, `sonnet` a tier 1 e
`opus` a tier 2.

Fuori scope: `/board`, che arriva dopo; i controlli visivi di ADR-0002,
decisione 7; il fixer cloud di `fix.yml`, che non gira più.

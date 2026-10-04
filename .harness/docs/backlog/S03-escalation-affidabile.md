---
id: S03
title: Una escalation avvisa sempre, un crash non toglie la PR dal giro
status: done
blocked_by: S01, S02
tier: 2
human: false
spec: audit (PR #3)
---

## Goal

Su PR #3 il giudice è crollato due volte prima di girare davvero, e i due
crash hanno lasciato due danni che nessuno ha visto. PR #4 ne ha aggiunto un
terzo, e ha rifatto il primo mentre giudicava questa slice.

Primo: l'unica notifica arrivata è stata quella inutile. Alle 15:50
`escalate.yml` ha spedito su ntfy un messaggio con il corpo "no verdict yet",
perché a quel momento nessun commento portava il marker. Il verdetto vero
delle 16:06 non ha notificato niente, perché `policy.sh` chiama
`gh pr edit --add-label needs-human` su una label che c'era già, e GitHub non
emette un evento `labeled` per un no-op. Il crash avvisa, il giudizio no. Su
PR #4 è successo di nuovo: il giudice di correttezza ha notificato, quello di
sicurezza quattro minuti dopo no.

Secondo: `needs-human` porta la PR a tier 3 in `tier.sh`, e `judge.yml` non
gira a tier 3. Quindi un 401 di passaggio toglie la PR dal giro per sempre:
si pusha la correzione, la CI torna verde, il job `tier` rimette 3, il
giudice viene saltato e non c'è un errore da nessuna parte. Per una
escalation decisa è il comportamento giusto. Per un crash è una trappola.

Terzo, da PR #4: a tier 2 girano due giudici e c'è una sola casella per la
label. La correttezza ha messo `judge:escalate`, la sicurezza l'ha tolta e ha
messo `judge:changes`. La PR dichiara il verdetto dell'ultimo che ha parlato.

## Acceptance criteria

- [ ] Un giudice senza verdetto, o con un JSON non valido, mette `judge:crashed` e il commento con il link al run, non `needs-human`.
- [ ] `tier.sh` non guarda `judge:crashed`: dopo un crash, la CI successiva ricalcola il tier che avrebbe calcolato prima, e `judge.yml` rigira.
- [ ] Le label del verdetto portano il ruolo: `judge:correctness:escalate`, `judge:security:changes`. `policy.sh` rimuove solo le label del proprio ruolo, così i due giudici di tier 2 non si sovrascrivono.
- [ ] La notifica parte da `policy.sh`, che ha il verdetto in mano, e non dall'evento `labeled`: sempre, a ogni escalation, anche la seconda di fila e anche quando la label c'era già. Il corpo è la `reason` del verdetto, mai "no verdict yet".
- [ ] `policy.sh` non toglie mai `needs-human` per rimetterla: lo stato di escalation non sparisce nemmeno per un istante, e nessuna `ci` in corsa può leggere un tier più basso.
- [ ] `escalate.yml` resta per le escalation che non vengono dal giudice (label messa a mano, tier 3) e parte anche su `judge:crashed`, con un corpo che dice che il giudice è crollato e linka il run.
- [ ] `policy.sh` non posta due volte lo stesso commento di crash sullo stesso `head_sha`: il secondo tentativo aggiorna il primo.
- [ ] `docs/spec.md` sale di versione con la sua riga in "Cosa cambia": 4.6 distingue crash e escalation e sposta la notifica dentro la policy, 7.2 toglie l'ambiguità nella riga delle label.

- [ ] La notifica parte anche al crash, con il link al run, e `escalate.yml` filtra gli attori bot: le label messe dalla policy non notificano due volte.

## Test plan

- `tests/policy.test.ts`, esteso: con `verdict.json` vuoto lo stub di `gh` registra `--add-label judge:crashed` e nessun `needs-human`.
- Stesso file: con un verdetto `escalate` lo stub registra `--add-label needs-human` e mai un `--remove-label needs-human`, e la notifica parte anche quando lo stub dichiara la label già presente.
- Stesso file: un verdetto `correctness` non tocca le label `judge:security:*` e viceversa.
- Stesso file: due giri di crash sullo stesso `head_sha` producono una sola chiamata di `gh pr comment`, la seconda è un `--edit-last` o equivalente.
- `tests/tier.test.ts`, esteso: `PR_LABELS` con `judge:crashed` dà lo stesso tier che darebbe senza; con `needs-human` dà 3.

## Touchpoints

- `skills/harness-init/templates/scripts/policy.sh`: la label del crash, le label per ruolo, la notifica diretta, il commento idempotente.
- `skills/harness-init/templates/scripts/tier.sh`: la lista delle label che alzano il tier.
- `skills/harness-init/templates/github/judge.yml`: `NTFY_TOPIC` nell'ambiente del passo di policy.
- `skills/harness-init/templates/github/escalate.yml`: il trigger sulla label del crash e il corpo del messaggio.
- `tests/policy.test.ts`, `tests/tier.test.ts`: estesi.
- `docs/spec.md`: 0, 4.6, 7.2.

## Notes

Prove dal run di PR #3, tutte verificabili: `gh api .../runs/34140144128` dice
`run_attempt: 3`; i tentativi 1 e 2 falliscono in `judge, correctness` con
`401 Unauthorized - Claude Code is not installed on this repository`, che è
l'action che scambia il token OIDC per un token di App, cosa diversa da
`CLAUDE_CODE_OAUTH_TOKEN`; la timeline della PR ha un solo evento
`labeled needs-human`, alle 15:48:48, e nessuno alle 16:06; il run di
`escalate` 34140201651 ha spedito `"message":"no verdict yet"`.

Da PR #4: il run di `escalate` 34145127478 parte dopo il verdetto di
correttezza delle 16:51:14; alle 16:55:05 la sicurezza rimette `needs-human`
e non parte niente. Stesso bug, seconda prova.

Il 401 è configurazione, non harness: la GitHub App non era installata sul
repo. Ma ha fatto vedere che il primo crash detta lo stato finale della PR,
e quello è harness.

La notifica passa dentro `policy.sh` invece di restare appesa all'evento
`labeled` per due motivi: lì il verdetto c'è già, quindi il corpo non è mai
"no verdict yet", e non serve più togliere e rimettere una label per farla
scattare, che era la correzione ovvia e apriva una finestra in cui la PR non
era più tier 3.

`blocked_by` su S01 e S02 solo per non litigare sui file: questa slice tocca
`policy.sh` come S01 e `tier.sh` come S02. Per questo il branch parte da
quello di S01, non da main, e la PR si apre dopo il merge dei due.

Il punto 6 del criterio originale voleva `escalate.yml` anche sul crash con
un corpo suo. Con la notifica dentro `policy.sh` il crash notifica da lì,
con il link al run in mano; `escalate.yml` resta per le label messe a mano
da una persona, `needs-human` o `judge:*:crashed`, e salta gli attori bot
per non spedire due volte. La trappola del tier 3 si è vista di nuovo l'8
settembre su PR #5: un push dopo la `needs-human` di ieri, CI verde,
tier 3 dalla label, giudice saltato.

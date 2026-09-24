---
id: S01
title: Il verdetto dice una riga e non ripete i gate
status: done
blocked_by: none
tier: 2
human: false
spec: audit (PR #3)
---

## Goal

Il primo verdetto reale, su PR #3, apre con dieci righe di `reason` che
rifanno a parole quello che `commitlint.sh` aveva già dimostrato quaranta
secondi prima ("minuscolo, senza punto, nessun trailer"), e chiude con una
riga di costo che dichiara trenta token in ingresso quando ne sono passati
588k, senza mai stampare gli 1,11 dollari che la PR è costata.

Tre cose da separare: il giudice dice una frase sul perché del verdetto, non
verifica mai ciò che un gate deterministico ha già provato e non riferisce
mai un pass; il commento mette in alto quello che legge l'umano e in basso
quello che leggono le macchine; il costo si vede e dice il vero.

## Acceptance criteria

- [ ] `reason` ha `description` e `maxLength: 240` nello schema, e il prompt chiede una frase sola per tutti e tre i verdetti, non solo per `escalate`.
- [ ] Il motivo di `needs_human` sta in un campo suo, `human_reason`, opzionale, e non dentro `reason`.
- [ ] Il prompt vieta di verificare ciò che un gate ha già provato, con l'elenco dei gate (`commitlint.sh`, `test-weakening.sh`, `tier.sh`, `pnpm audit`, gitleaks) e vieta di riferire un pass in prosa.
- [ ] `scripts/prose.sh` fallisce sul trattino lungo nei file testuali del diff, gira in `ci.yml` e nel `pre-commit`; da lì in poi il giudice non guarda più la prosa.
- [ ] Il commento di `policy.sh` ha, in ordine: titolo con role, tier, verdetto, sha e `confidence`; la riga di `reason`; la tabella dei criteri solo quando `slice` non è `null`; i findings; il JSON dentro un `<details>`; una riga finale con il costo.
- [ ] La riga del costo somma `input_tokens`, `cache_creation_input_tokens` e `cache_read_input_tokens` e stampa `cost_usd`. Sul verdetto di PR #3 legge `24 turni, 3m03s, 588k in / 13,5k out, $1.11`.
- [ ] L'estrazione del JSON dai commenti esce da `close.yml` e diventa `skills/harness-init/templates/scripts/review-log.sh`, che legge il commento con il `<details>` e accoda a `verdicts.jsonl` con `outcome` compilato.
- [ ] `review-log.sh` accetta solo i commenti del giudice: quelli scritti dalla catena (l'App dell'harness, o `github-actions` senza App) e quelli con `authorAssociation` `OWNER` o `MEMBER`. Un commento con il marker giusto e un blocco JSON valido, scritto da chiunque altro, non entra in `verdicts.jsonl`.
- [ ] `policy.sh` posta un commento solo per giudizio: la decisione della policy sta nell'ultima riga di quel commento, non in un secondo commento "human review required".
- [ ] Prima di postare, `policy.sh` minimizza come outdated il verdetto precedente dello stesso ruolo sulla PR, e non quello dell'altro ruolo: la PR mostra un verdetto vivo per giudice, il log li tiene tutti.
- [ ] `docs/spec.md` sale di versione con la sua riga in "Cosa cambia": 7.1 per la semantica di `cost` (i token in ingresso includono la cache, e `cost_usd` non è zero con il token dell'abbonamento, contro quanto dice oggi), 4.6 per il divieto di ripetere i gate e per l'autore dei verdetti che entrano nel log.

## Test plan

Scritti prima, tutti lanciano gli script come processi come fa
`commitlint.test.ts`.

- `tests/policy.test.ts`: da un verdetto di esempio con `slice: null`, il commento generato non ha la tabella dei criteri; con `slice: "S03"` ce l'ha. L'ordine delle sezioni è quello dei criteri. La riga del costo, su un `execution_file` di esempio con i tre campi di input, stampa la somma e il dollaro. `gh` è uno stub sul PATH che registra le chiamate.
- `tests/review-log.test.ts`: `review-log.sh` estrae il JSON da un commento con il `<details>`, ne ignora uno senza marker, e stampa la riga con `outcome.decided_by` a `policy` o `human` secondo chi ha mergiato.
- Stesso file, il caso che conta: un commento con il marker e un JSON valido ma di un autore che non è il giudice viene ignorato, e lo script lo scrive su stderr invece di accodarlo in silenzio.
- `tests/prose.test.ts`: `prose.sh` fallisce su un file con il trattino lungo, passa senza, ignora i file non testuali.
- `tests/architecture.test.ts`: il verdetto di esempio dei test valida contro `verdict.schema.json`, e un `reason` oltre i 240 caratteri non valida.

## Touchpoints

- `skills/harness-init/templates/judge/prompt.md`: il divieto di ripetere i gate, la frase sola per `reason`.
- `skills/harness-init/templates/judge/verdict.schema.json`: `reason` con `maxLength`, `human_reason` nuovo.
- `skills/harness-init/templates/scripts/policy.sh`: il rendering del commento e il calcolo del costo.
- `skills/harness-init/templates/scripts/prose.sh` e `skills/harness-init/templates/scripts/review-log.sh`: nuovi, più la loro riga in `skills/harness-init/templates/README.md`.
- `skills/harness-init/templates/github/ci.yml`: `prose.sh` nei gate.
- `skills/harness-init/templates/github/close.yml`: chiama `review-log.sh` invece dell'awk inline.
- `skills/harness-init/templates/githooks/pre-commit`: `prose.sh` in locale.
- `tests/policy.test.ts`, `tests/review-log.test.ts`, `tests/prose.test.ts`: nuovi.
- `docs/spec.md`: 0, 4.6, 7.1.
- `.github/**` e `scripts/**` di questo repo: rilanciando le fasi `ci` e `judge` di `/harness-init`, non a mano.

## Notes

Il costo vero del run: `input_tokens` 30, `cache_creation_input_tokens`
49.917, `cache_read_input_tokens` 538.470, `output_tokens` 13.536,
`total_cost_usd` 1,10798. Lo schema li ha già tutti tranne i due della cache.

La spec dice a 7.1 che "con il token dell'abbonamento `cost_usd` è zero e i
token sono la misura vera". PR #3 dimostra il contrario: l'action riporta il
prezzo di listino anche con il token dell'abbonamento. La riga va corretta,
non ignorata, perché è quella che l'audit usa per decidere le soglie.

Il costo resta visibile, non dentro il `<details>`: nasconderlo è il modo in
cui si smette di guardarlo, e guardarlo è metà del motivo per cui esiste
l'audit. Nel `<details>` va il JSON, che serve a `review-log.sh` e a nessun
umano.

La tabella dei criteri vale quando c'è una slice, perché gli `id` vengono dal
file della slice e sono confrontabili tra PR e tra settimane. Senza slice il
giudice se li inventa sul momento e metà ripetono i gate: è decorazione.

Senza App i commenti della policy li scrive `github-actions`, che non è né `OWNER` né `MEMBER`: "in mancanza" nel criterio originale avrebbe scartato proprio i verdetti della catena. La regola implementata accetta i login della catena (`JUDGE_LOGINS`, che `close.yml` compila con `github-actions` e lo slug dell'App) e in più owner e member, per un verdetto incollato a mano da chi può mergiare.

I due criteri sul commento unico e sul verdetto minimizzato vengono dalla lettura dei cinque verdetti di ieri: a ogni push il giudice riparte da zero e posta un commento nuovo, più un secondo che dice solo "human review required", più la notifica. Chi legge la PR trova tre commenti per giudizio e due giudizi per push.

Il controllo sull'autore viene dal giudice di sicurezza su PR #4. Oggi
`close.yml` prende ogni commento che contenga il marker, senza guardare chi
l'ha scritto, e lo accoda a `verdicts.jsonl`; `escalate.yml` sceglie allo
stesso modo il corpo che finisce su ntfy. Il log è il file da cui l'audit
decide le soglie, quindi è la superficie che conta: su un repo pubblico
chiunque può scrivere un verdetto falso commentando la PR. Il marker dice
dove finisce il JSON, non chi lo ha prodotto.

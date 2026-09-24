---
status: approved
intent: docs/intent/english-first.md
date: 2026-09-21
approved: 2026-09-21
---

# SPEC: l'harness in inglese

## Problema

L'harness è nato in italiano perché doveva servire un pubblico italiano. Ora
gira su Tipoff e su Docket e deve andare su codebase in produzione, dove lo
leggeranno altri dev. Le skill e il prompt del giudice sono già in inglese, il
contratto no.

Il contratto è fatto di stringhe che i programmi cercano alla lettera.
`scripts/policy-lines.sh` legge la sezione `## Gate umani` con un `awk` che
confronta il titolo parola per parola, e la riga `- Documenti:` con il valore
`su main`; `scripts/tier.sh` chiede a quella stessa funzione `Path sensibili`,
`Merge umano per path` e `Mai tier 0`; `scripts/intent.sh` porta dentro
`SECTIONS='Problema|Cosa vuol dire riuscire|Fuori scope'` e rifiuta una sezione
vuota cercando quelle tre stringhe; `scripts/board.sh` stampa una schermata con
i titoli italiani e le righe `ferma per ADR-<nnnn>`, `in corso`,
`gh non disponibile`. Intorno stanno i documenti che un umano legge per capire
cosa ha davanti: `AGENTS.md` qui e nel template, `CLAUDE.md`,
`docs/codebase-map.md`, i cinque README di `docs/`, `docs/inbox.md`, il template
di PR e le 707 righe di `docs/spec.md`.

Chi non legge l'italiano non può né usarlo né correggerlo, e ogni repo in più
che lo installa alza il costo del cambio.

## Soluzione

Il contratto esce dalla prosa. `AGENTS.md` porta, sotto un titolo fisso, un
blocco `json` dentro un fence con le chiavi che gli script leggono: `version`,
`docs_mode`, `sensitive_paths`, `never_tier_0`, `human_gate_paths`,
`docs_extra_paths`, `max_lines`, `max_files`. `scripts/policy-lines.sh` viene
riscritto intorno a una funzione sola che estrae il fence e lo passa a `jq`, e
nessuno script cerca più una frase. Da quel momento la lingua di `AGENTS.md` non
è più portante: la prosa diventa inglese perché lo decidiamo noi, non perché un
`awk` la sta guardando, e muore il drago dei backtick intorno ai glob, che
stanno lì solo perché Prettier legge gli `*` come enfasi.

Sopra quella base, tutto quello che un umano legge o scrive diventa inglese:
`AGENTS.md` e `CLAUDE.md` qui e nel template, `docs/codebase-map.md`, i cinque
README di `docs/`, `docs/inbox.md`, il template di PR, lo scheletro dell'intent
e quello della spec, la schermata di `board.sh`, le `description` delle skill e
le 707 righe di `docs/spec.md`. Un test in `tests/architecture.test.ts` tiene
fuori l'italiano da un insieme di path dichiarato.

Niente compatibilità: non c'è nessuna lettura doppia e nessuno script di
migrazione. Un repo senza fence si ferma invece di degradare, e i due repo
montati si rimontano con `/harness-init local`. La storia non si traduce: intent,
spec, slice, ADR e verdetti già scritti restano dove e come sono, e un ADR
dichiara il giorno da cui si scrive in inglese.

## User stories con criteri

Come dev che non legge l'italiano, apro un repo montato con l'harness e capisco
il contratto.

- [ ] `skills/harness-init/templates/AGENTS.md` e `CLAUDE.md`, i cinque README
      di `skills/harness-init/templates/docs/`, `codebase-map.md`, `inbox.md` e
      `github/pull_request_template.md` sono in inglese.
- [ ] `scripts/intent.sh new <slug>` scrive tre intestazioni inglesi, e `open`
      rifiuta una sezione vuota cercando quelle.
- [ ] Lo scheletro della spec, in `skills/spec/templates/SPEC.md` e nei due
      README di `docs/specs/`, ha otto sezioni inglesi; quello della slice, nei
      due README di `docs/backlog/`, è inglese.
- [ ] `scripts/board.sh` stampa titoli inglesi, e le righe che non sono un
      titolo, oggi `ferma per ADR-<nnnn>`, `in corso` e `gh non disponibile`,
      lo sono.

Come programma, leggo la policy da un blocco di chiavi fisse e non da una frase.

- [ ] `AGENTS.md`, qui e nel template, porta sotto un titolo fisso un blocco
      `json` in un fence con le otto chiavi, tutte obbligatorie e senza default.
- [ ] `scripts/policy-lines.sh` espone una funzione che estrae il fence e lo
      passa a `jq`; nessuna sua funzione cerca più una riga di prosa.
- [ ] `tier.sh`, `pre-commit`, `pre-push` e `intent.sh` leggono solo da lì, e
      `tier.sh` prende le soglie da `max_lines` e `max_files` invece dei numeri
      scritti alle sue righe 131 e 132.
- [ ] La prosa di `AGENTS.md` non nomina più le due soglie: dice dove sono.
- [ ] I glob stanno in stringhe JSON senza backtick, e il fence riformattato da
      Prettier si parsa uguale.

Come repo con il blocco assente o rotto, mi fermo invece di degradare.

- [ ] Senza fence, con un fence che `jq` rifiuta, con una chiave mancante o con
      una `version` sconosciuta: `tier.sh` stampa 3, `pre-commit` e `pre-push`
      rifiutano main, `intent.sh` esce con un messaggio.
- [ ] Ogni messaggio nomina `/harness-init local`.
- [ ] Il pavimento resta hardcoded in `docs_outside` e in `tier.sh`: `AGENTS.md`
      e `CLAUDE.md` a qualunque profondità, `.claude/**`, `docs/codebase-map.md`.
      Il blocco non dichiara sensibile se stesso.

Come Lionel, rimonto un repo già montato senza perdere la sua policy.

- [ ] `/harness-init local` su un repo che il fence ce l'ha già tiene ogni chiave
      presente com'è, aggiunge dal template quelle che mancano, e sovrascrive
      solo `version`.
- [ ] `docs_mode` non cambia mai per mano della skill.
- [ ] La regola è scritta nella fase `local` di `skills/harness-init/SKILL.md`.

Come chiunque apra una skill, trovo i comandi e inneschi in inglese.

- [ ] Nessuna `description` dei sei `SKILL.md` contiene una frase italiana.
- [ ] I comandi, le frasi inglesi e le condizioni che non sono frasi di nessuno,
      come "when a session starts in a repo that has the harness", restano.

Come manutentore, un file che torna in italiano diventa rosso.

- [ ] `tests/architecture.test.ts` ha un caso che cerca, sull'insieme di path
      dichiarato, le stringhe del contratto e le parole funzione italiane.
- [ ] L'insieme è `skills/harness-init/templates/**`, `skills/*/SKILL.md`,
      `skills/spec/templates/SPEC.md`, `AGENTS.md`, `CLAUDE.md`, `docs/spec.md`,
      `docs/codebase-map.md`, `docs/*/README.md`, `docs/inbox.md`, `.github/**`,
      `tests/**`, e lascia fuori `docs/intent/`, `docs/specs/SPEC-*.md`,
      `docs/backlog/S*.md`, `docs/decisions/ADR-*.md`, `docs/review-log/`.
- [ ] Il caso fallisce su una fixture che rimette una parola italiana in un file
      dell'insieme.
- [ ] `skills/harness-init/templates/architecture.test.ts` non porta il caso: la
      lingua di chi installa l'harness non la decide l'harness.

Come lettore della catena, leggo la spec in inglese.

- [ ] `docs/spec.md` è in inglese, con una versione nuova nell'intestazione e la
      sua riga in "Cosa cambia".
- [ ] `AGENTS.md` e `docs/codebase-map.md` di questo repo sono in inglese.
- [ ] Un ADR dichiara il giorno da cui intent, spec, slice e ADR nuovi si
      scrivono in inglese, e che la storia non si traduce.

## Decisioni bloccate

- **La scelta strutturale.** Il contratto esce dalla prosa: le righe che gli
  script leggono diventano un blocco di chiavi fisse che nessuna traduzione
  tocca, e `scripts/policy-lines.sh` lo parsa invece di leggere frasi. La prosa
  di `AGENTS.md` diventa libera e la sua lingua smette di essere portante.
  Scartata la forma dell'intent, tenere le etichette come prosa tradotta e
  insegnare a `policy_line`, `docs_line`, `docs_mode` e `SECTIONS` a leggere per
  una versione tutte e due le serie: risolve questa traduzione e lascia in piedi
  la prossima. Il prezzo è che i repo già montati vanno rimontati, e con due
  montati è accettato.
- Il blocco sta dentro `AGENTS.md`, sotto un titolo fisso, come un fence `json`
  che `policy-lines.sh` estrae con un `awk` e passa a `jq`. `AGENTS.md` è già il
  contratto, è già in `Path sensibili` e in `Mai tier 0`, è già nel pavimento
  hardcoded di `docs_outside` e di `tier.sh`, ed è già il file che
  `/harness-init local` possiede: non nasce nessun path nuovo da proteggere in
  quattro posti, e la regola resta nella stessa pagina del paragrafo che la
  spiega. Scartato `.harness/policy.json`, che si leggerebbe con un `jq` secco
  senza passare dall'`awk` ma farebbe nascere un path da mettere a mano nel
  pavimento, in `sensitive_paths`, in `never_tier_0` e nel README dei template,
  e separerebbe la regola dalla frase che la spiega. Qualunque contenitore tenga
  i gate non può stare fra i path che vanno su main senza PR e non può
  dichiarare sensibile se stesso: il pavimento resta hardcoded.
- Le chiavi sono `version`, `docs_mode` con i valori `"main"` e `"pr"`,
  `sensitive_paths`, `never_tier_0`, `human_gate_paths`, `docs_extra_paths`,
  `max_lines`, `max_files`. `docs_extra_paths` è nuova come chiave e vecchia
  come comportamento: oggi `docs_paths` ricava quei path raccogliendo i backtick
  della riga `Documenti` stessa, che è un trucco tipografico. `max_lines` e
  `max_files` entrano perché 200 e 8 oggi stanno hardcoded in `tier.sh` e
  riscritti a mano nella prosa, e sono già due copie di un numero; che un repo si
  allarghi il tier 1 da solo costa una modifica ad `AGENTS.md`, che è sensibile e
  non è mai tier 0, quindi esce tier 2 con il giudice addosso. `version` fa
  fallire chiusi una versione sconosciuta come il blocco assente: costa una riga
  e vale questa migrazione intera. Ogni chiave è obbligatoria e senza default.
- Blocco assente o che non si parsa: si fallisce chiusi dappertutto, e
  rumorosamente. Gli hook tengono main chiuso, che è già la regola scritta nei
  loro commenti; `intent.sh` si ferma; `tier.sh` dà 3, non 0. Oggi metà della
  catena fallisce chiusa e metà aperta senza che nessuno l'abbia deciso:
  `docs_mode` legge un valore che non capisce come `pr`, e `tier.sh` fallisce
  chiuso a 2 solo quando `AGENTS.md` manca del tutto, mentre con il file presente
  e la riga assente `sensitive_paths` resta vuoto e una PR che tocca `scripts/`
  si calcola tier 1. Il parsing è il momento per chiudere quel buco, perché una
  riga assente e una scritta male finora erano la stessa cosa e `jq` le
  distingue.
- Non esiste lettura doppia e non esiste uno script di migrazione: nessuno script
  legge più un'etichetta italiana, in nessuna versione, e un repo senza fence si
  ferma. È la riga di "Cosa vuol dire riuscire" dell'intent che chiedeva agli
  script di leggere per una versione tutte e due le serie, e salta perché con
  questa scelta strutturale i repo si rimontano invece di essere tollerati.
- `/harness-init local` che rigira su un repo con il fence lavora chiave per
  chiave, deterministico e non a giudizio dell'agente: una chiave che c'è resta
  com'è, una che manca arriva dal template, e `version` è l'unica che il template
  sovrascrive sempre. `docs_mode` non cambia mai per mano della skill. Così un
  repo prende le chiavi nuove senza perdere i suoi `sensitive_paths`, che su
  Tipoff sono il motivo per cui `AGENTS.md` non è il template. Il prezzo è che una
  chiave rinominata resta orfana finché qualcuno non la toglie a mano, e `version`
  la rende visibile. Scartata la riscrittura secca, dove il template vince e
  l'umano rimette i suoi path: con due progetti costa dieci minuti e nessuna
  regola da testare, ma al terzo cancella in silenzio una policy allargata apposta.
- Le intestazioni che un umano scrive a mano diventano inglesi con il resto: le
  tre di `docs/intent/README.md`, le otto della spec in `docs/specs/README.md` e
  `skills/spec/templates/SPEC.md`, lo scheletro della slice di
  `docs/backlog/README.md`. Sono la prima cosa che un dev vede aprendo un intent.
  Scartata l'alternativa di tradurre la prosa dei README e tenere le intestazioni
  come token italiani fissi: risparmia `intent.sh` e `tests/architecture.test.ts`
  e lascia il contratto bilingue per sempre.
- Le frasi d'innesco italiane escono dalle `description` delle skill: restano i
  comandi, `/harness-init`, `/spec`, `/slice`, `/next`, `/judge`, `/board`, le
  frasi inglesi e le condizioni che non sono frasi di nessuno, come "when a
  session starts in a repo that has the harness" di `skills/board/SKILL.md`.
  Scartata la regola che esentava dal test gli span tra virgolette della
  `description`: teneva vivo "vai" al prezzo di un contratto bilingue permanente.
  Scartata anche la lettura larga, togliere ogni innesco in linguaggio naturale:
  cambierebbe quando una skill parte, non in che lingua è scritta, e `/board`
  smetterebbe di aprirsi da sola a freddo. Questa decisione contraddice "Cosa
  vuol dire riuscire" dell'intent, che chiede a "vai" di continuare a funzionare.
- Il test che tiene fuori l'italiano sta in `tests/architecture.test.ts` di questo
  repo e solo qui, perché il repo di un progetto può avere prosa italiana di suo.
  Confronta due liste: le stringhe del contratto cercate esatte, e una ventina di
  parole funzione italiane che in inglese non esistono, `il`, `lo`, `gli`, `che`,
  `non`, `una`, `nel`, `della`, `dei`, `sono`, `anche`, `più`, `quando`, `senza`,
  `viene`, perché un paragrafo non tradotto non contiene nessuna etichetta e
  passerebbe la prima lista. Fuori dalla seconda lista `per`, `in`, `a`, `e`,
  `di`, `come`, che in un file inglese o in uno script compaiono per conto loro.
- I documenti già scritti non si toccano, qui, su Tipoff e su Docket.
  `intent.sh open` legge solo il file che `new` ha appena scritto, `/spec` e
  `/slice` leggono le intestazioni di documenti che producono loro, quindi nessuno
  inciampa in un'intestazione vecchia. Un intent scritto e non ancora aperto si
  rifà con `new`.
- Questa spec resta in italiano, perché è il verbale di una conversazione in
  italiano. L'inglese vale dal giorno in cui l'ADR atterra su main: da lì intent,
  spec, slice e ADR nuovi si scrivono in inglese.
- Rimontare Tipoff e Docket non è una slice: è un passo dell'ordine di lavoro
  dell'ADR, come il passo 6 di ADR-0003.

## Moduli toccati

- `skills/harness-init/templates/AGENTS.md` e `AGENTS.md`: il fence con le chiavi
  fisse, e la prosa intorno che smette di essere letta da un programma.
- `skills/harness-init/templates/scripts/policy-lines.sh`: riscritto, legge il
  fence invece delle righe di prosa.
- `skills/harness-init/templates/scripts/tier.sh`: le tre chiamate a `policy`, le
  soglie dal blocco, il tier 3 quando il blocco non si legge.
- `skills/harness-init/templates/githooks/pre-commit` e `pre-push`: main chiuso
  quando il blocco non si legge.
- `skills/harness-init/templates/scripts/intent.sh`: `SECTIONS`, i messaggi, lo
  stop senza blocco.
- `skills/harness-init/templates/scripts/board.sh`: i titoli della schermata e le
  righe che non sono un titolo.
- `skills/harness-init/templates/docs/`: i cinque README, `codebase-map.md`,
  `inbox.md`; `skills/harness-init/templates/github/pull_request_template.md`;
  `skills/harness-init/templates/CLAUDE.md`.
- `skills/harness-init/SKILL.md`: la fase `local` che scrive e fonde il blocco.
- `skills/spec/templates/SPEC.md`: le otto sezioni.
- `skills/*/SKILL.md`: il frontmatter `description` di tutte e sei.
- `docs/spec.md`, `docs/codebase-map.md`, `AGENTS.md`, `CLAUDE.md`,
  `docs/inbox.md` e i cinque README di `docs/` di questo repo.
- `tests/architecture.test.ts`: il test nuovo; `tests/hooks.test.ts`,
  `tests/tier.test.ts`, `tests/intent.test.ts`, `tests/board.test.ts`: le fixture
  e le attese che oggi citano le etichette italiane.
- `docs/decisions/`: un ADR nuovo che dichiara il giorno del cambio.

## Fuori scope

Tradurre la storia: slice `done`, ADR, intent già scritti, review log. Da una
data in poi si scrive in inglese e un ADR lo dichiara. La lingua in cui un dev
parla agli agenti. i18n dell'output: una lingua sola, l'inglese. Il feedback dagli
altri repo e lo stamp dei template, che sono righe di inbox e vengono dopo.

Deciso qui: nessuna lettura doppia e nessuno script di migrazione, i repo montati
si rimontano a mano. Nessun innesco inglese tolto dalle skill. La lingua della
prosa di un repo che installa l'harness non la decide l'harness: il test sulla
lingua resta in questo repo.

## Domande aperte

Nessuna.

## Decisioni da confermare

1. Il contratto esce dalla prosa: `AGENTS.md` porta un blocco `json` in un fence
   con otto chiavi fisse, e nessuno script legge più una frase.
2. Niente lettura doppia e niente migrazione: un repo senza fence si ferma invece
   di degradare, `tier.sh` dà 3 e gli hook tengono main chiuso. Tipoff e Docket si
   rimontano con `/harness-init local`.
3. Le frasi d'innesco italiane escono dalle `description`: "vai" e "monta
   l'harness" smettono di funzionare, restano i comandi e le frasi inglesi.
4. Le due soglie di `tier.sh`, 200 righe e 8 file, entrano nel blocco e la prosa
   smette di nominarle.
5. L'inglese vale dal giorno in cui l'ADR atterra su main; la storia non si
   traduce e questa spec resta in italiano.

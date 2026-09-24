---
id: S25
title: Ogni slice di /next lavora in un worktree suo, e il verdetto sopravvive al worktree
status: done
blocked_by: none
tier: 2
human: false
spec: inbox (2026-09-16)
---

## Goal

`/next` lancia i subagent di un'onda in parallelo nello stesso working tree.
Ogni `git switch -c` di uno sposta la HEAD di tutti: nella prima run qui il
commit di S18 è finito sul branch di S19, un terzo subagent ha spostato la
HEAD su S20, e le modifiche non committate di ciascuno erano visibili e
committabili dagli altri. Uno si è salvato da solo con `git worktree add`.
Su Tipoff non si è visto perché le onde erano di due e i tempi non si sono
sovrapposti.

Da questa slice ogni slice di un'onda ha un worktree suo sotto
`.claude/worktrees/S<NN>`, il checkout condiviso resta sul ramo di default e
nessun subagent lo tocca. Il worktree sparisce all'hand-back, con la PR
mergiata o lasciata aperta, così `gh pr checkout <n>` dalla radice funziona e
la verifica a mano non entra in `.claude/worktrees/`. Il verdetto sta in
`$(git rev-parse --git-common-dir)/harness`, uno per clone: oggi
`--absolute-git-dir` dentro un worktree è `.git/worktrees/<nome>` e il
verdetto muore con il worktree, e `judge.sh finding` o `answer` dopo la PR
non trovano più niente.

## Acceptance criteria

- [ ] `judge.sh` archivia e legge i verdetti in `$(git rev-parse --git-common-dir)/harness`: un `check` fatto dentro un worktree e, tolto il worktree, `path`, `findings`, `have`, `finding` e `answer` con lo stesso branch nel checkout principale trovano lo stesso verdetto. Il commento in testa allo script dice "git common dir" e il perché.
- [ ] `ensure-verdict.sh` legge la head da `--head <branch>` quando `gh pr create` lo porta, altrimenti da `HEAD` come oggi: con la head nel worktree e il comando dalla radice l'hook giudica il branch giusto, e il test lo mostra nei due casi.
- [ ] La sezione 3 di `skills/next/SKILL.md`: l'orchestratore crea i worktree prima di lanciare l'onda, uno alla volta, `git worktree add .claude/worktrees/S<NN> -b slice/S<NN>-<slug> origin/<default>`, poi `pnpm install --frozen-lockfile --offline` dentro; il passo 1 del blocco al subagent diventa "lavora solo in `<path del worktree>`, il push del branch vuoto resta la presa in carico"; nessun comando del subagent gira nel checkout condiviso.
- [ ] Le sezioni 4 e 5: il giudice e `gh pr create --head slice/S<NN>-<slug>` girano dal worktree, `have` e `policy.sh` pure; la sezione 7 toglie il worktree con `git worktree remove` per ogni slice della run, mergiata, aperta o bloccata, e il branch resta.
- [ ] Il blocco al subagent dice che la prosa nominata in "Touchpoints", `docs/spec.md`, `docs/codebase-map.md`, uno `SKILL.md`, viaggia nel branch con il codice: il giudice legge i touchpoint della slice e la PR è il posto dove il cambiamento è intero. `skills/slice/SKILL.md` non scrive più "su main" accanto a un touchpoint.
- [ ] `/harness-init local` aggiunge `.claude/worktrees/` al `.gitignore` del repo se manca, con la riga in `skills/harness-init/SKILL.md` e nella tabella dei template; il `.gitignore` di questo repo la ha.
- [ ] La 4.4 e la 5.4 di `docs/spec.md` dicono il worktree, dove sta il verdetto e quando il worktree sparisce; "Cosa cambia" ha la riga e la versione sale. `docs/codebase-map.md` dice dove sta lo store.
- [ ] Suite, typecheck, format e build verdi.

## Test plan

- `tests/judge.test.ts`: un repo con un branch in un worktree, `check` da dentro, poi `git worktree remove` e `git switch` sul branch nel checkout principale: `path` stampa lo stesso file, `findings` lo legge, `answer` lo scrive. Un secondo caso: il verdetto di un branch fatto nel checkout principale si vede da un worktree dello stesso clone.
- `tests/hooks.test.ts`: `gh pr create --head slice/S03-x` con il verdetto sulla head di quel branch e il checkout su main passa; senza `--head` l'hook legge `HEAD` come prima, e un `--head` di un branch senza verdetto è rifiutato con il motivo.
- `tests/architecture.test.ts`: il `.gitignore` del repo ha `.claude/worktrees/`.
- Le sezioni delle skill sono prosa e non hanno test: la prova è la prossima run di `/next` con un'onda di due, qui.

## Touchpoints

- `skills/harness-init/templates/scripts/judge.sh`: `store_dir` e il commento in testa.
- `skills/harness-init/templates/scripts/ensure-verdict.sh`: la head da `--head`.
- `skills/harness-init/SKILL.md`, `skills/harness-init/templates/README.md`: la riga del `.gitignore`.
- `.gitignore`: la riga.
- `skills/next/SKILL.md`: le sezioni 3, 4, 5 e 7, e il blocco al subagent.
- `skills/slice/SKILL.md`: la riga sui touchpoint.
- `docs/spec.md`: 4.4, 5.4, "Cosa cambia", versione. `docs/codebase-map.md`: lo store.
- `tests/judge.test.ts`, `tests/hooks.test.ts`, `tests/architecture.test.ts`.

## Notes

Dalle tre righe di inbox del 16 settembre: il worktree per slice, il worktree
che sparisce, il verdetto nella git dir comune. Sono una cosa sola perché la
seconda e la terza esistono solo con la prima.

Il worktree lo fa l'orchestratore e non il subagent: la corsa sta nel primo
`git switch` fatto da tre subagent sullo stesso checkout, e un `worktree add`
in sequenza dall'orchestratore la chiude prima che parta. `isolation:
worktree` dell'Agent tool farebbe un worktree a subagent, ma il giudice deve
entrare nello stesso worktree del coder e il path lo deve conoscere
l'orchestratore.

Il worktree resta finché la PR non è mergiata o la run non passa avanti, non
sparisce a PR aperta: `have` e `policy.sh` leggono `HEAD` e girano dopo la CI,
che dura minuti. Il dev che verifica a mano arriva dopo l'hand-back, quando
il worktree non c'è più e `gh pr checkout <n>` dalla radice funziona.

Questa slice condivide `skills/next/SKILL.md` e `docs/spec.md` con S24 e
partirebbe nella stessa onda di S21 e S24, senza worktree: si lancia da sola,
`/next S25`, e "vai" dopo il suo merge.

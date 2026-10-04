## Problema

Ogni sessione a freddo su questo repo ricostruisce la board a mano: un grep sui frontmatter delle slice, `gh pr list`, l'inbox riga per riga, l'ordine di lavoro dell'ADR incrociato con `git log` per sapere a che passo sta il piano. Il 15 settembre, per scegliere fra due raccomandazioni difendibili, sono servite quattro fonti in quattro posti, e la sessione non ha visto che S05-S08 aspettavano proprio la skill che mancava: quattro slice ferme per la stessa ragione, due dette `blocked` e due `todo`.

## Cosa vuol dire riuscire

Una sessione a freddo parte da `/board` e senza grep vede in una schermata slice per stato, PR aperte per tier ed esito del giudice, cosa aspetta un umano, il passo corrente del piano con un segno quando il backlog è andato oltre, le righe di inbox aperte; la board propone la prossima azione con una riga di motivo e per ogni riga di inbox fa una domanda, scrivendo solo lì con il sì.

## Fuori scope

Docket e la vista di calibrazione. `/audit`. Le Issues come board. La vista HTML interattiva della roadmap, che viene dopo e legge gli stessi file di `/board`: la spec decide il modello dei dati sapendo che i lettori sono due. Il frontmatter delle slice si tocca solo se la spec lo decide.

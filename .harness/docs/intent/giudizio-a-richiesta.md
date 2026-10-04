## Problema

La catena giudica ogni ci verde, quindi ogni push su una PR aperta è un giudizio nuovo a prezzo pieno, che io abbia riscritto uno script o corretto una virgola. In precedenza si è già pagato due giri sullo stesso diff. Per saltare un giro ho dovuto lasciare `needs-human`, che porta la PR a tier 3 per non pagare. Il primo giudizio su una PR invece si ripaga sempre, e quel giorno ha trovato tre cose che l'agente aveva scritto e riletto senza vederle.

## Cosa vuol dire riuscire

Il giudizio parte da solo al primo ci verde di una PR e non riparte da solo sui giri dopo, tranne a tier 1 dove è il verdetto a sbloccare l'automerge; per farlo ripartire si mette la label `judge:again`, che il workflow toglie dopo aver girato, e nessuna PR deve più cambiare tier per non essere giudicata.

## Fuori scope

Quanti giudici girano a tier 2. La scelta del modello per giro. Le soglie dell'audit. Il fixer.

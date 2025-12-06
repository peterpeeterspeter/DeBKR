# Pro UX richtlijnen

Doel: aannemers/installateurs helpen met snelle validatie, betrouwbare data-invoer en duidelijke verwachtingen richting klant.

## Validatieflow (verplicht)
- Toon AI-inschatting (leidingen/afvoer/fixtures) op 2D overlay.
- Gebruiker/pro bevestigt of corrigeert posities en afmetingen; sla overrides op.
- Vraag expliciet om maatvoering (breedte/diepte/hoogte) en deur-/raamposities.
- Flag onzekerheden: vraag extra foto's of LiDAR-scan bij lage confidence.

## Scenario’s voor calculatie
- Light: cosmetisch (tegels, sanitair vervangen, geen leidingverlegging).
- Mid: beperkte verlegging (≤1.5 m) + nieuwe douche/toiletposities.
- Full: vrij verleggen, elektra/ventilatie aanpassen; voeg 15–25% buffer toe.

## Disclaimers (altijd tonen)
- “Indicatieve offerte; verborgen constructies onbekend (leidingen, balken, vloerverwarming).”
- “Prijzen onder voorbehoud van现场-inspectie; arbeidsuren zijn schattingen.”
- “AI kan geen röntgen; finale goedkeuring door vakman vereist.”
- “Afwijkingen in vloerhaaksheid/wandvlakheid kunnen meerwerk veroorzaken.”

## Transparantie in kosten
- Splits materiaal vs. arbeid vs. onvoorzien.
- Toon gebruikte tarieven en regio-opslag (zie `data/mock/pricing.json`).
- Koppel producten in beeldrender direct aan catalogus-ID’s uit de offerte.

## Handige UX-elementen
- Inline risico-banner bij lage confidence of grote verleggingen.
- Edit-historie van aanpassingen (wie, wanneer).
- Export: PDF/Excel met werkplan + hoeveelheden + productlijst.
- Contactactie: “Vraag site-inspectie aan” knop bij high-risk scenario.


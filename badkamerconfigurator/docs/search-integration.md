# Integratie van Search-suggesties in selectieflow

## Flow
1) User vraagt suggesties (categorie/prijs/stijl). Call Gemini 3 Search tool (zie `ai/search_suggestions.py`).
2) Normaliseer hits naar schema (product_id, name, price_eur?, image_url, url, category?, style_tags, source=search).
3) Toon in UI als “suggested products”; niet automatisch toevoegen.
4) User selecteert expliciet. Voeg geselecteerde suggesties toe aan AfterState.products/reference_images (1 beeld per product) en respecteer 14-limit samen met room photo.
5) (Optioneel) Sla geaccepteerde suggesties op in lokale catalogus met source=search voor reproduceerbaarheid.

## Beeldlimiet
- Houd 1 key image per suggestie; totaal ≤ 14 (room photo + producten).

## Prijzen/zekerheid
- Behandel prijzen uit search als indicatief; toon bron-URL; laat user/admin bevestigen.
- Geen auto-prijs in backend zonder confirm.

## Fallback
- Als search faalt of weinig hits geeft, val terug op eigen catalogusfiltering. User blijft beslisser.



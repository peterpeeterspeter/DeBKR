# Search-grounding (Gemini 3) voor product-suggesties

## Doel
- Gebruik Google Search grounding om actuele product-suggesties te krijgen (bijv. badkamermeubels), maar houd eigen catalogus als bron van waarheid.
- Toon resultaten als “suggested”; user moet expliciet kiezen.

## Veiligheid en kosten
- Search-grounding heeft extra kosten/latency. Gebruik alleen voor discovery/prijscheck.
- Laat nooit ongeverifieerde prijzen of producten automatisch opnemen; altijd user-confirm.
- Beperk output (3-5 hits) en velden (naam, prijs, image_url, link).

## Prompt / toolconfig (concept)
- Model: `gemini-3-pro-preview`
- Thinking: `thinking_level="low"` voor snelheid, of `high` als betere selectie nodig is.
- Tools: enable `google_search`.
- Vraag: “Zoek 3-5 moderne matte badkamermeubels < €800 in Vlaanderen. Geef productnaam, ruwe prijs in EUR, image URL, landingspagina URL, kleur/finish.”

## Normalisatie naar schema
- Map elke hit naar:
  - `product_id`: hash of URL
  - `name`
  - `category`: uit prompt/context bepalen (bv. `washbasin`, `toilet`, `shower`, `accessory`)
  - `price_eur`: parsed number (if present)
  - `image_url`
  - `style_tags`: simple tags uit prompt (bv. modern, matte)
  - `source`: "search"
- Bewaar alleen deze velden; geen auto-prijsafspraken.

## UI gedrag
- Toon als “suggested products” apart van je eigen catalogus-items.
- Laat user expliciet selecteren om in AfterState te komen.
- Beeldlimiet: kies max 1 image per suggestie; samen met room photo ≤ 14.

## Integratie flow
- Aanroep search → normaliseer → append aan suggestieslijst → UI toont → user kiest → voeg toe aan AfterState.products/reference_images.
- Optioneel: sla geaccepteerde suggesties op in lokale catalogus (bron=search) voor reproduceerbaarheid.


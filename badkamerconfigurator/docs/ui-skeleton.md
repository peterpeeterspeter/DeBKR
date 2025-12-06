# UI skeleton (React/Next)

Doel: basis-UI voor catalogusfilters/selectie, 14-beelden teller, fit-check warnings, max 5 varianten.

## Schermen/secties
- Cataloguslijst met filters: category, style_tags, prijsrange, color, finish.
- Productselectie per categorie; toon teller voor resterende beeldslots (14-limit).
- Fit-check waarschuwingen (na selectie) op basis van anchors/clearances.
- Variantbeheer: toon bestaande varianten en blokkeer >5.

## Componenten (voorstel)
- `CatalogFilters`: inputs voor category, style_tags (multi), price min/max, color, finish.
- `ProductGrid`: kaartjes met beeld, naam, prijs; checkbox/select button.
- `SelectionSummary`: gekozen producten per categorie + beeldslot teller.
- `FitWarnings`: lijst met waarschuwingen uit `check_fit`.
- `VariantList`: overzicht varianten (after images) en teller (max 5).

## Dataflow (mock)
- Haal catalogus uit `data/mock/catalog.json` (later Supabase).
- Filters toepassen client-side (gebruik `ai/catalog.filter_catalog` logica als referentie).
- Na selectie: bouw `AfterState.products` + `reference_images` (gebruik `after_state_builder` in backend).
- Fit-check: gebruik anchors + maten → `check_fit` (backend); toon warnings.
- Variants: beheer lijst in state; blokkeer toevoegen als lengte >=5.

## Eventuele API-stubs
- GET /api/catalog (mock data)
- POST /api/selection → returns products + reference_images + warnings
- GET /api/variants → lijst bestaande varianten (mock)

## UX regels
- Toon duidelijk resterende beeldslots (14 - 1 room - gekozen producten).
- Forceer verplichte categorieën (toilet, washbasin, shower, tiles) of markeer als required.
- Bij fit-warnings: vraag gebruiker om bevestiging of herselectie.


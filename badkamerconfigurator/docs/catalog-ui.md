# Catalogus UI & selectie (hard filters, geen RAG)

## Filters
- category (whitelist: floor_tile, wall_tile, toilet, washbasin, shower, bathtub, radiator, lighting, accessory)
- style_tags (intersect)
- prijsrange (min/max)
- color / finish

## Stroom
1) Load catalog (JSON of Supabase tabel) in de UI.
2) Hard filters toepassen (geen embeddings).
3) Gebruiker kiest expliciet per categorie (product_id’s).
4) Bouw AfterState.products en reference_images:
   - Gebruik per product 1 key image (image_path of image_url).
   - Max 14 beelden totaal voor Gemini (1 room + ≤13 producten).

## Helpers (Python)
- `ai/catalog.py`
  - `load_catalog(path)`
  - `filter_catalog(items, category, style_tags, price_min, price_max, color, finish)`
  - `build_selection_payload(catalog_items, selected_product_ids, room_image_path)` → (products_by_category, product_image_paths)
- `ai/after_state_builder.py`
  - `build_after_state_from_selection(...)` → AfterState + reference_images (begrensd tot 14)

## UI hints
- Toon kaartjes met productbeeld, prijs, kleur/finish, formaat.
- Forceer keuze per verplichte categorie (bv. toilet/wastafel/douche/tegels).
- Toon teller van resterende beeldslots (14-limiet).

## Opslag
- Productbeelden: Supabase Storage `catalog-images/{product_id}.jpg`.
- Projectbeelden: `project-images/{project_id}/{variant}.jpg`.



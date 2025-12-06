# Catalog ingest (Supabase + Storage)

## CSV vereisten
Verplichte kolommen:
- `product_id`
- `name`
- `category` (whitelist: floor_tile, wall_tile, toilet, washbasin, shower, bathtub, radiator, lighting, accessory)
- `price_eur`
- `image_url`

Optioneel:
- `style_tags` (comma-separated)
- `color`, `finish`, `material`
- `width_cm`, `height_cm`, `depth_cm`, `thickness_cm`
- `unit_type` (per_unit | per_m2; default per_unit)
- `installation_notes`

## Supabase setup
- Tabel `catalog_items` (zie `docs/supabase-schema.sql`)
- Storage buckets: `catalog-images` (product key images)
- Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (of ANON voor lezen)

## Ingest script
```
python scripts/ingest_catalog_supabase.py catalog.csv --bucket catalog-images
```
- Valideert verplichte velden + category + unit_type
- Upsert naar `catalog_items` op `product_id`
- Download `image_url` en upload naar Storage (overslaan met `--skip-upload`)
- Schrijft `image_path` in de tabel

## Beelden (14-limit)
- Gebruik per product 1 key image (geüpload naar `catalog-images/{product_id}.jpg`).
- Voor Gemini Image: max 14 beelden totaal (1 room photo + tot 13 productbeelden).

## Storage paden
- Catalog: `catalog-images/{product_id}.jpg`
- Project images: `project-images/{project_id}/{variant}.jpg` (after/variant)

## Fallback
- Als upload faalt, controleer URL of sla `--skip-upload` over om alleen data te laden en upload later.


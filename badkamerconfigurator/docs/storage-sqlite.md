# Local storage (SQLite, no network)

## Files
- `local.db`: SQLite database (created on ingest/init)
- Schema: `db/schema.sql`
- Helpers: `ai/db.py`
- Ingest: `scripts/ingest_catalog_sqlite.py`

## Init
```
python -c "from ai.db import init_db; init_db()"
```
of implicit via ingest script.

## Catalog ingest (CSV)
```
python scripts/ingest_catalog_sqlite.py catalog.csv --db local.db --schema db/schema.sql
```
- Vereist kolommen: product_id, name, category, price_eur, image_url
- Whitelist categorieën: floor_tile, wall_tile, toilet, washbasin, shower, bathtub, radiator, lighting, accessory
- Schrijft naar tabel `catalog_items`.

## Queryen in code
```python
from ai.db import fetch_catalog
items = fetch_catalog()  # lijst dicts
```

## Tabellen (kern)
- `catalog_items`: producten + image_path/price/etc
- `projects`, `before_states`, `after_states`, `work_plans`, `pricing_generated`, `images`, `approvals`

## Niet in git
- Voeg `local.db` toe aan `.gitignore` als je deze in repo laat staan.


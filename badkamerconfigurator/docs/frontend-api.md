# Frontend → Local API (SQLite backend)

## Endpoints (Flask, `python server/api.py`)
- `GET /api/catalog`  
  Response: lijst catalog items uit `local.db`.

- `POST /api/selection`  
  Body:
  ```json
  {
    "selected_ids": ["TILE-FLR-001", "..."],
    "room_image_path": "path/to/room.jpg",
    "anchors": { "toilet": {...}, "room_width_cm": 200, "room_depth_cm": 300 },
    "style": {...},
    "constraints": {...},
    "render_intent": {...}
  }
  ```
  Response:
  ```json
  {
    "after_state": {...},
    "reference_images": ["room.jpg", "product1.jpg", ...],
    "fit_warnings": ["..."]
  }
  ```

- `POST /api/pricing`  
  Body:
  ```json
  {
    "work_plan": {...},
    "region": "vlaanderen",
    "custom_multiplier": 1.0
  }
  ```
  Response:
  ```json
  { "costs": {...} }
  ```

## Next.js fetch voorbeeld (TypeScript, client-side)
```ts
type CatalogItem = { product_id: string; name: string; category: string; price_eur?: number; image_path?: string; image_url?: string; };

export async function fetchCatalog(): Promise<CatalogItem[]> {
  const res = await fetch("/api/catalog");
  if (!res.ok) throw new Error("Catalog fetch failed");
  return res.json();
}

export async function postSelection(body: any) {
  const res = await fetch("/api/selection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Selection failed");
  return res.json(); // { after_state, reference_images, fit_warnings }
}

export async function postPricing(body: any) {
  const res = await fetch("/api/pricing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Pricing failed");
  return res.json(); // { costs }
}
```

## UI-koppeling
- Catalogus: gebruik `fetchCatalog()` om lijst te renderen; filters client-side.
- Selectie: stuur `selected_ids`, anchors, style/constraints/render_intent naar `postSelection`; toon fit_warnings; bewaar `after_state` en `reference_images`.
- Prijs: stuur WorkPlan naar `postPricing` met regio/multiplier; toon breakdown.

## Mock run
- Start API: `python server/api.py` (init DB bij first request).
- Ingest mock catalog: `python scripts/ingest_catalog_sqlite.py data/mock/catalog.json`.


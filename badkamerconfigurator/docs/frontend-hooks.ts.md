# Next/React fetch helpers (lokale API)

```ts
// utils/api.ts
export type CatalogItem = {
  product_id: string;
  name: string;
  category: string;
  price_eur?: number;
  image_path?: string;
  image_url?: string;
};

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
  return res.json() as Promise<{
    after_state: any;
    reference_images: string[];
    fit_warnings: string[];
  }>;
}

export async function postPricing(body: any) {
  const res = await fetch("/api/pricing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Pricing failed");
  return res.json() as Promise<{ costs: any }>;
}
```

## Voorbeeldpagina (Next, serverless route proxies door naar Flask)
```tsx
// app/catalog-demo/page.tsx (React client component)
"use client";
import { useEffect, useState } from "react";
import { fetchCatalog, postSelection, postPricing, CatalogItem } from "../utils/api";

export default function CatalogDemo() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [afterState, setAfterState] = useState<any>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [costs, setCosts] = useState<any>(null);

  useEffect(() => {
    fetchCatalog().then(setItems).catch(console.error);
  }, []);

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelection = async () => {
    const body = {
      selected_ids: selectedIds,
      room_image_path: "room_before.jpg",
      anchors: {
        room_width_cm: 250,
        room_depth_cm: 300,
        toilet: { position: "back-right", x: 180, y: 200, width: 36, depth: 54, clearance_front: 60, clearance_side: 20 },
        washbasin: { position: "left", x: 20, y: 120, width: 100, depth: 46, clearance_front: 70, clearance_side: 10 },
        shower: { position: "right", x: 140, y: 20, width: 120, depth: 90, clearance_front: 80 },
      },
      style: { name: "scandinavian" },
      constraints: { keep_walls: true, keep_openings: true },
      render_intent: { resolution: "1080p", aspect_ratio: "4:3", preserve_structure: true, num_variations: 1 },
    };
    const res = await postSelection(body);
    setAfterState(res.after_state);
    setWarnings(res.fit_warnings);
  };

  const handlePricing = async () => {
    // Dummy WorkPlan
    const work_plan = {
      phases: [
        {
          phase: 1,
          name: "Install",
          tasks: [
            { task: "Vloertegels leggen", category: "tiling", quantity: 12, unit: "m2" },
            { task: "Wandtegels plaatsen", category: "tiling", quantity: 18, unit: "m2" },
            { task: "Hangtoilet plaatsen", category: "sanitary_install", quantity: 1, unit: "pcs" },
          ],
        },
      ],
      total_estimated_hours: 40,
    };
    const res = await postPricing({ work_plan, region: "vlaanderen", custom_multiplier: 1.0 });
    setCosts(res.costs);
  };

  return (
    <div>
      <h1>Catalog demo</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {items.map((p) => (
          <div key={p.product_id} style={{ border: "1px solid #ccc", padding: 8 }}>
            <div>{p.name}</div>
            <div>{p.category}</div>
            <div>€{p.price_eur ?? "-"}</div>
            <button onClick={() => toggle(p.product_id)}>
              {selectedIds.includes(p.product_id) ? "Deselect" : "Select"}
            </button>
          </div>
        ))}
      </div>
      <button onClick={handleSelection} disabled={!selectedIds.length}>Run selection</button>
      <button onClick={handlePricing} disabled={!afterState}>Calc pricing</button>
      {warnings.length > 0 && (
        <div>
          <h3>Fit warnings</h3>
          <ul>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      )}
      {afterState && <pre>{JSON.stringify(afterState, null, 2)}</pre>}
      {costs && <pre>{JSON.stringify(costs, null, 2)}</pre>}
    </div>
  );
}
```

## Opmerking
- Deze voorbeeld-API verwacht dat je Next server `/api/*` proxyt naar de Flask server (port 5001). In dev kun je dit via `next.config.js` rewrites of handmatig fetchen met absolute URL (`http://localhost:5001/api/...`). Pas aan naar jouw setup.
```


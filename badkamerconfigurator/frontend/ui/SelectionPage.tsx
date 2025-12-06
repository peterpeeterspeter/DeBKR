"use client";

import { useEffect, useMemo, useState } from "react";
import { CatalogItem, fetchCatalog, postSelection, postPricing } from "./api";

type Anchor = {
  position?: string;
  x?: number;
  y?: number;
  width?: number;
  depth?: number;
  height?: number;
  clearance_front?: number;
  clearance_side?: number;
};

export default function SelectionPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [afterState, setAfterState] = useState<any>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [costs, setCosts] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCatalog().then(setItems).catch(console.error);
  }, []);

  const remainingImageSlots = useMemo(() => {
    // 14 total - 1 room photo - selected products
    return 13 - selectedIds.length;
  }, [selectedIds.length]);

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelection = async () => {
    setLoading(true);
    try {
      const anchors: Record<string, Anchor> = {
        room_width_cm: 250 as any,
        room_depth_cm: 300 as any,
        toilet: { position: "back-right", x: 180, y: 200, width: 36, depth: 54, clearance_front: 60, clearance_side: 20 },
        washbasin: { position: "left", x: 20, y: 120, width: 100, depth: 46, clearance_front: 70, clearance_side: 10 },
        shower: { position: "right", x: 140, y: 20, width: 120, depth: 90, clearance_front: 80 },
        lighting: { position: "ceiling", x: 125, y: 150, width: 10, depth: 10 },
      };
      const body = {
        selected_ids: selectedIds,
        room_image_path: "room_before.jpg",
        anchors,
        style: { name: "scandinavian" },
        constraints: { keep_walls: true, keep_openings: true },
        render_intent: { resolution: "1080p", aspect_ratio: "4:3", preserve_structure: true, num_variations: 1 },
      };
      const res = await postSelection(body);
      setAfterState(res.after_state);
      setWarnings(res.fit_warnings);
    } finally {
      setLoading(false);
    }
  };

  const handlePricing = async () => {
    if (!afterState) return;
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      <h1>Badkamer configurator (selectie + fit + pricing)</h1>
      <p>Beeldslots over (max 14, 1 room + producten): {remainingImageSlots}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
        {items.map((p) => (
          <div key={p.product_id} style={{ border: "1px solid #ccc", padding: 8 }}>
            <div><strong>{p.name}</strong></div>
            <div>{p.category}</div>
            <div>€{p.price_eur ?? "-"}</div>
            <button onClick={() => toggle(p.product_id)}>
              {selectedIds.includes(p.product_id) ? "Deselect" : "Select"}
            </button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button onClick={handleSelection} disabled={!selectedIds.length || loading}>Run selection</button>
        <button onClick={handlePricing} disabled={!afterState || loading}>Calc pricing</button>
      </div>
      {warnings.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3>Fit warnings</h3>
          <ul>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      )}
      {afterState && (
        <details style={{ marginTop: 16 }}>
          <summary>AfterState</summary>
          <pre>{JSON.stringify(afterState, null, 2)}</pre>
        </details>
      )}
      {costs && (
        <details style={{ marginTop: 16 }}>
          <summary>Pricing</summary>
          <pre>{JSON.stringify(costs, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}



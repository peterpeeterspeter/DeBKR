"use client";

import { useState } from "react";

type BeforeResponse = {
  before_state: any;
  anchors: any;
};

export default function IntakePage() {
  const [orientationHint, setOrientationHint] = useState("front=door");
  const [dims, setDims] = useState({ width: 240, depth: 300, height: 250 });
  const [imagePath, setImagePath] = useState("room_before.jpg"); // placeholder path
  const [before, setBefore] = useState<BeforeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/before", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orientation_hint: orientationHint,
          image_path: imagePath,
          dimensions_cm: dims,
        }),
      });
      if (!res.ok) throw new Error("Before call failed");
      const data = (await res.json()) as BeforeResponse;
      setBefore(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Intake / Before (mock)</h1>
      <div style={{ display: "grid", gap: 8, maxWidth: 320 }}>
        <label>
          Orientation hint
          <input
            value={orientationHint}
            onChange={(e) => setOrientationHint(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
        <label>
          Image path (placeholder)
          <input value={imagePath} onChange={(e) => setImagePath(e.target.value)} style={{ width: "100%" }} />
        </label>
        <label>
          Width (cm)
          <input
            type="number"
            value={dims.width}
            onChange={(e) => setDims({ ...dims, width: Number(e.target.value) })}
            style={{ width: "100%" }}
          />
        </label>
        <label>
          Depth (cm)
          <input
            type="number"
            value={dims.depth}
            onChange={(e) => setDims({ ...dims, depth: Number(e.target.value) })}
            style={{ width: "100%" }}
          />
        </label>
        <label>
          Height (cm)
          <input
            type="number"
            value={dims.height}
            onChange={(e) => setDims({ ...dims, height: Number(e.target.value) })}
            style={{ width: "100%" }}
          />
        </label>
      </div>
      <button onClick={submit} disabled={loading} style={{ marginTop: 12 }}>
        {loading ? "Loading..." : "Analyse (mock)"}
      </button>
      {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
      {before && (
        <div style={{ marginTop: 16 }}>
          <h3>BeforeState (mock)</h3>
          <pre>{JSON.stringify(before.before_state, null, 2)}</pre>
          <h3>Anchors (mock)</h3>
          <pre>{JSON.stringify(before.anchors, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}


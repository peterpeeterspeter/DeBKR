export type CatalogItem = {
  product_id: string;
  name: string;
  category: string;
  price_eur?: number;
  image_path?: string;
  image_url?: string;
};

export type SelectionResponse = {
  after_state: any;
  reference_images: string[];
  fit_warnings: string[];
};

export type PricingResponse = {
  costs: any;
};

const BASE = ""; // e.g. "" when Next proxies /api to backend, or "http://localhost:5001"

export async function fetchCatalog(): Promise<CatalogItem[]> {
  const res = await fetch(`${BASE}/api/catalog`);
  if (!res.ok) throw new Error("Catalog fetch failed");
  return res.json();
}

export async function postSelection(body: any): Promise<SelectionResponse> {
  const res = await fetch(`${BASE}/api/selection`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Selection failed");
  return res.json();
}

export async function postPricing(body: any): Promise<PricingResponse> {
  const res = await fetch(`${BASE}/api/pricing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Pricing failed");
  return res.json();
}


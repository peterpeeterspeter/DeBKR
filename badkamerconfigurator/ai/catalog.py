from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

VALID_CATEGORIES = {
    "floor_tile",
    "wall_tile",
    "toilet",
    "washbasin",
    "shower",
    "bathtub",
    "radiator",
    "lighting",
    "accessory",
}


def load_catalog(path: Path) -> List[Dict[str, Any]]:
    """Load catalog JSON (array of products)."""
    import json

    with Path(path).open("r", encoding="utf-8") as f:
        return json.load(f)


def filter_catalog(
    items: List[Dict[str, Any]],
    category: Optional[str] = None,
    style_tags: Optional[List[str]] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    color: Optional[str] = None,
    finish: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Simple hard filters; no embeddings."""
    def match(item: Dict[str, Any]) -> bool:
        if category and item.get("category") != category:
            return False
        if style_tags:
            its = set((item.get("style_tags") or []))
            if not its.intersection(style_tags):
                return False
        price = item.get("price_eur")
        if price_min is not None and (price is None or price < price_min):
            return False
        if price_max is not None and (price is None or price > price_max):
            return False
        if color and item.get("color") != color:
            return False
        if finish and item.get("finish") != finish:
            return False
        return True

    return [it for it in items if match(it)]


def build_selection_payload(
    catalog_items: List[Dict[str, Any]],
    selected_product_ids: List[str],
    room_image_path: str,
) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, str]]:
    """
    Map user-selected IDs to AfterState.products and image paths.
    Returns (products_by_category, product_image_paths).
    """
    by_id = {p["id"] if "id" in p else p["product_id"]: p for p in catalog_items}
    products_by_category: Dict[str, Dict[str, Any]] = {}
    product_image_paths: Dict[str, str] = {}

    for pid in selected_product_ids:
        if pid not in by_id:
            raise ValueError(f"Product not found: {pid}")
        item = by_id[pid]
        cat = item.get("category")
        if cat not in VALID_CATEGORIES:
            raise ValueError(f"Invalid category for {pid}: {cat}")
        products_by_category.setdefault(cat, {})
        products_by_category[cat] = {
            "product_id": pid,
            "variant": item.get("variant"),
            "quantity": item.get("quantity") or 1,
            "price_eur": item.get("price_eur"),
        }
        image_path = item.get("image_path") or item.get("image_url")
        if image_path:
            product_image_paths[pid] = image_path

    # ensure room image first in usage; returned separately by after_state_builder
    return products_by_category, product_image_paths


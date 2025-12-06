from __future__ import annotations

from typing import Any, Dict, List, Tuple


def check_fit(
    room_width_cm: float,
    room_depth_cm: float,
    fixture_clearances: List[Dict[str, Any]],
) -> List[str]:
    """
    Validate basic fit/clearance rules.
    Each fixture dict: {"name": str, "width": cm, "depth": cm, "x": cm, "y": cm, "clearance_front": cm, "clearance_side": cm}
    Returns list of warnings.
    """
    warnings: List[str] = []
    for fx in fixture_clearances:
        name = fx.get("name", "fixture")
        w = fx.get("width", 0)
        d = fx.get("depth", 0)
        x = fx.get("x", 0)
        y = fx.get("y", 0)
        cf = fx.get("clearance_front", 0)
        cs = fx.get("clearance_side", 0)

        if x + w + cs > room_width_cm:
            warnings.append(f"{name}: overschrijdt breedte (x + width + side clearance).")
        if y + d + cf > room_depth_cm:
            warnings.append(f"{name}: overschrijdt diepte (y + depth + front clearance).")
        if w <= 0 or d <= 0:
            warnings.append(f"{name}: ontbrekende maatvoering.")
    return warnings


def apply_layout(anchors: Dict[str, Dict[str, Any]], selections: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """
    Combine floorplan anchors (positions) with selected products into AfterState.layout.fixtures.
    anchors: {category: {position: str, x: cm, y: cm, width: cm, depth: cm}}
    selections: AfterState products mapping {category: {product_id, ...}}
    """
    layout = {"fixtures": {}}
    for cat, anchor in anchors.items():
        if cat not in selections:
            continue
        layout["fixtures"][cat] = {
            "product_id": selections[cat]["product_id"],
            "position": anchor.get("position"),
            "mount_type": anchor.get("mount_type"),
            "size_cm": {
                "width": anchor.get("width"),
                "depth": anchor.get("depth"),
                "height": anchor.get("height"),
            },
            "coordinates_cm": {"x": anchor.get("x"), "y": anchor.get("y")},
            "clearances_cm": {
                "front": anchor.get("clearance_front"),
                "side": anchor.get("clearance_side"),
            },
        }
    return layout



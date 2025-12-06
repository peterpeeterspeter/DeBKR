#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

from ai.db import init_db
from ai.catalog import build_selection_payload
from ai.after_state_builder import build_after_state_from_selection
from ai.layout import apply_layout, check_fit
from ai.pricing import price_work_plan
from ai.models import WorkPlan, Phase, Task
from ai.db import fetch_catalog


def main():
    # Init DB and ensure mock catalog is ingested (run ingest script beforehand if needed)
    init_db()
    catalog = fetch_catalog()
    if not catalog:
        print("Catalog is empty; run ingest_catalog_sqlite.py first.")
        return

    # Example selection: pick a few known IDs from mock data
    selected_ids = ["TILE-FLR-001", "TILE-WALL-002", "WC-SET-101", "BASIN-202", "SHOWER-303", "LIGHT-404"]
    room_image_path = "room_before.jpg"  # placeholder path

    # Mock anchors and room size
    anchors = {
        "room_width_cm": 250,
        "room_depth_cm": 300,
        "toilet": {"position": "back-right", "x": 180, "y": 200, "width": 36, "depth": 54, "clearance_front": 60, "clearance_side": 20},
        "washbasin": {"position": "left", "x": 20, "y": 120, "width": 100, "depth": 46, "clearance_front": 70, "clearance_side": 10},
        "shower": {"position": "right", "x": 140, "y": 20, "width": 120, "depth": 90, "clearance_front": 80, "clearance_side": 0},
        "lighting": {"position": "ceiling", "x": 125, "y": 150, "width": 10, "depth": 10},
    }

    style = {"name": "scandinavian", "color_palette": ["white", "oak"]}
    constraints = {"keep_walls": True, "keep_openings": True}
    render_intent = {"resolution": "1080p", "aspect_ratio": "4:3", "preserve_structure": True, "num_variations": 1}

    products_by_category, product_image_paths = build_selection_payload(catalog, selected_ids, room_image_path)
    layout = apply_layout(anchors, products_by_category)
    after_state, reference_images = build_after_state_from_selection(
        products_by_category=products_by_category,
        layout=layout,
        style=style,
        structural_constraints=constraints,
        render_intent=render_intent,
        room_image_path=room_image_path,
        product_image_paths=product_image_paths,
    )

    fixture_clearances = []
    for cat, fx in anchors.items():
        if cat.startswith("room_"):
            continue
        fixture_clearances.append(
            {
                "name": cat,
                "width": fx.get("width"),
                "depth": fx.get("depth"),
                "x": fx.get("x"),
                "y": fx.get("y"),
                "clearance_front": fx.get("clearance_front", 0),
                "clearance_side": fx.get("clearance_side", 0),
            }
        )
    warnings = check_fit(
        anchors.get("room_width_cm", 0) or 0,
        anchors.get("room_depth_cm", 0) or 0,
        fixture_clearances,
    )

    # Dummy WorkPlan for pricing demo
    wp = WorkPlan(
        phases=[
            Phase(
                phase=1,
                name="Tegels & sanitair",
                tasks=[
                    Task(task="Vloertegels leggen", category="tiling", quantity=12, unit="m2"),
                    Task(task="Wandtegels plaatsen", category="tiling", quantity=18, unit="m2"),
                    Task(task="Hangtoilet plaatsen", category="sanitary_install", quantity=1, unit="pcs"),
                    Task(task="Wastafelmeubel plaatsen", category="sanitary_install", quantity=1, unit="pcs"),
                    Task(task="Inloopdouche plaatsen", category="sanitary_install", quantity=1, unit="pcs"),
                ],
            )
        ],
        total_estimated_hours=40,
    )

    pricing_table = json.loads(Path("data/mock/pricing.json").read_text())
    costs = price_work_plan(wp, pricing_table, region="vlaanderen", materials_total=0)

    print("AfterState:")
    print(json.dumps(after_state.model_dump(), indent=2, ensure_ascii=False))
    print("\nReference images (max 14):", reference_images)
    print("\nFit warnings:", warnings)
    print("\nCosts:", costs)


if __name__ == "__main__":
    main()


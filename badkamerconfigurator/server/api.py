from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from flask import Flask, jsonify, request

from ai.db import fetch_catalog, init_db
from ai.layout import check_fit, apply_layout
from ai.after_state_builder import build_after_state_from_selection
from ai.catalog import build_selection_payload
from ai.pricing import price_work_plan
from ai.models import WorkPlan
from ai.image_generation import generate_after_image
from ai.before import analyze_before

app = Flask(__name__)


@app.before_first_request
def _init_db() -> None:
    init_db()


@app.get("/api/catalog")
def get_catalog():
    return jsonify(fetch_catalog())


@app.post("/api/selection")
def post_selection():
    """
    Body:
    {
      "selected_ids": [...],
      "room_image_path": "...",
      "anchors": {...},
      "style": {...},
      "constraints": {...},
      "render_intent": {...}
    }
    """
    data = request.get_json(force=True)
    selected_ids = data.get("selected_ids", [])
    room_image_path = data.get("room_image_path", "")
    anchors = data.get("anchors", {})
    style = data.get("style", {})
    constraints = data.get("constraints", {})
    render_intent = data.get("render_intent", {})
    # load catalog from db
    catalog_items = fetch_catalog()
    products_by_category, product_image_paths = build_selection_payload(
        catalog_items, selected_ids, room_image_path
    )
    layout = apply_layout(anchors, products_by_category)

    # build AfterState and reference images (14-limit handled in builder)
    after_state, reference_images = build_after_state_from_selection(
        products_by_category=products_by_category,
        layout=layout,
        style=style,
        structural_constraints=constraints,
        render_intent=render_intent,
        room_image_path=room_image_path,
        product_image_paths=product_image_paths,
    )

    # Fit-check warnings
    fixture_clearances = []
    for cat, fx in anchors.items():
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

    return jsonify(
        {
            "after_state": after_state.model_dump(),
            "reference_images": reference_images,
            "fit_warnings": warnings,
        }
    )


@app.post("/api/pricing")
def post_pricing():
    """
    Body:
    {
      "work_plan": {...},
      "pricing_table": {...},  # optional; else loads mock
      "region": "vlaanderen",
      "custom_multiplier": 1.0
    }
    """
    data = request.get_json(force=True)
    wp_data = data.get("work_plan", {})
    pricing_table = data.get("pricing_table")
    region = data.get("region", "vlaanderen")
    custom_multiplier = data.get("custom_multiplier", 1.0)

    if pricing_table is None:
        pricing_table = json.loads(Path("data/mock/pricing.json").read_text())

    work_plan = WorkPlan(**wp_data)
    costs = price_work_plan(work_plan, pricing_table, region=region, custom_multiplier=custom_multiplier)
    return jsonify({"costs": costs})


@app.post("/api/image")
def post_image():
    """
    Body:
    {
      "floorplan": {...},
      "products": {...},          # AfterState.products
      "style": {...},
      "constraints": {...},
      "room_image_path": "room_before.jpg",
      "product_image_paths": ["prod1.jpg", ...]  # max 13
    }
    Returns inline image bytes (base64) on success.
    """
    data = request.get_json(force=True)
    try:
        img_bytes = generate_after_image(
            floorplan=data.get("floorplan", {}),
            products=data.get("products", {}),
            style=data.get("style", {}),
            constraints=data.get("constraints", {}),
            room_image_path=Path(data["room_image_path"]),
            product_image_paths=[Path(p) for p in data.get("product_image_paths", [])],
        )
        if img_bytes is None:
            return jsonify({"error": "no image returned"}), 500
        # Return base64 inline to avoid filesystem writes here
        import base64

        b64 = base64.b64encode(img_bytes).decode("utf-8")
        return jsonify({"image_base64": b64})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/api/before")
def post_before():
    """
    Before-state generation.
    Expects: { orientation_hint, image_path, dimensions_cm?, user_notes?, force_mock? }
    If GEMINI_API_KEY present and force_mock != true, calls Gemini; otherwise returns mock.
    """
    data = request.get_json(force=True)
    orientation_hint = data.get("orientation_hint", "front=door")
    dims = data.get("dimensions_cm", {"width": 240, "depth": 300, "height": 250})
    image_path = Path(data.get("image_path", "room_before.jpg"))
    force_mock = data.get("force_mock", False)

    def mock_response():
        before_state = {
            "schema_version": "0.1.0",
            "captured_at": None,
            "source_media": [str(image_path)],
            "space": {
                "orientation_hint": orientation_hint,
                "dimensions_cm": dims,
                "floorplan_shape": "rectangular",
                "entrance": {"position": "front-left", "width_cm": 80},
            },
            "fixtures": {
                "toilet": {"present": True, "position": "back-right"},
                "washbasin": {"present": True, "position": "left"},
                "shower": {"present": True, "position": "right"},
            },
            "plumbing_estimate": {
                "water_inlet_likely": "wall_right",
                "waste_outlet_likely": "floor_back",
                "confidence": "medium",
            },
            "validation": {"user_confirmed": False},
        }
        anchors = {
            "room_width_cm": dims.get("width", 0),
            "room_depth_cm": dims.get("depth", 0),
            "toilet": {"position": "back-right", "x": 180, "y": 220, "width": 36, "depth": 54},
            "washbasin": {"position": "left", "x": 20, "y": 120, "width": 100, "depth": 46},
            "shower": {"position": "right", "x": 140, "y": 20, "width": 120, "depth": 90},
            "openings": [],
        }
        return jsonify({"before_state": before_state, "anchors": anchors})

    if force_mock or not os.getenv("GEMINI_API_KEY"):
        return mock_response()

    try:
        before_state = analyze_before(image_path=image_path, orientation_hint=orientation_hint, dimensions_cm=dims)
        # Anchors remain heuristic; could be enriched from model output if available
        anchors = {
            "room_width_cm": dims.get("width", 0),
            "room_depth_cm": dims.get("depth", 0),
            "toilet": {"position": "back-right", "x": 180, "y": 220, "width": 36, "depth": 54},
            "washbasin": {"position": "left", "x": 20, "y": 120, "width": 100, "depth": 46},
            "shower": {"position": "right", "x": 140, "y": 20, "width": 120, "depth": 90},
            "openings": [],
        }
        return jsonify({"before_state": before_state, "anchors": anchors})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def create_app() -> Flask:
    return app


if __name__ == "__main__":
    app.run(port=5001, debug=True)


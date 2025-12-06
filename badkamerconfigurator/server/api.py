from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from typing import Any, Dict
from werkzeug.utils import secure_filename

from flask import Flask, jsonify, request

from ai.supabase_client import (
    fetch_catalog,
    create_project,
    save_before_state,
    save_after_state,
    save_work_plan,
    save_pricing,
    save_image,
    upload_file_to_storage,
    get_public_url,
    get_signed_url,
    download_file_from_storage,
)
from ai.layout import check_fit, apply_layout
from ai.after_state_builder import build_after_state_from_selection
from ai.catalog import build_selection_payload
from ai.pricing import price_work_plan
from ai.models import WorkPlan
from ai.image_generation import generate_after_image
from ai.before import analyze_before

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}


def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.get("/api/catalog")
def get_catalog():
    filters = {}
    if request.args.get("category"):
        filters["category"] = request.args.get("category")
    if request.args.get("min_price"):
        filters["min_price"] = float(request.args.get("min_price"))
    if request.args.get("max_price"):
        filters["max_price"] = float(request.args.get("max_price"))

    items = fetch_catalog(filters if filters else None)

    for item in items:
        if item.get("image_path"):
            item["image_url"] = get_public_url("catalog-images", item["image_path"])

    return jsonify(items)


@app.post("/api/projects")
def create_new_project():
    data = request.get_json(force=True)
    user_id = data.get("user_id")
    region = data.get("region", "vlaanderen")

    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    project = create_project(user_id, region)
    return jsonify(project)


@app.post("/api/upload")
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed"}), 400

    user_id = request.form.get('user_id')
    project_id = request.form.get('project_id')

    if not user_id or not project_id:
        return jsonify({"error": "user_id and project_id required"}), 400

    filename = secure_filename(file.filename)
    file_path = f"{user_id}/{project_id}/{filename}"

    file_data = file.read()

    try:
        upload_file_to_storage("user-uploads", file_path, file_data, file.content_type)
        signed_url = get_signed_url("user-uploads", file_path, 3600)

        return jsonify({
            "file_path": file_path,
            "signed_url": signed_url
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/api/selection")
def post_selection():
    """
    Body:
    {
      "project_id": "...",
      "selected_ids": [...],
      "room_image_path": "...",
      "anchors": {...},
      "style": {...},
      "constraints": {...},
      "render_intent": {...}
    }
    """
    data = request.get_json(force=True)
    project_id = data.get("project_id")
    selected_ids = data.get("selected_ids", [])
    room_image_path = data.get("room_image_path", "")
    anchors = data.get("anchors", {})
    style = data.get("style", {})
    constraints = data.get("constraints", {})
    render_intent = data.get("render_intent", {})

    if not project_id:
        return jsonify({"error": "project_id required"}), 400

    catalog_items = fetch_catalog()
    products_by_category, product_image_paths = build_selection_payload(
        catalog_items, selected_ids, room_image_path
    )
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
        if isinstance(fx, dict) and "width" in fx:
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

    try:
        saved_after_state = save_after_state(project_id, after_state.model_dump())
    except Exception as e:
        return jsonify({"error": f"Failed to save after state: {str(e)}"}), 500

    return jsonify(
        {
            "after_state": after_state.model_dump(),
            "after_state_id": saved_after_state["id"],
            "reference_images": reference_images,
            "fit_warnings": warnings,
        }
    )


@app.post("/api/pricing")
def post_pricing():
    """
    Body:
    {
      "project_id": "...",
      "work_plan": {...},
      "pricing_table": {...},  # optional; else loads mock
      "region": "vlaanderen",
      "custom_multiplier": 1.0
    }
    """
    data = request.get_json(force=True)
    project_id = data.get("project_id")
    wp_data = data.get("work_plan", {})
    pricing_table = data.get("pricing_table")
    region = data.get("region", "vlaanderen")
    custom_multiplier = data.get("custom_multiplier", 1.0)

    if not project_id:
        return jsonify({"error": "project_id required"}), 400

    if pricing_table is None:
        pricing_path = Path(__file__).parent.parent / "data" / "mock" / "pricing.json"
        pricing_table = json.loads(pricing_path.read_text())

    work_plan = WorkPlan(**wp_data)
    costs = price_work_plan(work_plan, pricing_table, region=region, custom_multiplier=custom_multiplier)

    try:
        saved_pricing = save_pricing(project_id, region, costs)
    except Exception as e:
        return jsonify({"error": f"Failed to save pricing: {str(e)}"}), 500

    return jsonify({"costs": costs, "pricing_id": saved_pricing["id"]})


@app.post("/api/image")
def post_image():
    """
    Body:
    {
      "project_id": "...",
      "user_id": "...",
      "floorplan": {...},
      "products": {...},
      "style": {...},
      "constraints": {...},
      "room_image_path": "...",
      "product_image_paths": [...]  # max 13
      "seed": "..." (optional)
    }
    Returns inline image bytes (base64) and storage path.
    """
    data = request.get_json(force=True)
    project_id = data.get("project_id")
    user_id = data.get("user_id")

    if not project_id or not user_id:
        return jsonify({"error": "project_id and user_id required"}), 400

    try:
        room_image_path = data.get("room_image_path", "")
        if room_image_path and not room_image_path.startswith("/"):
            room_bytes = download_file_from_storage("user-uploads", room_image_path)
            temp_room_path = Path(f"/tmp/{room_image_path.split('/')[-1]}")
            temp_room_path.write_bytes(room_bytes)
            room_image_path = temp_room_path
        else:
            room_image_path = Path(room_image_path) if room_image_path else Path("temp.jpg")

        product_paths = []
        for p in data.get("product_image_paths", []):
            if p and not p.startswith("/"):
                prod_bytes = download_file_from_storage("catalog-images", p)
                temp_prod_path = Path(f"/tmp/{p.split('/')[-1]}")
                temp_prod_path.write_bytes(prod_bytes)
                product_paths.append(temp_prod_path)
            elif p:
                product_paths.append(Path(p))

        img_bytes = generate_after_image(
            floorplan=data.get("floorplan", {}),
            products=data.get("products", {}),
            style=data.get("style", {}),
            constraints=data.get("constraints", {}),
            room_image_path=room_image_path,
            product_image_paths=product_paths,
        )

        if img_bytes is None:
            return jsonify({"error": "no image returned"}), 500

        import time
        timestamp = int(time.time())
        seed = data.get("seed", str(timestamp))
        image_filename = f"after_{timestamp}.jpg"
        storage_path = f"{user_id}/{project_id}/{image_filename}"

        upload_file_to_storage("generated-images", storage_path, img_bytes, "image/jpeg")

        prompt = json.dumps({
            "floorplan": data.get("floorplan", {}),
            "products": data.get("products", {}),
            "style": data.get("style", {}),
        })

        saved_image = save_image(project_id, "after_generated", storage_path, seed, prompt)

        b64 = base64.b64encode(img_bytes).decode("utf-8")
        signed_url = get_signed_url("generated-images", storage_path, 3600)

        return jsonify({
            "image_base64": b64,
            "image_id": saved_image["id"],
            "storage_path": storage_path,
            "signed_url": signed_url
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/api/before")
def post_before():
    """
    Before-state generation.
    Expects: {
      project_id,
      orientation_hint,
      image_path (storage path),
      dimensions_cm,
      force_mock?
    }
    If GEMINI_API_KEY present and force_mock != true, calls Gemini; otherwise returns mock.
    """
    data = request.get_json(force=True)
    project_id = data.get("project_id")
    orientation_hint = data.get("orientation_hint", "front=door")
    dims = data.get("dimensions_cm", {"width": 240, "depth": 300, "height": 250})
    storage_path = data.get("image_path", "")
    force_mock = data.get("force_mock", False)

    if not project_id:
        return jsonify({"error": "project_id required"}), 400

    def mock_response():
        before_state = {
            "schema_version": "0.1.0",
            "captured_at": None,
            "source_media": [storage_path],
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

        try:
            saved_before = save_before_state(project_id, before_state)
            return jsonify({
                "before_state": before_state,
                "before_state_id": saved_before["id"],
                "anchors": anchors
            })
        except Exception as e:
            return jsonify({"error": f"Failed to save before state: {str(e)}"}), 500

    if force_mock or not os.getenv("GEMINI_API_KEY"):
        return mock_response()

    try:
        if storage_path and not storage_path.startswith("/"):
            image_bytes = download_file_from_storage("user-uploads", storage_path)
            temp_path = Path(f"/tmp/{storage_path.split('/')[-1]}")
            temp_path.write_bytes(image_bytes)
            image_path = temp_path
        else:
            image_path = Path(storage_path) if storage_path else Path("temp.jpg")

        before_state = analyze_before(image_path=image_path, orientation_hint=orientation_hint, dimensions_cm=dims)

        anchors = {
            "room_width_cm": dims.get("width", 0),
            "room_depth_cm": dims.get("depth", 0),
            "toilet": {"position": "back-right", "x": 180, "y": 220, "width": 36, "depth": 54},
            "washbasin": {"position": "left", "x": 20, "y": 120, "width": 100, "depth": 46},
            "shower": {"position": "right", "x": 140, "y": 20, "width": 120, "depth": 90},
            "openings": [],
        }

        saved_before = save_before_state(project_id, before_state)

        return jsonify({
            "before_state": before_state,
            "before_state_id": saved_before["id"],
            "anchors": anchors
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/api/workplan")
def generate_workplan():
    """
    Generate work plan from before and after states.
    Body: {
      project_id,
      before_state,
      after_state,
      scenario (optional, default: 'mid')
    }
    """
    data = request.get_json(force=True)
    project_id = data.get("project_id")
    before_state = data.get("before_state")
    after_state = data.get("after_state")
    scenario = data.get("scenario", "mid")

    if not project_id:
        return jsonify({"error": "project_id required"}), 400

    try:
        from ai.chains import build_workplan_chain

        chain = build_workplan_chain()
        work_plan = chain.invoke({
            "before_state": before_state,
            "after_state": after_state,
            "scenario": scenario
        })

        work_plan_dict = work_plan.model_dump() if hasattr(work_plan, 'model_dump') else work_plan

        saved_workplan = save_work_plan(project_id, work_plan_dict)

        return jsonify({
            "work_plan": work_plan_dict,
            "work_plan_id": saved_workplan["id"]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/api/projects/<project_id>")
def get_project_details(project_id: str):
    """Get complete project details including all states."""
    try:
        from ai.supabase_client import (
            get_project,
            get_before_state,
            get_after_state,
            get_work_plan,
            get_pricing,
            get_images,
            get_approvals,
        )

        project = get_project(project_id)
        if not project:
            return jsonify({"error": "Project not found"}), 404

        before = get_before_state(project_id)
        after = get_after_state(project_id)
        workplan = get_work_plan(project_id)
        pricing = get_pricing(project_id)
        images = get_images(project_id)
        approvals = get_approvals(project_id)

        for img in images:
            if img.get("path"):
                img["signed_url"] = get_signed_url("generated-images", img["path"], 3600)

        return jsonify({
            "project": project,
            "before_state": before,
            "after_state": after,
            "work_plan": workplan,
            "pricing": pricing,
            "images": images,
            "approvals": approvals
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/api/admin/projects")
def get_pending_projects_admin():
    """Get all projects pending admin approval."""
    try:
        from ai.supabase_client import get_pending_projects

        projects = get_pending_projects()
        return jsonify(projects)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/api/admin/approve")
def approve_project():
    """
    Approve or reject a project.
    Body: {
      project_id,
      user_id (admin),
      status ('approved' or 'rejected'),
      notes (optional)
    }
    """
    data = request.get_json(force=True)
    project_id = data.get("project_id")
    user_id = data.get("user_id")
    status = data.get("status")
    notes = data.get("notes")

    if not project_id or not user_id or not status:
        return jsonify({"error": "project_id, user_id, and status required"}), 400

    if status not in ["approved", "rejected"]:
        return jsonify({"error": "status must be 'approved' or 'rejected'"}), 400

    try:
        from ai.supabase_client import create_approval, update_project_status

        approval = create_approval(project_id, user_id, "admin", status, notes)

        new_project_status = "admin_approved" if status == "approved" else "rejected"
        update_project_status(project_id, new_project_status)

        return jsonify({
            "approval": approval,
            "project_status": new_project_status
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def create_app() -> Flask:
    return app


if __name__ == "__main__":
    app.run(port=5001, debug=True)


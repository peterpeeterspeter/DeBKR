from __future__ import annotations

import os
from typing import Any, Dict, List, Optional
from pathlib import Path
from io import BytesIO

from supabase import create_client, Client

_client: Optional[Client] = None


def get_supabase_client() -> Client:
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY must be set")
        _client = create_client(url, key)
    return _client


def fetch_catalog(filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    client = get_supabase_client()
    query = client.table("catalog_items").select("*")

    if filters:
        if "category" in filters:
            query = query.eq("category", filters["category"])
        if "min_price" in filters:
            query = query.gte("price_eur", filters["min_price"])
        if "max_price" in filters:
            query = query.lte("price_eur", filters["max_price"])

    response = query.execute()
    return response.data


def upsert_catalog_items(items: List[Dict[str, Any]]) -> int:
    client = get_supabase_client()

    formatted_items = []
    for item in items:
        formatted_item = {
            "product_id": item["product_id"] if "product_id" in item else item["id"],
            "name": item["name"],
            "category": item["category"],
            "style_tags": item.get("style_tags", []),
            "color": item.get("color"),
            "finish": item.get("finish"),
            "material": item.get("material"),
            "dimensions_json": item.get("dimensions_json") or item.get("dimensions_cm"),
            "price_eur": item.get("price_eur"),
            "unit_type": item.get("unit_type", "per_unit"),
            "image_path": item.get("image_path"),
            "installation_notes": item.get("installation_notes"),
        }
        formatted_items.append(formatted_item)

    client.table("catalog_items").upsert(formatted_items, on_conflict="product_id").execute()
    return len(formatted_items)


def create_project(user_id: str, region: str = "vlaanderen") -> Dict[str, Any]:
    client = get_supabase_client()
    response = client.table("projects").insert({
        "user_id": user_id,
        "region": region,
        "status": "draft"
    }).execute()
    return response.data[0]


def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    client = get_supabase_client()
    response = client.table("projects").select("*").eq("id", project_id).maybeSingle().execute()
    return response.data


def update_project_status(project_id: str, status: str) -> Dict[str, Any]:
    client = get_supabase_client()
    response = client.table("projects").update({"status": status, "updated_at": "now()"}).eq("id", project_id).execute()
    return response.data[0]


def save_before_state(project_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    client = get_supabase_client()
    response = client.table("before_states").insert({
        "project_id": project_id,
        "data": data
    }).execute()
    return response.data[0]


def get_before_state(project_id: str) -> Optional[Dict[str, Any]]:
    client = get_supabase_client()
    response = client.table("before_states").select("*").eq("project_id", project_id).order("created_at", desc=True).limit(1).maybeSingle().execute()
    return response.data


def save_after_state(project_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    client = get_supabase_client()
    response = client.table("after_states").insert({
        "project_id": project_id,
        "data": data
    }).execute()
    return response.data[0]


def get_after_state(project_id: str) -> Optional[Dict[str, Any]]:
    client = get_supabase_client()
    response = client.table("after_states").select("*").eq("project_id", project_id).order("created_at", desc=True).limit(1).maybeSingle().execute()
    return response.data


def approve_after_state(after_state_id: str) -> Dict[str, Any]:
    client = get_supabase_client()
    response = client.table("after_states").update({"user_approved_at": "now()"}).eq("id", after_state_id).execute()
    return response.data[0]


def save_work_plan(project_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    client = get_supabase_client()
    response = client.table("work_plans").insert({
        "project_id": project_id,
        "data": data
    }).execute()
    return response.data[0]


def get_work_plan(project_id: str) -> Optional[Dict[str, Any]]:
    client = get_supabase_client()
    response = client.table("work_plans").select("*").eq("project_id", project_id).order("created_at", desc=True).limit(1).maybeSingle().execute()
    return response.data


def save_pricing(project_id: str, region: str, data: Dict[str, Any]) -> Dict[str, Any]:
    client = get_supabase_client()
    response = client.table("pricing_generated").insert({
        "project_id": project_id,
        "region": region,
        "data": data
    }).execute()
    return response.data[0]


def get_pricing(project_id: str) -> Optional[Dict[str, Any]]:
    client = get_supabase_client()
    response = client.table("pricing_generated").select("*").eq("project_id", project_id).order("created_at", desc=True).limit(1).maybeSingle().execute()
    return response.data


def save_image(project_id: str, image_type: str, path: str, seed: Optional[str] = None, prompt: Optional[str] = None) -> Dict[str, Any]:
    client = get_supabase_client()
    response = client.table("images").insert({
        "project_id": project_id,
        "type": image_type,
        "path": path,
        "seed": seed,
        "prompt": prompt
    }).execute()
    return response.data[0]


def get_images(project_id: str, image_type: Optional[str] = None) -> List[Dict[str, Any]]:
    client = get_supabase_client()
    query = client.table("images").select("*").eq("project_id", project_id)
    if image_type:
        query = query.eq("type", image_type)
    response = query.order("created_at", desc=True).execute()
    return response.data


def mark_image_as_final(image_id: str) -> Dict[str, Any]:
    client = get_supabase_client()
    response = client.table("images").update({"type": "final"}).eq("id", image_id).execute()
    return response.data[0]


def create_approval(project_id: str, user_id: str, role: str, status: str = "pending", notes: Optional[str] = None) -> Dict[str, Any]:
    client = get_supabase_client()
    response = client.table("approvals").insert({
        "project_id": project_id,
        "user_id": user_id,
        "role": role,
        "status": status,
        "notes": notes
    }).execute()
    return response.data[0]


def get_approvals(project_id: str) -> List[Dict[str, Any]]:
    client = get_supabase_client()
    response = client.table("approvals").select("*").eq("project_id", project_id).order("created_at", desc=True).execute()
    return response.data


def get_pending_projects() -> List[Dict[str, Any]]:
    client = get_supabase_client()
    response = client.table("projects").select("*").in_("status", ["pending", "user_approved"]).order("created_at", desc=True).execute()
    return response.data


def upload_file_to_storage(bucket: str, file_path: str, file_data: bytes, content_type: str = "image/jpeg") -> str:
    client = get_supabase_client()
    client.storage.from_(bucket).upload(file_path, file_data, {"content-type": content_type})
    return file_path


def get_public_url(bucket: str, file_path: str) -> str:
    client = get_supabase_client()
    response = client.storage.from_(bucket).get_public_url(file_path)
    return response


def get_signed_url(bucket: str, file_path: str, expires_in: int = 3600) -> str:
    client = get_supabase_client()
    response = client.storage.from_(bucket).create_signed_url(file_path, expires_in)
    return response["signedURL"]


def download_file_from_storage(bucket: str, file_path: str) -> bytes:
    client = get_supabase_client()
    response = client.storage.from_(bucket).download(file_path)
    return response

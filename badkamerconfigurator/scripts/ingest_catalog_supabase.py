#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import os
from pathlib import Path
from typing import Dict, List

from supabase import create_client, Client


REQUIRED_COLUMNS = [
    "product_id",
    "name",
    "category",
    "price_eur",
    "image_url",
]

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

VALID_UNIT_TYPES = {"per_unit", "per_m2"}

BUCKET = "catalog-images"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest catalog CSV into Supabase and upload images to Storage")
    parser.add_argument("csv_file", type=Path, help="CSV input with catalog data")
    parser.add_argument("--bucket", default=BUCKET, help="Supabase storage bucket name")
    parser.add_argument("--skip-upload", action="store_true", help="Skip image download/upload, only load rows")
    parser.add_argument("--limit", type=int, default=None, help="Limit rows for testing")
    return parser.parse_args()


def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not url or not key:
        raise RuntimeError("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/ANON_KEY")
    return create_client(url, key)


def validate_row(row: Dict[str, str]) -> List[str]:
    errors = []
    for col in REQUIRED_COLUMNS:
        if not row.get(col):
            errors.append(f"missing {col}")
    if row.get("category") and row["category"] not in VALID_CATEGORIES:
        errors.append(f"invalid category {row['category']}")
    unit_type = row.get("unit_type") or "per_unit"
    if unit_type not in VALID_UNIT_TYPES:
        errors.append(f"invalid unit_type {unit_type}")
    return errors


def download_image(url: str, dest: Path) -> None:
    import requests

    resp = requests.get(url, timeout=20)
    resp.raise_for_status()
    dest.write_bytes(resp.content)


def upload_to_storage(client: Client, bucket: str, local_path: Path, storage_path: str) -> None:
    with local_path.open("rb") as f:
        client.storage.from_(bucket).upload(storage_path, f, {"content-type": "image/jpeg"})


def main() -> None:
    args = parse_args()
    supabase = get_supabase_client()

    rows = []
    errors: List[str] = []
    with args.csv_file.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=1):
            if args.limit and idx > args.limit:
                break
            errs = validate_row(row)
            if errs:
                errors.append(f"row {idx}: {', '.join(errs)}")
                continue
            rows.append(row)

    if errors:
        print("Validation errors (first 10):")
        for e in errors[:10]:
            print("-", e)

    # Upsert rows
    payload = []
    for row in rows:
        payload.append(
            {
                "product_id": row["product_id"],
                "name": row["name"],
                "category": row["category"],
                "style_tags": (row.get("style_tags") or "").split(",") if row.get("style_tags") else [],
                "color": row.get("color"),
                "finish": row.get("finish"),
                "material": row.get("material"),
                "dimensions_json": {
                    "width_cm": row.get("width_cm"),
                    "height_cm": row.get("height_cm"),
                    "depth_cm": row.get("depth_cm"),
                    "thickness_cm": row.get("thickness_cm"),
                },
                "price_eur": float(row["price_eur"]) if row.get("price_eur") else None,
                "unit_type": row.get("unit_type") or "per_unit",
                "installation_notes": row.get("installation_notes"),
            }
        )

    if payload:
        supabase.table("catalog_items").upsert(payload, on_conflict="product_id").execute()
        print(f"Upserted {len(payload)} catalog items.")

    if args.skip_upload or not rows:
        return

    tmp_dir = Path(".tmp_catalog_images")
    tmp_dir.mkdir(exist_ok=True)
    for row in rows:
        url = row["image_url"]
        product_id = row["product_id"]
        local_path = tmp_dir / f"{product_id}.jpg"
        storage_path = f"{product_id}.jpg"
        try:
            download_image(url, local_path)
            upload_to_storage(supabase, args.bucket, local_path, storage_path)
            supabase.table("catalog_items").update({"image_path": storage_path}).eq("product_id", product_id).execute()
            print(f"Uploaded {product_id} -> {storage_path}")
        except Exception as e:
            print(f"Failed image for {product_id}: {e}")


if __name__ == "__main__":
    main()



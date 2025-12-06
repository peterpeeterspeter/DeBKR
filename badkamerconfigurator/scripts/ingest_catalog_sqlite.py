#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import uuid
from pathlib import Path
from typing import Dict, List

from ai.db import init_db, upsert_catalog_items

REQUIRED_COLUMNS = ["product_id", "name", "category", "price_eur", "image_url"]

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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest catalog CSV into local SQLite (no network)")
    parser.add_argument("csv_file", type=Path, help="CSV input")
    parser.add_argument("--db", type=Path, default=Path("local.db"), help="SQLite file path")
    parser.add_argument("--schema", type=Path, default=Path("db/schema.sql"), help="Schema file path")
    parser.add_argument("--limit", type=int, default=None, help="Limit rows for testing")
    return parser.parse_args()


def validate_row(row: Dict[str, str]) -> List[str]:
    errors: List[str] = []
    for col in REQUIRED_COLUMNS:
        if not row.get(col):
            errors.append(f"missing {col}")
    if row.get("category") and row["category"] not in VALID_CATEGORIES:
        errors.append(f"invalid category {row['category']}")
    unit_type = row.get("unit_type") or "per_unit"
    if unit_type not in VALID_UNIT_TYPES:
        errors.append(f"invalid unit_type {unit_type}")
    return errors


def main() -> None:
    args = parse_args()
    init_db(args.db, args.schema)

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

    payload = []
    for row in rows:
        payload.append(
            {
                "id": str(uuid.uuid4()),
                "product_id": row["product_id"],
                "name": row["name"],
                "category": row["category"],
                "style_tags": (row.get("style_tags") or "").split(",") if row.get("style_tags") else [],
                "color": row.get("color"),
                "finish": row.get("finish"),
                "material": row.get("material"),
                "dimensions_json": json.dumps(
                    {
                        "width_cm": row.get("width_cm"),
                        "height_cm": row.get("height_cm"),
                        "depth_cm": row.get("depth_cm"),
                        "thickness_cm": row.get("thickness_cm"),
                    }
                ),
                "price_eur": float(row["price_eur"]) if row.get("price_eur") else None,
                "unit_type": row.get("unit_type") or "per_unit",
                "image_path": row.get("image_url"),
                "installation_notes": row.get("installation_notes"),
            }
        )

    if payload:
        count = upsert_catalog_items(payload, args.db)
        print(f"Upserted {count} catalog items into {args.db}")

    if errors:
        print(f"Total errors: {len(errors)}")


if __name__ == "__main__":
    main()



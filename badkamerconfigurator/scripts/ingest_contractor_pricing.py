#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from statistics import median
from typing import Dict, List, Tuple

VALID_CATEGORIES = {
    "demolition",
    "plumbing",
    "electrical",
    "surface_prep",
    "tiling",
    "sanitary_install",
    "painting",
    "ventilation",
    "cleanup",
    "other",
}

VALID_UNITS = {"m2", "m", "pcs", "hrs", "lump_sum"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest contractor pricing CSV to pricing.generated.json")
    parser.add_argument("input", type=Path, help="CSV file with contractor data")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/pricing.generated.json"),
        help="Output JSON path",
    )
    parser.add_argument("--region-default", default="nl_overig", help="Default region if missing")
    return parser.parse_args()


def validate_row(row: Dict[str, str], region_default: str) -> Tuple[Dict, List[str]]:
    errors: List[str] = []
    category = row.get("category", "").strip()
    unit = row.get("unit", "").strip()
    if category not in VALID_CATEGORIES:
        errors.append(f"invalid category: {category}")
    if unit not in VALID_UNITS:
        errors.append(f"invalid unit: {unit}")

    def num(field: str) -> float:
        val = row.get(field, "").strip()
        return float(val) if val else 0.0

    cleaned = {
        "invoice_id": row.get("invoice_id", "").strip(),
        "date": row.get("date", "").strip(),
        "region": row.get("region", "").strip() or region_default,
        "task": row.get("task", "").strip(),
        "category": category,
        "qty": num("qty"),
        "unit": unit,
        "unit_price": num("unit_price"),
        "hours": num("hours"),
        "hourly_rate": num("hourly_rate"),
        "notes": row.get("notes", "").strip(),
    }
    return cleaned, errors


def aggregate(records: List[Dict]) -> Dict:
    stats: Dict[str, Dict[str, Dict[str, List[float]]]] = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    hourly_stats: Dict[str, Dict[str, List[float]]] = defaultdict(lambda: defaultdict(list))
    for rec in records:
        cat, unit, region = rec["category"], rec["unit"], rec["region"]
        if rec["unit_price"] > 0:
            stats[cat][unit][region].append(rec["unit_price"])
        if rec["hourly_rate"] > 0:
            hourly_stats[cat][region].append(rec["hourly_rate"])

    def summarize(values: List[float]) -> Dict:
        if not values:
            return {}
        values_sorted = sorted(values)
        p75_idx = int(0.75 * (len(values_sorted) - 1))
        return {
            "median": round(median(values_sorted), 2),
            "p75": round(values_sorted[p75_idx], 2),
            "count": len(values_sorted),
        }

    summary: Dict = {"by_category_unit_region": {}, "hourly_rates": {}}
    for cat, unit_dict in stats.items():
        summary["by_category_unit_region"][cat] = {}
        for unit, region_dict in unit_dict.items():
            summary["by_category_unit_region"][cat][unit] = {}
            for region, vals in region_dict.items():
                summary["by_category_unit_region"][cat][unit][region] = summarize(vals)

    for cat, region_dict in hourly_stats.items():
        summary["hourly_rates"][cat] = {}
        for region, vals in region_dict.items():
            summary["hourly_rates"][cat][region] = summarize(vals)

    return summary


def main() -> None:
    args = parse_args()
    records: List[Dict] = []
    errors: List[str] = []

    with args.input.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=1):
            cleaned, row_errors = validate_row(row, args.region_default)
            if row_errors:
                errors.append(f"row {idx}: {', '.join(row_errors)}")
                continue
            records.append(cleaned)

    summary = aggregate(records)
    output = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "source_file": str(args.input),
        "source_count": len(records),
        "errors": errors,
        "data": summary,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Wrote {args.output} with {len(records)} records; {len(errors)} errors.")
    if errors:
        print("Errors (truncated to first 10):")
        for err in errors[:10]:
            print(f"- {err}")


if __name__ == "__main__":
    main()



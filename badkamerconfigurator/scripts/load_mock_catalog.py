#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from ai.supabase_client import upsert_catalog_items


def main() -> None:
    catalog_file = Path(__file__).parent.parent / "data" / "mock" / "catalog.json"

    if not catalog_file.exists():
        print(f"Catalog file not found: {catalog_file}")
        return

    with catalog_file.open("r", encoding="utf-8") as f:
        catalog_data = json.load(f)

    print(f"Loading {len(catalog_data)} catalog items...")

    count = upsert_catalog_items(catalog_data)
    print(f"Successfully loaded {count} catalog items into Supabase")


if __name__ == "__main__":
    main()

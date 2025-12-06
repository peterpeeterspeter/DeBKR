from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

SCHEMA_PATH = Path("db/schema.sql")
DB_PATH = Path("local.db")


def get_conn(db_path: Path = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Path = DB_PATH, schema_path: Path = SCHEMA_PATH) -> None:
    sql = schema_path.read_text(encoding="utf-8")
    conn = get_conn(db_path)
    with conn:
        conn.executescript(sql)
    conn.close()


def upsert_catalog_items(items: Iterable[Dict[str, Any]], db_path: Path = DB_PATH) -> int:
    conn = get_conn(db_path)
    count = 0
    with conn:
        for it in items:
            conn.execute(
                """
                INSERT INTO catalog_items (id, product_id, name, category, style_tags, color, finish, material,
                                           dimensions_json, price_eur, unit_type, image_path, installation_notes)
                VALUES (:id, :product_id, :name, :category, :style_tags, :color, :finish, :material,
                        :dimensions_json, :price_eur, :unit_type, :image_path, :installation_notes)
                ON CONFLICT(product_id) DO UPDATE SET
                  name=excluded.name,
                  category=excluded.category,
                  style_tags=excluded.style_tags,
                  color=excluded.color,
                  finish=excluded.finish,
                  material=excluded.material,
                  dimensions_json=excluded.dimensions_json,
                  price_eur=excluded.price_eur,
                  unit_type=excluded.unit_type,
                  image_path=excluded.image_path,
                  installation_notes=excluded.installation_notes;
                """,
                {
                    "id": it.get("id") or it["product_id"],
                    "product_id": it["product_id"],
                    "name": it["name"],
                    "category": it["category"],
                    "style_tags": ",".join(it.get("style_tags") or []),
                    "color": it.get("color"),
                    "finish": it.get("finish"),
                    "material": it.get("material"),
                    "dimensions_json": it.get("dimensions_json"),
                    "price_eur": it.get("price_eur"),
                    "unit_type": it.get("unit_type", "per_unit"),
                    "image_path": it.get("image_path"),
                    "installation_notes": it.get("installation_notes"),
                },
            )
            count += 1
    conn.close()
    return count


def fetch_catalog(db_path: Path = DB_PATH) -> List[Dict[str, Any]]:
    conn = get_conn(db_path)
    cur = conn.execute("SELECT * FROM catalog_items")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows



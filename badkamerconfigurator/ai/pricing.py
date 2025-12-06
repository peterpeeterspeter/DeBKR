from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional

from .models import WorkPlan


def load_pricing_table(path: Path) -> Dict:
    with Path(path).open("r", encoding="utf-8") as f:
        return json.load(f)


def load_generated_or_mock(
    generated_path: Path = Path("data/pricing.generated.json"),
    fallback_path: Path = Path("data/mock/pricing.json"),
) -> Dict:
    if generated_path.exists():
        return load_pricing_table(generated_path).get("data", {})
    return load_pricing_table(fallback_path)


def _get_rate(summary: Dict, category: str, unit: str, region: str, percentile: str = "median") -> Optional[float]:
    try:
        return summary["by_category_unit_region"][category][unit][region][percentile]
    except KeyError:
        return None


def _get_hourly(summary: Dict, category: str, region: str, percentile: str = "median") -> Optional[float]:
    try:
        return summary["hourly_rates"][category][region][percentile]
    except KeyError:
        return None


def price_work_plan(
    work_plan: WorkPlan,
    pricing_table: Dict,
    region: str = "nl_overig",
    custom_multiplier: float = 1.0,
    materials_total: float = 0.0,
) -> Dict:
    """
    Map tasks to cost using pricing table.
    Prefers generated pricing (median); falls back to mock defaults.
    """
    region_factor = pricing_table.get("region_multiplier", {}).get(region, 1.0)
    labor_base = pricing_table.get("labor_hour_base", 75) * region_factor
    tasks_prices = pricing_table.get("tasks", {})

    generated = pricing_table.get("by_category_unit_region")
    hourly_generated = pricing_table.get("hourly_rates")

    labor_cost = 0.0
    material_cost = materials_total

    for phase in work_plan.phases:
        for task in phase.tasks:
            qty = task.quantity or 0
            cat = task.category
            unit = task.unit or ""
            desc = (task.task or "").lower()

            rate = None
            if generated:
                rate = _get_rate(pricing_table, cat, unit, region, "median")
            if rate is None:
                # fallback to mock tasks table keyed by category/unit heuristics
                if cat == "tiling":
                    rate = tasks_prices.get("tiling_per_m2")
                elif cat == "demolition":
                    rate = tasks_prices.get("demolition_tile_per_m2")
                elif cat == "plumbing":
                    rate = tasks_prices.get("plumbing_move_per_meter", labor_base)
                elif cat == "electrical":
                    rate = tasks_prices.get("lighting_point", labor_base)
                elif cat == "sanitary_install":
                    if "toilet" in desc:
                        rate = tasks_prices.get("toilet_install", labor_base)
                    elif "douche" in desc or "shower" in desc:
                        rate = tasks_prices.get("shower_install", labor_base)
                    elif "wastafel" in desc or "washbasin" in desc:
                        rate = tasks_prices.get("washbasin_install", labor_base)
            rate = rate or labor_base

            if unit in {"m2", "m", "pcs"}:
                labor_cost += qty * rate
            elif unit == "lump_sum":
                labor_cost += rate  # assumes rate is total
            else:
                # fallback: use estimated hours if provided
                hours_rate = (
                    _get_hourly(pricing_table, cat, region, "median") if hourly_generated else labor_base
                ) or labor_base
                labor_cost += (task.estimated_hours or 0) * hours_rate

    contingency_pct = pricing_table.get("contingency_percent", 10) / 100
    contingency = (labor_cost + material_cost) * contingency_pct
    disposal_fee = pricing_table.get("disposal_fee_eur", 0)

    subtotal = labor_cost + material_cost + contingency + disposal_fee
    total = subtotal * custom_multiplier
    margin = total * 0.2

    return {
        "labor_eur": round(labor_cost * custom_multiplier, 2),
        "materials_eur": round(material_cost * custom_multiplier, 2),
        "contingency_eur": round(contingency * custom_multiplier, 2),
        "disposal_fee_eur": disposal_fee,
        "margin_eur": round(margin, 2),
        "total_eur": round(total + margin, 2),
        "applied_region": region,
        "labor_hour_effective": round(labor_base * custom_multiplier, 2),
        "custom_multiplier": custom_multiplier,
    }


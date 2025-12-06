from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Tuple

from .models import AfterState


MAX_REFERENCE_IMAGES = 14  # 1 room photo + up to 13 product images


def build_after_state_from_selection(
    products_by_category: Dict[str, Dict[str, Any]],
    layout: Dict[str, Any],
    style: Dict[str, Any],
    structural_constraints: Dict[str, Any],
    render_intent: Dict[str, Any],
    room_image_path: str,
    product_image_paths: Dict[str, str],
) -> Tuple[AfterState, List[str]]:
    """
    Build an AfterState instance from user-chosen products and a validated layout.
    Returns the AfterState and the list of reference image paths (room + products),
    respecting the 14-image limit for Gemini Image.
    """
    after = AfterState(
        layout=layout,
        products=products_by_category,
        style=style,
        structural_constraints=structural_constraints,
        render_intent=render_intent,
    )

    reference_images: List[str] = []
    if room_image_path:
        reference_images.append(room_image_path)

    # Add product key images, limited to remaining slots.
    remaining = MAX_REFERENCE_IMAGES - len(reference_images)
    for product_id, img_path in product_image_paths.items():
        if remaining <= 0:
            break
        if img_path:
            reference_images.append(img_path)
            remaining -= 1

    return after, reference_images


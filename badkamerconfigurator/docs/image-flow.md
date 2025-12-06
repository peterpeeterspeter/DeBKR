# Image flow (structure-preserving, varianten max 5)

## Inputs
- Room photo (before) als referentie.
- Product key images (max 13; totaal ≤14 incl. room photo).
- Floorplan/anchors + AfterState (layout, products, style, constraints).

## Modelconfig (Gemini 3 Pro Image Preview)
- Model: `gemini-3-pro-image-preview`
- Temperatuur: 0.2–0.3
- Prompt: behoud muren/deur/raam/structuur; gebruik exact product_id’s, kleuren, finishes; geen generieke alternatieven.
- Variations: max 5 per project (afgesproken).
- Thinking level: optioneel (default).

## Call (pseudocode)
```python
from ai.image_generation import generate_after_image

image_bytes = generate_after_image(
    floorplan=floorplan_dict,
    products=after_state["products"],
    style=after_state.get("style", {}),
    constraints=after_state.get("structural_constraints", {}),
    room_image_path=Path("room_before.jpg"),
    product_image_paths=[Path("product1.jpg"), ...],  # max 13
)
with open("after_variant_1.jpg", "wb") as f:
    f.write(image_bytes)
```

## Variantbeheer
- Bewaar per project max 5 beelden (after/varianten).
- Sla prompt/seed/paths op (tabel `images` in SQLite schema).
- Markeer één variant als definitief (user-approved).

## UI gedrag
- Toon resterende beeldslots (14) bij selectie; toon resterende variant slots (5) bij image generation.
- Bij nieuwe user-instructie: update AfterState, roep image-call opnieuw aan, sla nieuwe variant op (indien slots beschikbaar).

## Opmerkingen
- Deze repo bevat geen actieve Gemini API-call in de server (offline). Gebruik `ai/image_generation.py` clientside/serverside waar keys beschikbaar zijn.
- Respecteer resolutie/latency/kosten: kies passende `image_size` (1080p/4K) en aspect_ratio die bij de foto past.


# After-beeld generatie (Gemini 3 Pro Image)

## Inputs
- Room referentiefoto (gevalideerd floorplan/structuur)
- Product key images (max 13 stuks; totaal beelden ≤ 14 incl. room photo)
- Floorplan (anchors/constraints)
- AfterState products + stijl/constraints

## Prompt principes
- Behoud muren/deur/raam/structuur uit room photo.
- Gebruik exact de product_id’s, kleuren, finishes.
- Nooit generieke alternatieven.
- Temperatuur laag (0.2–0.3) voor consistentie.

## Code helper
- `ai/image_generation.py`:
  - `make_image_prompt(floorplan, products, style, constraints)`
  - `prepare_reference_images(room_image_path, product_image_paths)`
  - `generate_after_image(...)` -> bytes (eerste image)

## Beeldenlimiet
- Max 14 beelden: 1 room photo + tot 13 product key images.
- Kies per product 1 beeld.

## Opslag
- Project images bucket: `project-images/{project_id}/{variant}.jpg`
- Bewaar prompt/seed in `images` tabel (metadata).

## Iteraties
- Nieuwe user-instructies → AfterState update → nieuwe image call.
- Max 5 varianten per project (afgesproken).


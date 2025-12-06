# Layout & fit-check

## Doel
- Gekozen producten plaatsen op floorplan anchors en basale maat-/clearance-checks geven.

## Helpers
- `ai/layout.py`
  - `apply_layout(anchors, selections)` → bouwt `AfterState.layout.fixtures` met product_id en posities.
  - `check_fit(room_width_cm, room_depth_cm, fixture_clearances)` → waarschuwingen bij overschrijding breedte/diepte of ontbrekende maatvoering.

## Data aannames
- Anchors bevatten `x, y, width, depth, height, position, mount_type, clearance_front, clearance_side`.
- Selections zijn `AfterState.products` mapping `{category: {product_id, ...}}`.

## Gebruik
1) Verzamel anchors uit gevalideerde floorplan.
2) Combineer met user-selecties: `layout = apply_layout(anchors, selections)`.
3) Bouw lijst voor fit-check: `[{"name": cat, "width": ..., "depth": ..., "x": ..., "y": ..., "clearance_front": ..., "clearance_side": ...}]`.
4) `warnings = check_fit(room_width_cm, room_depth_cm, fixture_clearances)`.
5) Toon waarschuwingen in UI; blokkeer of laat user bevestigen bij overschrijding.


# Intake / Before flow (mock UI + /api/before contract)

## Doel
- Foto upload + oriëntatiehint + basismaatvoering door gebruiker.
- Gemini-before analyse (vision) → BeforeState (fixtures, plumbing estimate, openings).
- User validatie/overlay: posities aanpassen, afmetingen invullen, anchors opslaan.

## API contract (voorstel)
- `POST /api/before`
  - Body:
    ```json
    {
      "orientation_hint": "front=door",
      "image_path": "uploads/room_before.jpg",
      "user_notes": "...",
      "dimensions_cm": { "width": 240, "depth": 300, "height": 250 }
    }
    ```
  - Response (mock):
    ```json
    {
      "before_state": {...},   // schema-conform
      "anchors": {
        "room_width_cm": 240,
        "room_depth_cm": 300,
        "toilet": { "position": "back-right", "x": 180, "y": 220, "width": 36, "depth": 54 },
        "washbasin": {...},
        "shower": {...},
        "openings": [...]
      }
    }
    ```
  - Opmerking: in deze repo blijft dit een stub/mocked output; echte Gemini-call kan later.

## Frontend (mock) stappen
1) Upload component voor room photo (bewaar lokaal pad, geen echte upload in deze skeleton).
2) Inputs: orientation_hint, breedte/diepte/hoogte (cm).
3) Call `POST /api/before` met image_path en hints → ontvang BeforeState + anchors.
4) Overlay/anchors editor (mock): toon markers, laat user schuiven/aanpassen (optioneel in deze skeleton).
5) User bevestigt → sla validated anchors + dimensions op voor volgende stap (layout).

## Beperkingen
- Geen echte file upload/API in deze skeleton; image_path is een placeholder string.
- Geen daadwerkelijke Gemini-call in deze repo; alleen contract + mock flow.


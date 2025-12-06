# Frontend (mock Next/React UI)

Deze map bevat voorbeeldcode voor een simpele UI die praat met de lokale Flask-API (`server/api.py`):
- `frontend/ui/api.ts` fetch helpers
- `frontend/ui/SelectionPage.tsx` voorbeeld component voor catalogus-selectie, fit-warnings en pricing

Gebruik in een Next-app:
1. Proxy `/api/*` naar `http://localhost:5001` (Flask) via `next.config.js` rewrites, of vervang `BASE` in `api.ts` door `http://localhost:5001`.
2. Importeer `SelectionPage` in een client component/pagina.
3. Start backend: `python server/api.py` (zorg dat `local.db` gevuld is met `ingest_catalog_sqlite.py`).

Let op:
- Dit is een skeleton; geen styling of state management lib gebruikt.
- Pas anchors, style, constraints, render_intent aan je eigen flow aan.


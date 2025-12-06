# Masterplan – Badkamerconfigurator (stand van zaken + integratie in Bolt)

## Concept (end-to-end)
1) Intake/Before: gebruiker uploadt badkamerfoto + oriëntatiehint + basisafmetingen → AI (Gemini) maakt BeforeState + anchors; gebruiker valideert/corrigeert.
2) Catalogus & selectie: gebruiker kiest producten (tegels, sanitair, verlichting, accessoires) uit catalogus (hard filters) + optioneel search-suggesties; 14-beeldenlimiet (1 room + max 13 productbeelden).
3) Layout & fit: anchors + gekozen producten → layout; fit-warnings bij overschrijding maten/clearances.
4) After-image: structure-preserving generatie (room + productbeelden); varianten max 5; user kiest final.
5) Delta → WorkPlan: Gemini (thinking) maakt taken/uren uit BeforeState + AfterState (geen prijzen).
6) Prijs: contractor-based pricing (regio/multipliers) + optioneel materiaaltotaal; admin bevestigt richtprijs.
7) Export/UX: disclaimers, scenario’s (light/mid/full), PDF/Excel met final image + kosten + werkplan.

## Wat is al gebouwd (lokale backend + helpers)
- Backend: Flask API + SQLite:
  - `/api/catalog`, `/api/selection` (AfterState + fit_warnings + reference images), `/api/pricing`, `/api/before` (Gemini of mock), `/api/image` (Gemini image → base64).
- Opslag: SQLite schema `db/schema.sql`; helpers `ai/db.py`; ingest CSV → SQLite `scripts/ingest_catalog_sqlite.py`.
- AI helpers:
  - Before (Gemini vision) `ai/before.py`.
  - Catalog filters/mapping `ai/catalog.py`, AfterState builder (14-limit) `ai/after_state_builder.py`.
  - Layout/fit-check `ai/layout.py`.
  - Image generation helper `ai/image_generation.py`.
  - WorkPlan/pricing chains `ai/chains.py`, `ai/pricing.py`.
  - Search suggestions (Gemini search-grounding) `ai/search_suggestions.py` + docs.
- Mock/demo:
  - `scripts/demo_flow.py` (selectie → AfterState → fit → pricing).
  - Frontend skeletons: `frontend/ui/SelectionPage.tsx`, `frontend/ui/IntakePage.tsx`, helpers `frontend/ui/api.ts`.
- Docs: flows, pricing, catalog ingest/UI, layout-fit, image-flow, search-grounding/integration, Bolt-plan, frontend hooks, storage-sqlite, etc.

## Integratie in Bolt (frontend)
### Omgevingsvariabelen
- `API_BASE` (backend URL, bijv. `http://localhost:5001` of je deployment).
- Server-side: `GEMINI_API_KEY` (niet client-side), voor `/api/before` en `/api/image`.
- Geen secrets in de browser; alle Gemini-calls via backend.

### API-contracten (Flask)
- GET `/api/catalog` → producten.
- POST `/api/before` → {before_state, anchors} (echte Gemini indien key, anders mock; `force_mock` optioneel).
- POST `/api/selection` → {after_state, reference_images, fit_warnings}.
- POST `/api/pricing` → {costs} (input: work_plan, region, custom_multiplier, optioneel pricing_table/materials_total).
- POST `/api/image` → {image_base64} (input: floorplan, products, style, constraints, room_image_path, product_image_paths<=13).

### Aanbevolen paginastructuur (Bolt/React)
1) `/intake`:
   - Form: orientation_hint, dimensions (cm), file upload (room photo, pad/URL naar backend).
   - Call `/api/before`; toon anchors + BeforeState; laat user corrigeren/confirm; bewaar anchors/dims/image_path.
2) `/select`:
   - Haal catalogus op; filters (category, style_tags, prijsrange, kleur/finish).
   - Productgrid met selecties; teller beeldslots (14 total = 1 room + producten).
   - Post `/api/selection` met selected_ids + anchors + style/constraints/render_intent + room_image_path; toon fit_warnings.
3) `/pricing`:
   - Bouw of kies WorkPlan (desnoods dummy); POST `/api/pricing`; toon breakdown (arbeid, materialen, contingency, margin, total).
4) `/image` (optioneel nu, later):
   - POST `/api/image` met AfterState/products + images; toon gegenereerde beelden; beheer varianten (max 5), markeer final.
5) Admin/export (later):
   - Admin-approval (pending/user-approved/admin-approved).
   - Exports PDF/CSV met final image + kosten + werkplan.

### UX-regels
- 14-beeldenlimiet: 1 room + ≤13 productbeelden.
- Varianten: max 5 per project.
- Fit-warnings: tonen en user-confirm.
- Prijzen indicatief; toon disclaimers.
- Search-suggesties: alleen als “suggested”; user moet expliciet kiezen; geen auto-prijs zonder confirm.

## GitHub → Bolt workflow
1) Repo: https://github.com/peterpeeterspeter/DeBKR (branch `main`, `.env` in .gitignore).
2) In Bolt: clone repo of import; zet env/secrets (API_BASE, GEMINI_API_KEY).
3) Zorg dat backend draait/benaderbaar (Flask op 5001 of deployment); Bolt-frontend gebruikt API_BASE voor calls.
4) Voor lokale dev: start backend `python server/api.py`; ingest catalogus `python scripts/ingest_catalog_sqlite.py data/mock/catalog.json`; gebruik rewrites of absolute API_BASE.

## Nog te doen (na Bolt-start)
- Echte upload/paths voor room/product images die backend kan lezen of via storage serveert.
- Variantbeheer UI + opslag van metadata (seed/prompt/path) in DB.
- Export (PDF/CSV) en admin-approval scherm.
- Materiaalkosten automatisch meenemen vanuit geselecteerde catalog items in UI-flow (pricing endpoint accepteert materials_total).



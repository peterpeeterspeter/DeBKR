# Bolt-frontend integratie (aanpassing masterplan)

## Context
- Backend staat lokaal (Flask + SQLite); API endpoints: /api/catalog, /api/selection, /api/pricing, /api/before (Gemini/mock), /api/image.
- Frontend wordt in Bolt gebouwd; zorg dat env/config voor API-base en GEMINI_API_KEY server-side beschikbaar zijn.

## Richtlijnen
- API-base: configureer in Bolt als env/secret; geen keys client-side.
- Gebruik dezelfde fetch-contracten als `docs/frontend-hooks.ts.md`.
- Intake-flow: roep `/api/before` met `force_mock=false` wanneer GEMINI_API_KEY aanwezig is; anders mock.
- Image-flow: `/api/image` verwacht paden naar room/productbeelden; in Bolt only if server can read them; anders upload-/path-strategie bepalen.
- Beeldslots/variant slots blijven: 14 total (1 room + 13 producten), varianten max 5.

## Aanpak Bolt
1) Zet env in Bolt: `API_BASE` (bv. https://your-backend) en server-only `GEMINI_API_KEY`.
2) Implementeer frontend calls volgens `frontend/ui/api.ts`.
3) Pages:
   - Intake: upload/oriëntatie/maten → POST /api/before → anchors tonen.
   - Selectie: filters, selectie, teller beeldslots → POST /api/selection → fit-warnings tonen.
   - Pricing: POST /api/pricing → breakdown.
   - (Optioneel) Image-generate: POST /api/image → toon base64 image; variantbeheer (max 5).
4) Materials/pricing: client kan `materials_total` meesturen naar pricing endpoint als gewenst.

## Deployment-notes
- Houd `.env` buiten repo; configureer secrets in Bolt.
- Als backend niet publiek is, overweeg tunneling/proxy tijdens dev; of host Flask apart.



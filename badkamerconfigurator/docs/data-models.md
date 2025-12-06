# Data modellen

- `schemas/before_state.schema.json`  
  - Snapshot van bestaande situatie (fixtures, materiaal, AI plumbing estimate, validation overrides, risico’s).
  - Gebruiker moet `validation.user_confirmed` zetten na het corrigeren van inschattingen.

- `schemas/after_state.schema.json`  
  - Gewenste eindsituatie met layout + catalogus product-ID’s + stijl.  
  - Bevat `structural_constraints` en `render_intent` voor beeldgeneratie.

- `schemas/work_plan.schema.json`  
  - Resultaat van delta-analyse; fases, taken, hoeveelheden, uren.  
  - Prijsvelden zijn backend-invulling; model levert geen bedragen.

- Mock data:  
  - `data/mock/catalog.json` (producten met beelden/prijs)  
  - `data/mock/pricing.json` (uurtarief, regio-multiplier, taakprijzen)


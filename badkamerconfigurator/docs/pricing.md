# Pricing ingest en gebruik

## Contractor input schema
- Velden: `invoice_id`, `date`, `region`, `task`, `category`, `qty`, `unit`, `unit_price`, `hours`, `hourly_rate`, `notes`.
- `category` moet een van `work_plan.schema` zijn: `demolition`, `plumbing`, `electrical`, `surface_prep`, `tiling`, `sanitary_install`, `painting`, `ventilation`, `cleanup`, `other`.
- `unit` whitelist: `m2`, `m`, `pcs`, `hrs`, `lump_sum`.
- `qty` en `hours` zijn numeriek; `unit_price` en `hourly_rate` in EUR.
- `region` vrij veld maar verwacht: `nl_randstad`, `nl_overig`, `be_vlaanderen`.

## Pipeline
1) Contractor levert CSV/JSON met bovengenoemde velden.
2) Script `scripts/ingest_contractor_pricing.py` leest, valideert, en berekent per `(category, unit, region)`:
   - median, p75 voor `unit_price`
   - median, p75 voor `hourly_rate`
   - aantal observaties
3) Output: `data/pricing.generated.json` met metadata (`generated_at`, `source_count`).
4) `ai/pricing.py` gebruikt `pricing.generated.json` (fallback op `data/mock/pricing.json`).

## Eenheden-mapping
- Tiling/demolition: `qty` in `m2`.
- Plumbing verlegging: `qty` in `m`.
- Electrical punten: `qty` in `pcs` of `hrs` (werkuren).
- Sanitary install: vaak `pcs` + optionele `hours`.
- Lump sum: gebruik `unit=lump_sum`, zet bedrag in `unit_price`, `qty=1`.

## Multipliers
- Regionale opslag komt uit `pricing.generated.json` (of mock); per project kun je custom multipliers toevoegen (zie `ai/pricing.py`).



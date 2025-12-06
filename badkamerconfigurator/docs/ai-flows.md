# AI flows (Gemini 3 stack + LangChain)

Doel: reproduceerbare ketens voor pro-gebruikers met valideerbare outputs. Gebruik LCEL, async, structured outputs (Pydantic), retries, en log alles naar LangSmith.

## 1) Foto → BeforeState (analyse + validatie)
- Input: foto-URI(s) + context (gebruikersnotities, oriëntatie-hint).
- Model: `gemini-3-pro-preview` (multimodaal).
- Output: `BeforeState` (zie `schemas/before_state.schema.json`) als structured output.
- UX: toon AI-inschatting + verplicht user-confirm; sla overrides op in `validation.overrides`.

```python
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel

class BeforeStateModel(BaseModel):
    # mirror schema fields (abbreviated)
    plumbing_estimate: dict
    fixtures: dict
    space: dict
    validation: dict

model = ChatGoogleGenerativeAI(
    model="gemini-3-pro-preview",
    temperature=0.2,
    safety_settings={"HARASSMENT": "BLOCK_NONE"},
)

parser = PydanticOutputParser(pydantic_object=BeforeStateModel)

prompt = (
    "Je bent loodgieter/renovatie-expert. "
    "Analyseer de foto technisch; vul alle velden van BeforeState JSON. "
    "Lever ALLEEN JSON. Gebruik duidelijke positie-termen die overeenkomen met orientation_hint."
)

chain = (
    {
        "image": lambda x: x["image_base64"],
        "metadata": lambda x: x["orientation_hint"],
    }
    | model.with_structured_output(parser)
)

result = await chain.ainvoke({"image_base64": encoded_img, "orientation_hint": "front=deur"})
# result is validated Pydantic; persist as before_state
```

## 2) Catalogus RAG → materiaalkeuze
- Data: `data/mock/catalog.json` (later echte catalogus + embeddings).
- Retriever: `SelfQueryRetriever` of eenvoudige metadata-filter (style/budget).
- Model: `gemini-3-pro-preview` (thinking mode voor betere selectie).
- Output: producten per categorie + motivaties (structured).

Pseudo-LCEL:
```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableParallel

prompt = ChatPromptTemplate.from_messages([
    ("system", "Je bent badkamer inkoper. Kies top 3 per categorie. Output JSON."),
    ("human", "Voorkeuren: {prefs}\nCatalogus: {catalog_snippets}")
])

chain = (
    RunnableParallel(
        prefs=lambda x: x["preferences"],
        catalog_snippets=lambda x: "\n".join(x["retrieved_docs"]),
    )
    | prompt
    | model.with_structured_output(parser_for_products)
)
```

## 3) After-visual (structure-preserving)
- Model: `gemini-3-pro-image-preview` met `preserve_structure=true` in prompt.
- Inputs: gevalideerde `BeforeState` + productrefs (id, kleur, finish) + referentie-foto als control.
- Output: 1..4 variaties; sla metadata (prompt, seeds) op.

Promptkern:
- Behoud muren/deur/raam uit referentiefoto.
- Gebruik exacte productnamen + kleuren.
- Respecteer `structural_constraints.allowed_plumbing_moves_m`.
- Stijl: uit `after_state.style`.

## 4) Delta → WorkPlan → kosten
- Model: `gemini-3-pro-preview` (thinking: high) met structured output naar `WorkPlan`.
- Inputs: `BeforeState`, `AfterState`, scenario-profiel (light/mid/full).
- Output: `WorkPlan` (zonder prijzen).
- Backend: prijsberekening via `data/mock/pricing.json`; AI mag geen bedragen verzinnen.

```python
from langchain_core.output_parsers import PydanticOutputParser

class WorkPlanModel(BaseModel):
    phases: list
    total_estimated_hours: float
    risk_flags: list[str] | None

workplan_chain = (
    {
        "before": lambda x: x["before_state"],
        "after": lambda x: x["after_state"],
        "scenario": lambda x: x.get("scenario", "mid"),
    }
    | model.with_structured_output(PydanticOutputParser(pydantic_object=WorkPlanModel))
)

wp = await workplan_chain.ainvoke(payload)
costs = price_engine(wp, pricing_table, region="nl_randstad")
```

## 5) Robuustheid
- Retries: configureer LangChain retry middleware (exponential backoff, max 3).
- Logging/monitoring: `LANGCHAIN_TRACING_V2=true` + LangSmith projectnaam.
- Safety: temperature laag (0-0.3) voor consistency; safety settings relaxed maar log blokkades.
- Secrets: API keys via ENV (geen hardcoded).

## 6) Artefacten opslaan
- `before_state.json`, `after_state.json`, `work_plan.json` conform schemas.
- Generated beelden + prompt metadata naast `after_state`.
- Audit trail: welke overrides gebruiker deed.


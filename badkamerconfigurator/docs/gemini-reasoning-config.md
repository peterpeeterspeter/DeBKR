# Gemini Pro Reasoning Configuration

## Overview

Het badkamer configurator systeem gebruikt **Gemini 2.0 Flash Experimental** met **ThinkingBudget.HIGH** voor intelligente badkamer analyse tijdens de intake fase.

## Model Configuratie

### Model: gemini-2.0-flash-exp

Gekozen om:
- Multimodal capabilities (text + image input)
- Structured output support via `response_schema`
- Reasoning capabilities met thinking budget
- Snelle response times
- Cost-effectief voor productie gebruik

### Reasoning Level: HIGH

```python
thinking_config=types.ThinkingConfig(
    thinking_budget=types.ThinkingBudget.HIGH
)
```

**HIGH reasoning level** betekent:
- Diepere analyse van de badkamerfoto
- Meer tijd voor redeneren over fixture posities
- Betere plausibiliteit checks
- Nauwkeuriger leidingen inschatting
- Hogere betrouwbaarheid in complexe layouts

### Response Schema

Het systeem gebruikt structured output via JSON schema om consistente, parsable output te garanderen:

```python
generation_config = types.GenerateContentConfig(
    thinking_config=types.ThinkingConfig(
        thinking_budget=types.ThinkingBudget.HIGH
    ),
    response_mime_type="application/json",
    response_schema=BEFORE_STATE_SCHEMA,
    temperature=0.2
)
```

**Key parameters:**
- `response_mime_type="application/json"`: Forces JSON output
- `response_schema`: Enforces BeforeState JSON structure
- `temperature=0.2`: Low temperature voor consistente, deterministische output

## BeforeState Schema

Het schema definieert de exacte structuur van de geanalyseerde badkamer state:

```json
{
  "schema_version": "0.1.0",
  "captured_at": null,
  "source_media": ["path/to/image.jpg"],
  "space": {
    "orientation_hint": "front=door",
    "dimensions_cm": {
      "width": 240,
      "depth": 300,
      "height": 250
    },
    "floorplan_shape": "rectangular",
    "entrance": {
      "position": "front-left",
      "width_cm": 80
    }
  },
  "fixtures": {
    "toilet": {
      "present": true,
      "position": "back-right"
    },
    "washbasin": {
      "present": true,
      "position": "left"
    },
    "shower": {
      "present": true,
      "position": "right"
    },
    "bathtub": {
      "present": false
    }
  },
  "plumbing_estimate": {
    "water_inlet_likely": "wall_right",
    "waste_outlet_likely": "floor_back",
    "confidence": "medium"
  },
  "validation": {
    "user_confirmed": false
  }
}
```

## Analyse Prompt

De prompt is geoptimaliseerd voor technische badkamer analyse:

```
Je bent een ervaren loodgieter en badkamer renovatie-expert.
Analyseer deze badkamerfoto grondig en technisch.

Oriëntatie hint: {orientation_hint}
Gegeven afmetingen: {dimensions_cm}

Analyseer en detecteer:
1. Welke fixtures zijn aanwezig (toilet, wastafel, douche, bad)
2. Waar bevinden deze fixtures zich (posities: left, right, back, front, center)
3. Waar is waarschijnlijk de waterinlaat (wall_left, wall_right, wall_back, floor)
4. Waar is waarschijnlijk de afvoer (floor_left, floor_right, floor_back, floor_front, wall)
5. Hoe betrouwbaar is je inschatting van de leidingen (low/medium/high)
6. Vorm van de ruimte (rectangular, l_shaped, irregular)
7. Positie van de deur en eventuele ramen

Gebruik de gegeven afmetingen voor de dimensions_cm velden.
Geef nauwkeurige posities aan op basis van wat je ziet in de foto.
Wees conservatief met de confidence level - als het niet duidelijk is,
gebruik dan 'medium' of 'low'.
```

## Confidence Levels

Het model geeft een confidence level voor de plumbing estimate:

- **HIGH**: Leidingen zijn duidelijk zichtbaar of logisch afleidbaar
- **MEDIUM**: Waarschijnlijke positie gebaseerd op fixture plaatsing
- **LOW**: Onzeker, meerdere mogelijkheden of obstructed view

## Error Handling

De `analyze_before()` functie heeft robuuste error handling:

1. Controleert of `GEMINI_API_KEY` is ingesteld
2. Valideert image path bestaat
3. Parsed JSON response
4. Falls back naar user-provided dimensions indien AI ze niet detect
5. Raises exception bij API errors (caught door Flask endpoint)

## Mock Mode

Zonder `GEMINI_API_KEY` of met `force_mock=True`:

```python
def mock_response():
    before_state = {
        "schema_version": "0.1.0",
        "space": {...},
        "fixtures": {
            "toilet": {"present": True, "position": "back-right"},
            "washbasin": {"present": True, "position": "left"},
            "shower": {"present": True, "position": "right"}
        },
        "plumbing_estimate": {
            "water_inlet_likely": "wall_right",
            "waste_outlet_likely": "floor_back",
            "confidence": "medium"
        }
    }
    return before_state
```

Mock mode geeft een standaard badkamer layout met typische posities.

## Usage in API

```python
from ai.before import analyze_before

# With AI
result = analyze_before(
    image_path=Path("uploads/bathroom.jpg"),
    orientation_hint="front=door",
    dimensions_cm={"width": 240, "depth": 300, "height": 250}
)

# Returns BeforeState dict with detected fixtures
```

## Cost Optimization

ThinkingBudget.HIGH heeft hogere API kosten maar geeft:
- Betere accuracy (minder handmatige correcties)
- Hogere user satisfaction
- Minder failed projects
- ROI is positief door minder handmatig werk

Voor cost-sensitive scenarios:
- Gebruik ThinkingBudget.MEDIUM voor standaard badkamers
- Gebruik HIGH alleen voor complexe layouts
- Cache resultaten in Supabase (already implemented)

## Monitoring & Analytics

Track via Supabase `before_states` table:
- `confidence` level distribution
- Fixture detection accuracy
- User confirmations vs AI predictions
- Error rates per bathroom type

## Future Improvements

1. **Adaptive reasoning budget**: Use MEDIUM for simple layouts, HIGH for complex
2. **Multi-shot analysis**: Take multiple photos for 3D reconstruction
3. **Fine-tuning**: Train custom model on annotated bathroom dataset
4. **Validation loop**: Ask clarifying questions if confidence is low
5. **Vision + LLM chain**: Combine vision analysis with reasoning chain

## References

- [Google AI Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [Thinking & Reasoning](https://ai.google.dev/gemini-api/docs/thinking-mode)
- [Structured Output](https://ai.google.dev/gemini-api/docs/json-mode)

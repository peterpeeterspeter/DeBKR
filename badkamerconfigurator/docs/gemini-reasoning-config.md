# Gemini 3 Pro Reasoning Configuration

## Overview

Het badkamer configurator systeem gebruikt **Gemini 3 Pro** met **thinking_level="high"** voor intelligente badkamer analyse tijdens de intake fase.

## Model Configuratie

### Model: gemini-3-pro-preview

Gekozen om:
- Multimodal capabilities (text + image input)
- Structured output support via `response_schema`
- Advanced reasoning capabilities met thinking levels
- 1M token context window voor complexe analyse
- Most capable Gemini model (Jan 2025 knowledge cutoff)
- Native JSON schema enforcement

### Thinking Level: HIGH

```python
thinking_config=types.ThinkingConfig(
    thinking_level="high"
)
```

**HIGH thinking level** betekent:
- Diepere analyse van de badkamerfoto
- Meer tijd voor redeneren over fixture posities
- Betere plausibiliteit checks
- Nauwkeuriger leidingen inschatting
- Hogere betrouwbaarheid in complexe layouts
- Default voor Gemini 3 Pro

**Alternatief: LOW** voor snellere responses:
- Minimale latentie
- Lagere kosten
- Geschikt voor simpele, duidelijke foto's
- Expliciet instellen met `thinking_level="low"`

**MEDIUM** wordt niet ondersteund in Gemini 3.

### Response Schema

Het systeem gebruikt structured output via JSON schema om consistente, parsable output te garanderen:

```python
generation_config = types.GenerateContentConfig(
    thinking_config=types.ThinkingConfig(
        thinking_level="high"
    ),
    response_mime_type="application/json",
    response_schema=BEFORE_STATE_SCHEMA,
    temperature=1.0
)
```

**Key parameters:**
- `thinking_level="high"`: Deep reasoning (default)
- `response_mime_type="application/json"`: Forces JSON output
- `response_schema`: Enforces BeforeState JSON structure
- `temperature=1.0`: **CRITICAL - moet 1.0 blijven voor Gemini 3!**

**Waarom temperature 1.0?**
Van de officiële Gemini 3 docs:
> "For Gemini 3, we strongly recommend keeping the temperature parameter at its default value of 1.0. Changing the temperature (setting it below 1.0) may lead to unexpected behavior, such as looping or degraded performance, particularly in complex mathematical or reasoning tasks."

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
3. Parsed JSON response (gegarandeerd door response_schema)
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

# With AI (Gemini 3 Pro with thinking_level="high")
result = analyze_before(
    image_path=Path("uploads/bathroom.jpg"),
    orientation_hint="front=door",
    dimensions_cm={"width": 240, "depth": 300, "height": 250}
)

# Returns BeforeState dict with detected fixtures
```

## Cost Optimization

**Gemini 3 Pro pricing:**
- Input: $2/1M tokens (<200k) or $4/1M tokens (>200k)
- Output: $12/1M tokens (<200k) or $18/1M tokens (>200k)
- ~$0.0027 per bathroom analysis

**thinking_level="high"** heeft hogere kosten maar geeft:
- Betere accuracy (minder handmatige correcties)
- Hogere user satisfaction
- Minder failed projects
- ROI is positief door minder handmatig werk

Voor cost-sensitive scenarios:
- Gebruik `thinking_level="low"` voor standaard badkamers (~40% goedkoper)
- Gebruik `media_resolution="medium"` voor images
- HIGH alleen voor complexe layouts
- Cache resultaten in Supabase (already implemented)
- Enable context caching voor prompts (min 2,048 tokens)

## Monitoring & Analytics

Track via Supabase `before_states` table:
- `confidence` level distribution
- Fixture detection accuracy
- User confirmations vs AI predictions
- Error rates per bathroom type
- Thinking level usage (high vs low)
- Response times

## Migratie van Gemini 2.x

Als je migreert van Gemini 2.x Flash of Pro:

**Changes:**
1. Model: `gemini-2.0-flash-exp` → `gemini-3-pro-preview`
2. Parameter: `thinking_budget` → `thinking_level`
3. Values: `ThinkingBudget.HIGH` → `"high"` (string)
4. Temperature: `0.2` → `1.0` (kritisch!)
5. Context: 128k → 1M tokens

**Oude code (Gemini 2.0):**
```python
config = types.GenerateContentConfig(
    thinking_config=types.ThinkingConfig(
        thinking_budget=types.ThinkingBudget.HIGH
    ),
    response_mime_type="application/json",
    response_schema=BEFORE_STATE_SCHEMA,
    temperature=0.2
)

response = client.models.generate_content(
    model="gemini-2.0-flash-exp",
    contents=contents,
    config=config
)
```

**Nieuwe code (Gemini 3.0):**
```python
config = types.GenerateContentConfig(
    thinking_config=types.ThinkingConfig(
        thinking_level="high"
    ),
    response_mime_type="application/json",
    response_schema=BEFORE_STATE_SCHEMA,
    temperature=1.0
)

response = client.models.generate_content(
    model="gemini-3-pro-preview",
    contents=contents,
    config=config
)
```

## Future Improvements

1. **Adaptive thinking level**: Use LOW for simple layouts, HIGH for complex
2. **Multi-shot analysis**: Take multiple photos for 3D reconstruction
3. **Fine-tuning**: Train custom model on annotated bathroom dataset
4. **Validation loop**: Ask clarifying questions if confidence is low
5. **Vision + reasoning chain**: Combine vision analysis with multi-step reasoning
6. **Context caching**: Cache system prompt to reduce costs

## References

- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3)
- [Text Generation](https://ai.google.dev/gemini-api/docs/text-generation)
- [Thinking Levels](https://ai.google.dev/gemini-api/docs/thinking)
- [Structured Output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Pricing](https://ai.google.dev/gemini-api/docs/pricing)

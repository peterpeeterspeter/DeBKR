# Gemini 3 Pro Setup Guide

## Quick Start

1. **Get API Key**
   ```bash
   # Visit: https://aistudio.google.com/app/apikey
   # Create a new API key
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY
   ```

3. **Install Python Package**
   ```bash
   pip install google-genai>=1.0.0
   ```

4. **Test Configuration**
   ```bash
   python badkamerconfigurator/scripts/test_gemini_analysis.py
   ```

## Configuration Details

### Model Used
- **Name**: `gemini-3-pro-preview`
- **Type**: Multimodal (text + image input)
- **Context Window**: 1M tokens input / 64k tokens output
- **Knowledge Cutoff**: January 2025

### Why Gemini 3 Pro?

1. **Advanced Reasoning**: Supports `thinking_level` for deep analysis
2. **Structured Output**: Native JSON schema enforcement via `response_schema`
3. **Vision + Language**: Analyzes photos with technical understanding
4. **Long Context**: 1M token window for complex analysis
5. **Latest Model**: Most capable Gemini model with enhanced reasoning

### Configuration Parameters

```python
generation_config = types.GenerateContentConfig(
    thinking_config=types.ThinkingConfig(
        thinking_level="high"  # Deep reasoning mode
    ),
    response_mime_type="application/json",        # Force JSON output
    response_schema=BEFORE_STATE_SCHEMA,          # Enforce structure
    temperature=1.0                               # Keep at default for Gemini 3
)
```

## Thinking Levels Comparison

| Level | Use Case | Analysis Depth | Response Time | Cost |
|-------|----------|----------------|---------------|------|
| **HIGH** (default) | Complex layouts, uncertain fixtures | Deep, multi-step reasoning | ~3-5s | Higher |
| **MEDIUM** | Not supported in Gemini 3 | N/A | N/A | N/A |
| **LOW** | Simple, clear photos | Quick analysis | ~1-2s | Lower |

**Our choice**: HIGH (default) for accurate fixture detection and plumbing estimation.

**Important:** Gemini 3 defaults to HIGH thinking level. For simple tasks, explicitly set `thinking_level="low"` to reduce latency and cost.

## Temperature Setting

**CRITICAL:** Gemini 3 Pro must use `temperature=1.0` (default).

From the official docs:
> "For Gemini 3, we strongly recommend keeping the temperature parameter at its default value of 1.0. While previous models often benefited from tuning temperature to control creativity versus determinism, Gemini 3's reasoning capabilities are optimized for the default setting. Changing the temperature (setting it below 1.0) may lead to unexpected behavior, such as looping or degraded performance, particularly in complex mathematical or reasoning tasks."

## What Gets Analyzed?

The AI analyzes and outputs:

### 1. Fixtures Detection
```json
{
  "fixtures": {
    "toilet": {"present": true, "position": "back-right"},
    "washbasin": {"present": true, "position": "left"},
    "shower": {"present": true, "position": "right"},
    "bathtub": {"present": false}
  }
}
```

**Positions**: left, right, back, front, center, back-left, back-right, front-left, front-right

### 2. Plumbing Estimation
```json
{
  "plumbing_estimate": {
    "water_inlet_likely": "wall_right",
    "waste_outlet_likely": "floor_back",
    "confidence": "medium"
  }
}
```

**Water inlet options**: wall_left, wall_right, wall_back, wall_front, floor, unknown

**Waste outlet options**: floor_left, floor_right, floor_back, floor_front, wall, unknown

**Confidence levels**: low, medium, high

### 3. Space Analysis
```json
{
  "space": {
    "floorplan_shape": "rectangular",
    "entrance": {
      "position": "front-left",
      "width_cm": 80
    }
  }
}
```

**Shapes**: rectangular, l_shaped, irregular

## Prompt Engineering

The analysis prompt guides the AI:

```
Je bent een ervaren loodgieter en badkamer renovatie-expert.
Analyseer deze badkamerfoto grondig en technisch.

Analyseer en detecteer:
1. Welke fixtures zijn aanwezig (toilet, wastafel, douche, bad)
2. Waar bevinden deze fixtures zich (posities: left, right, back, front)
3. Waar is waarschijnlijk de waterinlaat
4. Waar is waarschijnlijk de afvoer
5. Hoe betrouwbaar is je inschatting (low/medium/high)
6. Vorm van de ruimte (rectangular, l_shaped, irregular)
7. Positie van de deur en eventuele ramen
```

**Key aspects**:
- Role: Expert plumber/renovator
- Language: Dutch (matches target audience)
- Technical focus: Fixtures, plumbing, structure
- Confidence awareness: Conservative estimation

## Structured Output Schema

The response schema enforces consistent JSON structure:

```python
BEFORE_STATE_SCHEMA = {
    "type": "object",
    "properties": {
        "schema_version": {"type": "string"},
        "space": {...},
        "fixtures": {...},
        "plumbing_estimate": {...},
        "validation": {...}
    },
    "required": ["schema_version", "space", "fixtures", "plumbing_estimate"]
}
```

**Benefits**:
- No JSON parsing errors
- Type safety
- Enum validation (positions, confidence levels)
- Required fields guaranteed

## Testing

### Mock Mode (No API Key)
```bash
python badkamerconfigurator/scripts/test_gemini_analysis.py
```

Returns default fixture layout for testing without API costs.

### Real AI Analysis
```bash
export GEMINI_API_KEY=your_key
python badkamerconfigurator/scripts/test_gemini_analysis.py
```

Requires a test bathroom image at: `badkamerconfigurator/scripts/test_bathroom_real.jpg`

### Frontend Testing

1. Start backend: `python badkamerconfigurator/server/api.py`
2. Start frontend: `npm run dev`
3. Upload bathroom photo
4. Check "Gebruik AI analyse" checkbox
5. Click "Analyseer Badkamer"

## Cost Estimation

**Gemini 3 Pro pricing** (as of December 2024):
- Input: $2 per 1M tokens (<200k context) / $4 per 1M tokens (>200k context)
- Output: $12 per 1M tokens (<200k context) / $18 per 1M tokens (>200k context)
- Images: ~1120 tokens per image (at high resolution)

**Per bathroom analysis**:
- Input: ~1500 tokens (prompt + image encoding at high resolution)
- Output: ~200 tokens (JSON response)
- Cost: ~$0.0027 per analysis (high thinking level)

**Monthly estimates**:
- 1000 analyses: ~$2.70
- 10000 analyses: ~$27.00
- 100000 analyses: ~$270.00

**Cost optimization:**
- Use `thinking_level="low"` for simple bathrooms to reduce cost by ~40%
- Use `media_resolution="medium"` for images to reduce tokens
- Cache prompts with context caching (min 2,048 tokens)

## Error Handling

The system gracefully handles:

1. **No API Key**: Falls back to mock mode
2. **API Errors**: Returns error message, user can retry
3. **Invalid Images**: Validates file format and size (max 16MB)
4. **Rate Limits**: Shows error, suggests retry later
5. **Network Issues**: Timeout with helpful error message

## Best Practices

1. **Image Quality**: Use well-lit, clear photos
2. **Orientation**: Provide accurate orientation hint
3. **Dimensions**: Enter precise measurements
4. **Multiple Photos**: Consider taking 2-3 angles for better analysis
5. **Validation**: Always review AI output with user confirmation
6. **Temperature**: Keep at 1.0 (default) - don't change it!

## Monitoring

Track in production:
- Confidence level distribution
- Error rates
- Response times
- User confirmations vs AI predictions
- API costs
- Thinking level usage (high vs low)

Data stored in Supabase `before_states` table for analytics.

## Migration from Gemini 2.x

If migrating from Gemini 2.x Flash or Pro:

1. **Model name**: Change `gemini-2.0-flash-exp` → `gemini-3-pro-preview`
2. **Thinking parameter**: Change `thinking_budget` → `thinking_level`
3. **Thinking values**: Change `ThinkingBudget.HIGH` → `"high"` (string)
4. **Temperature**: Change `0.2` → `1.0` (keep at default)
5. **Context window**: Now 1M tokens (up from 128k)

Example migration:

**Before (Gemini 2.0):**
```python
config = types.GenerateContentConfig(
    thinking_config=types.ThinkingConfig(
        thinking_budget=types.ThinkingBudget.HIGH
    ),
    temperature=0.2
)
response = client.models.generate_content(
    model="gemini-2.0-flash-exp",
    contents=contents,
    config=config
)
```

**After (Gemini 3.0):**
```python
config = types.GenerateContentConfig(
    thinking_config=types.ThinkingConfig(
        thinking_level="high"
    ),
    temperature=1.0
)
response = client.models.generate_content(
    model="gemini-3-pro-preview",
    contents=contents,
    config=config
)
```

## Alternatives Considered

| Model | Pros | Cons | Decision |
|-------|------|------|----------|
| GPT-4 Vision | Excellent vision | Higher cost, no reasoning | ❌ Too expensive |
| Claude 3.5 Sonnet | Strong reasoning | No native JSON schema | ❌ Limited structure |
| Gemini 3 Pro | Reasoning + JSON + Vision | Perfect fit | ✅ **Selected** |
| Gemini 2.x Flash | Fast, cheap | Less accurate reasoning | ❌ Not as good |

## Future Enhancements

1. **Adaptive thinking**: AUTO select HIGH/LOW based on image complexity
2. **Multi-photo analysis**: Combine multiple angles for 3D understanding
3. **Confidence calibration**: Track accuracy to tune confidence thresholds
4. **Context caching**: Cache prompt templates to reduce costs
5. **Validation loop**: Ask clarifying questions if confidence < medium

## Troubleshooting

### Common Issues

**Error: "thinking_budget not supported"**
- Solution: Use `thinking_level` instead of `thinking_budget`
- Gemini 3 changed the parameter name

**Poor quality responses / looping**
- Solution: Ensure `temperature=1.0` (default)
- Don't lower temperature below 1.0 in Gemini 3

**High API costs**
- Solution: Use `thinking_level="low"` for simple cases
- Use media_resolution="medium" for images
- Enable context caching for repeated prompts

**Model not found error**
- Solution: Ensure you're using `gemini-3-pro-preview`
- Check API key has access to Gemini 3 models

## Support

Issues with Gemini configuration:
1. Check API key validity at https://aistudio.google.com
2. Verify `google-genai` package version: `pip show google-genai`
3. Test with mock mode first to isolate issues
4. Check Flask console for detailed error traces
5. Review official docs: https://ai.google.dev/gemini-api/docs/gemini-3

## References

- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3)
- [Text Generation Guide](https://ai.google.dev/gemini-api/docs/text-generation)
- [Structured Output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Thinking Levels](https://ai.google.dev/gemini-api/docs/thinking)
- [Pricing](https://ai.google.dev/gemini-api/docs/pricing)

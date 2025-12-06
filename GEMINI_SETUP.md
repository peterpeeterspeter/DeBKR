# Gemini Pro Reasoning Setup Guide

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
- **Name**: `gemini-2.0-flash-exp`
- **Type**: Multimodal (text + image input)
- **Reasoning**: ThinkingBudget.HIGH

### Why Gemini 2.0 Flash Experimental?

1. **Reasoning Capabilities**: Supports ThinkingBudget for deep analysis
2. **Structured Output**: Native JSON schema enforcement
3. **Vision + Language**: Analyzes photos with technical understanding
4. **Cost-Effective**: Balanced performance vs cost
5. **Fast**: Suitable for real-time web applications

### Configuration Parameters

```python
generation_config = types.GenerateContentConfig(
    thinking_config=types.ThinkingConfig(
        thinking_budget=types.ThinkingBudget.HIGH  # Deep reasoning
    ),
    response_mime_type="application/json",        # Force JSON output
    response_schema=BEFORE_STATE_SCHEMA,          # Enforce structure
    temperature=0.2                               # Low randomness
)
```

## Reasoning Levels Comparison

| Level | Use Case | Analysis Depth | Response Time | Cost |
|-------|----------|----------------|---------------|------|
| **HIGH** | Complex layouts, uncertain fixtures | Deep, multi-step reasoning | ~3-5s | Higher |
| **MEDIUM** | Standard bathrooms | Moderate analysis | ~2-3s | Medium |
| **LOW** | Simple, clear photos | Quick analysis | ~1-2s | Lower |

**Our choice**: HIGH for accurate fixture detection and plumbing estimation.

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

**Gemini 2.0 Flash pricing** (as of Dec 2024):
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens
- Images: ~258 tokens per image

**Per bathroom analysis**:
- Input: ~500 tokens (prompt + image encoding)
- Output: ~200 tokens (JSON response)
- Cost: ~$0.0002 per analysis

**Monthly estimates**:
- 1000 analyses: ~$0.20
- 10000 analyses: ~$2.00
- 100000 analyses: ~$20.00

ThinkingBudget.HIGH adds ~20-30% to base cost but provides much better accuracy.

## Error Handling

The system gracefully handles:

1. **No API Key**: Falls back to mock mode
2. **API Errors**: Returns error message, user can retry
3. **Invalid Images**: Validates file format and size
4. **Rate Limits**: Shows error, suggests retry later
5. **Network Issues**: Timeout with helpful error message

## Best Practices

1. **Image Quality**: Use well-lit, clear photos
2. **Orientation**: Provide accurate orientation hint
3. **Dimensions**: Enter precise measurements
4. **Multiple Photos**: Consider taking 2-3 angles (future feature)
5. **Validation**: Always review AI output with user confirmation

## Monitoring

Track in production:
- Confidence level distribution
- Error rates
- Response times
- User confirmations vs AI predictions
- API costs

Data stored in Supabase `before_states` table for analytics.

## Alternatives Considered

| Model | Pros | Cons | Decision |
|-------|------|------|----------|
| GPT-4 Vision | Excellent vision | Higher cost, no reasoning | ❌ Too expensive |
| Claude 3 | Strong reasoning | No structured output yet | ❌ Limited JSON |
| Gemini Pro | Reasoning + JSON | Perfect fit | ✅ **Selected** |
| Open source | Free | Self-hosting complexity | ❌ Not worth it |

## Future Enhancements

1. **Adaptive reasoning**: AUTO select HIGH/MEDIUM based on image complexity
2. **Multi-photo analysis**: Combine multiple angles for 3D understanding
3. **Confidence calibration**: Track accuracy to tune confidence thresholds
4. **Custom fine-tuning**: Train on annotated bathroom dataset
5. **Validation loop**: Ask clarifying questions if confidence < medium

## Support

Issues with Gemini configuration:
1. Check API key validity at https://aistudio.google.com
2. Verify `google-genai` package version: `pip show google-genai`
3. Test with mock mode first to isolate issues
4. Check Flask console for detailed error traces
5. Review `badkamerconfigurator/docs/gemini-reasoning-config.md`

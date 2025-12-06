from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from typing import Any, Dict

from google import genai
from google.genai import types

BEFORE_STATE_SCHEMA = {
    "type": "object",
    "properties": {
        "schema_version": {
            "type": "string",
            "description": "Version of the schema, use '0.1.0'"
        },
        "captured_at": {
            "type": ["string", "null"],
            "description": "ISO timestamp or null"
        },
        "source_media": {
            "type": "array",
            "items": {"type": "string"},
            "description": "List of source image paths"
        },
        "space": {
            "type": "object",
            "properties": {
                "orientation_hint": {
                    "type": "string",
                    "description": "Orientation hint provided by user"
                },
                "dimensions_cm": {
                    "type": "object",
                    "properties": {
                        "width": {"type": "number"},
                        "depth": {"type": "number"},
                        "height": {"type": "number"}
                    },
                    "required": ["width", "depth", "height"]
                },
                "floorplan_shape": {
                    "type": "string",
                    "enum": ["rectangular", "l_shaped", "irregular"],
                    "description": "Shape of the bathroom floorplan"
                },
                "entrance": {
                    "type": "object",
                    "properties": {
                        "position": {
                            "type": "string",
                            "description": "Position of the door entrance"
                        },
                        "width_cm": {"type": "number"}
                    }
                }
            },
            "required": ["orientation_hint", "dimensions_cm", "floorplan_shape"]
        },
        "fixtures": {
            "type": "object",
            "properties": {
                "toilet": {
                    "type": "object",
                    "properties": {
                        "present": {"type": "boolean"},
                        "position": {"type": "string"}
                    },
                    "required": ["present"]
                },
                "washbasin": {
                    "type": "object",
                    "properties": {
                        "present": {"type": "boolean"},
                        "position": {"type": "string"}
                    },
                    "required": ["present"]
                },
                "shower": {
                    "type": "object",
                    "properties": {
                        "present": {"type": "boolean"},
                        "position": {"type": "string"}
                    },
                    "required": ["present"]
                },
                "bathtub": {
                    "type": "object",
                    "properties": {
                        "present": {"type": "boolean"},
                        "position": {"type": "string"}
                    },
                    "required": ["present"]
                }
            },
            "required": ["toilet", "washbasin", "shower", "bathtub"]
        },
        "plumbing_estimate": {
            "type": "object",
            "properties": {
                "water_inlet_likely": {
                    "type": "string",
                    "enum": ["wall_left", "wall_right", "wall_back", "wall_front", "floor", "unknown"]
                },
                "waste_outlet_likely": {
                    "type": "string",
                    "enum": ["floor_left", "floor_right", "floor_back", "floor_front", "wall", "unknown"]
                },
                "confidence": {
                    "type": "string",
                    "enum": ["low", "medium", "high"]
                }
            },
            "required": ["water_inlet_likely", "waste_outlet_likely", "confidence"]
        },
        "validation": {
            "type": "object",
            "properties": {
                "user_confirmed": {"type": "boolean"}
            },
            "required": ["user_confirmed"]
        }
    },
    "required": ["schema_version", "space", "fixtures", "plumbing_estimate", "validation"]
}

ANALYSIS_PROMPT = """Je bent een ervaren loodgieter en badkamer renovatie-expert. Analyseer deze badkamerfoto grondig en technisch.

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
Wees conservatief met de confidence level - als het niet duidelijk is, gebruik dan 'medium' of 'low'."""


def analyze_before(
    image_path: Path,
    orientation_hint: str,
    dimensions_cm: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Calls Gemini 3 Pro with thinking_level='high' to analyze bathroom photo.
    Returns structured BeforeState JSON using response schema.

    Uses gemini-3-pro-preview with:
    - thinking_level: "high" for deep reasoning
    - response_mime_type: "application/json" for structured output
    - response_schema: enforces BeforeState JSON structure
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")

    client = genai.Client(api_key=api_key)

    img_bytes = image_path.read_bytes()
    img_b64 = base64.standard_b64encode(img_bytes).decode("utf-8")

    prompt = ANALYSIS_PROMPT.format(
        orientation_hint=orientation_hint,
        dimensions_cm=json.dumps(dimensions_cm)
    )

    contents = [
        types.Part.from_text(text=prompt),
        types.Part.from_bytes(
            data=img_bytes,
            mime_type="image/jpeg"
        )
    ]

    generation_config = types.GenerateContentConfig(
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
        config=generation_config
    )

    result_text = response.text
    data = json.loads(result_text)

    space = data.get("space", {})
    dims = space.get("dimensions_cm", {})
    for k, v in dimensions_cm.items():
        if k not in dims or dims[k] is None:
            dims[k] = v

    if "source_media" not in data:
        data["source_media"] = [str(image_path)]

    if "captured_at" not in data:
        data["captured_at"] = None

    space["orientation_hint"] = orientation_hint

    return data



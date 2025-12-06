from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from typing import Any, Dict

from google import genai

DEFAULT_PROMPT = """
Je bent loodgieter/renovatie-expert. Analyseer de badkamerfoto technisch.
Geef ALLEEN JSON met deze velden:
{
  "schema_version": "0.1.0",
  "space": {
    "orientation_hint": "...",
    "dimensions_cm": {"width": number, "depth": number, "height": number},
    "floorplan_shape": "rectangular"
  },
  "fixtures": {
    "toilet": {"present": bool, "position": "string"},
    "washbasin": {"present": bool, "position": "string"},
    "shower": {"present": bool, "position": "string"},
    "bathtub": {"present": bool, "position": "string"}
  },
  "plumbing_estimate": {
    "water_inlet_likely": "wall_left|wall_right|wall_back|wall_front|floor|unknown",
    "waste_outlet_likely": "floor_left|floor_right|floor_back|floor_front|wall|unknown",
    "confidence": "low|medium|high"
  },
  "validation": {"user_confirmed": false}
}
Vul missende afmetingen uit de meegegeven dimensies. Geen extra tekst.
"""


def analyze_before(
    image_path: Path,
    orientation_hint: str,
    dimensions_cm: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Calls Gemini 3 Pro Vision to produce a BeforeState-like JSON.
    Raises on error.
    """
    client = genai.Client()
    img_b64 = base64.standard_b64encode(image_path.read_bytes()).decode("utf-8")
    prompt = DEFAULT_PROMPT.replace("orientation_hint", orientation_hint)
    contents = [
        {"text": prompt},
        {"inline_data": {"mime_type": "image/jpeg", "data": img_b64}},
    ]
    resp = client.models.generate_content(
        model="gemini-3-pro-preview",
        contents=contents,
    )
    txt = resp.text or ""
    try:
        data = json.loads(txt)
    except Exception:
        # try to extract JSON block
        start = txt.find("{")
        end = txt.rfind("}")
        if start != -1 and end != -1:
            data = json.loads(txt[start : end + 1])
        else:
            raise

    # Fill in dimensions if missing
    space = data.setdefault("space", {})
    dims = space.setdefault("dimensions_cm", {})
    for k, v in dimensions_cm.items():
        if v is not None and k not in dims:
            dims[k] = v
    space.setdefault("orientation_hint", orientation_hint)
    space.setdefault("floorplan_shape", "rectangular")
    data.setdefault("schema_version", "0.1.0")
    data.setdefault("validation", {"user_confirmed": False})
    return data



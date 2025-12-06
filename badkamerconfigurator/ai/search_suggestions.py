from __future__ import annotations

import hashlib
from typing import Any, Dict, List

from google import genai
from google.genai import types


def _hash_id(url: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest()[:12]


def search_products(query: str, max_results: int = 5, thinking_level: str = "low") -> List[Dict[str, Any]]:
    """
    Use Gemini 3 Pro with Google Search grounding to fetch product suggestions.
    Returns normalized list (product_id, name, price_eur?, image_url, url, category?, style_tags).
    """
    client = genai.Client()
    response = client.models.generate_content(
        model="gemini-3-pro-preview",
        contents=query,
        config=types.GenerateContentConfig(
            tools=[{"google_search": {}}],
            thinking_config=types.ThinkingConfig(thinking_level=thinking_level),
        ),
    )

    text = response.text or ""
    # Expecting a simple JSON-ish list; if not, try to parse line-wise
    suggestions: List[Dict[str, Any]] = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        # naive parse: expect key: value pairs separated by ';'
        # Example line: "name: Matte wastafel, price_eur: 550, image_url: http..., url: http..., category: washbasin"
        fields = {}
        for part in line.split(","):
            if ":" in part:
                k, v = part.split(":", 1)
                fields[k.strip()] = v.strip()
        if not fields:
            continue
        url = fields.get("url") or fields.get("link") or ""
        pid = _hash_id(url) if url else _hash_id(fields.get("name", "suggestion"))
        price_val = None
        try:
            price_val = float(fields["price_eur"])
        except Exception:
            price_val = None

        suggestions.append(
            {
                "product_id": pid,
                "name": fields.get("name"),
                "price_eur": price_val,
                "image_url": fields.get("image_url"),
                "url": url,
                "category": fields.get("category"),
                "style_tags": [s.strip() for s in fields.get("style_tags", "").split(";") if s.strip()],
                "source": "search",
            }
        )
        if len(suggestions) >= max_results:
            break
    return suggestions



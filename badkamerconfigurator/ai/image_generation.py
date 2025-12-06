from __future__ import annotations

import base64
from pathlib import Path
from typing import Any, Dict, List, Optional

from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

IMAGE_MODEL = "gemini-3-pro-image-preview"


def _image_model() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=IMAGE_MODEL,
        temperature=0.25,
        max_output_tokens=2048,
    )


def encode_image_file(path: Path) -> str:
    data = Path(path).read_bytes()
    return base64.standard_b64encode(data).decode("utf-8")


def make_image_prompt(
    floorplan: Dict[str, Any],
    products: Dict[str, Any],
    style: Dict[str, Any],
    constraints: Dict[str, Any],
) -> str:
    return (
        "Je bent architect. Genereer een fotorealistische after-visual.\n"
        "Behoud structuur (muren/deur/raam) volgens floorplan.\n"
        f"Floorplan: {floorplan}\n"
        f"Producten: {products}\n"
        f"Stijl: {style}\n"
        f"Constraints: {constraints}\n"
        "Gebruik exact de opgegeven product_id's, kleuren en finishes. Geen generieke alternatieven."
    )


def prepare_reference_images(room_image_path: Path, product_image_paths: List[Path]) -> List[Dict[str, Any]]:
    refs: List[Dict[str, Any]] = []
    # room photo first
    refs.append(
        {
            "inline_data": {
                "mime_type": "image/jpeg",
                "data": Path(room_image_path).read_bytes(),
            }
        }
    )
    for p in product_image_paths:
        refs.append(
            {
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": Path(p).read_bytes(),
                }
            }
        )
    return refs


def generate_after_image(
    floorplan: Dict[str, Any],
    products: Dict[str, Any],
    style: Dict[str, Any],
    constraints: Dict[str, Any],
    room_image_path: Path,
    product_image_paths: List[Path],
) -> Optional[bytes]:
    """
    Calls Gemini image model with room photo + product reference images.
    Returns raw image bytes of the first generated image, or None.
    """
    prompt_text = make_image_prompt(floorplan, products, style, constraints)
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", "Genereer fotorealistische after-visual; behoud structuur uit referentie."),
            ("human", "{prompt_text}"),
        ]
    )
    chain = prompt | _image_model()
    refs = prepare_reference_images(room_image_path, product_image_paths)
    result = chain.invoke({"prompt_text": prompt_text, "image": refs})

    # Extract first inline image from result
    if hasattr(result, "message") and getattr(result.message, "content", None):
        for part in result.message.content:
            if getattr(part, "type", "") == "image":
                return part.data
    return None


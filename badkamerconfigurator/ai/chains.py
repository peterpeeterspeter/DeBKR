from __future__ import annotations

import base64
import json
from pathlib import Path
from typing import Any, Dict, List

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableParallel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai.output_parsers import GeminiVisionLLMOutputParser

from .models import AfterState, BeforeState, WorkPlan

# Configuration: rely on env vars for keys; no hardcoding.
MODEL_TEXT = "gemini-3-pro-preview"
MODEL_IMAGE = "gemini-3-pro-image-preview"


def _base_model() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=MODEL_TEXT,
        temperature=0.2,
        max_output_tokens=8192,
        safety_settings={"HARASSMENT": "BLOCK_NONE"},
    )


def _image_model() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=MODEL_IMAGE,
        temperature=0.25,
        max_output_tokens=2048,
    )


def build_before_chain() -> Any:
    """
    Foto -> BeforeState
    Structured output via Pydantic; caller passes base64 image and orientation hint.
    """
    parser = PydanticOutputParser(pydantic_object=BeforeState)
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "Je bent loodgieter/renovatie-expert. "
                "Analyseer de foto technisch; vul het volledige BeforeState JSON. "
                "Gebruik positionele termen consistent met orientation_hint.",
            ),
            ("human", "orientation_hint: {orientation_hint}"),
            ("human", "Lever ALLEEN geldige JSON conform schema."),
        ]
    )

    chain = (
        {
            "orientation_hint": lambda x: x["orientation_hint"],
            "image": lambda x: x["image_base64"],
        }
        | prompt
        | _base_model().with_structured_output(parser)
    )
    return chain


def build_catalog_reco_chain(catalog_items: List[Dict[str, Any]]) -> Any:
    """
    Catalogus RAG -> suggesties per categorie.
    Provide catalog_items (already filtered or full).
    """
    parser = PydanticOutputParser(pydantic_object=AfterState)  # placeholder to parse products layout; adjust downstream
    # For recommendations we return structured dict; reuse AfterState parser when applicable.
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "Je bent badkamer inkoper. Kies passende producten per categorie op basis van voorkeuren. "
                "Gebruik uitsluitend product_id's uit de catalogus. Output JSON.",
            ),
            ("human", "Voorkeuren: {preferences}"),
            ("human", "Catalogus:\n{catalog_json}"),
        ]
    )

    chain = (
        RunnableParallel(
            preferences=lambda x: json.dumps(x["preferences"], ensure_ascii=False),
            catalog_json=lambda x: json.dumps(catalog_items, ensure_ascii=False),
        )
        | prompt
        | _base_model()
    )
    return chain


def build_workplan_chain() -> Any:
    """
    Delta (Before + After) -> WorkPlan (zonder prijzen).
    """
    parser = PydanticOutputParser(pydantic_object=WorkPlan)
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "Je bent gespecialiseerde badkamer-aannemer. "
                "Vergelijk BeforeState met AfterState en produceer WorkPlan JSON (fases, taken, uren). "
                "Geen prijzen genereren.",
            ),
            ("human", "BeforeState: {before_state}"),
            ("human", "AfterState: {after_state}"),
            ("human", "Scenario: {scenario}"),
        ]
    )

    chain = (
        {
            "before_state": lambda x: json.dumps(x["before_state"], ensure_ascii=False),
            "after_state": lambda x: json.dumps(x["after_state"], ensure_ascii=False),
            "scenario": lambda x: x.get("scenario", "mid"),
        }
        | prompt
        | _base_model().with_structured_output(parser)
    )
    return chain


def build_image_chain() -> Any:
    """
    Structure-preserving after-image generation.
    Returns raw model output; caller extracts image part.
    """
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "Je bent architect. Genereer fotorealistische after-visual. "
                "Behoud muren/deur/raam uit referentiefoto. "
                "Gebruik exact de opgegeven producten en kleuren.",
            ),
            ("human", "Style: {style}"),
            ("human", "Constraints: {constraints}"),
            ("human", "Producten: {products}"),
        ]
    )

    chain = (
        {
            "style": lambda x: json.dumps(x.get("style", {}), ensure_ascii=False),
            "constraints": lambda x: json.dumps(x.get("constraints", {}), ensure_ascii=False),
            "products": lambda x: json.dumps(x.get("products", {}), ensure_ascii=False),
            "image": lambda x: x["image_base64"],
        }
        | prompt
        | _image_model()
    )
    return chain


def encode_image_file(path: Path) -> str:
    """Read an image file and return base64 string."""
    data = Path(path).read_bytes()
    return base64.standard_b64encode(data).decode("utf-8")



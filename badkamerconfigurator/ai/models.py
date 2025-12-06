from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class Dimensions(BaseModel):
    width: float
    depth: float
    height: Optional[float] = None


class Fixture(BaseModel):
    present: Optional[bool] = None
    position: Optional[str] = None
    size_cm: Optional[Dimensions] = None
    mount_type: Optional[str] = None
    notes: Optional[str] = None


class PlumbingEstimate(BaseModel):
    water_inlet_likely: Optional[str] = None
    waste_outlet_likely: Optional[str] = None
    ventilation_hint: Optional[str] = None
    notes: Optional[str] = None
    evidence: Optional[List[str]] = None
    confidence: Optional[str] = None


class ValidationInfo(BaseModel):
    user_confirmed: bool
    confirmed_at: Optional[str] = None
    confirmed_by: Optional[str] = None
    overrides: Optional[Dict[str, Any]] = None


class BeforeState(BaseModel):
    schema_version: str = Field(default="0.1.0")
    captured_at: Optional[str] = None
    source_media: Optional[List[str]] = None
    space: Dict[str, Any]
    fixtures: Dict[str, Fixture]
    materials: Optional[Dict[str, Any]] = None
    plumbing_estimate: PlumbingEstimate
    electricity_estimate: Optional[Dict[str, Any]] = None
    risks: Optional[List[str]] = None
    validation: ValidationInfo
    disclaimer: Optional[str] = None


class ProductRef(BaseModel):
    product_id: str
    variant: Optional[str] = None
    quantity: Optional[float] = None
    price_eur: Optional[float] = None


class Placement(BaseModel):
    product_id: str
    position: str
    mount_type: Optional[str] = None
    clearances_cm: Optional[Dict[str, float]] = None


class AfterState(BaseModel):
    schema_version: str = Field(default="0.1.0")
    reference_before_state_id: Optional[str] = None
    layout: Dict[str, Any]
    products: Dict[str, Any]
    style: Optional[Dict[str, Any]] = None
    structural_constraints: Optional[Dict[str, Any]] = None
    render_intent: Optional[Dict[str, Any]] = None
    disclaimer: Optional[str] = None


class Task(BaseModel):
    task: str
    category: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    complexity_flag: Optional[str] = None
    estimated_hours: Optional[float] = None
    dependencies: Optional[List[str]] = None
    notes: Optional[str] = None


class Phase(BaseModel):
    phase: int
    name: str
    tasks: List[Task]
    estimated_hours: Optional[float] = None
    notes: Optional[str] = None


class WorkPlan(BaseModel):
    schema_version: str = Field(default="0.1.0")
    source_before_state_id: Optional[str] = None
    source_after_state_id: Optional[str] = None
    phases: List[Phase]
    total_estimated_hours: float
    risk_flags: Optional[List[str]] = None
    pricing_inputs: Optional[Dict[str, Any]] = None
    cost_breakdown: Optional[Dict[str, Any]] = None
    disclaimer: Optional[str] = None



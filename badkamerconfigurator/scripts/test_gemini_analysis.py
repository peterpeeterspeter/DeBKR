#!/usr/bin/env python3
"""
Test script voor Gemini Pro reasoning analysis.
Demonstreert de before-state analyse met structured output.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from ai.before import analyze_before


def test_analysis_mock():
    """Test with mock mode (no API key required)"""
    print("=" * 60)
    print("TEST 1: Mock Mode (no GEMINI_API_KEY)")
    print("=" * 60)

    # Create a dummy image path
    dummy_image = Path(__file__).parent / "test_bathroom.jpg"
    if not dummy_image.exists():
        dummy_image.write_bytes(b"dummy")

    dimensions = {
        "width": 240,
        "depth": 300,
        "height": 250
    }

    # This will use mock data if no API key is set
    try:
        result = analyze_before(
            image_path=dummy_image,
            orientation_hint="front=door",
            dimensions_cm=dimensions
        )

        print("\n✓ Mock analysis completed successfully!")
        print(f"\nDetected fixtures:")
        for fixture, data in result.get("fixtures", {}).items():
            if data.get("present"):
                print(f"  - {fixture}: {data.get('position', 'unknown position')}")

        plumbing = result.get("plumbing_estimate", {})
        print(f"\nPlumbing estimate:")
        print(f"  - Water inlet: {plumbing.get('water_inlet_likely')}")
        print(f"  - Waste outlet: {plumbing.get('waste_outlet_likely')}")
        print(f"  - Confidence: {plumbing.get('confidence')}")

        print(f"\nFull JSON output:")
        print(json.dumps(result, indent=2))

    except Exception as e:
        print(f"\n✗ Error: {e}")

    finally:
        if dummy_image.exists():
            dummy_image.unlink()


def test_analysis_with_api():
    """Test with actual Gemini API (requires GEMINI_API_KEY)"""
    print("\n" + "=" * 60)
    print("TEST 2: Gemini Pro with Reasoning Level HIGH")
    print("=" * 60)

    if not os.getenv("GEMINI_API_KEY"):
        print("\n⚠ GEMINI_API_KEY not set. Skipping AI test.")
        print("  Set GEMINI_API_KEY environment variable to test AI analysis.")
        return

    # You would need a real bathroom image here
    print("\n⚠ This test requires a real bathroom image.")
    print("  Place a bathroom photo at: test_bathroom_real.jpg")

    test_image = Path(__file__).parent / "test_bathroom_real.jpg"
    if not test_image.exists():
        print(f"  Image not found: {test_image}")
        return

    dimensions = {
        "width": 240,
        "depth": 300,
        "height": 250
    }

    try:
        print("\n🤖 Analyzing bathroom with Gemini 2.0 Flash...")
        print("   Using ThinkingBudget.HIGH for deep reasoning...")

        result = analyze_before(
            image_path=test_image,
            orientation_hint="front=door",
            dimensions_cm=dimensions
        )

        print("\n✓ AI analysis completed successfully!")
        print(f"\nDetected fixtures:")
        for fixture, data in result.get("fixtures", {}).items():
            if data.get("present"):
                print(f"  - {fixture}: {data.get('position', 'unknown position')}")

        plumbing = result.get("plumbing_estimate", {})
        print(f"\nPlumbing estimate:")
        print(f"  - Water inlet: {plumbing.get('water_inlet_likely')}")
        print(f"  - Waste outlet: {plumbing.get('waste_outlet_likely')}")
        print(f"  - Confidence: {plumbing.get('confidence')}")

        space = result.get("space", {})
        print(f"\nSpace analysis:")
        print(f"  - Shape: {space.get('floorplan_shape')}")
        if "entrance" in space:
            print(f"  - Entrance: {space['entrance'].get('position')}")

        print(f"\nFull JSON output:")
        print(json.dumps(result, indent=2))

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()


def show_schema():
    """Display the BeforeState schema"""
    print("\n" + "=" * 60)
    print("BeforeState JSON Schema")
    print("=" * 60)

    from ai.before import BEFORE_STATE_SCHEMA
    print(json.dumps(BEFORE_STATE_SCHEMA, indent=2))


if __name__ == "__main__":
    print("\n🏠 Badkamer Configurator - Gemini Analysis Test\n")

    # Run tests
    test_analysis_mock()
    test_analysis_with_api()

    # Show schema
    if "--schema" in sys.argv:
        show_schema()

    print("\n" + "=" * 60)
    print("Tests completed!")
    print("=" * 60)

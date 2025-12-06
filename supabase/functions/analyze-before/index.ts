import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BEFORE_STATE_SCHEMA = {
  type: "object",
  properties: {
    schema_version: {
      type: "string",
      description: "Version of the schema, use '0.1.0'"
    },
    captured_at: {
      type: ["string", "null"],
      description: "ISO timestamp or null"
    },
    source_media: {
      type: "array",
      items: { type: "string" },
      description: "List of source image paths"
    },
    space: {
      type: "object",
      properties: {
        orientation_hint: {
          type: "string",
          description: "Orientation hint provided by user"
        },
        dimensions_cm: {
          type: "object",
          properties: {
            width: { type: "number" },
            depth: { type: "number" },
            height: { type: "number" }
          },
          required: ["width", "depth", "height"]
        },
        floorplan_shape: {
          type: "string",
          enum: ["rectangular", "l_shaped", "irregular"],
          description: "Shape of the bathroom floorplan"
        },
        entrance: {
          type: "object",
          properties: {
            position: {
              type: "string",
              description: "Position of the door entrance"
            },
            width_cm: { type: "number" }
          }
        }
      },
      required: ["orientation_hint", "dimensions_cm", "floorplan_shape"]
    },
    fixtures: {
      type: "object",
      properties: {
        toilet: {
          type: "object",
          properties: {
            present: { type: "boolean" },
            position: { type: "string" }
          },
          required: ["present"]
        },
        washbasin: {
          type: "object",
          properties: {
            present: { type: "boolean" },
            position: { type: "string" }
          },
          required: ["present"]
        },
        shower: {
          type: "object",
          properties: {
            present: { type: "boolean" },
            position: { type: "string" }
          },
          required: ["present"]
        },
        bathtub: {
          type: "object",
          properties: {
            present: { type: "boolean" },
            position: { type: "string" }
          },
          required: ["present"]
        }
      },
      required: ["toilet", "washbasin", "shower", "bathtub"]
    },
    plumbing_estimate: {
      type: "object",
      properties: {
        water_inlet_likely: {
          type: "string",
          enum: ["wall_left", "wall_right", "wall_back", "wall_front", "floor", "unknown"]
        },
        waste_outlet_likely: {
          type: "string",
          enum: ["floor_left", "floor_right", "floor_back", "floor_front", "wall", "unknown"]
        },
        confidence: {
          type: "string",
          enum: ["low", "medium", "high"]
        }
      },
      required: ["water_inlet_likely", "waste_outlet_likely", "confidence"]
    },
    validation: {
      type: "object",
      properties: {
        user_confirmed: { type: "boolean" }
      },
      required: ["user_confirmed"]
    }
  },
  required: ["schema_version", "space", "fixtures", "plumbing_estimate", "validation"]
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { project_id, orientation_hint, dimensions_cm, image_path } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    let beforeState;
    
    if (!geminiApiKey) {
      console.log("No GEMINI_API_KEY found, using mock data");
      beforeState = {
        schema_version: "0.1.0",
        captured_at: new Date().toISOString(),
        source_media: [image_path],
        space: {
          orientation_hint: orientation_hint,
          dimensions_cm: dimensions_cm,
          floorplan_shape: "rectangular",
          entrance: {
            position: "front_left",
            width_cm: 80
          }
        },
        fixtures: {
          toilet: { present: true, position: "back_left" },
          washbasin: { present: true, position: "front_right" },
          shower: { present: true, position: "back_right" },
          bathtub: { present: false }
        },
        plumbing_estimate: {
          water_inlet_likely: "wall_back",
          waste_outlet_likely: "floor_back",
          confidence: "medium"
        },
        validation: {
          user_confirmed: false
        }
      };
    } else {
      const { data: imageData, error: downloadError } = await supabase.storage
        .from('user-uploads')
        .download(image_path);

      if (downloadError) {
        throw new Error(`Failed to download image: ${downloadError.message}`);
      }

      const imageBytes = await imageData.arrayBuffer();
      const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBytes)));

      const prompt = `Je bent een ervaren loodgieter en badkamer renovatie-expert. Analyseer deze badkamerfoto grondig en technisch.

Oriëntatie hint: ${orientation_hint}
Gegeven afmetingen: ${JSON.stringify(dimensions_cm)}

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
Wees conservatief met de confidence level - als het niet duidelijk is, gebruik dan 'medium' of 'low'.`;

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Image
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 1.0,
              responseMimeType: "application/json",
              responseSchema: BEFORE_STATE_SCHEMA
            }
          })
        }
      );

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        throw new Error(`Gemini API error: ${errorText}`);
      }

      const geminiData = await geminiResponse.json();
      beforeState = JSON.parse(geminiData.candidates[0].content.parts[0].text);

      beforeState.source_media = [image_path];
      beforeState.captured_at = new Date().toISOString();
      beforeState.space.orientation_hint = orientation_hint;
      beforeState.space.dimensions_cm = dimensions_cm;
    }

    const { error: insertError } = await supabase
      .from('before_states')
      .insert([{ project_id, data: beforeState }]);

    if (insertError) {
      throw new Error(`Failed to save before state: ${insertError.message}`);
    }

    const mockAnchors = [
      { x: 0.2, y: 0.8, fixture: 'toilet' },
      { x: 0.8, y: 0.2, fixture: 'washbasin' },
      { x: 0.8, y: 0.8, fixture: 'shower' }
    ];

    return new Response(
      JSON.stringify({ before_state: beforeState, anchors: mockAnchors }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('Error in analyze-before:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// --- LIST OF MODELS TO TRY IN ORDER ---
// We try the newest 2.0 first. If 404, we fallback to specific 1.5 versions.
const MODELS = [
  "gemini-2.0-flash-exp",   // Newest, smartest, fast
  "gemini-1.5-flash",       // Standard alias
  "gemini-1.5-flash-001",   // Specific stable version (often fixes 404s)
  "gemini-1.5-pro",         // Slower but reliable fallback
];

// Helper: Extract JSON from markdown
function extractJSON(text: string): string {
  try {
    JSON.parse(text);
    return text;
  } catch (e) {
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      return text.substring(firstOpen, lastClose + 1);
    }
    return text;
  }
}

const SYSTEM_INSTRUCTION = `
**Role:** You are a specialized JSON Data Generator for a React Learning Management System. 
**Output:** RAW JSON ONLY. No markdown. No explanations.

**CRITICAL RULES:**
1. **Mandatory Fields:** Must include "authorId": "qt0rlbiExqPtvS7we1vCzX29N8f1" and "publishedAt" timestamps.
2. **NO Real Line Breaks:** All HTML strings (e.g., "<p>...</p>") MUST be single-line.
3. **MCQ Logic:** For "Given Data" step, set "isMultiCorrect": false.
4. **Strict UUIDs:** Generate unique v4 UUIDs for all IDs.

**Target JSON Schema (Follow EXACTLY):**
{
  "id": "GENERATE-UUID",
  "name": "Topic Title",
  "mainQuestionText": "<p>Problem text here.</p>",
  "status": "draft",
  "currencyType": "coin",
  "gradingMode": "system",
  "aiFeedbackPatterns": [],
  "classId": "z52XEEoI62jS3Rp6hLqV",
  "subjectId": "EgdxgoTrVXEIbA0AVw3e",
  "unitId": "iqFx63mGROVy3cP510U5",
  "categoryId": "aGmKlpaM3Ky2cg5YEwsY",
  "authorId": "qt0rlbiExqPtvS7we1vCzX29N8f1",
  "createdAt": { "seconds": 1766621763, "nanoseconds": 0 },
  "updatedAt": { "seconds": 1766621763, "nanoseconds": 0 },
  "publishedAt": { "seconds": 1766621763, "nanoseconds": 0 },
  "solutionSteps": [
    {
      "id": "GENERATE-UUID",
      "title": "GIVEN DATA",
      "description": "",
      "stepQuestion": "Identify the knowns.",
      "subQuestions": [
        {
          "id": "GENERATE-UUID",
          "marks": 1,
          "questionText": "<p>What do we need to calculate?</p>",
          "answerType": "mcq",
          "mcqAnswer": {
            "isMultiCorrect": false,
            "shuffleOptions": true,
            "options": [
              { "id": "GENERATE-UUID", "text": "Correct Target" },
              { "id": "GENERATE-UUID", "text": "Wrong Target" }
            ],
            "correctOptions": ["UUID-OF-CORRECT"]
          }
        },
        {
          "id": "GENERATE-UUID",
          "marks": 1,
          "questionText": "<p>Enter value for [Variable].</p>",
          "answerType": "numerical",
          "numericalAnswer": {
            "baseUnit": "Units",
            "correctValue": 100,
            "toleranceValue": 0
          }
        }
      ]
    },
    {
      "id": "GENERATE-UUID",
      "title": "CALCULATION",
      "description": "",
      "stepQuestion": "Perform calculation.",
      "subQuestions": [
        {
          "id": "GENERATE-UUID",
          "marks": 1,
          "questionText": "<p>Select formula.</p>",
          "answerType": "mcq",
          "mcqAnswer": {
            "isMultiCorrect": false,
            "shuffleOptions": true,
            "options": [
              { "id": "GENERATE-UUID", "text": "Correct Formula" },
              { "id": "GENERATE-UUID", "text": "Wrong Formula" }
            ],
            "correctOptions": ["UUID-OF-CORRECT"]
          }
        },
        {
          "id": "GENERATE-UUID",
          "marks": 1,
          "questionText": "<p>Final Answer.</p>",
          "answerType": "numerical",
          "numericalAnswer": {
            "baseUnit": "Units",
            "correctValue": 50,
            "toleranceValue": 0.5
          }
        }
      ]
    }
  ],
  "aiRubric": {
    "presentationClarity": 10,
    "substitution": 15,
    "calculationAccuracy": 25,
    "formulaSelection": 20,
    "problemUnderstanding": 15,
    "finalAnswer": 15
  }
}
`;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
        return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // --- ROBUST MODEL LOOP ---
    // Try models one by one until success
    let lastError = null;
    let textResponse = null;

    for (const modelName of MODELS) {
      try {
        console.log(`Attempting generation with model: ${modelName}`);
        
        const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: { 
                responseMimeType: "application/json",
                temperature: 0.2 
            } 
        });

        const result = await model.generateContent([
            SYSTEM_INSTRUCTION, 
            `Input Problem: ${prompt}`
        ]);

        textResponse = result.response.text();
        
        // If we get here, it worked! Break the loop.
        if (textResponse) break;

      } catch (error: any) {
        console.warn(`Model ${modelName} failed:`, error.message);
        lastError = error;
        // Continue to next model...
      }
    }

    // If all models failed
    if (!textResponse) {
      console.error("All models failed. Last error:", lastError);
      return NextResponse.json({ 
        error: "AI Service Unavailable. All models failed.", 
        details: lastError?.message 
      }, { status: 503 });
    }

    // Process Success
    const cleanJson = extractJSON(textResponse);

    try {
        const jsonResponse = JSON.parse(cleanJson);
        return NextResponse.json(jsonResponse);
    } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        console.error("Raw Text:", textResponse);
        return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
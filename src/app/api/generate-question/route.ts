import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Ensure Node runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Reuse your robust JSON extractor
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

// The Prompt Definitions
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

    // Configure Model (Using Flash for speed/cost, same as your grading)
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.2 // Low temp for consistent structure
        } 
    });

    const result = await model.generateContent([
        SYSTEM_INSTRUCTION, 
        `Input Problem: ${prompt}`
    ]);

    const textResponse = result.response.text();
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

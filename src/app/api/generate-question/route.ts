import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// --- ROBUST MODEL LIST ---
const MODELS = [
  "gemini-2.0-flash-exp",   
  "gemini-1.5-flash",       
  "gemini-1.5-flash-001",   
  "gemini-1.5-pro",
  "gemini-pro"              
];

// Helper: Extract JSON from text
function extractJSON(text: string): string {
  try {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) return jsonMatch[1];
    
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      return text.substring(firstOpen, lastClose + 1);
    }
    return text;
  } catch (e) {
    return text;
  }
}

const SYSTEM_INSTRUCTION = `
**Role:** You are a helpful Academic Tutor creating a structured problem for a Learning App.
**Output:** RAW JSON ONLY. No markdown.

**TONE & STYLE GUIDE:**
- **Professional yet Approachable:** Write clearly and concisely. Use the tone of a helpful hint rather than a casual chat.
- **Focus on Logic:** Step titles should describe the *action* (e.g., "Identify Given Data", "Select Formula").
- **Minimal Emojis:** Use emojis only to highlight key concepts (e.g., 💡 for a hint, 📐 for geometry), not for decoration.

**CRITICAL DATA RULES:**
1. **Mandatory Fields:** Include "authorId": "qt0rlbiExqPtvS7we1vCzX29N8f1" and "publishedAt".
2. **NO Real Line Breaks:** All HTML strings must be single-line.
3. **MCQ Logic:** For the "Given Data" step, set "isMultiCorrect": false.
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
      "title": "Analyze the Given Data",
      "description": "First, let's extract the known values and identify the target variable.",
      "stepQuestion": "Read the problem carefully. What information is explicitly provided?",
      "subQuestions": [
        {
          "id": "GENERATE-UUID",
          "marks": 1,
          "questionText": "<p>Which variable are we being asked to calculate?</p>",
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
          "questionText": "<p>Enter the value for [Variable] (in standard units).</p>",
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
      "title": "Apply the Formula 📐",
      "description": "Select the appropriate physical principle or formula to solve for the unknown.",
      "stepQuestion": "Which relationship connects the given values?",
      "subQuestions": [
        {
          "id": "GENERATE-UUID",
          "marks": 1,
          "questionText": "<p>Select the correct formula:</p>",
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
          "questionText": "<p>Calculate the final result. 💡 Tip: Watch your significant figures.</p>",
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

    let textResponse = null;
    let lastError = null;

    // --- LOOP THROUGH MODELS ---
    for (const modelName of MODELS) {
      try {
        console.log(`Attempting generation with model: ${modelName}`);
        
        // SAFE CONFIG for Legacy Models
        const isLegacy = modelName.includes("gemini-pro") && !modelName.includes("1.5");
        const generationConfig: any = { temperature: 0.3 }; // Lower temp for more professional consistency
        
        if (!isLegacy) {
            generationConfig.responseMimeType = "application/json";
        }

        const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig
        });

        const result = await model.generateContent([
            SYSTEM_INSTRUCTION, 
            `Input Problem: ${prompt}`
        ]);

        textResponse = result.response.text();
        
        if (textResponse) {
            console.log(`Success with model: ${modelName}`);
            break;
        }

      } catch (error: any) {
        console.warn(`Model ${modelName} failed:`, error.message);
        lastError = error;
      }
    }

    if (!textResponse) {
      return NextResponse.json({ 
        error: "All AI models failed. Please try again later.", 
        details: lastError?.message 
      }, { status: 503 });
    }

    const cleanJson = extractJSON(textResponse);

    try {
        const jsonResponse = JSON.parse(cleanJson);
        return NextResponse.json(jsonResponse);
    } catch (parseError) {
        console.error("JSON Parse Error. Raw text:", textResponse);
        return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
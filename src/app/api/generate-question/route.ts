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
**Role:** You are an energetic, emoji-loving study buddy creating a JSON Problem for a Learning App. 
**Output:** RAW JSON ONLY. No markdown.

**TONE & STYLE GUIDE (CRITICAL):**
- **Friendly & Casual:** Write step titles and questions as if you are studying with a friend.
- **Use Emojis:** Sprinkle relevant emojis (🚀, 💡, 🤔, ✨, 🧠) in titles and introductory text to make it visual and engaging.
- **Encouraging:** Use phrases like "Let's figure this out," "What do you think?", "Nice! Now..."
- **Avoid Robotic Language:** Do NOT use "Calculate X". Instead use "How do we find X? 🤔"

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
      "title": "Let's Start with the Basics 🧠",
      "description": "Before we calculate anything, let's see what the problem actually gave us. 🕵️‍♂️",
      "stepQuestion": "Okay, check the problem text. What values do we already know?",
      "subQuestions": [
        {
          "id": "GENERATE-UUID",
          "marks": 1,
          "questionText": "<p>What is the main thing we are trying to find here? 🤔</p>",
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
          "questionText": "<p>And what is the value of [Variable]? Don't forget units! 📏</p>",
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
      "title": "Crunching the Numbers 🚀",
      "description": "We have the data, now let's pick the right tool for the job. 🛠️",
      "stepQuestion": "Which formula connects these values?",
      "subQuestions": [
        {
          "id": "GENERATE-UUID",
          "marks": 1,
          "questionText": "<p>Which of these formulas looks correct to you? 🧪</p>",
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
          "questionText": "<p>Great! Now plug the numbers in. What do you get? ✨</p>",
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

    let lastError = null;
    let textResponse = null;

    // --- ROBUST LOOP ---
    for (const modelName of MODELS) {
      try {
        console.log(`Attempting generation with model: ${modelName}`);
        
        // SAFE CONFIG for Legacy Models
        const isLegacy = modelName.includes("gemini-pro") && !modelName.includes("1.5");
        const generationConfig: any = { temperature: 0.6 }; // Higher temp = More Creative/Fun
        
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
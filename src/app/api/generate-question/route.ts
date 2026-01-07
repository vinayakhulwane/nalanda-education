import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from '@/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

// Helper: Get AI Configuration with Fallback
async function getAiConfiguration() {
  try {
    // 1. Get the current active ID from global settings
    const activeSnap = await db.collection('settings').doc('ai_active').get();
    const activeData = activeSnap.data();
    const targetId = activeData?.generationId; // Specifically for generation

    if (!targetId) {
       console.warn("No active generation ID found, falling back to ENV key and default model.");
       return { 
         apiKey: process.env.GEMINI_API_KEY || "", 
         model: "gemini-1.5-flash" 
       };
    }

    // 2. Fetch the full details (API Key, Model Name) from your dynamic table
    const providerSnap = await db.collection('ai_providers').doc(targetId).get();
    const config = providerSnap.data();

    if (!config || !config.active) {
      console.warn("Target AI Provider is missing or disabled, using fallback.");
      return { 
        apiKey: process.env.GEMINI_API_KEY || "", 
        model: "gemini-1.5-flash" 
      };
    }

    return {
      apiKey: config.apiKey,
      model: config.gradingModel, // Using the model name stored in the 'gradingModel' field
      provider: config.provider
    };
  } catch (error) {
    console.error("Failed to fetch dynamic AI config:", error);
    return { 
      apiKey: process.env.GEMINI_API_KEY || "", 
      model: "gemini-1.5-flash" 
    };
  }
}

const SYSTEM_INSTRUCTION = ` **Role:** You are an expert "Scaffolded Learning" Architect creating systematic, step-by-step physics/math problems. 
 **Output:** RAW JSON ONLY. No markdown. 
 **PEDAGOGY STRATEGY (Strictly Follow):** Do not just ask for the answer. You must break the problem down into two distinct phases using the "Teacher Key" method: 
 **Phase 1: Analyze the Given Data 🧐** - Force the student to identify every variable *before* solving. - Ask: "What is the target variable?" (MCQ) - Ask: "What is the value of [Variable A]?" (Numerical) - Ask: "What is the value of [Variable B]?" (Numerical) 
 **Phase 2: Apply the Formula & Solve 🚀** - Do not jump to the result. Micro-step the logic. - Step A: Select the correct Formula for the first part (MCQ). - Step B: Calculate the intermediate value (Numerical). - Step C: Select the next formula (if needed) (MCQ). - Step D: Calculate the final answer (Numerical). 
 **TONE & VISUALS:** - **Systematic & Clear:** Every step must be distinct. - **Emoji Usage:** Use emojis to guide the eye (e.g., 🔢 for numbers, 📐 for formulas, 🎯 for goals, 💡 for hints). - **Structure:** Use "subQuestions" heavily to create the step-by-step flow. 
 **JSON SCHEMA RULES:** 1. **Mandatory Fields:** "authorId": "qt0rlbiExqPtvS7we1vCzX29N8f1", "publishedAt" (timestamp). 2. **UUIDs:** Generate unique v4 UUIDs for ALL IDs. 3. **HTML:** All text fields must be HTML strings (e.g., "<p>...</p>"). No real line breaks. 4. **Data Types:** "marks" must be integers. "toleranceValue" must be numbers. 
 **Target JSON Structure:** { 
   "id": "GENERATE-UUID", 
   "name": "Clear Topic Title", 
   "mainQuestionText": "<p>Full problem statement here.</p>", 
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
       "title": "Analyze the Given Data 🧐", 
       "description": "Read the problem carefully. Let's explicitly list what we know and what we need.", 
       "stepQuestion": "What information is explicitly provided?", 
       "subQuestions": [ 
         { 
           "id": "GENERATE-UUID", 
           "marks": 1, 
           "questionText": "<p>🎯 <strong>Goal:</strong> Which variable are we being asked to calculate?</p>", 
           "answerType": "mcq", 
           "mcqAnswer": { 
             "isMultiCorrect": false, 
             "shuffleOptions": true, 
             "options": [ 
               { "id": "GENERATE-UUID", "text": "Correct Variable Name" }, 
               { "id": "GENERATE-UUID", "text": "Distractor Variable" } 
             ], 
             "correctOptions": ["UUID-OF-CORRECT"] 
           } 
         }, 
         { 
           "id": "GENERATE-UUID", 
           "marks": 1, 
           "questionText": "<p>🔢 Enter the value for <strong>[Variable Name]</strong> (in [Unit]):</p>", 
           "answerType": "numerical", 
           "numericalAnswer": { 
             "baseUnit": "Unit", 
             "correctValue": 10, 
             "toleranceValue": 0 
           } 
         } 
       ] 
     }, 
     { 
       "id": "GENERATE-UUID", 
       "title": "Apply the Formula & Solve 🚀", 
       "description": "Now, let's connect the values using the correct relationships.", 
       "stepQuestion": "Which formulas do we need?", 
       "subQuestions": [ 
         { 
           "id": "GENERATE-UUID", 
           "marks": 1, 
           "questionText": "<p>📐 Select the correct formula for <strong>[Intermediate Step]</strong>:</p>", 
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
           "questionText": "<p>🧮 Now calculate the value for <strong>[Intermediate Variable]</strong>:</p>", 
           "answerType": "numerical", 
           "numericalAnswer": { 
             "baseUnit": "Unit", 
             "correctValue": 50, 
             "toleranceValue": 1 
           } 
         }, 
         { 
           "id": "GENERATE-UUID", 
           "marks": 1, 
           "questionText": "<p>📝 Final Step: What is the answer for <strong>[Target Variable]</strong>?</p>", 
           "answerType": "numerical", 
           "numericalAnswer": { 
             "baseUnit": "Unit", 
             "correctValue": 100, 
             "toleranceValue": 2 
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
   } } `; 

export async function POST(req: Request) { 
  try { 
    const { prompt } = await req.json(); 
    
    if (!prompt) { 
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 }); 
    } 
    
    // 1. Fetch Dynamic Configuration
    const { apiKey, model: modelName } = await getAiConfiguration();

    // 2. Initialize Model
    const genAI = new GoogleGenerativeAI(apiKey);
    
    console.log(`Attempting generation with dynamic model: ${modelName}`);

    // SAFE CONFIG for Legacy Models
    const isLegacy = modelName.includes("gemini-pro") && !modelName.includes("1.5");
    const generationConfig: any = { temperature: 0.2 }; // Low temp for precision
    
    if (!isLegacy) {
      generationConfig.responseMimeType = "application/json";
    }

    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig
    });

    // 3. Generate Content
    const result = await model.generateContent([
      SYSTEM_INSTRUCTION,
      `Create a systematic, scaffolded problem for: ${prompt}`
    ]);

    const textResponse = result.response.text();
    
    if (!textResponse) {
       return NextResponse.json({ 
         error: "AI model returned empty response.", 
         details: "Please check your API key or try a different model." 
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
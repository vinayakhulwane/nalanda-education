import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// ✅ VERCEL OPTIMIZATION: Use 'nodejs' for Google SDK stability.
// 'edge' runtime can sometimes cause issues with the official Google library.
// 'force-dynamic' ensures it doesn't try to cache the API results.
export const runtime = 'nodejs'; 
export const dynamic = 'force-dynamic';

// Initialize Google AI Client
// Make sure GEMINI_API_KEY is added to your Vercel Environment Variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const PATTERN_MAPPING: Record<string, string> = {
    'givenRequiredMapping': 'Given Data & Required Mapping',
    'conceptualMisconception': 'Conceptual Understanding & Misconceptions',
    'stepSequence': 'Step Sequence & Method Flow',
    'calculationMistake': 'Calculation Accuracy & Arithmetic',
    'unitsDimensions': 'Units & Dimensions',
    'commonPitfalls': 'Common Pitfalls',
    'answerPresentation': 'Final Answer Presentation',
    'nextSteps': 'How you can improve?', 
};

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const questionText = formData.get('questionText') as string;
    const rubricJson = formData.get('rubric') as string;
    const feedbackPatternsJson = formData.get('feedbackPatterns') as string;

    if (!imageFile) return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });

    // --- STEP 1: Process Rubric (Preserved Logic) ---
    let parsedRubric: Record<string, number> = {};
    try {
        parsedRubric = JSON.parse(rubricJson);
    } catch (e) {
        parsedRubric = { "General Accuracy": 100 }; 
    }

    const rubricInstructions = Object.entries(parsedRubric)
        .map(([category, weight]) => `- ${category}: Weightage ${weight}`)
        .join("\n");

    let feedbackFocusList = "";
    try {
        const patterns = JSON.parse(feedbackPatternsJson || '[]');
        if (Array.isArray(patterns) && patterns.length > 0) {
            feedbackFocusList = patterns.map(p => `- ${PATTERN_MAPPING[p] || p}`).join("\n");
        } else {
            feedbackFocusList = "- General Step-by-Step Review";
        }
    } catch (e) {
        feedbackFocusList = "- General observations";
    }

    // --- STEP 2: Process Image (Standard Node.js Buffer) ---
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    
    // --- STEP 3: Construct AI Prompt ---
    const totalQuestionMarks = parseFloat(formData.get('totalMarks') as string) || 8;

    const systemPrompt = `
      You are an expert academic grader.
      TASK: Analyze the student's handwritten solution. Compare it against the Question and evaluate it strictly using the weighted Rubric provided.
      QUESTION: "${questionText}"
      MAX MARKS: ${totalQuestionMarks}
      RUBRIC: ${rubricInstructions}
      FEEDBACK FOCUS: ${feedbackFocusList}
      
      INSTRUCTIONS:
      1. Score (0-100) for each rubric criterion.
      2. Feedback as a markdown list. Use bold titles (e.g. "**Title:**").
      
      OUTPUT JSON (Strictly JSON only): 
      { "breakdown": { "Criteria": number }, "feedback": "markdown string" }
    `;

    // --- STEP 4: Call AI (Switched to Gemini 1.5 Flash) ---
    // gemini-1.5-flash gives you 1,500 free requests per day
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      systemPrompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: imageFile.type || "image/jpeg"
        }
      }
    ]);

    // --- STEP 5: Parse Response ---
    const response = await result.response;
    const text = response.text();
    
    // Clean markdown if AI adds it (e.g. ```json ... ```)
    const jsonMatch = text.replace(/```json|```/g, "").trim();
    
    let rawResult;
    try {
        rawResult = JSON.parse(jsonMatch);
    } catch (e) {
        // Fallback if AI returns plain text instead of JSON
        console.error("JSON Parse Failed:", text);
        throw new Error("AI did not return valid JSON");
    }

    const breakdown = rawResult.breakdown || {};

    // Calculate Weighted Score (Preserved Logic)
    let calculatedTotalScore = 0;
    let totalWeight = 0;
    const normalizedBreakdown: Record<string, number> = {};
    
    Object.keys(breakdown).forEach(k => normalizedBreakdown[normalizeKey(k)] = Number(breakdown[k] || 0));

    Object.entries(parsedRubric).forEach(([rubricKey, weight]) => {
        const normKey = normalizeKey(rubricKey);
        let score = normalizedBreakdown[normKey];
        if (score === undefined) {
             const foundKey = Object.keys(normalizedBreakdown).find(k => k.includes(normKey) || normKey.includes(k));
             score = foundKey ? normalizedBreakdown[foundKey] : 0;
        }
        const numericWeight = Number(weight);
        totalWeight += numericWeight;
        calculatedTotalScore += (score / 100) * numericWeight;
    });

    if (totalWeight > 0 && totalWeight !== 100) {
        calculatedTotalScore = (calculatedTotalScore / totalWeight) * 100;
    }
    
    if (calculatedTotalScore === 0 && Object.values(breakdown).length > 0) {
        const scores = Object.values(breakdown).map(v => Number(v));
        calculatedTotalScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    return NextResponse.json({
        totalScore: Math.round(calculatedTotalScore),
        isCorrect: calculatedTotalScore >= 50,
        feedback: rawResult.feedback || "Grading complete.",
        breakdown: breakdown,
        driveLink: null 
    });

  } catch (error: any) {
    console.error("Backend Error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// ✅ VERCEL OPTIMIZATION: Use Edge Runtime. 
// This makes the API lighter and prevents the 10-second timeout.
export const runtime = 'edge'; 

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },
});

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

    // --- STEP 1: Process Rubric (Fast) ---
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

    // --- STEP 2: Process Image (In Memory) ---
    // We skip Google Drive upload to save 3-5 seconds
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${imageFile.type};base64,${base64Image}`;

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
      
      OUTPUT JSON: { "breakdown": { "Criteria": number }, "feedback": "markdown string" }
    `;

    // --- STEP 4: Call AI (Single Fast Attempt) ---
    // Using gemini-2.0-flash-exp because it is the fastest free model currently active
    const completion = await openai.chat.completions.create({
        model: "google/gemini-2.0-flash-exp:free",
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: systemPrompt },
                    { type: "image_url", image_url: { url: dataUrl } }
                ]
            }
        ],
        response_format: { type: "json_object" }
    });

    // --- STEP 5: Parse Response ---
    const content = completion.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) throw new Error("AI output format error");
    
    const rawResult = JSON.parse(jsonMatch[0]);
    const breakdown = rawResult.breakdown || {};

    // Calculate Weighted Score
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
        driveLink: null // Google Drive link is null because we skipped upload for speed
    });

  } catch (error: any) {
    console.error("Backend Error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
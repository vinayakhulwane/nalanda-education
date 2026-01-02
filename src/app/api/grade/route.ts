// Updated Backend Logic to fix "AI did not return valid JSON"
// Issue: The regex was too simple. AI sometimes returns text BEFORE or AFTER the JSON block.
// Solution: Use a more robust extraction method to find the first '{' and last '}'.

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

// Helper to reliably extract JSON from markdown/conversational text
function extractJSON(text: string): string {
    try {
        // 1. If it's already pure JSON, return it
        JSON.parse(text);
        return text;
    } catch (e) {
        // 2. Locate the outermost curly braces
        const firstOpen = text.indexOf('{');
        const lastClose = text.lastIndexOf('}');
        
        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            return text.substring(firstOpen, lastClose + 1);
        }
        
        // 3. Fallback: Return original text (will fail parse in next step, triggering error)
        return text;
    }
}

async function generateContentWithFallback(systemPrompt: string, base64Image: string, mimeType: string) {
    const promptParts = [
        systemPrompt,
        {
            inlineData: {
                data: base64Image,
                mimeType: mimeType
            }
        }
    ];

    try {
        console.log("Attempting Primary Model: gemini-2.0-flash-exp");
        const modelPrimary = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash-exp",
            // Force JSON mode for 2.0 Flash (if supported by provider, helps significantly)
            generationConfig: { responseMimeType: "application/json" } 
        });
        const resultPrimary = await modelPrimary.generateContent(promptParts);
        return await resultPrimary.response.text();
    } catch (error) {
        console.warn("Primary model failed, switching to Fallback (Gemini 1.5 Flash). Error:", error);
        
        try {
            const modelFallback = genAI.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                generationConfig: { responseMimeType: "application/json" }
            });
            const resultFallback = await modelFallback.generateContent(promptParts);
            return await resultFallback.response.text();
        } catch (fallbackError) {
            console.error("Fallback model also failed:", fallbackError);
            throw new Error("AI Service Unavailable");
        }
    }
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const imageFile = formData.get('image') as File;
        const questionText = formData.get('questionText') as string;
        const rubricJson = formData.get('rubric') as string;
        const feedbackPatternsJson = formData.get('feedbackPatterns') as string;

        if (!imageFile) return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });

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

        const arrayBuffer = await imageFile.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = imageFile.type || "image/jpeg";
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

        const textResponse = await generateContentWithFallback(systemPrompt, base64Image, mimeType);

        // --- FIXED PARSING LOGIC ---
        const cleanJson = extractJSON(textResponse);
        
        let rawResult;
        try {
            rawResult = JSON.parse(cleanJson);
        } catch (e) {
            console.error("JSON Parse Failed. Raw AI Response:", textResponse);
            throw new Error("AI did not return valid JSON");
        }

        const breakdown = rawResult.breakdown || {};

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
        // Return 500 so the frontend can catch the specific error message
        return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
    }
}
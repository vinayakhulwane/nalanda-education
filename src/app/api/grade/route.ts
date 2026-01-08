import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from '@/firebase/admin';
import { logAiUsage } from '@/lib/ai-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// --- CONSTANTS & HELPERS ---

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

// --- DYNAMIC AI CONFIGURATION ---

async function getAiConfiguration() {
    try {
        // 1. Get the current active ID from global settings (specifically for grading)
        const activeSnap = await db.collection('settings').doc('ai_active').get();
        const activeData = activeSnap.data();
        const targetId = activeData?.gradingId;

        if (!targetId) {
            console.warn("No active grading ID found, falling back to ENV key.");
            return {
                apiKey: process.env.GEMINI_API_KEY || "",
                model: "gemini-2.0-flash-exp", // Default fallback
                provider: "google-gemini"
            };
        }

        // 2. Fetch the provider details
        const providerSnap = await db.collection('ai_providers').doc(targetId).get();
        const config = providerSnap.data();

        if (!config || !config.active) {
            console.warn("Target AI Provider is missing or disabled, using fallback.");
            return {
                apiKey: process.env.GEMINI_API_KEY || "",
                model: "gemini-2.0-flash-exp",
                provider: "google-gemini"
            };
        }

        return {
            apiKey: config.apiKey,
            model: config.gradingModel,
            provider: config.provider || "google-gemini"
        };
    } catch (error) {
        console.error("Failed to fetch dynamic AI config:", error);
        return {
            apiKey: process.env.GEMINI_API_KEY || "",
            model: "gemini-2.0-flash-exp",
            provider: "google-gemini"
        };
    }
}

// --- GENERATION LOGIC ---

async function generateContentWithFallback(
    genAI: GoogleGenerativeAI,
    primaryModelName: string,
    systemPrompt: string,
    base64Image: string,
    mimeType: string
) {
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
        console.log(`Attempting Primary Model: ${primaryModelName}`);
        const modelPrimary = genAI.getGenerativeModel({
            model: primaryModelName,
            generationConfig: { responseMimeType: "application/json" }
        });

        const resultPrimary = await modelPrimary.generateContent(promptParts);
        return await resultPrimary.response.text();
    } catch (error) {
        console.warn(`Primary model (${primaryModelName}) failed, switching to Fallback (Gemini 1.5 Flash). Error:`, error);

        try {
            // Fallback uses the SAME API key but a generally stable model
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

// --- MAIN ROUTE ---

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const imageFile = formData.get('image') as File;
        const questionText = formData.get('questionText') as string;
        const rubricJson = formData.get('rubric') as string;
        const feedbackPatternsJson = formData.get('feedbackPatterns') as string;

        if (!imageFile) return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });

        // 1. Parse Rubric
        let parsedRubric: Record<string, number> = {};
        try {
            parsedRubric = JSON.parse(rubricJson);
        } catch (e) {
            parsedRubric = { "General Accuracy": 100 };
        }

        const rubricInstructions = Object.entries(parsedRubric)
            .map(([category, weight]) => `- ${category}: Weightage ${weight}`)
            .join("\n");

        // 2. Parse Feedback Patterns
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

        // 3. Dynamic Model Initialization
        const { apiKey, model: dynamicModelName, provider } = await getAiConfiguration();
        const genAI = new GoogleGenerativeAI(apiKey);

        // 4. Generate with Dynamic Config
        const textResponse = await generateContentWithFallback(
            genAI,
            dynamicModelName,
            systemPrompt,
            base64Image,
            mimeType
        );

        // 5. Parse & Score Logic (Preserved)
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

        // 6. Log Usage (AWAITED for Serverless Reliability)
        // We must await this, otherwise Vercel kills the process before writing.
        await logAiUsage({
            action: 'grade_submission',
            model: dynamicModelName,
            provider: provider || 'google-gemini',
            success: true,
            details: `Graded assignment with ${totalQuestionMarks} marks`
        });

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
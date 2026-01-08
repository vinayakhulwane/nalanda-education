import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from '@/firebase/admin';
import { logAiUsage } from '@/lib/ai-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// --- CONSTANTS ---

// 1. MAPPING: Converts "codeKeys" to "Beautiful English Headers"
const HUMAN_READABLE_TITLES: Record<string, string> = {
    // Keys likely coming from your frontend
    'calculationError': 'Calculation & Arithmetic',
    'calculationMistake': 'Calculation & Arithmetic',
    'givenRequiredMapping': 'Given Data & Formula Mapping',
    'conceptualMisconception': 'Conceptual Understanding',
    'stepSequence': 'Step-by-Step Logic',
    'unitsDimensions': 'Units & Dimensions',
    'consistency': 'Notation Consistency',
    'nextSteps': 'Recommended Next Steps',
    'commonPitfalls': 'Common Pitfalls',
    'finalAnswer': 'Final Answer Accuracy',
    'presentationClarity': 'Presentation & Clarity'
};

// --- HELPERS ---

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

async function getAiConfiguration() {
    try {
        const activeSnap = await db.collection('settings').doc('ai_active').get();
        const activeData = activeSnap.data();
        const targetId = activeData?.gradingId;

        if (!targetId) {
            return { apiKey: process.env.GEMINI_API_KEY || "", model: "gemini-2.0-flash-exp", provider: "google-gemini" };
        }

        const providerSnap = await db.collection('ai_providers').doc(targetId).get();
        const config = providerSnap.data();

        if (!config || !config.active) {
            return { apiKey: process.env.GEMINI_API_KEY || "", model: "gemini-2.0-flash-exp", provider: "google-gemini" };
        }

        return { apiKey: config.apiKey, model: config.gradingModel, provider: config.provider || "google-gemini" };
    } catch (error) {
        return { apiKey: process.env.GEMINI_API_KEY || "", model: "gemini-2.0-flash-exp", provider: "google-gemini" };
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
        const totalMarks = formData.get('totalMarks') as string;

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

        // 2. Parse Feedback Patterns & CONVERT TO ENGLISH
        let feedbackFocusList = "";
        try {
            const patterns = JSON.parse(feedbackPatternsJson || '[]');
            if (Array.isArray(patterns) && patterns.length > 0) {
                // Map the code keys to nice English titles
                feedbackFocusList = patterns.map(p => {
                    // FIX: Explicitly typed 'str' as string to satisfy TypeScript
                    const readable = HUMAN_READABLE_TITLES[p] || p.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase());
                    return `- ${readable}`;
                }).join("\n");
            } else {
                feedbackFocusList = "- General Step-by-Step Review";
            }
        } catch (e) {
            feedbackFocusList = "- General observations";
        }

        const arrayBuffer = await imageFile.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = imageFile.type || "image/jpeg";

        // 3. System Prompt (Updated for "Correct vs Incorrect" Detail)
        const systemPrompt = `
        You are an expert academic grader.
        
        PHASE 0: STRICT VALIDATION (CRITICAL)
        Before grading, analyze the visual nature of the text in the image.
        
        CRITERIA FOR REJECTION:
        1. Irrelevant Content: Photos of gardens, people, animals, objects, or blank screens.
        2. PRINTED/TYPED TEXT: Screenshots of PDFs, digital text files, Word documents, or textbook pages.
        
        CRITERIA FOR ACCEPTANCE:
        - The image must contain HUMAN HANDWRITING (either on physical paper or stylus-written on a tablet).
        
        ACTION:
        IF THE IMAGE FAILS VALIDATION:
        - STOP IMMEDIATELY.
        - Output JSON with "totalScore": 0 and "feedback": "ERROR: RELEVANCE_CHECK_FAILED".
        
        PHASE 1: GRADING (Only if Validation Passes)
        Analyze the student's solution. Compare it against the Question and evaluate it strictly using the weighted Rubric provided.

        QUESTION: "${questionText}"
        MAX MARKS: ${totalMarks}
        RUBRIC: ${rubricInstructions}
        
        FEEDBACK REQUIREMENTS (STRICT):
        The user has requested feedback ONLY on these specific topics:
        ${feedbackFocusList}

        INSTRUCTIONS:
        1. Score (0-100) for each rubric criterion.
        2. Generate Feedback:
           - You MUST use the exact English topics listed in "FEEDBACK REQUIREMENTS" as your bold titles.
           - **CRITICAL:** For any error found, do not just say "it is wrong".
             - You must specify: "You wrote [Student's Value], but the correct value is [Correct Value]."
             - Show the correct formula or step if applicable.
           - Be encouraging but precise.

        OUTPUT JSON (Strictly JSON only):
        { "breakdown": { "Criteria": number }, "feedback": "markdown string" }
        `;

        // 4. Initialize Dynamic Model
        const { apiKey, model: dynamicModelName, provider } = await getAiConfiguration();
        const genAI = new GoogleGenerativeAI(apiKey);
        
        const model = genAI.getGenerativeModel({
            model: dynamicModelName,
            generationConfig: { responseMimeType: "application/json" }
        });

        // 5. Generate Content
        const result = await model.generateContent([
            systemPrompt,
            { inlineData: { data: base64Image, mimeType: mimeType } }
        ]);

        const textResponse = result.response.text();
        const cleanJson = extractJSON(textResponse);
        let rawResult;

        try {
            rawResult = JSON.parse(cleanJson);
        } catch (e) {
            console.error("JSON Parse Failed. Raw AI Response:", textResponse);
            throw new Error("AI did not return valid JSON");
        }

        // 6. Handle Rejection
        if (rawResult.feedback === "ERROR: RELEVANCE_CHECK_FAILED") {
            await logAiUsage({
                action: 'grade_submission',
                model: dynamicModelName,
                provider: provider || 'google-gemini',
                success: false,
                details: `Rejected invalid image upload`
            });

            return NextResponse.json({
                totalScore: 0,
                isCorrect: false,
                feedback: "⚠️ Invalid Upload. Please upload a photo of your **Handwritten Solution**. We do not accept printed documents, screenshots, or irrelevant photos.",
                breakdown: {},
                driveLink: null
            });
        }

        // 7. Calculate Weighted Score
        const breakdown = rawResult.breakdown || {};
        let calculatedTotalScore = 0;
        let totalWeight = 0;
        
        const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');
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

        // 8. Log Success
        await logAiUsage({
            action: 'grade_submission',
            model: dynamicModelName,
            provider: provider || 'google-gemini',
            success: true,
            details: `Graded assignment with ${totalMarks} marks`
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
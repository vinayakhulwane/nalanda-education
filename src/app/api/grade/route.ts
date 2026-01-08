import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from '@/firebase/admin';
import { logAiUsage } from '@/lib/ai-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// --- HELPERS ---

// Helper to reliably extract JSON from markdown/conversational text
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

// Helper: Get AI Configuration from Database
async function getAiConfiguration() {
    try {
        // 1. Get the current active ID from global settings
        const activeSnap = await db.collection('settings').doc('ai_active').get();
        const activeData = activeSnap.data();
        const targetId = activeData?.gradingId;

        if (!targetId) {
            console.warn("No active grading ID found, falling back to ENV key.");
            return {
                apiKey: process.env.GEMINI_API_KEY || "",
                model: "gemini-2.0-flash-exp", 
                provider: "google-gemini"
            };
        }

        // 2. Fetch the provider details
        const providerSnap = await db.collection('ai_providers').doc(targetId).get();
        const config = providerSnap.data();

        if (!config || !config.active) {
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
        const totalMarks = formData.get('totalMarks') as string;

        if (!imageFile) return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });

        // 1. Parse Rubric (Context-Aware Grading)
        let parsedRubric: Record<string, number> = {};
        try {
            parsedRubric = JSON.parse(rubricJson);
        } catch (e) {
            parsedRubric = { "General Accuracy": 100 };
        }

        const rubricInstructions = Object.entries(parsedRubric)
            .map(([category, weight]) => `- ${category}: Weightage ${weight}`)
            .join("\n");

        // 2. Parse Feedback Patterns (Strict Headers)
        let feedbackFocusList = "";
        try {
            const patterns = JSON.parse(feedbackPatternsJson || '[]');
            if (Array.isArray(patterns) && patterns.length > 0) {
                // We use the raw strings from frontend (e.g. "Units & Dimensions")
                feedbackFocusList = patterns.map(p => `- ${p}`).join("\n");
            } else {
                feedbackFocusList = "- General Step-by-Step Review";
            }
        } catch (e) {
            feedbackFocusList = "- General observations";
        }

        const arrayBuffer = await imageFile.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = imageFile.type || "image/jpeg";

        // 3. Construct the "Phase 0" Validated System Prompt
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
        IF THE IMAGE FAILS VALIDATION (e.g., it is a printed question paper or a garden photo):
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
           - You MUST use the exact topics listed in "FEEDBACK REQUIREMENTS" as your bold titles.
           - If a topic is not relevant to the error found, skip it.
           - Be specific and constructive.

        OUTPUT JSON (Strictly JSON only):
        { "breakdown": { "Criteria": number }, "feedback": "markdown string" }
        `;

        // 4. Initialize Dynamic Model
        const { apiKey, model: dynamicModelName, provider } = await getAiConfiguration();
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // 5. Generate Content
        const textResponse = await generateContentWithFallback(
            genAI,
            dynamicModelName,
            systemPrompt,
            base64Image,
            mimeType
        );

        const cleanJson = extractJSON(textResponse);
        let rawResult;

        try {
            rawResult = JSON.parse(cleanJson);
        } catch (e) {
            console.error("JSON Parse Failed. Raw AI Response:", textResponse);
            throw new Error("AI did not return valid JSON");
        }

        // 6. Handle Rejection (Input Validation)
        if (rawResult.feedback === "ERROR: RELEVANCE_CHECK_FAILED") {
            // Log the failed attempt but don't count it as a "success" for stats if you prefer
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
        
        // Normalize keys to handle slight AI variations (e.g., "Step" vs "Steps")
        const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedBreakdown: Record<string, number> = {};
        Object.keys(breakdown).forEach(k => normalizedBreakdown[normalizeKey(k)] = Number(breakdown[k] || 0));

        Object.entries(parsedRubric).forEach(([rubricKey, weight]) => {
            const normKey = normalizeKey(rubricKey);
            let score = normalizedBreakdown[normKey];

            // Fuzzy match fallback
            if (score === undefined) {
                const foundKey = Object.keys(normalizedBreakdown).find(k => k.includes(normKey) || normKey.includes(k));
                score = foundKey ? normalizedBreakdown[foundKey] : 0;
            }

            const numericWeight = Number(weight);
            totalWeight += numericWeight;
            calculatedTotalScore += (score / 100) * numericWeight;
        });

        // Normalize to final percentage
        if (totalWeight > 0 && totalWeight !== 100) {
            calculatedTotalScore = (calculatedTotalScore / totalWeight) * 100;
        }

        // Fallback if AI returned scores but rubric failed to match
        if (calculatedTotalScore === 0 && Object.values(breakdown).length > 0) {
            const scores = Object.values(breakdown).map(v => Number(v));
            calculatedTotalScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        }

        // 8. Log Success (Awaited for Serverless Reliability)
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
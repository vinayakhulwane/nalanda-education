import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { google } from 'googleapis';
import { Readable } from 'stream';

// 1. Initialize OpenRouter (AI)
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },
});

// 2. Initialize Google Drive (OAuth 2.0)
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

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

// Helper to normalize keys for matching (e.g. "Calculation Accuracy" == "calculationAccuracy")
const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

// Helper delay function
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const questionText = formData.get('questionText') as string;
    const rubricJson = formData.get('rubric') as string;
    const feedbackPatternsJson = formData.get('feedbackPatterns') as string;

    if (!imageFile) return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });

    // --- STEP 1: Process Rubric ---
    let parsedRubric: Record<string, number> = {};
    try {
        parsedRubric = JSON.parse(rubricJson);
    } catch (e) {
        parsedRubric = { "General Accuracy": 100 }; 
    }

    const rubricInstructions = Object.entries(parsedRubric)
        .map(([category, weight]) => `- ${category}: Weightage ${weight}`)
        .join("\n");

    // --- STEP 2: Process Feedback Patterns ---
    let feedbackFocusList = "";
    try {
        const patterns = JSON.parse(feedbackPatternsJson || '[]');
        if (Array.isArray(patterns) && patterns.length > 0) {
            feedbackFocusList = patterns
                .map(p => `- ${PATTERN_MAPPING[p] || p}`)
                .join("\n");
        } else {
            feedbackFocusList = "- General Step-by-Step Review";
        }
    } catch (e) {
        feedbackFocusList = "- General observations";
    }

    // --- STEP 3: Process Image ---
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const dataUrl = `data:${imageFile.type};base64,${base64Image}`;

    // --- STEP 4: Upload to Google Drive ---
    const driveResponse = await drive.files.create({
      requestBody: {
        name: `nalanda_attempt_${Date.now()}.jpg`,
        mimeType: imageFile.type,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!] 
      },
      media: {
        mimeType: imageFile.type,
        body: Readable.from(buffer),
      },
    });

    const fileId = driveResponse.data.id!;
    await drive.permissions.create({
      fileId: fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    const fileInfo = await drive.files.get({
      fileId: fileId,
      fields: 'webViewLink',
    });
    const driveLink = fileInfo.data.webViewLink;

    // --- STEP 5: Construct AI Prompt ---
    const totalQuestionMarks = parseFloat(formData.get('totalMarks') as string) || 8;

    const systemPrompt = `
      You are an expert academic grader.
      
      TASK:
      Analyze the student's handwritten solution in the provided image. Compare it against the Question and evaluate it strictly using the weighted Rubric provided.

      QUESTION: "${questionText}"
      QUESTION MAX MARKS: ${totalQuestionMarks}

      RUBRIC CRITERIA (For Scoring):
      ${rubricInstructions}

      FEEDBACK SECTIONS:
      ${feedbackFocusList}

      INSTRUCTIONS:
      1. **Scoring:** Assign a score (0-100) for each Rubric Criterion.
      2. **Feedback Format:** - Output a structured Markdown list.
         - For every item in "FEEDBACK SECTIONS", provide a specific comment.
         - Use bold for the section title followed by a colon (e.g., "**How you can improve?:** ...").
         
      OUTPUT FORMAT (STRICT JSON ONLY):
      {
        "breakdown": { 
           "Criteria Name": number 
        },
        "feedback": "string (Markdown formatted list)"
      }
    `;

    // --- STEP 6: Call AI with Retries & Fallbacks ---
    // ✅ Updated Model List: Prioritize fast free models, then high quality ones
    const modelsToTry = [
        "google/gemini-2.0-flash-lite-preview-02-05:free", 
        "google/gemini-2.0-pro-exp-02-05:free",
        "google/gemini-2.0-flash-exp:free",
        "mistralai/pixtral-12b:free",
        "meta-llama/llama-3.2-11b-vision-instruct:free",
    ];

    let completion;
    let lastError;

    for (const modelId of modelsToTry) {
        try {
            console.log(`Trying AI Model: ${modelId}...`);
            completion = await openai.chat.completions.create({
                model: modelId,
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
            // If successful, break the loop
            break; 
        } catch (err: any) {
            console.warn(`Model ${modelId} failed: ${err.message}`);
            lastError = err;
            // ✅ Wait 1 second before trying the next model to avoid rate limit spam
            await delay(1000);
        }
    }

    if (!completion) {
        return NextResponse.json(
            { error: "AI Servers are currently busy. Please try again in 30 seconds." }, 
            { status: 429 }
        );
    }

    // --- STEP 7: Parse & Recalculate Score (THE FIX) ---
    const content = completion.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) throw new Error("AI output format error: " + content);
    
    const rawResult = JSON.parse(jsonMatch[0]);
    const breakdown = rawResult.breakdown || {};

    // ✅ ROBUST SCORE RE-CALCULATION
    // We ignore AI's "totalScore" and calculate it ourselves based on the Rubric weights.
    let calculatedTotalScore = 0;
    let totalWeight = 0;

    // Normalize keys to ensure we match "CalculationAccuracy" with "Calculation Accuracy"
    const normalizedBreakdown: Record<string, number> = {};
    Object.keys(breakdown).forEach(k => {
        normalizedBreakdown[normalizeKey(k)] = Number(breakdown[k] || 0);
    });

    Object.entries(parsedRubric).forEach(([rubricKey, weight]) => {
        const normKey = normalizeKey(rubricKey);
        
        // Find matching score in breakdown (fuzzy match)
        let score = normalizedBreakdown[normKey];

        if (score === undefined) {
             // Fallback: If AI named it slightly differently, look for it
             const foundKey = Object.keys(normalizedBreakdown).find(k => k.includes(normKey) || normKey.includes(k));
             score = foundKey ? normalizedBreakdown[foundKey] : 0;
        }

        const numericWeight = Number(weight);
        totalWeight += numericWeight;
        calculatedTotalScore += (score / 100) * numericWeight; // Weighted sum
    });

    // If weights don't sum to 100, normalize the result
    if (totalWeight > 0 && totalWeight !== 100) {
        calculatedTotalScore = (calculatedTotalScore / totalWeight) * 100;
    }
    
    // Fallback if rubric matching completely failed but AI gave a breakdown
    if (calculatedTotalScore === 0 && Object.values(breakdown).length > 0) {
        const scores = Object.values(breakdown).map(v => Number(v));
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        calculatedTotalScore = avg;
    }

    const cleanResult = {
        totalScore: Math.round(calculatedTotalScore), // ✅ Used our Calculated Score
        isCorrect: calculatedTotalScore >= 50,
        feedback: rawResult.feedback || "Grading complete.",
        breakdown: breakdown,
        driveLink 
    };

    return NextResponse.json(cleanResult);

  } catch (error: any) {
    console.error("Backend Error:", error);
    const status = error.message?.includes("busy") ? 429 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
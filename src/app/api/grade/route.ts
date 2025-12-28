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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const questionText = formData.get('questionText') as string;
    const rubricJson = formData.get('rubric') as string;
    const feedbackPatternsJson = formData.get('feedbackPatterns') as string;

    if (!imageFile) return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });

    // --- STEP 1: Process Rubric & Feedback Patterns ---
    let parsedRubric;
    try {
        parsedRubric = JSON.parse(rubricJson);
    } catch (e) {
        parsedRubric = { "General Accuracy": "100%" }; 
    }

    const rubricInstructions = Object.entries(parsedRubric)
        .map(([category, weight]) => `- ${category}: Weightage ${weight}`)
        .join("\n");

    let feedbackFocusList = "General observations";
    try {
        const patterns = JSON.parse(feedbackPatternsJson || '[]');
        if (Array.isArray(patterns) && patterns.length > 0) {
            feedbackFocusList = patterns.map(p => `- ${p}`).join("\n");
        }
    } catch (e) {
        console.log("No feedback patterns found, using default.");
    }

    // --- STEP 2: Process Image ---
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const dataUrl = `data:${imageFile.type};base64,${base64Image}`;

    // --- STEP 3: Upload to Google Drive ---
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

    // --- STEP 4: Construct AI Prompt ---
    const totalQuestionMarks = parseFloat(formData.get('totalMarks') as string) || 8;

    // ✅ UPDATED PROMPT: More explicit about formatting and spaces
    const systemPrompt = `
      You are an expert academic grader.
      
      TASK:
      Analyze the student's handwritten solution in the provided image. Compare it against the Question and evaluate it strictly using the weighted Rubric provided.

      QUESTION: "${questionText}"
      QUESTION MAX MARKS: ${totalQuestionMarks}

      RUBRIC CRITERIA:
      ${rubricInstructions}

      FEEDBACK FOCUS AREAS (Must Address These):
      ${feedbackFocusList}

      INSTRUCTIONS:
      1. For each Rubric criterion, assign a score from 0 to 100.
      2. "totalScore" must be the final weighted percentage (0-100).
      3. "feedback": You MUST return a structured Markdown list. 
         - Create a bullet point for each "Feedback Focus Area".
         - **Crucial:** Use bold for the focus area name, followed by a colon and a space. Ensure there are spaces between words in the focus area name (e.g., "**Step Sequence:**" not "**StepSequence:**").
         - Example Format:
           - **Given Data:** Mentioned correctly.
           - **Step Sequence:** Confusing; you missed the second derivative.
           - **Calculation Error:** Good, but watch units.
      4. Set "isCorrect" to true if the totalScore is 50 or higher.

      OUTPUT FORMAT (STRICT JSON ONLY):
      {
        "totalScore": number, 
        "isCorrect": boolean,
        "feedback": "string (Markdown formatted list)",
        "breakdown": { 
           "Criteria Name": number 
        }
      }
    `;

    // --- STEP 5: Call AI ---
    const modelsToTry = [
        "google/gemma-3-12b-it:free",
        "mistralai/mistral-small-3.1-24b-instruct:free",
        "google/gemini-2.0-flash-exp:free"
    ];

    let completion;
    let lastError;

    for (const modelId of modelsToTry) {
        try {
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
            break; 
        } catch (err) {
            console.log(`Model ${modelId} failed, trying next...`);
            lastError = err;
        }
    }

    if (!completion) throw lastError || new Error("All AI models failed");

    // --- STEP 6: Parse & Sanitize Response ---
    const content = completion.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) throw new Error("AI output format error: " + content);
    
    const rawResult = JSON.parse(jsonMatch[0]);

    const cleanResult = {
        totalScore: Number(rawResult.totalScore ?? rawResult.score ?? rawResult.Score ?? 0),
        isCorrect: Boolean(rawResult.isCorrect),
        feedback: rawResult.feedback || "Grading complete.",
        breakdown: rawResult.breakdown || {},
        driveLink 
    };

    return NextResponse.json(cleanResult);

  } catch (error: any) {
    console.error("Backend Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
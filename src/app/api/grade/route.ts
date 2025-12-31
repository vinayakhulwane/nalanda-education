import { NextResponse } from 'next/server';

// ✅ VERCEL OPTIMIZATION: Use 'nodejs' runtime.
export const runtime = 'nodejs'; 
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Check for API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server Config Error: GEMINI_API_KEY is missing.' }, { status: 500 });
    }

    // 2. Parse Form Data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const questionText = formData.get('questionText') as string;
    const rubricJson = formData.get('rubric') as string;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    // 3. Prepare Image (Base64)
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    // 4. Construct Prompt
    const systemPrompt = `
      You are a strict academic grader.
      TASK: Analyze the handwritten student solution in the image provided.
      QUESTION: "${questionText}"
      RUBRIC: ${rubricJson}
      OUTPUT FORMAT (Return PURE JSON only):
      {
        "totalScore": number (0-100),
        "isCorrect": boolean,
        "feedback": "markdown string (bullet points)",
        "breakdown": { "Step 1": number, "Step 2": number, "Final Answer": number }
      }
    `;

    // 5. Call Google API DIRECTLY (No SDK)
    // We use the REST endpoint manually to bypass SDK 404 errors.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{
        parts: [
          { text: systemPrompt },
          { inline_data: { mime_type: imageFile.type || "image/jpeg", data: base64Image } }
        ]
      }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    };

    console.log("Sending request to Google REST API...");

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    // 6. Handle Response
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google API Error:", errorText);
      return NextResponse.json({ error: `AI Error: ${response.status} ${response.statusText}`, details: errorText }, { status: response.status });
    }

    const data = await response.json();
    
    // 7. Parse the messy JSON structure from Google
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
       throw new Error("AI returned empty response");
    }

    const cleanJson = textContent.replace(/```json|```/g, "").trim();
    const parsedResult = JSON.parse(cleanJson);

    return NextResponse.json(parsedResult);

  } catch (error: any) {
    console.error("Backend Failure:", error);
    return NextResponse.json({ error: error.message || "Grading Failed" }, { status: 500 });
  }
}
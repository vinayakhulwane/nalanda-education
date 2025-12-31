import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// ✅ VERCEL OPTIMIZATION: Use 'nodejs' runtime.
export const runtime = 'nodejs'; 
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Check for API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("API Key Missing on Vercel");
      return NextResponse.json(
        { error: 'Server Config Error: GEMINI_API_KEY is missing.' },
        { status: 500 }
      );
    }

    // 2. Parse Form Data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const questionText = formData.get('questionText') as string;
    const rubricJson = formData.get('rubric') as string;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    // 3. Prepare Image for Google AI
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    // 4. Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // ✅ FIX: Use the PINNED VERSION 'gemini-1.5-flash-001'
    // This avoids the 404 error caused by aliases like 'latest' or 'flash'
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

    // 5. Construct Prompt
    const prompt = `
      You are a strict academic grader.
      TASK: Analyze the handwritten student solution in the image provided.
      
      QUESTION: "${questionText}"
      RUBRIC: ${rubricJson}
      
      INSTRUCTIONS:
      - Ignore minor spelling errors unless they change the meaning.
      - Focus on the logic and steps shown in the handwriting.
      - If the image is blurry or irrelevant, set totalScore to 0.
      
      OUTPUT FORMAT (Return PURE JSON only):
      {
        "totalScore": number (0-100),
        "isCorrect": boolean,
        "feedback": "markdown string (bullet points)",
        "breakdown": { "Step 1": number, "Step 2": number, "Final Answer": number }
      }
    `;

    // 6. Call AI
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: imageFile.type || "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    // 7. Clean JSON
    const cleanJson = text.replace(/```json|```/g, "").trim();
    let data;
    try {
        data = JSON.parse(cleanJson);
    } catch (e) {
        console.error("JSON Parse Error. AI returned:", text);
        throw new Error("AI returned invalid format");
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
        { error: error.message || "Grading Failed" }, 
        { status: 500 }
    );
  }
}
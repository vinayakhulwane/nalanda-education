import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// ✅ Use Edge Runtime (Fastest on Vercel)
export const runtime = 'edge'; 

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY, 
  defaultHeaders: {
    "HTTP-Referer": "https://nalanda-education.vercel.app",
    "X-Title": "Nalanda Education",
  },
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const questionText = formData.get('questionText') as string;
    const rubricJson = formData.get('rubric') as string;

    if (!imageFile) return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });

    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${imageFile.type};base64,${base64Image}`;

    const systemPrompt = `
      You are an expert academic grader.
      Analyze the handwritten student solution.
      QUESTION: "${questionText}"
      RUBRIC: ${rubricJson}
      OUTPUT JSON ONLY:
      {
        "totalScore": number (0-100),
        "isCorrect": boolean,
        "feedback": "markdown string",
        "breakdown": { "Step 1": number, "Final Answer": number }
      }
    `;

    // ✅ CRITICAL: Use 'google/gemini-flash-1.5' (PAID version)
    // DO NOT add ':free' at the end.
    // This will cost you approx ₹0.014 per request.
    const completion = await openai.chat.completions.create({
      model: "google/gemini-flash-1.5", 
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

    const content = completion.choices[0]?.message?.content || "";
    const rawResult = JSON.parse(content);

    return NextResponse.json(rawResult);

  } catch (error: any) {
    console.error("OpenRouter Error:", error);
    return NextResponse.json({ error: error.message || "Grading Failed" }, { status: 500 });
  }
}
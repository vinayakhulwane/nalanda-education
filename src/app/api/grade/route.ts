// src/app/api/grade/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenRouter Client
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY, // Ensure this is in your .env.local
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", // Required by OpenRouter
    "X-Title": "Nalanda Grading App", // Optional: Shows in their analytics
  },
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageUrl, rubric, questionText } = body;

    // Basic Validation
    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Construct the System Prompt
    const systemPrompt = `
      You are an expert academic grader. You will be given a student's handwritten solution to a problem.
      
      YOUR TASK:
      1. Read the student's handwritten solution from the image.
      2. Compare it strictly against the Question and Rubric provided below.
      3. Assign a score and provide constructive, encouraging feedback.
      
      CONTEXT:
      - Question: "${questionText}"
      - Rubric: ${JSON.stringify(rubric, null, 2)}
      
      OUTPUT FORMAT:
      You must return a valid JSON object with these 3 fields:
      {
        "score": number, // The numeric score awarded based on the rubric
        "feedback": "string", // A concise, helpful comment (max 3 sentences)
        "isCorrect": boolean // true if they scored > 50% of the marks
      }
    `;

    // Call OpenRouter (Gemini 2.0 Flash)
    const completion = await openai.chat.completions.create({
      model: "google/gemini-2.0-flash-exp:free", 
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: systemPrompt },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      // Note: Gemini usually respects JSON mode. If you get errors, remove this line.
      response_format: { type: "json_object" }, 
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) throw new Error("No response from AI");

    // Parse the JSON result
    // Note: Sometimes AIs wrap JSON in markdown ('''json ... '''). We clean that up just in case.
    const cleanContent = content.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleanContent);

    return NextResponse.json(result);

  } catch (error) {
    console.error("AI Grading Error:", error);
    return NextResponse.json(
      { error: 'Grading failed', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}

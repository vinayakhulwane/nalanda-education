'use server';

import OpenAI from 'openai';

export async function generateSolutionAction({ questionText }: { questionText: string }) {
  // 1. Check if API Key exists
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("❌ CRITICAL ERROR: OPENROUTER_API_KEY is missing from .env file.");
    return { success: false, error: "Server Error: API Key is missing." };
  }

  // 2. Initialize Client inside the action to ensure it picks up the latest env var
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "X-Title": "Nalanda Education",
    }
  });

  try {
    if (!questionText) {
      console.error("❌ Error: No question text provided to action.");
      return { success: false, error: "No question provided" };
    }

    console.log(`🔄 Sending request to OpenRouter for question: "${questionText.substring(0, 30)}..."`);

    // 3. Call API
    const response = await openai.chat.completions.create({
      // Try a fallback model if the specific 'free' one is down/busy
      model: "google/gemini-2.0-flash-exp:free", 
      messages: [
        {
          role: "system",
          content: "You are an expert tutor. Provide a clear, step-by-step educational solution for the question. Use Markdown formatting (bold key terms, list steps). Keep it concise and easy to read."
        },
        {
          role: "user",
          content: `Question: "${questionText}"`
        }
      ],
    });

    const solution = response.choices[0]?.message?.content;

    if (!solution) {
      console.error("❌ OpenRouter Error: Received empty response from model.", response);
      return { success: false, error: "Empty response from AI." };
    }

    console.log("✅ Solution generated successfully.");
    return { success: true, solution: solution };

  } catch (error: any) {
    // 4. Log the EXACT error from OpenRouter
    console.error("❌ OpenRouter API Exception:", error);
    
    // Return the actual error message so you can see it in the UI/Console
    return { 
      success: false, 
      error: error?.message || "Failed to generate solution" 
    };
  }
}
 'use server';

import OpenAI from 'openai';

// 1. Initialize OpenAI client pointing to OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY, // Ensure this is set in your .env file
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", // Optional: Your site URL
    "X-Title": "Nalanda Education", // Optional: Your site name
  }
});

export async function generateSolutionAction({ questionText }: { questionText: string }) {
  try {
    if (!questionText) return { success: false, error: "No question provided" };

    // 2. Use your specified OpenRouter model
    // You can switch between 'google/gemini-2.0-flash-exp:free' or 'google/gemma-3-12b-it:free'
    const model = "google/gemini-2.0-flash-exp:free"; 

    const response = await openai.chat.completions.create({
      model: model,
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
    return { success: true, solution: solution || "No solution generated." };

  } catch (error) {
    console.error("AI Generation Error:", error);
    return { success: false, error: "Failed to generate solution" };
  }
}

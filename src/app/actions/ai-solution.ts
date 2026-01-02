'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateSolutionAction({ questionText }: { questionText: string }) {
  try {
    // 1. Validation
    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ Server Error: GEMINI_API_KEY is missing.");
      return { success: false, error: "Server Configuration Error: API Key missing." };
    }

    if (!questionText) {
      return { success: false, error: "No question text provided." };
    }

    // 2. Initialize Google Client
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // ✅ FIX: Use "gemini-1.5-flash-001" instead of just "gemini-1.5-flash"
    // This specific version ID is more stable with the v1beta API.
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    console.log(`🔄 Sending request to Google AI for question: "${questionText.substring(0, 30)}..."`);

    // 3. Construct Prompt
    const prompt = `
      You are an expert tutor. 
      Provide a clear, step-by-step educational solution for the following question. 
      Use Markdown formatting (bold key terms, list steps). 
      Keep it concise and easy to read.

      Question: "${questionText}"
    `;

    // 4. Call API
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const solution = response.text();

    if (!solution) {
      throw new Error("Empty response from AI model.");
    }

    console.log("✅ Solution generated successfully.");
    return { success: true, solution: solution };

  } catch (error: any) {
    console.error("❌ Google AI API Exception:", error);
    
    // Handle standard Google API errors
    let errorMessage = "Failed to generate solution";
    
    if (error.message?.includes("429")) {
        errorMessage = "System busy (Rate Limit). Please try again in a moment.";
    } else if (error.message?.includes("404")) {
        errorMessage = "AI Model not found. Please contact support.";
    } else if (error.message) {
        errorMessage = error.message;
    }

    return { success: false, error: errorMessage };
  }
}
'use server';
/**
 * @fileOverview Generates a step-by-step solution for a given math or physics question.
 *
 * - generateSolutionForQuestion - A function that generates a detailed solution.
 * - GenerateSolutionForQuestionInput - The input type for the function.
 * - GenerateSolutionForQuestionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSolutionForQuestionInputSchema = z.object({
  questionText: z.string().describe('The full text of the question for which a solution is required.'),
});
export type GenerateSolutionForQuestionInput = z.infer<typeof GenerateSolutionForQuestionInputSchema>;

const GenerateSolutionForQuestionOutputSchema = z.object({
  solution: z
    .string()
    .describe('A detailed, step-by-step markdown-formatted solution to the question.'),
});
export type GenerateSolutionForQuestionOutput = z.infer<typeof GenerateSolutionForQuestionOutputSchema>;

export async function generateSolutionForQuestion(
  input: GenerateSolutionForQuestionInput
): Promise<GenerateSolutionForQuestionOutput> {
  return generateSolutionForQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSolutionForQuestionPrompt',
  input: {schema: GenerateSolutionForQuestionInputSchema},
  output: {schema: GenerateSolutionForQuestionOutputSchema},
  prompt: `You are an expert educator. Your task is to provide a clear, detailed, step-by-step solution for the following question.

Question:
"{{{questionText}}}"

Instructions:
1.  **Understand the Goal:** Clearly state the objective of the problem.
2.  **Identify Given Information:** List all the known values and conditions.
3.  **Select the Right Formulas:** State the relevant formulas or principles needed.
4.  **Show Your Work:** Provide a step-by-step calculation, substituting values and solving.
5.  **Final Answer:** Clearly state the final answer with the correct units.
6.  **Format:** Use Markdown for clarity, including lists, bold text for key terms, and code blocks for equations if necessary.

Return the entire solution as a single Markdown string in the 'solution' field.`,
});

const generateSolutionForQuestionFlow = ai.defineFlow(
  {
    name: 'generateSolutionForQuestionFlow',
    inputSchema: GenerateSolutionForQuestionInputSchema,
    outputSchema: GenerateSolutionForQuestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

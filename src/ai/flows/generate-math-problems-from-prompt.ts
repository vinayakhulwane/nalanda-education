'use server';
/**
 * @fileOverview A flow to generate math problems from a text prompt.
 *
 * - generateMathProblems - A function that generates math problems based on a text prompt.
 * - GenerateMathProblemsInput - The input type for the generateMathProblems function.
 * - GenerateMathProblemsOutput - The return type for the generateMathProblems function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMathProblemsInputSchema = z.object({
  prompt: z.string().describe('A text prompt describing the type of math problems to generate.'),
});
export type GenerateMathProblemsInput = z.infer<typeof GenerateMathProblemsInputSchema>;

const GenerateMathProblemsOutputSchema = z.object({
  problems: z.array(z.string()).describe('An array of math problems generated from the prompt.'),
});
export type GenerateMathProblemsOutput = z.infer<typeof GenerateMathProblemsOutputSchema>;

export async function generateMathProblems(input: GenerateMathProblemsInput): Promise<GenerateMathProblemsOutput> {
  return generateMathProblemsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMathProblemsPrompt',
  input: {schema: GenerateMathProblemsInputSchema},
  output: {schema: GenerateMathProblemsOutputSchema},
  prompt: `You are a math teacher. Generate a list of math problems based on the following description: {{{prompt}}}. Return the problems as a JSON array of strings.

For example, if the prompt was "5 simple addition problems", the response should be ["1+1", "2+2", "3+3", "4+4", "5+5"].`,
});

const generateMathProblemsFlow = ai.defineFlow(
  {
    name: 'generateMathProblemsFlow',
    inputSchema: GenerateMathProblemsInputSchema,
    outputSchema: GenerateMathProblemsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

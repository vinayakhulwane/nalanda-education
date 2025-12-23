'use server';
/**
 * @fileOverview Analyzes a student's strengths and weaknesses based on their performance data.
 *
 * - analyzeStudentStrengthsAndWeaknesses - A function that analyzes student performance.
 * - AnalyzeStudentStrengthsAndWeaknessesInput - The input type for the analyzeStudentStrengthsAndWeaknesses function.
 * - AnalyzeStudentStrengthsAndWeaknessesOutput - The return type for the analyzeStudentStrengthsAndWeaknesses function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeStudentStrengthsAndWeaknessesInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  performanceData: z
    .string()
    .describe(
      'A string containing the student performance data, including scores on various math topics.'
    ),
});
export type AnalyzeStudentStrengthsAndWeaknessesInput = z.infer<
  typeof AnalyzeStudentStrengthsAndWeaknessesInputSchema
>;

const AnalyzeStudentStrengthsAndWeaknessesOutputSchema = z.object({
  strengths: z
    .string()
    .describe('A summary of the student’s strengths based on the data.'),
  weaknesses: z
    .string()
    .describe('A summary of the student’s weaknesses based on the data.'),
  suggestedTopicsForReview: z
    .string()
    .describe('A list of topics the student should review based on their weaknesses.'),
});
export type AnalyzeStudentStrengthsAndWeaknessesOutput = z.infer<
  typeof AnalyzeStudentStrengthsAndWeaknessesOutputSchema
>;

export async function analyzeStudentStrengthsAndWeaknesses(
  input: AnalyzeStudentStrengthsAndWeaknessesInput
): Promise<AnalyzeStudentStrengthsAndWeaknessesOutput> {
  return analyzeStudentStrengthsAndWeaknessesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeStudentStrengthsAndWeaknessesPrompt',
  input: {schema: AnalyzeStudentStrengthsAndWeaknessesInputSchema},
  output: {schema: AnalyzeStudentStrengthsAndWeaknessesOutputSchema},
  prompt: `Analyze the strengths and weaknesses of {{studentName}} based on the following performance data:

{{performanceData}}

Based on the performance data, identify the student's key strengths, weaknesses, and suggest topics for review. Return each field as a short paragraph.`,
});

const analyzeStudentStrengthsAndWeaknessesFlow = ai.defineFlow(
  {
    name: 'analyzeStudentStrengthsAndWeaknessesFlow',
    inputSchema: AnalyzeStudentStrengthsAndWeaknessesInputSchema,
    outputSchema: AnalyzeStudentStrengthsAndWeaknessesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

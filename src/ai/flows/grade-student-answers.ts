'use server';

/**
 * @fileOverview AI agent for grading student answers based on a predefined rubric.
 *
 * - gradeStudentAnswer - Function to initiate the grading process.
 * - GradeStudentAnswerInput - Input type for the grading function.
 * - GradeStudentAnswerOutput - Return type for the grading function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GradeStudentAnswerInputSchema = z.object({
  studentAnswer: z.string().describe('The student\u2019s answer to the question.'),
  problemDescription: z.string().describe('The problem that the student is answering.'),
  rubric: z.string().describe('The grading rubric to use.'),
});
export type GradeStudentAnswerInput = z.infer<typeof GradeStudentAnswerInputSchema>;

const GradeStudentAnswerOutputSchema = z.object({
  score: z.number().describe('The overall score for the student\u2019s answer.'),
  feedback: z.string().describe('Detailed feedback on the student\u2019s answer based on the rubric.'),
});
export type GradeStudentAnswerOutput = z.infer<typeof GradeStudentAnswerOutputSchema>;

export async function gradeStudentAnswer(input: GradeStudentAnswerInput): Promise<GradeStudentAnswerOutput> {
  return gradeStudentAnswerFlow(input);
}

const gradeStudentAnswerPrompt = ai.definePrompt({
  name: 'gradeStudentAnswerPrompt',
  input: {schema: GradeStudentAnswerInputSchema},
  output: {schema: GradeStudentAnswerOutputSchema},
  prompt: `You are an AI grading assistant. You will grade the student's answer based on the provided problem description and grading rubric.

Problem Description: {{{problemDescription}}}

Student's Answer: {{{studentAnswer}}}

Grading Rubric: {{{rubric}}}

Based on the rubric, provide a score and detailed feedback. The score should be a number, and the feedback should contain areas where the student excelled and where they can improve.

Please output a JSON object that contains a score and feedback. Example: { \"score\": 85, \"feedback\": \"The student demonstrated a strong understanding of the concepts...\"}`,
});

const gradeStudentAnswerFlow = ai.defineFlow(
  {
    name: 'gradeStudentAnswerFlow',
    inputSchema: GradeStudentAnswerInputSchema,
    outputSchema: GradeStudentAnswerOutputSchema,
  },
  async input => {
    const {output} = await gradeStudentAnswerPrompt(input);
    return output!;
  }
);

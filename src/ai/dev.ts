import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-student-strengths-and-weaknesses.ts';
import '@/ai/flows/grade-student-answers.ts';
import '@/ai/flows/generate-math-problems-from-prompt.ts';
import '@/ai/flows/generate-solution-for-question.ts';

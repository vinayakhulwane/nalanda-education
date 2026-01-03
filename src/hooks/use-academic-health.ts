'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, documentId } from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import type { User, WorksheetAttempt, Worksheet } from '@/types';

// --- HELPER: ROBUST SCORE EXTRACTION ---
const getAttemptTotals = (
  a: WorksheetAttempt, 
  worksheet: Worksheet | undefined, 
  questionMap: Map<string, any>
) => {
  // 1. Try saved summary stats first
  const savedScore = (a as any).score ?? (a as any).obtainedMarks;
  const savedTotal = (a as any).totalMarks ?? (a as any).maxScore;

  if (typeof savedScore === 'number' && typeof savedTotal === 'number' && savedTotal > 0) {
    if (savedScore > savedTotal) {
      return { score: (savedScore / 100) * savedTotal, total: savedTotal };
    }
    return { score: savedScore, total: savedTotal };
  }

  // 2. Fail-safe: Manual Calculation using Question Definitions
  let calcScore = 0;
  let calcTotal = 0;
  const results = a.results || {};

  if (worksheet) {
    worksheet.questions.forEach(qId => {
      const question = questionMap.get(qId);
      if (question) {
        const qMax = question.solutionSteps?.reduce((acc: number, s: any) => 
          acc + s.subQuestions.reduce((ss: number, sub: any) => ss + (sub.marks || 0), 0), 0) || 0;
        
        calcTotal += qMax;

        let qEarned = 0;
        question.solutionSteps?.forEach((step: any) => {
          step.subQuestions.forEach((sub: any) => {
            const res = results[sub.id];
            if (res) {
              if (typeof res.score === 'number') qEarned += res.score;
              else if (res.isCorrect) qEarned += (sub.marks || 0);
            }
          });
        });

        if (qEarned > qMax && qMax > 0) {
          qEarned = (qEarned / 100) * qMax;
        }
        calcScore += qEarned;
      }
    });
  }

  if (calcTotal > 0) return { score: calcScore, total: calcTotal };
  return null;
};

export function useAcademicHealth(userProfile: User) {
  const firestore = useFirestore();

  // 1. Fetch Recent Attempts (Last 30 days)
  const attemptsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.id) return null;
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    return query(
      collection(firestore, 'worksheet_attempts'),
      where('userId', '==', userProfile.id),
      where('attemptedAt', '>', oneMonthAgo),
      orderBy('attemptedAt', 'desc')
    );
  }, [firestore, userProfile?.id]);
  const { data: attempts } = useCollection<WorksheetAttempt>(attemptsQuery);

  // 2. Fetch All Worksheets
  const allWorksheetsQuery = useMemoFirebase(() => {
     return firestore ? collection(firestore, 'worksheets') : null;
  }, [firestore]);
  const { data: allWorksheets } = useCollection<Worksheet>(allWorksheetsQuery);

  // 3. Fetch All Questions
  const allQuestionsQuery = useMemoFirebase(() => {
     return firestore ? collection(firestore, 'questions') : null;
  }, [firestore]);
  const { data: allQuestions } = useCollection<any>(allQuestionsQuery);

  // 4. Calculate Health
  const health = useMemo(() => {
    if (!attempts || !allWorksheets || !allQuestions) return 0;

    const worksheetMap = new Map(allWorksheets.map(w => [w.id, w]));
    const questionMap = new Map(allQuestions.map(q => [q.id, q]));
    const dailyStats: Record<string, { total: number; obtained: number }> = {};

    attempts.forEach(a => {
      if (!a.attemptedAt) return;
      const w = worksheetMap.get(a.worksheetId);
      const data = getAttemptTotals(a, w, questionMap);
      
      if (data) {
        const dateObj = (a.attemptedAt as any).toDate ? (a.attemptedAt as any).toDate() : new Date((a.attemptedAt as any));
        const dateKey = format(dateObj, 'yyyy-MM-dd');

        if (!dailyStats[dateKey]) dailyStats[dateKey] = { total: 0, obtained: 0 };
        dailyStats[dateKey].total += data.total;
        dailyStats[dateKey].obtained += data.score;
      }
    });

    // 14-Day Rolling Window (Baseline 80)
    let currentHealth = 80; 
    const today = new Date();

    for (let i = 13; i >= 0; i--) {
      const targetDate = subDays(today, i);
      const dateKey = format(targetDate, 'yyyy-MM-dd');
      const dayStats = dailyStats[dateKey];

      if (dayStats && dayStats.total > 0) {
        const dayAvg = Math.min(100, (dayStats.obtained / dayStats.total) * 100);
        currentHealth = (currentHealth * 0.6) + (dayAvg * 0.4);
      } else {
        currentHealth = Math.max(0, currentHealth * 0.95);
      }
    }

    return Math.round(currentHealth);
  }, [attempts, allWorksheets, allQuestions]);

  return health;
}
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, documentId, getDocs } from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import type { User, WorksheetAttempt, Worksheet, Question } from '@/types';

// --- HELPER: ROBUST SCORE EXTRACTION (Exact replica of Progress Page logic) ---
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
  
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  // 1. Fetch Recent Attempts
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
  
  // 2. Fetch related Worksheets and Questions based on attempts
  useEffect(() => {
    const fetchRelatedData = async () => {
        if (!firestore || !attempts || attempts.length === 0) {
            setWorksheets([]);
            setQuestions([]);
            return;
        }
        
        const worksheetIds = [...new Set(attempts.map(a => a.worksheetId))];

        // Fetch Worksheets
        const wsChunks = [];
        for (let i = 0; i < worksheetIds.length; i += 30) {
            wsChunks.push(worksheetIds.slice(i, i + 30));
        }
        const worksheetPromises = wsChunks.map(chunk => 
            getDocs(query(collection(firestore, 'worksheets'), where(documentId(), 'in', chunk)))
        );
        const worksheetSnapshots = await Promise.all(worksheetPromises);
        const fetchedWorksheets = worksheetSnapshots.flatMap(snap => snap.docs.map(d => ({ id: d.id, ...d.data() } as Worksheet)));
        setWorksheets(fetchedWorksheets);

        // Fetch Questions from the fetched worksheets
        const questionIds = [...new Set(fetchedWorksheets.flatMap(w => w.questions))];
        if (questionIds.length > 0) {
            const qChunks = [];
            for (let i = 0; i < questionIds.length; i += 30) {
                qChunks.push(questionIds.slice(i, i + 30));
            }
            const questionPromises = qChunks.map(chunk => 
                getDocs(query(collection(firestore, 'questions'), where(documentId(), 'in', chunk)))
            );
            const questionSnapshots = await Promise.all(questionPromises);
            const fetchedQuestions = questionSnapshots.flatMap(snap => snap.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
            setQuestions(fetchedQuestions);
        } else {
            setQuestions([]);
        }
    };
    fetchRelatedData();
  }, [firestore, attempts]);

  // 3. Calculate Health
  const health = useMemo(() => {
    if (!attempts || worksheets.length === 0 || questions.length === 0) return 80; // Return baseline if no data

    const worksheetMap = new Map(worksheets.map(w => [w.id, w]));
    const questionMap = new Map(questions.map(q => [q.id, q]));
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

    // 14-Day Rolling Window
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
  }, [attempts, worksheets, questions]);

  return health;
}
